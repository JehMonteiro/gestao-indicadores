## Por que `Indicadores` e `Meus indicadores` ficam em "Sem informação"

Olhando os dados atuais, identifiquei duas lacunas no cálculo — nenhuma delas foi coberta pelas correções anteriores. Elas explicam por que o % e a classificação não aparecem mesmo com lançamentos aprovados.

### Problema 1 — `indicator.default_target` é ignorado

Há indicadores com meta padrão cadastrada no próprio indicador (`default_target = 100000`, por exemplo) **sem** nenhuma linha correspondente na tabela `targets`. Hoje `findTargetForEntry` e `latestTargetForIndicator` olham só a tabela `targets`, então devolvem `undefined`, `computeAchievement` recebe `target=null` e o % vira `null` → linha classifica como "Sem informação".

**Correção:** quando nenhuma meta específica for encontrada, usar `indicator.default_target` (quando > 0) como meta base para o cálculo.

### Problema 2 — Meta anual comparada a lançamento mensal

Vários indicadores mensais têm apenas uma meta anual (período `2026-01-01 → 2026-12-31`, valor 84000). O lançamento é mensal (`2026-01-01 → 2026-01-31`, valor 15181). Hoje o código pega a meta anual inteira e faz `15181 / 84000 = 18%` — número enganoso: contra a fatia mensal (`84000/12 = 7000`) o atingimento real seria 217%.

**Correção:** quando o período da meta contém o período do lançamento (span maior) e o indicador é do tipo somativo (`maior_melhor`, `menor_melhor`, `inteiro/moeda/quantidade`), ratear a meta proporcionalmente aos dias do lançamento:
`meta_efetiva = target_value * (dias_lançamento / dias_meta)`.
Para indicadores de tipo "média/pontuação" (`meta_exata`, `faixa_ideal`, `percentual`, `nota`) não ratear — usar o valor cheio.

### Escopo

Somente `src/lib/metrics.ts` e `src/lib/format.ts`:

- Novo helper `resolveTargetForEntry(indicator, entry, targets)` em `metrics.ts` que devolve `{ value, minimum, maximum } | null` já com fallback para `default_target` e com rateio proporcional quando aplicável.
- Novo helper `resolveTargetForIndicator(indicator, targets)` para o caso de "ainda não tem lançamento" (usa a meta mais recente aplicável ou o `default_target`).
- `computeAchievement` passa a aceitar esses objetos resolvidos (mantém a assinatura antiga por compatibilidade via overload — sem quebrar `visao-geral`, `meu-painel`, `indicadores.$id`).
- Trocar as chamadas em `indicadores.index.tsx` e `meus-indicadores.tsx` para usar os helpers novos.

Sem mudança de schema, RLS, componentes, gráficos ou fluxo de realtime. Os gráficos passam a refletir os valores corretos automaticamente porque leem os mesmos helpers.

### Validação após implementação

1. Indicador com `default_target=100000` e sem linha em `targets` + lançamento aprovado → % aparece = actual / 100000.
2. Indicador mensal com meta anual (84000/ano) e lançamento de janeiro (15181) → % ≈ 217% (contra 7000), classificação "Atingido".
3. Indicador `meta_exata` (ex.: NPS) com meta anual = valor médio → não é rateado; mantém o valor cheio.
4. Indicador sem `default_target` e sem `targets` → continua "Sem informação" (comportamento esperado).
5. Cenários já validados no plano anterior (meta de outra franquia, gráfico do detalhe, resumo anual) seguem inalterados.
