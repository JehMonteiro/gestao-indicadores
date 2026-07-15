## Corrigir Metas: setor, colaborador responsável e formato do valor

**Problemas**
1. A tabela `targets` no banco não tem colunas `sector_id` nem `user_id`. O diálogo coleta esses campos, mas o `dbWrite.target` nunca os envia — por isso "Setor" e "Colaborador responsável" somem depois de salvar.
2. A meta está sendo exibida como "650.000,00" (formato decimal/moeda) porque segue o `value_type` do indicador. Você pediu que a meta seja sempre número inteiro.

**Correções**

1. **Migração no banco (`targets`)**
   - Adicionar `sector_id uuid` (FK → `sectors(id)` ON DELETE SET NULL).
   - Adicionar `user_id uuid` (FK → `auth.users(id)` ON DELETE SET NULL).
   - Índices simples nos dois campos.
   - Políticas RLS existentes continuam válidas (baseadas em `indicator_id`); não precisam mudar.

2. **`src/lib/supabase-data.ts`**
   - Em `dbWrite.target`, incluir `sector_id: t.sector_id ?? null` e `user_id: t.user_id ?? null` no upsert.

3. **`src/mocks/store.ts` / hidratação inicial**
   - Ao carregar `targets` do banco, mapear `sector_id` e `user_id` para o objeto local (se houver select explícito, incluir esses campos; se for `select("*")`, já vem).

4. **`src/routes/_authenticated/metas.tsx` — valor sempre inteiro**
   - Remover a lógica dinâmica de `label/step/min/max` baseada em `value_type`.
   - Fixar o input como inteiro: `type="number"`, `step="1"`, label "Valor da meta (número inteiro)", e `onChange` sempre com `Math.trunc(Number(raw))`.
   - Na tabela, exibir `t.target_value` formatado como inteiro em pt-BR (`new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(...)`), em vez de `formatValue(...)` que segue o tipo do indicador.

**Fora do escopo**
- Não altero o `value_type` dos indicadores existentes.
- Não mexo em telas de lançamentos/indicadores — só Metas.
