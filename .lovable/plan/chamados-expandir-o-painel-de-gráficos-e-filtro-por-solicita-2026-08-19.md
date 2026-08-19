# Chamados — expandir o painel de gráficos e filtro por solicitante

O módulo de Chamados já existe (importação `.xlsx`, filtros, KPIs, histórico de lotes, tabela detalhada e 8 gráficos). Esta nova versão da especificação muda apenas duas coisas: acrescenta o filtro por **Solicitante** e reorganiza/expande os gráficos para **12 visualizações agrupadas em 5 blocos**.

## 1. Filtro por Solicitante

- Novo campo "Solicitante" na barra de filtros, com busca (combobox com digitação, já que a lista costuma ser longa), alimentado pelos valores únicos existentes nos chamados, em ordem alfabética.
- Entra no mesmo conjunto de filtros combináveis, no "Limpar filtros" e no contador de registros; afeta KPIs, gráficos e tabela.

## 2. Painel de gráficos reorganizado

Padrão único de card: título à esquerda, badge de contexto à direita (total, nº de responsáveis, média etc.), grid de 2 colunas no desktop e 1 no mobile; gráficos com rótulos longos ocupam a largura inteira.

**Bloco A — Visão temporal e status**
1. Evolução mensal (barras empilhadas: Finalizados, Em Andamento, Aguardando) — largura total.
2. Chamados por situação (rosca com total no centro, legenda com percentuais).
3. Chamados por etiqueta (Urgente/Importante/Comercial/Sem etiqueta; um chamado conta em cada etiqueta que possui).

**Bloco B — Performance por pessoa** (largura total)
4. Top 10 responsáveis: Total x No Prazo, linha de média e tooltip com % no prazo.
5. Top 10 solicitantes: Total x Concluídos, linha de média e tooltip com % concluído.

**Bloco C — Departamento e unidade** (largura total)
6. Top 10 departamentos de recebimento: Total, No Prazo e Em Aberto, com **normalização de nome** (maiúsculas/espaços) para não duplicar o mesmo departamento.
7. Top 10 unidades: Total x Concluídos, ignorando registros sem unidade.

**Bloco D — Interações** (largura total)
8. Média de interações com **alternador de dimensão** (Por Responsável / Por Departamento / Por Categoria), linha de média geral e badge com a média geral. A troca recalcula em memória, sem nova consulta.

**Bloco E — Categorias, satisfação e tempo** (2 colunas)
9. Chamados por categoria de assunto, com percentual do total.
10. Distribuição de satisfação (notas 1–5 com cores de vermelho a verde), média destacada e nº de avaliados.
11. TMA por responsável, eixo formatado em horas/dias, linha de média geral.
12. Histograma de volume de interações por faixas (1–3, 4–6, 7–10, 11–15, 16–20, 21–30, 31+), com mediana e máximo no badge.

## Detalhes técnicos

- `src/types/chamados.ts`: incluir `solicitante` em `FiltrosChamados`.
- `src/hooks/use-chamados.ts`: aplicar o filtro de solicitante em `aplicarFiltros`.
- `src/components/chamados/chamados-filtros.tsx`: adicionar o combobox de solicitante (Popover + Command do shadcn).
- `src/components/chamados/chamados-graficos.tsx`: reescrever com os 12 gráficos; extrair as agregações para `src/lib/chamados-agregacoes.ts` (funções puras memoizadas) para manter o componente legível, e criar um `ChartCard` com suporte a badge, altura e `col-span`.
- Cores continuam vindas dos tokens do tema (`--chart-1..5`, `--destructive`, `--muted-foreground`), com exceção das cores fixas já definidas por situação e por nota de satisfação.
- Nenhuma alteração de banco de dados, importação, KPIs, tabela ou permissões.
