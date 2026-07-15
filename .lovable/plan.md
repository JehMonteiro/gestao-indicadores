
## Objetivo

Garantir que qualquer criação/edição/exclusão de **Metas, Indicadores, Lançamentos** (e demais entidades relacionadas: Setores, Franquias, Usuários, Configurações, Aprovações) reflita imediatamente em **todas as páginas** que dependem desses dados, tanto para quem fez a alteração quanto para outros usuários logados.

## Diagnóstico

Explorando `src/mocks/store.ts`, `src/lib/supabase-data.ts`, `src/components/app/auth-sync.tsx` e as páginas de escrita (metas, lançamentos, aprovações, indicadores, setores, franquias, usuários, configurações), identifiquei 5 causas para os dados “não conversarem”:

1. **Realtime cobre só 3 tabelas.** A migração atual só publica `indicator_entries`, `targets`, `indicators`. Mudanças em `sectors`, `franchises`, `user_sectors`, `user_franchises`, `profiles`, `user_roles`, `notifications`, `app_settings` **não** disparam refresh — outra aba/usuário não vê a alteração.
2. **Escritas “fire-and-forget” sem re-sync.** No `store.ts`, `upsertIndicator`, `upsertTarget`, `deleteIndicator`, `deleteTarget`, `upsertSector`, `upsertFranchise`, `upsertUserSector/Franchise`, `updateSettings` fazem upsert **otimista** e disparam a escrita em segundo plano. Se a linha do banco tiver campos default/normalizados diferentes (ex.: `default_target`, timestamps, `status`), o objeto que ficou no store diverge do banco. Isso explica por que Indicadores/Meus Indicadores continuam com “Sem informação” mesmo após salvar.
3. **Refresh manual duplicado e incompleto.** Só `metas.tsx` e `lancamentos.novo.tsx` chamam `loadAllFromSupabase` após salvar. `indicadores.novo`, `indicadores.$id.editar`, `setores.$id`, `franquias.*`, `usuarios.tsx`, `configuracoes.tsx`, `aprovacoes.tsx`, `lancamentos.$id.tsx` **não** re-hidratam — dependem só do upsert otimista.
4. **Realtime channel sem verificação de `SUBSCRIBED`.** Em falha de conexão silenciosa o refresh nunca dispara e não há reconexão automática ao voltar de background.
5. **`queryClient.invalidateQueries()` só em `SIGNED_IN`.** Páginas que usam `useQuery` (ex.: `useAuthProfile`) não são revalidadas quando o Realtime dispara.

## O que vai mudar (frontend + 1 migração pequena)

### 1. Migração — expandir Realtime

Nova migração adicionando ao `supabase_realtime`:
`sectors`, `franchises`, `user_sectors`, `user_franchises`, `profiles`, `user_roles`, `notifications`, `app_settings`.
Cada uma com `REPLICA IDENTITY FULL`.

### 2. `src/components/app/auth-sync.tsx`

- Assinar todas as tabelas acima (uma única `channel`, um `on(...)` por tabela).
- Verificar status `SUBSCRIBED`/`CLOSED`/`CHANNEL_ERROR` e re-inscrever com backoff em erro.
- Re-inscrever também no evento `visibilitychange` (voltar para a aba).
- Após cada refresh do store, chamar `queryClient.invalidateQueries()` para acordar telas com React Query.

### 3. `src/mocks/store.ts` — refresh centralizado + writes confiáveis

- Novo helper `useStore.getState().refreshFromCloud()` (memoizado com debounce curto) que chama `loadAllFromSupabase(currentUserId)` e faz `hydrate`.
- Transformar os writes em **write-then-hydrate**:
  `upsertIndicator`, `deleteIndicator`, `upsertTarget`, `deleteTarget`, `upsertSector`, `deleteSector`, `upsertFranchise`, `deleteFranchise`, `upsertUserSector`, `removeUserSector`, `upsertUserFranchise`, `removeUserFranchise`, `updateSettings`, `markNotificationRead` passam a `await` a resposta do Supabase e, em caso de sucesso, disparar `refreshFromCloud()` (o Realtime dos outros clientes cuida do resto).
- Em erro, reverter o upsert otimista e emitir toast (a lógica de toast já existe em `reportError`).

### 4. Páginas — remover código de refresh ad-hoc

Como o store agora re-hidrata sozinho, as páginas ficam mais simples:

- `metas.tsx` e `lancamentos.novo.tsx`: remover as chamadas manuais a `loadAllFromSupabase` — o `upsertTarget`/`upsertEntry` do store já cuida.
- `aprovacoes.tsx`, `lancamentos.$id.tsx`: garantir que a mudança de status use `setEntryStatus` do store (que já faz await + upsert), sem manter cópias locais.
- Confirmar (sem alterar UI) que as demais páginas de leitura (`visao-geral`, `meu-painel`, `indicadores.index`, `meus-indicadores`, `indicadores.$id`, `franquias.$id`, `setores.$id`, `relatorios`, `auditoria`, `usuarios`) leem via `useStore(...)` — já leem, então re-renderizam quando o store muda.

### 5. Cálculos derivados

Nenhuma mudança na lógica de KPI/atingimento — as correções recentes em `metrics.ts` (default_target, rateio de meta anual, escopo por franquia) permanecem. O plano só corrige a **propagação** dos dados.

## Fora de escopo

- Nenhuma mudança em RLS, tipos, schema de tabelas, ou UI (cores, layout, cópias).
- Sem trocar Zustand por React Query; apenas coordena as duas.
- Sem mexer em `src/integrations/supabase/*` (arquivos auto-gerados).

## Cenários de validação

1. **Meta criada** em Metas → aparece imediatamente em Indicadores, Meus indicadores, Visão geral, Meu painel, Detalhe do indicador (aba Metas e Evolução), Relatórios.
2. **Lançamento enviado** em `/lancamentos/novo` (aprovação automática ou não) → aparece em Lançamentos, Aprovações (se pendente), Visão geral, Meu painel, Indicadores, Meus indicadores, Detalhe do indicador (Histórico + Evolução).
3. **Aprovação/rejeição** em Aprovações → status atualiza em Lançamentos e nos KPIs de todas as páginas de leitura.
4. **Indicador criado/editado/inativado** → aparece/some em todas as listagens e nos selects (Metas, Novo lançamento).
5. **Setor/Franquia criado/editado** → aparece nas listagens, nos filtros, nas colunas “Setor/Empresa” de metas, indicadores, lançamentos.
6. **Usuário atribuído a setor/franquia** → passa a ver os indicadores permitidos sem precisar recarregar.
7. **Configurações (thresholds)** alteradas → classificação (“Atingido/Atenção/Crítico/Sem info”) recalculada em tempo real em todas as páginas.
8. **Segunda aba/usuário** logado: qualquer uma das ações acima refletida em ≤ 1s via Realtime.
9. **Erro de RLS** em um write: toast de erro + estado local revertido (não fica “fantasma” na UI).
