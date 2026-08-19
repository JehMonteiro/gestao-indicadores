# Auditoria de Dados (/auditoria-dados)

Nova tela **somente leitura**, visível apenas para Superadmin. Nenhuma escrita, exclusão ou botão de ação.

## Ajustes de realidade do banco (verificados)

- A tabela de metas se chama `targets` (não `indicator_targets`) — a contagem usará `targets`.
- **Não existe coluna `deleted_at`** em `indicators`. Portanto:
  - A seção 4 (Indicadores excluídos logicamente) será exibida como um bloco informativo dizendo que exclusão lógica não está implementada (exclusões são físicas).
  - Órfãos serão detectados apenas por `indicator_id` sem correspondência em `indicators`.
- `audit_logs` guarda apenas `payload` (dados novos); **não existe `previous_data`**. O expander mostrará o `payload` registrado, com nota de que o estado anterior não é armazenado hoje.
- Os `entity_type` gravados pelo app são `indicator`, `entry` e `target` — o filtro usará esses valores (equivalentes a indicator_entry / indicator_target).

## Conteúdo da tela

1. **Contagens brutas** (consultas diretas, sem filtro de escopo/permissão da UI)
   - total de `indicator_entries`; total por `status`
   - total de `targets`
   - total de `indicators`; com `entity_scope` NULL; = 'empresa'; = 'franquia'

2. **Indicadores invisíveis** — todos com `entity_scope` NULL: nome, código, nº de lançamentos, acumulado (soma de `actual_value`), data do último lançamento; ordenado por nº de lançamentos DESC. No topo: "X lançamentos estão ocultos por falta de classificação."

3. **Lançamentos órfãos** — registros de `indicator_entries` cujo `indicator_id` não existe em `indicators`: indicator_id, período, valor. Mensagem de "nenhum órfão" quando vazio.

4. **Exclusão lógica** — bloco informativo (ver acima).

5. **Auditoria recente** — últimos 200 `audit_logs` com `action` em ('delete','update') e `entity_type` em ('indicator','entry','target'): data/hora, usuário (nome do profile), ação, entity_type, entity_id, e expander com o payload em JSON.

## Detalhes técnicos

- Nova rota `src/routes/_authenticated/auditoria-dados.tsx`, com guarda de Superadmin (mensagem de acesso negado para os demais), usando o hook de perfil existente.
- Dados carregados via server function autenticada (`src/lib/audit-data.functions.ts`) com `requireSupabaseAuth`, que valida o papel superadmin no servidor antes de consultar; consumida por `useQuery` no componente (sem loader, para não quebrar prerender).
- Consultas somente `select`/`count` — nenhuma mutação.
- Link no menu lateral (`app-shell.tsx`) visível apenas para Superadmin, e liberação da rota nas permissões existentes.
- `head()` com título e descrição próprios da página.
