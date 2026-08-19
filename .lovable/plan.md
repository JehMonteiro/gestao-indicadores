# Módulo de Chamados (Help Desk) com importação XLSX e painel de performance

Novo módulo independente em `/chamados`: importar planilhas `.xlsx` do sistema externo de help desk, guardar os chamados no banco e analisar performance (KPIs, gráficos, filtros, tabela detalhada).

## Ajustes de realidade do projeto (verificados)

- `xlsx`, `recharts` e `date-fns` já estão instalados — nada novo a instalar.
- A tabela `profiles` **não tem** coluna `global_role`; os papéis ficam em `user_roles`. A política de exclusão de lotes usará a checagem de papel existente (`user_roles` / `has_role`) em vez de `profiles.global_role`.
- Não existe pasta `src/pages` neste projeto (rotas em `src/routes`, componentes em `src/components/app`). A página raiz ficará em `src/components/chamados/chamados-page.tsx` e a rota em `src/routes/_authenticated/chamados.tsx` — o `AppShell` já é aplicado pelo layout `_authenticated`, então a rota não o renderiza de novo.
- Permissões por rota ficam no `roleMatrix` de `src/mocks/store.ts` (usado por `canSeeRoute`).

## Banco de dados

Migration criando `public.chamados` conforme a especificação: colunas do XLSX (situação, datas, satisfação, unidade, solicitante, responsável, departamentos, assunto, qtd. interação, etiquetas), colunas geradas (`categoria`, `subcategoria`, `tma_horas`, `tmr_horas`, `no_prazo`) e controle de importação (`importado_em`, `importado_por`, `lote_id`).

Índices em situação, `aberto_em`, responsável, departamento de recebimento, unidade e `lote_id`.

GRANTs + RLS:
- leitura para usuários autenticados;
- inserção por usuário autenticado (`importado_por = auth.uid()`);
- exclusão de lotes apenas para `superadmin` e `admin_corporativo`, via checagem em `user_roles`.

## Telas

**Cabeçalho** com título "Chamados", contador de registros e botão "Importar Excel".

**Dialog de importação**: arrastar-e-soltar ou selecionar `.xlsx`; parse das colunas mapeadas (ignorando ID, TITULO, SATISFAÇÃO OBS, UNIDADE CNPJ); datas `dd/mm/yyyy HH:MM:SS` interpretadas no fuso de Brasília; etiquetas separadas por vírgula; pré-visualização das 10 primeiras linhas com marcação de erros; confirmação grava em blocos de 100 registros com barra de progresso; resumo final com importados/ignorados.

**Filtros** (combináveis, com "Limpar filtros" e contador): período por `aberto_em`, situação (multi), responsável, departamento, unidade, etiqueta e categoria.

**KPIs**: total, em aberto, concluídos, TMA, TMR, satisfação média, % no prazo, % fora do prazo e média de interações — com cores por faixa (verde/âmbar/vermelho) e formatação de tempo amigável ("2d 5h", "3h 20min").

**Gráficos (Recharts)**: evolução mensal empilhada por grupo de situação; rosca por situação; top 10 responsáveis (total x no prazo); volume por departamento; categorias de assunto; distribuição de notas de satisfação; TMA por responsável com linha de média; volume por etiqueta.

**Histórico de importações**: accordion listando cada lote (data, quem importou, nº de registros, período dos dados) com exclusão de lote protegida por confirmação, visível apenas a superadmin/admin corporativo.

**Tabela detalhada**: colunas de data de abertura, situação (badge colorido), solicitante, responsável, departamento, assunto, prazo, TMA, satisfação e etiquetas; ordenação por coluna, paginação 20/50/100, exportação dos filtrados em `.xlsx` e painel lateral com todos os detalhes do chamado.

**Estado vazio** quando nenhum chamado foi importado, com botão para a primeira importação.

## Navegação e permissões

- Novo grupo "Atendimento" no menu lateral, entre "Estrutura" e "Sistema", com o item "Chamados" (ícone de headset).
- Rota `/chamados` liberada para `superadmin`, `admin_corporativo` e `gestor_setor`.

## Detalhes técnicos

- Arquivos: `src/routes/_authenticated/chamados.tsx`, `src/components/chamados/*` (página, dialog de importação, filtros, dashboard, KPIs, gráficos, tabela, sheet de detalhes, histórico de lotes), `src/hooks/use-chamados.ts`, `src/types/chamados.ts`, `src/lib/chamados-utils.ts`.
- Dados via cliente Supabase do navegador + React Query (`useQuery`), sem mocks; skeletons no carregamento e toasts (`sonner`) em erros.
- Cálculo de KPIs e agregações memoizado com `useMemo` sobre o conjunto filtrado.
- Datas e números no padrão brasileiro; a página terá `head()` próprio (título/descrição/OG).
