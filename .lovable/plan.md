## Problema

Na lista de **Indicadores** (`/indicadores`), a coluna **Atingimento** aparece como "Sem informação" ou com valores incorretos mesmo quando existem lançamentos aprovados e metas cadastradas.

## Causa

Em `src/routes/_authenticated/indicadores.index.tsx`, o cálculo do último resultado e da meta usa lógica ingênua:

```ts
const t = targets.filter((t) => t.indicator_id === i.id).slice(-1)[0];
const e = entries.filter((e) => e.indicator_id === i.id && e.status === "aprovado").slice(-1)[0];
```

Problemas:
1. `slice(-1)` pega o último da ordem de inserção, não o mais recente por período.
2. A meta é buscada sem considerar franquia nem casar período com o lançamento (mesma causa dos outros bugs de "não atualiza" já corrigidos em Visão geral / Meu painel / Meus indicadores via `src/lib/metrics.ts`).
3. Para indicadores de escopo por franquia, não filtra `franchise_id` no lançamento.

O helper correto (`approvedEntriesForIndicator`, `findTargetForEntry`, `latestTargetForIndicator`) já existe em `src/lib/metrics.ts` e é usado em `meus-indicadores.tsx`.

## Correção

Em `src/routes/_authenticated/indicadores.index.tsx`:

- Importar `approvedEntriesForIndicator`, `findTargetForEntry`, `latestTargetForIndicator` de `@/lib/metrics`.
- Substituir o cálculo por:
  ```ts
  const e = approvedEntriesForIndicator(i, entries).slice(-1)[0];
  const t = e ? findTargetForEntry(e, targets) : latestTargetForIndicator(i, targets);
  ```
- Manter o restante da linha (badge, formatação) inalterado.

Somente presentação; sem mudanças de dados, RLS ou schema.