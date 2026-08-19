# Classificação de indicadores em grupos estratégicos (Movimento / Resultado / Qualidade)

Nova dimensão obrigatória `kpi_group`, independente de `strategic_pillar` e `category_id` (ambos permanecem intactos).

## 1. Banco de dados

Migration única:
- Enum `kpi_group` com `movimento`, `resultado`, `qualidade`.
- Coluna `indicators.kpi_group` NOT NULL DEFAULT 'resultado', backfill por heurística de nome/código (listas de termos informadas), depois `DROP DEFAULT`.
- Índices: `indicators(kpi_group)` e `indicators(kpi_group, status)`.
- Nenhuma alteração de RLS ou GRANT.

## 2. Tipos, tokens e helpers

- `src/mocks/types.ts`: `export type KpiGroup` e campo `kpi_group: KpiGroup` em `Indicator`.
- `src/lib/supabase-data.ts`: mapear `kpi_group` na leitura e incluir nos upserts de indicador; mesmo ajuste no seed/store mock.
- `src/lib/format.ts`: `KPI_GROUPS` (value/label/icon/description) e `kpiGroupStyles(group)` devolvendo classes no mesmo padrão de `classificationStyles()` (fundo 10%, texto e borda sólidos).
- Cores: tokens novos `--kpi-movimento` (ciano), `--kpi-resultado` (violeta), `--kpi-qualidade` (índigo) em `src/styles.css` (light + dark) e expostos no bloco `@theme inline` como `--color-kpi-*`. Sem verde/amarelo/vermelho, para não colidir com o semáforo.
- `src/lib/kpi-group.ts`: função pura `inferKpiGroup(name, code)` com a mesma heurística do backfill, reutilizada na importação.

## 3. Cadastro e edição

Em `/indicadores/novo` e `/indicadores/$id/editar`:
- Campo "Grupo estratégico" obrigatório, logo abaixo de "Nome" e acima de "Setor responsável".
- `ToggleGroup` com 3 opções (ícone + label + descrição menor), não Select.
- Zod: obrigatório, mensagem "Selecione o grupo estratégico do indicador".
- Tooltip de ajuda ao lado do rótulo com o texto explicativo dos três grupos.

## 4. Listagem `/indicadores`

- Coluna "Grupo" com badge colorido + ícone, logo após o nome.
- `ToggleGroup` de filtro acima da tabela: Todos | Movimento | Resultado | Qualidade, cada um com contagem entre parênteses; combina com busca/setor/status.
- Estado persistido no search param `?grupo=` via `validateSearch` (Zod) da rota.

## 5. Detalhe `/indicadores/$id`

Badge do grupo no cabeçalho, ao lado do código e do badge de status.

## 6. `KpiGroupBalanceCard`

Novo `src/components/dashboard/kpi-group-balance-card.tsx`, props `{ metrics: IndicatorMetric[]; settings: SystemSettings }`:
- Três blocos (grid responsivo: empilhados no mobile, 3 colunas em telas maiores) com ícone, nome, índice ponderado via `weightedIndex()`, barra de progresso na cor do grupo e "X de Y indicadores atingidos".
- Grupo sem lançamentos no período exibe "Sem lançamentos no período" em vez de 0%.
- Abaixo, leitura automática em bloco muted com ícone de lâmpada, gerada por `readGroupBalance(movimento, resultado, qualidade)` exatamente com as seis regras/mensagens especificadas.

## 7. Integração

- `/meu-painel`: card abaixo dos cards de resumo e acima da evolução, só com indicadores do usuário.
- `/visao-geral`: mesmo card no escopo/contexto e permissões atuais.
- `/setores/$id` e `/franquias/$id`: card no escopo da entidade.
- `/relatorios`: filtro por grupo e coluna "Grupo" na exportação.

## 8. Importação em massa

Em `import-indicators-dialog.tsx`:
- Coluna `kpi_group` no template e no parser; valores aceitos case-insensitive e sem acentuação.
- Ausente/inválido → aplicar `inferKpiGroup` e marcar a linha na pré-visualização com badge "inferido", editável antes de confirmar.
- Bloqueia apenas quando inválido e sem correspondência heurística — nesse caso exige escolha manual na pré-visualização.

## Observações técnicas

- O projeto usa Tailwind v4: não existem `tailwind.config.ts` nem `index.css`. Os tokens de cor entram em `src/styles.css` (`@theme inline` + `:root`/`.dark`), gerando as utilities `bg-kpi-movimento` etc.
- `/relatorios` hoje exporta apenas CSV (o botão PDF está desabilitado como "em breve") e não há exportação Excel. Vou incluir a coluna "Grupo" no CSV existente; criar exportadores Excel/PDF novos está fora deste escopo salvo indicação contrária.
- `IndicatorMetric` e `buildIndicatorMetrics` já existem em `src/components/app/dashboard-blocks.tsx` e serão reutilizados pelo novo card.
- Após a migration, os tipos gerados do backend são atualizados automaticamente; nenhum arquivo auto-gerado será editado à mão.
