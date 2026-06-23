## Fase 2 — Backend real (Lovable Cloud)

Cloud ativado. Vou migrar o app dos dados mockados para o backend real, em 4 etapas.

### Etapa 1 — Schema do banco (migração SQL)

Tabelas (todas com RLS + GRANTs):

- `profiles` — espelho de `auth.users` (id, full_name, avatar_url, status)
- `app_role` (enum): `superadmin`, `admin_corporativo`, `gestor_setor`, `gestor_franquia`, `analista`, `colaborador`, `franqueado`, `auditor`
- `user_roles` — papel global por usuário (separado do profile, padrão de segurança)
- `sectors` — setores corporativos (nome, código, cor, status)
- `franchises` — unidades franqueadas (nome, código, cidade/UF, status)
- `user_sectors` — vínculo usuário↔setor + função no setor
- `user_franchises` — vínculo usuário↔franquia + função
- `indicators` — catálogo (código, nome, fórmula, unidade, tipo de valor, direção, escopo, periodicidade, setor dono, requer aprovação, permite anexo, status)
- `targets` — metas por indicador + período + franquia (opcional)
- `indicator_entries` — lançamentos (período, valor, status do workflow, revisão, aprovador, motivo de rejeição)
- `audit_logs` — auditoria (usuário, ação, entidade, payload)
- `notifications` — notificações in-app
- `app_settings` — limiares de classificação (single row)

Função `SECURITY DEFINER` `public.has_role(uuid, app_role)` para uso em policies sem recursão. Funções auxiliares `is_member_of_sector(uuid)` e `is_member_of_franchise(uuid)`.

### Etapa 2 — Autenticação

- Página `/auth` real (email+senha, signup + login, redirect pós-login para `/meu-painel`)
- Trigger `on_auth_user_created` cria `profiles` automaticamente
- `_authenticated/route.tsx` continua gateando o subtree (já é o padrão do template)
- Wire de `onAuthStateChange` em `__root.tsx`
- Botão "Sair" no shell já existe — apontar para `supabase.auth.signOut()`

### Etapa 3 — Camada de dados (server functions + React Query)

Substituir o `useStore` Zustand por server functions tipadas em `src/lib/*.functions.ts`:

- `sectors.functions.ts`, `franchises.functions.ts`, `indicators.functions.ts`, `targets.functions.ts`, `entries.functions.ts`, `users.functions.ts`, `audit.functions.ts`, `notifications.functions.ts`, `settings.functions.ts`
- Todas com `requireSupabaseAuth` (RLS aplica como o usuário logado)
- Validação Zod em `.inputValidator()`
- React Query (`useSuspenseQuery` + `ensureQueryData` nos loaders) substitui leitura direta do store
- Mutations via `useMutation` + `queryClient.invalidateQueries`

### Etapa 4 — Seed de demonstração + reset

- Botão "Carregar dados demo" em `/configuracoes` chama uma server function `seedDemoData` (restrita a `superadmin`) que insere setores, franquias, indicadores, metas e alguns lançamentos de exemplo
- Botão "Limpar dados demo" chama `clearDemoData` (apaga apenas registros marcados como `is_demo = true`)
- Primeiro usuário cadastrado recebe automaticamente role `superadmin` (via trigger)

### Decisões técnicas

- Edge functions: nenhuma nesta fase (tudo via `createServerFn`)
- `attachSupabaseAuth` já estará registrado em `src/start.ts` (necessário para fns autenticadas)
- Loaders em rotas `_authenticated/*` podem chamar fns protegidas com segurança
- Componentes lêem via `useSuspenseQuery`; nada de `useEffect` + `fetch`
- O store Zustand é removido ao final da etapa 3; `useCurrentUser` passa a vir de um hook `useAuth()` baseado na sessão Supabase

### Ordem de execução

1. Migração SQL (tabelas + RLS + GRANTs + trigger de profile + funções helper)
2. Auth: refatorar `/auth` + `__root.tsx` + remover login mockado
3. Server functions + React Query (substituir mocks rota a rota: setores → franquias → indicadores → metas → lançamentos → aprovações → usuários → auditoria → notificações)
4. Seed/reset demo + ajustes finais (permissões visíveis, estados de loading/erro, responsividade)

Ao final desta fase o app está rodando 100% no Lovable Cloud, sem dados mockados.

Posso seguir?
