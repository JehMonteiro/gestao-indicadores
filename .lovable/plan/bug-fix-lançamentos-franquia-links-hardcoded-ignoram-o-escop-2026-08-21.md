# Bug fix: Lançamentos Franquia — links hardcoded ignoram o escopo

## Problema

O componente compartilhado `src/components/app/lancamentos-page.tsx` renderiza tanto `/lancamentos` (escopo empresa) quanto `/lancamentos-franquia` (escopo franquia), mas seus links para "Novo lançamento" e "Ver" estão hardcoded para as rotas de lançamento interno (`/lancamentos/novo` e `/lancamentos/$id`). Isso faz com que ações dentro da tela de franquia naveguem para o fluxo errado.

Além disso, o banco atualmente só tem indicadores com `entity_scope = 'empresa'`, então a listagem de franquia aparece sempre vazia sem explicar o motivo ao usuário.

## Solução

### Parte 1 — Criar rotas dedicadas de lançamento de franquia

- Renomear/converter `src/routes/_authenticated/lancamentos-franquia.tsx` para `src/routes/_authenticated/lancamentos-franquia.index.tsx` (listagem, mantendo o conteúdo atual).
- Criar `src/routes/_authenticated/lancamentos-franquia.novo.tsx` para formulário de novo lançamento de franquia.
- Criar `src/routes/_authenticated/lancamentos-franquia.$id.tsx` para detalhe de lançamento de franquia.

Cada rota renderiza o componente de lançamento correspondente com `escopo="franquia"`, seguindo o mesmo padrão da rota de listagem.

### Parte 2 — Tornar os links do componente sensíveis ao escopo

Em `src/components/app/lancamentos-page.tsx`:

- No topo do componente, derivar as rotas a partir da prop `escopo`:

```tsx
const isFranquia = escopo === "franquia";
const rotaNovo    = isFranquia ? "/lancamentos-franquia/novo" : "/lancamentos/novo";
const rotaDetalhe = isFranquia ? "/lancamentos-franquia/$id"  : "/lancamentos/$id";
```

- Substituir os três links hardcoded:
  1. Botão "Novo lançamento" no `PageHeader` → `to={rotaNovo}`
  2. Botão "Novo lançamento" no estado vazio → `to={rotaNovo}`
  3. Link "Ver" na tabela → `to={rotaDetalhe} params={{ id: e.id }}`

### Parte 3 — Corrigir o estado vazio enganoso

Quando `escopo === "franquia"` e `scopedIndicatorIds.size === 0`, exibir um estado vazio explicativo em vez do genérico, com título/descrição indicando que não há indicadores de franquia cadastrados e um atalho para `/indicadores-franquia`.

Quando há indicadores de franquia mas nenhum lançamento, manter o estado vazio normal com botão "Novo lançamento".

## Validação

- Clicar em "Novo lançamento" dentro de `/lancamentos-franquia` navega para `/lancamentos-franquia/novo`.
- Clicar em "Ver" numa linha de Lançamentos Franquia navega para `/lancamentos-franquia/$id`.
- `/lancamentos` e seus filhos continuam inalterados.
- Estado vazio de franquia explica o motivo e oferece atalho quando não há indicadores de franquia.
- Nenhum `to="/lancamentos/novo"` ou `to="/lancamentos/$id"` hardcoded permanece em `lancamentos-page.tsx`.
