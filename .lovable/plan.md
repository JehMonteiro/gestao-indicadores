## Objetivo

Remover todas as restrições de permissão do módulo **Lançamentos**, para que qualquer usuário autenticado consiga ver o menu, listar, criar, editar e aprovar/rejeitar lançamentos, sem verificação de papel (role) ou de vínculo com setor/franquia.

## Mudanças

### 1. Menu lateral — liberar item "Lançamentos" para todos
`src/mocks/store.ts` (função `canSeeRoute`)
- Adicionar `"auditor"` ao array de `/lancamentos`, deixando todos os papéis com acesso. (Os demais papéis já estão listados.)

### 2. Lista de lançamentos — mostrar todos
`src/routes/_authenticated/lancamentos.index.tsx`
- Deixar de filtrar `entries` por `useVisibleIndicators`. Passar a listar `useStore((s) => s.entries)` na íntegra.
- Ao renderizar cada linha, buscar o indicador diretamente em `useStore((s) => s.indicators)` (não mais restrito à visibilidade).
- Remover o `import { useVisibleIndicators }` deste arquivo.

### 3. Novo lançamento — permitir escolher qualquer indicador/franquia
`src/routes/_authenticated/lancamentos.novo.tsx`
- Trocar `useVisibleIndicators()` por `useStore((s) => s.indicators)` para popular o select de indicadores.
- Trocar `myFranchises` (filtrado por `userFranchises`) por a lista completa de `franchises`, permitindo selecionar qualquer franquia quando o indicador for de escopo "franquia".
- Remover o `import { useVisibleIndicators }`.

### 4. Detalhe do lançamento — liberar aprovação/rejeição
`src/routes/_authenticated/lancamentos.$id.tsx`
- Remover a variável `canApprove` (que restringia a superadmin/admin/gestor).
- Trocar a condição `entry.status === "enviado" && canApprove` por apenas `entry.status === "enviado"`, de forma que qualquer usuário autenticado possa aprovar/rejeitar.

## Fora de escopo

- Regras de visibilidade em outras telas (Visão geral, Meus indicadores, Aprovações, etc.) permanecem inalteradas.
- Nenhuma alteração no banco/RLS — o app hoje usa store mockada; regras futuras de RLS ficam para outro momento.
- Estilo/UI não muda.

## Verificação

- `bun run build` deve passar.
- Trocar de usuário (ex.: `colaborador`, `auditor`, `franqueado`) e confirmar que o item "Lançamentos" aparece no menu, a listagem exibe todos os registros, o formulário lista todos os indicadores e o botão de aprovar/rejeitar aparece em lançamentos com status "enviado".
