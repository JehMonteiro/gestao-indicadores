# Remover o fluxo de aprovação de lançamentos

Todo lançamento passa a valer assim que é registrado. Não existe mais envio para aprovação, aprovação, rejeição, nem central de aprovações.

## Banco de dados (uma migration)

1. Converter dados existentes: lançamentos com status `enviado` ou `aprovado` viram `registrado`; `rejeitado` vira `rascunho` (para o responsável corrigir e registrar de novo). `atrasado` e `rascunho` ficam como estão.
2. Substituir o enum `entry_status` por apenas `rascunho`, `registrado`, `atrasado` (cria-se o novo tipo, converte-se a coluna, remove-se o antigo).
3. Remover de `indicator_entries`: `approved_by`, `approved_at`, `rejection_reason`.
4. Remover de `indicators`: `requires_approval`.
5. Remover a trigger/função de guarda de status de aprovação (`indicator_entries_guard_status` e suas duas triggers) e as funções auxiliares que existem só para checar permissão de aprovar/rejeitar.
6. Reescrever as políticas de acesso de `indicator_entries` sem qualquer regra de aprovação: quem enxerga o setor/franquia continua vendo e editando; ninguém aprova nada.
7. Ajustar a função de dados demo (`seed_demo_data`) para gravar `registrado`.

Permissões de visualização/edição por setor e franquia continuam iguais.

## Backend / camada de dados

- `src/lib/supabase-data.ts`: parar de ler e gravar `approved_by`, `approved_at`, `rejection_reason` e `requires_approval`.
- `src/mocks/types.ts` e `src/mocks/seed.ts`: novo conjunto de status e remoção dos campos de aprovação.
- `src/mocks/store.ts`: remover a rota `/aprovacoes` do mapa de permissões e as ações de aprovar/rejeitar.
- `src/lib/metrics.ts`: `approvedEntriesForIndicator` passa a considerar lançamentos `registrado` (renomeada para refletir isso), mantendo o resto do cálculo intacto.

## Frontend

- Excluir a rota/página `src/routes/_authenticated/aprovacoes.tsx` e o item "Aprovações" do menu lateral.
- `lancamentos.$id.tsx`: remover o card "Aprovação", botões Aprovar/Rejeitar, motivo de rejeição e o botão "Criar revisão" ligado ao status rejeitado (a revisão continua disponível pelo fluxo normal de novo lançamento).
- `lancamentos.novo.tsx`: salvar como `rascunho` ou `registrado` — sem envio para aprovação.
- `lancamentos.index.tsx`: filtro e cores de status apenas com os três status novos; coluna Empresa permanece.
- `indicadores.novo.tsx` e `indicadores.$id.editar.tsx`: remover o campo "Necessita aprovação" e a lógica ligada a ele; o importador de indicadores também deixa de enviar esse campo.
- `visao-geral.tsx`, `meu-painel.tsx`, `meus-indicadores.tsx`, `indicadores.index.tsx`, `indicadores.$id.tsx`, `setores.index.tsx`: passar a usar lançamentos `registrado` nos cálculos e remover cards/contadores de "pendências de aprovação". "Lançamentos atrasados" continua.
- `relatorios.tsx`: a coluna de status exporta os novos valores.

## Notificações

Remover os tipos ligados a envio/aprovação/rejeição; manter novo indicador atribuído, meta próxima do vencimento, lançamento pendente, lançamento atrasado e indicador crítico.

## Validação

- Conferir que os lançamentos históricos continuam existindo com o status convertido.
- Registrar um lançamento e verificar que ele aparece imediatamente em Visão geral, Meu painel, Indicadores e Relatórios.
- Verificar que não sobrou nenhum link, rota ou botão apontando para aprovações.
