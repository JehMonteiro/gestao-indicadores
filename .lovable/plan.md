## Validação do cálculo automático dos KPIs

Revisei `src/lib/metrics.ts`, `src/lib/format.ts` e todas as telas que consomem esses helpers (`visao-geral`, `meu-painel`, `meus-indicadores`, `indicadores/index`, `indicadores/$id`). O caminho feliz está correto — meta e período casam via `findTargetForEntry` (target_id → período+empresa → período → empresa → indicador) e o realtime já reidrata. Mas encontrei quatro pontos que produzem KPI errado em cenários específicos:

### Problemas encontrados

1. **`findTargetForEntry` cai numa meta de outra empresa quando não há meta para a empresa do lançamento.**
   Um lançamento da franquia A sem meta cadastrada acaba usando a meta da franquia B pelo fallback final `latestTarget(sameIndicator)`. O % exibido fica errado sem sinalizar o problema.
   **Correção:** para lançamentos com `franchise_id`, nunca cair em metas de outra franquia — retornar `undefined` (KPI mostra "Sem meta") em vez de uma meta alheia.

2. **`latestTargetForIndicator` (usado quando ainda não há lançamento) pode retornar meta de outra empresa.**
   Para indicador com `scope="franquia"` sem `indicator.franchise_id` fixo, o filtro `!t.franchise_id` esvazia e o fallback pega qualquer meta.
   **Correção:** só cair no fallback global quando o escopo do indicador for corporativo. Em escopo por franquia sem `franchise_id` do indicador, retornar `undefined`.

3. **Detalhe do indicador (`indicadores.$id.tsx`) casa meta apenas por `target_id`.**
   ```ts
   const t = indTargets.find((t) => t.id === e.target_id);
   ```
   Lançamentos antigos sem `target_id` mostram meta `0` no gráfico — inconsistente com o resto do app.
   **Correção:** trocar por `findTargetForEntry(e, indTargets)`.

4. **Resumo anual em `visao-geral` usa `default_target * 12` como meta anual.**
   Fórmula assume periodicidade mensal; para indicadores trimestrais/semestrais/anuais o % realizada fica distorcido.
   **Correção:** derivar o multiplicador da `frequency` do indicador (`mensal:12, trimestral:4, semestral:2, anual:1, quinzenal:24, semanal:52, diaria:365`).

### Escopo da mudança

Alterações apenas em `src/lib/metrics.ts` (itens 1–2) e `src/routes/_authenticated/indicadores.$id.tsx` + `src/routes/_authenticated/visao-geral.tsx` (itens 3–4). Sem mudança de schema, RLS, tipos ou fluxo de dados; comportamento do realtime e do store fica inalterado.

### Validação após implementação

Percorrer os quatro cenários no preview autenticado:
- Indicador de franquia com meta cadastrada só para franquia B, lançamento aprovado em franquia A → KPI deve mostrar "Sem meta".
- Indicador ativo sem nenhum lançamento aprovado → KPI "Sem informação", sem herdar meta de outra franquia.
- Detalhe do indicador com lançamentos sem `target_id` → linha "meta" do gráfico usa a meta do mesmo período.
- Indicador trimestral com meta anual única → % realizada bate com `acumulado / meta anual`, sem multiplicar por 12.
