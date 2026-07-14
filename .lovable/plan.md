## Corrigir erro ao salvar meta

**Causa:** em `src/routes/_authenticated/metas.tsx`, o `initial()` da nova meta define `created_by: "u-admin"` — um texto que não é UUID. A coluna `targets.created_by` é `uuid`, então o insert falha no banco e dispara o toast vermelho "Não foi possível salvar", enquanto o `toast.success("Meta salva")` aparece em paralelo porque a gravação é fire-and-forget.

**Correção (somente `src/routes/_authenticated/metas.tsx`):**
- Usar o id do usuário autenticado (via `useSession()` de `@/hooks/use-auth`) para preencher `created_by` ao criar a meta.
- Se não houver sessão, deixar `created_by: ""` (o helper `dbWrite.target` já converte para `null`).

Nenhuma outra tela ou schema é afetado.