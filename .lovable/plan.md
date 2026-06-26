## Problema

Em **Usuários → Novo usuário**, o formulário chama `upsertProfile`, que apenas atualiza o estado local (Zustand). Não há gravação no Supabase, e mesmo se houvesse, não é possível inserir diretamente em `public.profiles`: essa tabela é populada automaticamente pelo trigger `handle_new_user` quando um usuário é criado em `auth.users`. Resultado: os dois usuários "somem" no próximo refresh.

## Solução

Criar usuários via Auth Admin API (service role) numa server function protegida, e gravar o papel global em `user_roles` no mesmo fluxo.

### 1. Server function `inviteUser` (`src/lib/users.functions.ts`)

- `createServerFn({ method: "POST" })`
- `.middleware([requireSupabaseAuth])`
- `.inputValidator` (zod): `full_name`, `email`, `global_role`, `user_type`
- Handler:
  1. Verifica se o chamador é `superadmin` ou `admin_corporativo` via `has_role` (RPC) — senão `403`.
  2. `await import("@/integrations/supabase/client.server")` para usar `supabaseAdmin`.
  3. `supabaseAdmin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name } })` (cria usuário; trigger `handle_new_user` cria o perfil automaticamente).
  4. `supabaseAdmin.from("profiles").update({ full_name }).eq("id", newUser.id)` (garante nome).
  5. Se `global_role` ≠ `colaborador` (padrão do trigger): `delete` em `user_roles` daquele user + `insert` com o papel escolhido.
  6. Retorna `{ id, email }`.

### 2. UI `src/routes/_authenticated/usuarios.tsx`

- `ProfileDialog` passa a chamar `useServerFn(inviteUser)` em vez de `upsertProfile` local.
- Em caso de sucesso: toast "Usuário convidado" + `queryClient.invalidateQueries()` para recarregar a lista; hidratar store a partir do Supabase (já existe fluxo em `auth-sync`/`supabase-data`).
- Em caso de erro: toast genérico ("Não foi possível criar o usuário").
- Remover o uso de `upsertProfile` para criação (mantém apenas para edições locais futuras, se houver).

### 3. Sem alterações de schema

`profiles`, `user_roles` e o trigger `handle_new_user` já existem e estão corretos. Não há migração.

### Detalhes técnicos

- `supabaseAdmin` só pode ser importado dinamicamente dentro do handler (regra `tanstack-supabase-import-graph`).
- A criação por `createUser` com `email_confirm: true` evita exigir confirmação por e-mail (consistente com a configuração atual da plataforma).
- A senha inicial pode ser omitida; usuário define via "Esqueci minha senha" — ou adicionamos campo opcional de senha temporária no diálogo (pergunto abaixo se necessário).
- O bearer já é anexado pelo `functionMiddleware` existente em `src/start.ts`.

## Resultado esperado

Novo usuário criado pelo admin aparece imediatamente na lista e persiste após refresh, com o papel global correto em `user_roles`.