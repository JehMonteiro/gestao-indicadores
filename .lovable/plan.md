# Números inteiros em todo o sistema

Remover vírgula e casas decimais de todos os números, tanto ao salvar quanto ao exibir, para todos os tipos de valor (inteiro, decimal, percentual, moeda, tempo, quantidade, nota). Nenhuma regra de negócio (fórmulas, escopos, permissões, fluxos) muda.

## 1. Regra central

`src/lib/value-rules.ts` passa a considerar **todos** os tipos como inteiros:
- `requiresInteger()` sempre `true`, `numericStep()` sempre `"1"`.
- `blockDecimalKeys()` bloqueia `.` `,` `e` em qualquer campo numérico.
- Validação com mensagem clara: "… deve ser um número inteiro, sem casas decimais."

Isso já propaga para os formulários de indicadores (novo/editar), metas, lançamentos e importação, que hoje consomem esses helpers.

## 2. Exibição

`src/lib/format.ts`:
- `formatBRL` sem centavos (R$ 100.000).
- `formatNumber` sempre com 0 casas.
- `formatValue`: percentual `87%`, decimal, tempo (`120 min`) e nota sem casas decimais.
- Percentual de atingimento e índice ponderado exibidos sempre com `Math.round` (meio para cima), como já ocorre na maioria das telas.

Revisão das telas que ainda exibem decimais:
- `visao-geral.tsx`: variação percentual usa `toFixed(1)` → passa a inteiro; tooltips e eixos dos gráficos formatados como inteiros.
- `meu-painel.tsx`, `meus-indicadores.tsx`, `indicadores.index.tsx`, `indicadores.$id.tsx`, `lancamentos.*`, `metas.tsx`, `relatorios.tsx`: valores, metas, percentuais e barras de progresso arredondados na exibição.

Cálculos intermediários (`computeAchievement`, `weightedIndex`, prorrateamento em `metrics.ts`) continuam em precisão total — o arredondamento acontece só no valor final exibido/salvo.

## 3. Relatórios / exportação

Hoje existe apenas exportação CSV em `relatorios.tsx`. Ela passa a gravar valor, meta e atingimento arredondados, sem separador decimal. (Não existem exportações Excel/PDF no sistema; se quiser, posso adicioná-las depois.)

## 4. Backend e banco

- Camada de escrita (`src/lib/supabase-data.ts`): arredondar todos os campos numéricos de indicadores, metas e lançamentos antes do insert/update, com validação que rejeita valores não numéricos.
- Migration:
  - `value_type_requires_integer()` passa a retornar `true` para todos os tipos, fazendo os gatilhos existentes (`indicators`, `targets`, `indicator_entries`) barrarem decimais vindos de qualquer origem, inclusive API.
  - Arredondamento dos registros existentes com registro em `integer_rounding_log` (tabela já existente) para revisão. Verificação atual: nenhum registro decimal encontrado hoje em indicadores, metas ou lançamentos — o log deve sair vazio, mas a migration fica idempotente e segura.
  - Colunas permanecem `numeric` (menor risco); a integridade é garantida pelos gatilhos.
- `seed_demo_data()` e `src/mocks/seed.ts`: gerar apenas valores inteiros (hoje o seed JS ainda arredonda em 2 casas para alguns tipos).

## 5. Validação final

Após implementar, verifico no preview: cadastro de indicador em cada tipo de valor rejeitando decimais, cálculo de atingimento exibindo percentual inteiro, dashboards/gráficos/relatório sem vírgula, e conferência dos registros arredondados no log.

## Detalhes técnicos

Arquivos afetados: `src/lib/value-rules.ts`, `src/lib/format.ts`, `src/lib/supabase-data.ts`, `src/mocks/seed.ts`, telas em `src/routes/_authenticated/` (visão geral, meu painel, meus indicadores, indicadores, metas, lançamentos, relatórios) e uma migration atualizando `value_type_requires_integer` + backfill logado.
