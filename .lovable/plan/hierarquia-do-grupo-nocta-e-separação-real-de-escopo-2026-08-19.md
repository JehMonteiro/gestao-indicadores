# Hierarquia do Grupo Nocta e separação real de escopo

Substituir a heurística temporária por classificação real de entidades (grupo / empresa / franquia) e aplicar o filtro de escopo nas telas, sem tocar em nenhum lançamento existente.

## Garantia de integridade

Nenhum `DELETE` ou `UPDATE` em `indicator_entries`. Nenhum indicador excluído, nenhum `code` alterado. Filtrar por escopo apenas oculta registros na interface; os dados permanecem no banco.

## 1. Banco de dados (migração)

- Enum `entity_type` ('grupo','empresa','franquia') e enum `entity_scope` ('empresa','franquia').
- `franchises`: novas colunas `entity_type` e `parent_id` (FK para a própria tabela), com índices — todas nullable.
- `indicators`: novas colunas `entity_scope` e `entity_id` (FK para `franchises`), índice composto `(entity_scope, status)` — nullable.
- `sectors`: nova coluna `company_id` (FK para `franchises`) — nullable.
- Sem alterações em `targets` / `indicator_entries` (continuam usando `franchise_id`).
- Nenhum NOT NULL nesta etapa.

## 2. Seed da hierarquia

Inserção/atualização por nome normalizado (sem duplicar):

```text
Grupo Nocta (grupo)
├── Nocta Seguros e Benefícios (empresa)
├── Nocta Franquia (empresa)
│   └── todas as franquias (parent_id = Nocta Franquia)
└── Fábio Gomes (empresa)
```

Demais registros: nome iniciando com "Franquia" ou código puramente numérico → `franquia` sob Nocta Franquia. Os restantes ficam com `entity_type` NULL para revisão manual.

## 3. Backfill de escopo por sufixo do código

| Sufixo | Escopo | Entidade |
| --- | --- | --- |
| `_COR` | empresa | Nocta Seguros e Benefícios |
| `_FRA` | empresa | Nocta Franquia (franqueadora, não a rede) |
| `_GRUPO_NOCT` e `_CHANA_GRUPO_NOCT` | empresa | Grupo Nocta |
| `_CED` | — | não classificar (revisão manual) |
| sem sufixo | — | não classificar (revisão manual) |

## 4. Tela `/classificacao-escopo` (somente superadmin)

- Barra de resumo: Total · Classificados · Pendentes.
- Tabela dos indicadores sem escopo: Nome · Código · Setor · Lançamentos · Acumulado · select de Escopo · select de Entidade (empresas, franquias ou "Toda a rede"), ordenada por número de lançamentos (desc).
- Seleção múltipla com aplicação em lote.
- Bloco destacado "Sufixo _CED não mapeado" com o texto de orientação pedido.
- Cada gravação registra em `audit_logs` (`update` / `indicator`).

## 5. Filtro de escopo nas rotas

- Remover os Alerts de "escopo pendente" de `indicadores-page`, `metas-page`, `lancamentos-page` e `/desempenho-franquias`.
- `/indicadores`, `/metas`, `/lancamentos` → escopo `empresa`; as rotas `-franquia` → escopo `franquia`.
- Em `/indicadores` e `/indicadores-franquia`, quando houver indicadores sem escopo, exibir Alert: "N indicador(es) ainda sem escopo definido e não aparecem nestas listas" com botão "Classificar agora".

## 6. Substituir a heurística

`src/lib/entity-kind.ts` passa a ler apenas `entity_type` e retorna `null` quando indefinido. Toda comparação por nome/código é removida. As abas de `/franquias` usam o campo real; na aba Empresas, o Grupo Nocta aparece no topo, destacado, seguido das empresas filhas.

## 7. Formulários

- Indicador (novo/editar): campo "Escopo" obrigatório abaixo de "Grupo estratégico"; ao escolher Franquia, campo "Unidade" com opção "Toda a rede".
- Franquia: `entity_type` e empresa-mãe fixos e exibidos como somente leitura.
- Setor: campo "Empresa" obrigatório, listando apenas entidades do tipo empresa.
- Importador: coluna `entity_scope` no template e remoção de `makeIndicatorCode()` com sufixo de franquia — código gerado só do nome, com checagem de unicidade.

## Detalhes técnicos

- Arquivos principais: `supabase/migrations/*` (nova migração), `src/lib/entity-kind.ts`, `src/lib/supabase-data.ts` (mapeadores e upserts), `src/mocks/types.ts`, `src/components/app/indicadores-page.tsx`, `metas-page.tsx`, `lancamentos-page.tsx`, `import-indicators-dialog.tsx`, `src/routes/_authenticated/indicadores.novo.tsx`, `indicadores.$id.editar.tsx`, `setores.index.tsx`, `franquias.index.tsx`, `desempenho-franquias.tsx`, nova rota `src/routes/_authenticated/classificacao-escopo.tsx` e item no menu lateral.
- Seed e backfill vão na mesma migração, escritos de forma idempotente (match por nome normalizado / sufixo de `code`), somente com INSERT/UPDATE em `franchises` e `indicators`.
- Antes e depois da migração, conferir contagem de `indicators` e `indicator_entries` para comprovar os critérios 5 e 6.
