# Auditoria: lançamentos não atualizam indicadores e metas

## O que a auditoria encontrou (verificado no banco e no código)

Consultei os dados reais: existem **19 lançamentos** e apenas **3 metas** cadastradas. Desses 19 lançamentos, **18 estão sem vínculo com meta** (`target_id` nulo). As 3 metas existentes estão vinculadas a **um indicador de outra empresa**, e não aos indicadores em que os lançamentos foram feitos. Ou seja: hoje quase nenhum lançamento tem meta correspondente, então o sistema calcula "sem informação" em todas as telas.

### Causa raiz 1 — o lançamento nunca encontra a meta
A tela de novo lançamento só aceita uma meta cujo **início de período seja exatamente igual** ao início do período do lançamento. As metas cadastradas são anuais (01/01 a 31/12) e os lançamentos são mensais, então a busca nunca acha nada e o lançamento é gravado sem meta.

### Causa raiz 2 — metas caem no indicador errado
Os indicadores estão duplicados por empresa (existem três indicadores chamados "Alcance (novas contas)", um por empresa). No cadastro de Meta, a lista de indicadores mostra só o nome, sem a empresa, e não é filtrada pela empresa escolhida. Foi escolhido o indicador de uma empresa e a empresa de outra — a meta ficou órfã.

### Causa raiz 3 — cada tela calcula de um jeito diferente
- **Relatórios** só considera a meta se o lançamento tiver `target_id` gravado. Com 18 de 19 nulos, o relatório mostra meta e atingimento vazios sempre.
- **Visão geral**, **detalhe do indicador** e **Meu painel** usam uma busca de meta que ignora a meta padrão do indicador e não ajusta meta anual para período mensal.
- **Indicadores** e **Meus indicadores** usam uma terceira via, que já ajusta proporcionalmente e usa meta padrão.
Resultado: o mesmo lançamento aparece com percentuais diferentes (ou vazio) dependendo da tela.

### Causa raiz 4 — meta de outra empresa e escopo ignorado
A busca de meta não considera setor nem responsável, e em alguns casos aceita a meta mais recente do indicador mesmo sendo de outra empresa. No "Meu painel" a busca recebe a lista completa de metas, sem filtrar pelo indicador.

### Causa raiz 5 — "sem meta" é confundido com "sem lançamento"
Quando não existe meta no período, tudo cai em "Sem informação", sem indicar que o problema é meta ausente.

### Causa raiz 6 — revisões duplicadas
Cada novo lançamento no mesmo indicador/empresa/período cria uma linha nova, e os cálculos que somam períodos (resumo anual da Visão geral) contam as duas.

## O que será corrigido

**1. Vínculo lançamento ↔ meta (frontend + backend)**
- A busca da meta no lançamento passa a aceitar meta cujo período **contenha** o período do lançamento (mensal dentro de anual/trimestral), respeitando indicador + empresa + setor.
- O `target_id` passa a ser gravado sempre que houver meta compatível.
- Correção de dados: vincular os lançamentos existentes à meta correta quando ela existir.

**2. Uma única regra de cálculo para todo o sistema**
- Todas as telas (Visão geral, Meu painel, detalhe do indicador, Indicadores, Meus indicadores, Relatórios) passam a usar a mesma função de resolução de meta e de atingimento, incluindo o ajuste proporcional já existente (meta anual dividida para o período do lançamento) e a meta padrão do indicador como fallback.
- Fórmulas de atingimento e escopos de meta permanecem como estão — só a busca da meta e os filtros são unificados.

**3. Cadastro de Metas**
- A lista de indicadores no diálogo de meta passa a exibir a empresa/setor no rótulo e a ser filtrada pela empresa selecionada, impedindo metas órfãs.
- Aviso ao salvar quando já existir meta sobreposta para o mesmo indicador/empresa/período.

**4. Dashboards**
- Cards "atingido / em atenção / crítico / sem informação" e evolução mensal recalculados com a regra unificada, sempre pelo lançamento mais recente de cada período.
- Ranking por empresa e por setor passam a filtrar metas pela empresa correta.

**5. Sem meta definida**
- Indicadores sem meta no período exibem "Sem meta definida" (badge/tooltip) em vez de apenas "Sem informação", sem quebrar tela nem gráfico.

**6. Revisões**
- Ao lançar novamente o mesmo indicador/empresa/período, o registro anterior é substituído (nova revisão) em vez de duplicado; os cálculos passam a considerar apenas a última revisão.

**7. Relatórios**
- O relatório detalhado e a exportação CSV passam a usar exatamente os mesmos dados calculados dos dashboards, incluindo meta resolvida e atingimento.

**8. RLS e permissões**
- Revisão das políticas de leitura de lançamentos para confirmar que autor, membro do setor, gestor de setor, gestor/franqueado da empresa, admin e auditor enxergam o que devem. Hoje um colaborador do setor que não é o autor não lê o lançamento — será ajustado para leitura por membro do setor/empresa, mantendo escrita restrita.

## Verificação ao final
1. Criar lançamento novo para indicador com meta e conferir o mesmo percentual em: detalhe do indicador, Meu painel, Visão geral, dashboard por setor/empresa e Relatórios.
2. Criar lançamento para indicador sem meta e conferir a mensagem "Sem meta definida".
3. Relançar o mesmo período e conferir que substitui, não duplica.
4. Conferir leitura com cada perfil.
5. Entregar o resumo item a item das causas e correções (banco, cálculo, dashboards, RLS, relatórios).

## Detalhes técnicos
- `src/lib/metrics.ts`: `findTargetForEntry` passa a casar por contenção de período (`target.period_start <= entry.period_start && target.period_end >= entry.period_end`) e escopo (empresa/setor); remoção do fallback que pega meta de outra empresa; `latestTargetForIndicator` deixa de retornar `undefined` quando há uma única meta de empresa aplicável; nova helper `latestEntriesByPeriod` para deduplicar revisões.
- `src/routes/_authenticated/lancamentos.novo.tsx`: usa `resolveTargetRowForEntry` (mesma regra) para preencher `target_id`, `sector_id` e `franchise_id`.
- `visao-geral.tsx`, `meu-painel.tsx`, `indicadores.$id.tsx`, `relatorios.tsx`: trocam `findTargetForEntry`/`targets.find(...)` por `resolveTargetForEntry`/`resolveTargetForIndicator`, com metas pré-filtradas por indicador.
- `metas.tsx`: rótulo do indicador com empresa, filtro por empresa selecionada e checagem de sobreposição.
- Migração SQL: backfill de `indicator_entries.target_id` por indicador + empresa + contenção de período; ajuste da policy `entries read scope` para incluir membros de setor/empresa.
