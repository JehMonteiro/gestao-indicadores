# Restaurar "Indicadores Franquia" na sidebar

## Contexto

A refatoração anterior separou os fluxos de indicadores internos e de franquia e removeu a entrada global "Indicadores Franquia" da sidebar. O usuário pediu para restaurá-la no grupo "Estrutura", abaixo de "Indicadores", espelhando o padrão existente "Metas" / "Metas Franquia".

## Verificação atual

- `src/components/app/app-shell.tsx`: o grupo "Estrutura" contém Indicadores, Metas, Metas Franquia, Setores, Empresas / Franquias, Classificação de escopo e Usuários — sem "Indicadores Franquia".
- `src/routeTree.gen.ts`: não existe rota `/indicadores-franquia` (a rota foi removida na refatoração). Existem apenas `/indicadores` (internos) e as rotas aninhadas `/franquias/$id/indicadores/...`.
- `src/components/app/indicadores-page.tsx`: já aceita a prop `escopo` (`empresa` | `franquia`) e filtra os indicadores, mas os links de detalhe/edição e o botão "Novo indicador" estão hardcoded para as rotas internas (`/indicadores/$id`, `/indicadores/$id/editar`, `/indicadores/novo`).
- `src/routes/_authenticated/metas-franquia.tsx` e `src/routes/_authenticated/metas.tsx`: usam o mesmo componente `MetasPage` com prop `escopo`, servindo de modelo para a solução.

## Alterações propostas

### 1. Criar rota de listagem de indicadores de franquia

Criar `src/routes/_authenticated/indicadores-franquia.tsx` seguindo o padrão de `metas-franquia.tsx`:

- `createFileRoute("/_authenticated/indicadores-franquia")`.
- `head()` com título, description, og:title e og:description próprios.
- Componente: `<IndicadoresPage escopo="franquia" />`.

O route tree será regenerado automaticamente pelo plugin TanStack Router.

### 2. Adaptar `IndicadoresPage` para modo franquia

Em `src/components/app/indicadores-page.tsx`, quando `escopo === "franquia"`:

- Título do `PageHeader`: "Indicadores Franquia".
- Ocultar o filtro e a coluna "Setor" (não se aplica a indicadores de franquia).
- Cada linha deve linkar para a rota de detalhe da franquia: `/franquias/$id/indicadores/$indId` com `params={{ id: i.franchise_id ?? i.entity_id, indId: i.id }}`.
- O botão de editar (admin) deve linkar para `/franquias/$id/indicadores/$indId/editar` com os mesmos params.
- Botão "Novo indicador" no header: quando em modo franquia, navegar para `/franquias` para que o usuário escolha a unidade (criação de indicador de franquia exige contexto de franquia). No modo interno, permanece `/indicadores/novo`.

### 3. Restaurar entrada na sidebar

Em `src/components/app/app-shell.tsx`, no grupo "Estrutura", adicionar imediatamente abaixo de "Indicadores":

```ts
{ to: "/indicadores-franquia", label: "Indicadores Franquia", icon: Target },
```

Mantendo o mesmo padrão de ícone e posição de "Metas" / "Metas Franquia".

## Critérios de aceitação

- "Indicadores Franquia" aparece na sidebar no grupo "Estrutura", logo abaixo de "Indicadores".
- Clicar em "Indicadores Franquia" navega para `/indicadores-franquia` e exibe apenas indicadores com `entity_scope = "franquia"`.
- Clicar em um indicador na listagem de franquia abre a rota de detalhe aninhada `/franquias/$id/indicadores/$indId`.
- A listagem de indicadores internos (`/indicadores`) continua exibindo apenas `entity_scope = "empresa"` ou nulo, e seus links permanecem `/indicadores/$id`.
- Nenhum outro item da sidebar é alterado ou removido.
- O `routeTree.gen.ts` é regenerado automaticamente com a nova rota `/indicadores-franquia`.

## Verificação

Após a implementação, recarregar a preview e confirmar visualmente que:

1. O item aparece na sidebar.
2. A navegação carrega a listagem correta.
3. Os links de detalhe/editar da franquia apontam para as rotas aninhadas.
4. A listagem interna não exibe indicadores de franquia.
