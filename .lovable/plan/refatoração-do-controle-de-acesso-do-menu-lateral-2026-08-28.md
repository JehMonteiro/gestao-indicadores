# Refatoração do controle de acesso do menu lateral

Somente código — nenhuma migration, nenhuma alteração de banco.

## A. Tipo GlobalRole

- `src/mocks/types.ts`: adicionar `"analista"` ao union `GlobalRole`.
- `src/hooks/use-auth.ts`: remover os casts `"analista" as GlobalRole` e `("colaborador" as GlobalRole)`.
- `src/routes/_authenticated/usuarios.tsx`: adicionar `analista: "Analista"` em `roleLabels` (Record tipado passa a exigi-lo).

## B. Expor todos os roles

Em `useAuthProfile`, manter `role` (precedência) e adicionar `roles: GlobalRole[]` com a lista completa vinda de `user_roles`. Mudança aditiva.

## C. `src/lib/menu-registry.ts` (novo)

- `MenuKey`, `MenuEntry` conforme especificado.
- `MENU_ENTRIES`: cópia exata do array `NAV` atual do app-shell (mesmos grupos Acompanhamento / Operação / Estrutura / Atendimento / Sistema, mesmos labels, ícones, ordem e `to`), agora achatada com o campo `group` por entrada.
- `matches` conforme a lista informada, incluindo `indicadores_franquia -> ["/franquias/$id/indicadores"]`.
- `resolveMenuKey(pathname)`: normaliza a barra final, compara segmento a segmento (segmento do padrão iniciado por `$` casa com qualquer coisa), exige que o padrão seja prefixo do pathname, pontua pelo número de segmentos do padrão e devolve a chave de maior pontuação; `null` se nada casar.

## D. `DEFAULT_ROLE_MENU`

`Record<GlobalRole, MenuKey[]>` (o Record tipado força cobrir os 8 roles) exatamente com as listas informadas por role, com o comentário de role legado em `franqueado`.

## E. `src/hooks/use-menu-access.ts` (novo)

`useMenuAccess()` consome `useAuthProfile()` (sem nova query), une os conjuntos de chaves de todos os `roles` do usuário e retorna `loading`, `allowedKeys`, `can`, `canPath` (true quando `resolveMenuKey` devolve `null`) e `firstAllowedPath` (primeiro `to` liberado na ordem do registry).

## F. Sidebar (`src/components/app/app-shell.tsx`)

- Remover o array `NAV` local e o import/uso de `canSeeRoute`; montar os grupos a partir de `MENU_ENTRIES`, agrupados por `group` preservando a ordem.
- Filtrar itens com `can(entry.key)`.
- Enquanto `loading`, renderizar skeletons no lugar dos itens (nem menu vazio, nem menu completo).
- Preservar destaque de item ativo e a prop `pairTop`.
- `canSeeRoute` permanece em `src/mocks/store.ts` (não removida).

## G. Gate de rota (`src/routes/_authenticated/route.tsx`)

Novo componente `MenuGuard` envolvendo o `<Outlet />` dentro do `AppShell`:
- `loading` → skeleton de página;
- `canPath(pathname)` false → `EmptyState` "Você não tem acesso a esta área" com ícone `ShieldAlert` e botão que navega para `firstAllowedPath` (ou `/perfil`);
- caso contrário → `<Outlet />`.

Sem `redirect` e sem `beforeLoad` para esse controle.

## Saída

Ao final, listagem por role (os 8) dos labels de menu efetivamente visíveis, derivada do código escrito.

## Notas técnicas

- Rotas fora do registry (`/perfil`, `/auth`, `/definir-senha`) resolvem para `null` e continuam acessíveis.
- Nenhum arquivo de banco, RLS ou migration é tocado; o controle é de UI/navegação apenas.
