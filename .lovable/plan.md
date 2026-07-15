## Problema

Ao aprovar/rejeitar em `/aprovacoes`, o backend responde 403 com `new row violates row-level security policy for table "indicator_entries"`.

Causa raiz (duas partes):

1. **Escrita errada** – `setEntryStatus` no store chama `dbWrite.entry`, que executa `upsert` (INSERT ... ON CONFLICT UPDATE). Assim o Postgres avalia a policy de **INSERT**, que exige `user_id = auth.uid()` e proíbe inserir com `status='aprovado'` quando o indicador exige aprovação. Aprovador (Jéssica) não é o dono do lançamento → bloqueia.
2. **Policy de UPDATE restritiva** – a policy atual só deixa transicionar status quem for admin, gestor do setor, gestor da franquia ou o próprio autor. Porém a trigger `indicator_entries_guard_status` documenta a decisão de produto: “any authenticated user may transition entry status, including approving their own entries. No role/self-approval checks.” Ou seja, o RLS está mais restritivo que a regra desejada.

## Correções

### 1. Backend – migration em `indicator_entries`

- `DROP POLICY "entries update own draft or manager"`.
- Recriar duas policies alinhadas à decisão de produto (a trigger continua sendo o guard-rail):
  - `USING`: qualquer usuário autenticado que enxergue a linha (mantém escopo de SELECT: admin, dono, gestor de setor, gestor de franquia).
  - `WITH CHECK`: qualquer usuário autenticado, sem exigir papel/self-approval — a validação de transições segue na trigger.
- Não mexer nas policies de INSERT/DELETE/SELECT.

### 2. Frontend – usar UPDATE ao mudar status

Em `src/mocks/store.ts` → `setEntryStatus`:

- Não chamar `dbWrite.entry` (upsert). Fazer um `supabase.from("indicator_entries").update({...}).eq("id", id).select().maybeSingle()` só com os campos que mudam (`status`, `approved_by`, `approved_at`, `rejection_reason`, `submitted_at`, `updated_at`).
- Manter o retorno mapeado via o mesmo mapper de `dbWrite.entry` (extrair helper reutilizável em `src/lib/supabase-data.ts`, ex.: `dbWrite.updateEntryStatus(id, patch)`).
- Preservar a atualização local do store como já está.

Assim a policy de INSERT deixa de ser avaliada e a de UPDATE (agora relaxada) permite aprovar/rejeitar.

## Validação

- Fazer login como usuária não-gestora, aprovar um lançamento pendente em `/aprovacoes` e confirmar 200 + toast “Aprovado”.
- Rejeitar com motivo e confirmar transição para “Rejeitado”.
- Conferir no console que `indicator_entries?select=*` responde 200 (sem 403/42501).
- Confirmar que criação de novo lançamento (fluxo `lancamentos/novo`) continua funcionando (policy de INSERT intacta).