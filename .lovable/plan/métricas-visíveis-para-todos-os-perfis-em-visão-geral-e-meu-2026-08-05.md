# Métricas visíveis para todos os perfis em "Visão geral" e "Meu painel"

## Situação atual (verificada)

- A página "Visão geral" só está liberada para Superadministrador, Administrador corporativo e Auditor. Gestor de setor, Colaborador interno, Gestor de franquia e Franqueado não conseguem abrir a página (o item nem aparece no menu).
- Dentro da "Visão geral", os dados são lidos direto da base completa, sem aplicar o escopo do usuário. Se ela for liberada como está, um colaborador veria dados de toda a empresa.
- "Meu painel" já está liberado para todos os perfis e já aplica o escopo do usuário, mas mostra um conjunto menor de cards (KPIs, desempenho por setor, distribuição, meus indicadores, pendências, índice consolidado). Faltam os blocos que só existem na "Visão geral" (evolução do índice, ranking por empresa, resumo anual por indicador).
- O bloco "Resumo anual por indicador" hoje aparece para todo mundo que acessa a "Visão geral", sem nenhuma checagem de responsabilidade.

## O que será feito

1. **Liberar "Visão geral" para todos os perfis** — a página passa a ser acessível a Superadministrador, Administrador corporativo, Gestor de setor, Colaborador interno, Gestor de franquia, Franqueado e Auditor, e o item volta a aparecer no menu para todos.

2. **Aplicar o escopo do usuário nos dados da "Visão geral"** — em vez de ler todos os indicadores, a página passa a usar a mesma regra de visibilidade já usada em "Meu painel" e na lista de indicadores. Assim, cada perfil vê a mesma estrutura de cards, mas só com os indicadores/metas/lançamentos que já tem direito de ver. Setores e empresas exibidos nos gráficos ficam limitados aos que aparecem nos indicadores visíveis.

3. **Igualar os cards das duas páginas** — "Meu painel" passa a exibir também os blocos que hoje só existem na "Visão geral" (evolução do índice ao longo do tempo, ranking por empresa e resumo anual por indicador), mantendo os cálculos exatamente como já são feitos hoje.

4. **Regra especial do "Resumo anual por indicador"** — o bloco só é renderizado quando houver pelo menos um indicador do qual o usuário logado é responsável direto (consta como responsável do indicador) ou responsável/criador da meta ligada àquele indicador. A tabela lista apenas esses indicadores. Superadministrador continua vendo tudo. Se não houver nenhum indicador nessa condição, o bloco não aparece.

5. **Validação** — verificar em pré-visualização que a "Visão geral" abre para perfis não administrativos com os mesmos cards e dados reduzidos ao escopo, e que o resumo anual só surge para responsáveis.

## Detalhes técnicos

- `src/mocks/store.ts` → `canSeeRoute`: incluir todos os perfis em `/visao-geral`.
- `src/routes/_authenticated/visao-geral.tsx`: trocar `useStore((s) => s.indicators)` por `useVisibleIndicators()`; derivar `targets`/`entries`/`sectors`/`franchises` a partir dos indicadores visíveis. Nenhuma fórmula de cálculo é alterada.
- Novo helper em `src/lib/permissions.ts`, por exemplo `useOwnedIndicators()`, que retorna os indicadores visíveis em que o usuário é responsável (`responsible_ids`) ou responsável/criador de alguma `target` do indicador (`targets.user_id` / `created_by`); superadmin recebe todos.
- Extrair o bloco "Resumo anual por indicador" (e os blocos de evolução/ranking, conforme necessário) para componentes em `src/components/app/` reutilizados por `visao-geral.tsx` e `meu-painel.tsx`, evitando duplicação.
- `src/routes/_authenticated/meu-painel.tsx`: renderizar os componentes compartilhados usando os mesmos dados de escopo já usados na página.
