# Separar Empresas e Franquias na navegação

Etapa de interface e navegação apenas: nenhuma migration, nenhuma alteração de schema, RLS ou nome de tabela. A rota `/franquias` permanece onde está.

## 1. Classificador temporário

Novo arquivo `src/lib/entity-kind.ts` com `entityKind()`, `isEmpresa()` e `isFranquia()` exatamente como especificado (heurística por nome/código, com comentário indicando a substituição futura por `entity_type`). Único lugar do código com lógica de classificação.

## 2. Menu lateral

Em `src/components/app/app-shell.tsx`, reescrever o array `NAV`:

- Acompanhamento: Visão geral, Meu painel, Meus indicadores, **Franquias** (`/desempenho-franquias`, ícone Store)
- Operação: Lançamentos, **Lançamentos Franquia** (`/lancamentos-franquia`, ClipboardCheck)
- Estrutura: Indicadores, **Indicadores Franquia** (`/indicadores-franquia`, Crosshair), Metas (ícone trocado para Flag), **Metas Franquia** (`/metas-franquia`, FlagTriangleRight), Setores, **Empresas / Franquias** (rótulo novo, rota `/franquias` inalterada), Usuários
- Sistema: inalterado

Separador sutil (`border-white/10`) entre cada item e seu par "Franquia".

Em `src/mocks/store.ts`, adicionar as 4 rotas novas ao `roleMatrix` de `canSeeRoute` copiando a permissão da rota irmã:

- `/desempenho-franquias` = mesma lista de `/visao-geral`
- `/lancamentos-franquia` = mesma de `/lancamentos`
- `/indicadores-franquia` = mesma de `/indicadores`
- `/metas-franquia` = mesma de `/metas`

## 3. Página `/franquias` com abas

Manter a rota e todo o CRUD atual. Cabeçalho passa a "Empresas / Franquias" — "Entidades do Grupo Nocta e unidades franqueadas".

Duas abas com contagem no rótulo, estado persistido em search param `?aba=empresas|franquias` (padrão `empresas`), validado no `validateSearch` da rota para sobreviver ao refresh.

- **Empresas** (`isEmpresa`): Nome · Código · CNPJ · Cidade/UF · Status · Ações. Lista simples, botão "Nova empresa". Vazio: "Nenhuma empresa cadastrada."
- **Franquias** (`isFranquia`): Unidade · Código · Cidade/UF · Região · Início · Status · Ações. Busca por nome/código, filtro de região (valores distintos existentes), filtro de status, paginação de 20. Coluna Início mostra a data e, abaixo em texto menor muted, o tempo de operação ("2 anos e 3 meses"). Botão "Nova franquia". Vazio: "Nenhuma franquia cadastrada. As unidades franqueadas ficam vinculadas à Nocta Franquia."

No formulário aberto pela aba Franquias, campo somente leitura "Vinculada a: Nocta Franquia" (informativo).

## 4. Nova rota `/desempenho-franquias`

Título "Franquias" · subtítulo "Desempenho da rede franqueada". Considera apenas entidades `isFranquia()`.

- **Aba Rede**: 4 cards (unidades ativas, índice médio da rede, unidades acima da meta, unidades sem lançamento no período), `useFranchiseRanking()` + `<FranchiseRankingList />` e `<IndexEvolutionCard />` reaproveitados de `dashboard-blocks.tsx`, seletor de período 3m/6m/12m no cabeçalho.
- **Aba Por unidade**: Select de unidade, cards de resumo, `<IndexEvolutionCard />` com dados da unidade e tabela Indicador · Meta · Realizado · Atingimento (badge semáforo) · Status, com a média da rede do mesmo indicador em cada linha.

Sem franquias classificadas: estado vazio com link para `/franquias?aba=franquias`.

## 5. Rotas espelho

Extrair o corpo de `indicadores.index.tsx`, `metas.tsx` e `lancamentos.index.tsx` para componentes reutilizáveis que recebem `escopo: "empresa" | "franquia"`; as rotas atuais e as novas (`/indicadores-franquia`, `/metas-franquia`, `/lancamentos-franquia`) renderizam o mesmo componente com prop diferente — sem duplicar tela.

No escopo franquia: título ajustado ("Indicadores Franquia" etc.) e um `Alert` discreto (variant default) no topo: "A separação por escopo será aplicada quando o campo de entidade for criado. No momento esta tela exibe todos os registros." Nenhum filtro de dado é aplicado ainda.

## Detalhes técnicos

- Novos arquivos de rota: `src/routes/_authenticated/desempenho-franquias.tsx`, `indicadores-franquia.tsx`, `metas-franquia.tsx`, `lancamentos-franquia.tsx`, cada um com `head()` próprio (título e descrição específicos).
- Componentes compartilhados extraídos para `src/components/app/` (ex.: `indicadores-page.tsx`, `metas-page.tsx`, `lancamentos-page.tsx`); as rotas passam a ser wrappers finos.
- Tabs via `@/components/ui/tabs`, busca/filtros com estado local, paginação simples de 20 itens.
- Cálculo de atingimento, semáforo e ranking permanecem inalterados; apenas reaproveitados.
- Layout responsivo: filtros empilham no mobile, tabelas com scroll horizontal.
