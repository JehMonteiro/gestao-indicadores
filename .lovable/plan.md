# Meu painel — dashboard pessoal do usuário

Reescrever `/meu-painel` para mostrar somente dados do usuário autenticado, com as 6 seções pedidas.

## Ajustes necessários ao que existe hoje

Alguns nomes citados no pedido não existem no sistema; mantenho a intenção e uso o equivalente real:

- Não há tabela `indicator_assignments`. "Meus indicadores" = indicadores em que o usuário é responsável direto (`responsible_ids` / responsável do indicador) ou responsável/criador de alguma meta ligada a ele — a mesma regra já usada em `useOwnedIndicators`. Superadmin também vê apenas os seus nesta página (a página é pessoal).
- Status de lançamento existentes: **rascunho**, **registrado**, **atrasado**. Não existem "aprovado"/"rejeitado" (o fluxo de aprovação foi removido antes), então a timeline usará esses três.
- "Meta" vem da tabela de metas (`targets`), resolvida por período pela lógica já existente em `src/lib/metrics.ts`.
- O campo "unidade" foi removido dos indicadores; os valores serão formatados por tipo (moeda, percentual, inteiro), sempre inteiros, como no resto do sistema.
- Indicador ativo = `status = 'ativo'`.

## Seções

1. **Cards de resumo** (4, responsivos 4/2/1): Meus indicadores ativos (BarChart2); Lançamentos no mês — "X / Y esperados" pela frequência dos meus indicadores (ClipboardList); Meu índice de desempenho — média ponderada pelos pesos, com badge verde ≥100%, amarelo 80–99%, vermelho <80% (TrendingUp); Pendências — rascunhos + indicadores sem lançamento no período atual, ícone amarelo/vermelho conforme criticidade (AlertCircle).
2. **Evolução do meu desempenho**: LineChart com seletor 3/6/12 meses, meses em português, linha tracejada de referência em 100%, tooltip com mês e percentual.
3. **Meus indicadores por status**: gráfico de rosca (Atingido/Em atenção/Crítico/Sem lançamento), total ao centro, legenda lateral com contagem e percentual.
4. **Tabela detalhada**: Indicador (nome + código em mono), Setor, Período atual, Realizado, Meta, Atingimento (badge), Status (badge) e Ação ("Lançar" → `/lancamentos/novo?indicadorId=X`, ou "Ver" → detalhe do lançamento). Paginação de 10 itens. Vazio: "Nenhum indicador atribuído a você no momento" com ícone e botão de contato com o gestor.
5. **Próximos prazos**: até 5 indicadores ordenados por urgência, com frequência, data limite estimada (frequência + último `period_end`) e dias restantes; badge vermelho ≤3 dias, amarelo ≤7, cinza acima.
6. **Histórico recente**: timeline dos últimos 10 lançamentos do usuário (indicador, valor, data, badge de status) com ícone por status e link "Ver todos os lançamentos".

Cabeçalho: "Olá, [nome] 👋" e subtítulo com a data de hoje em português.

## Detalhes técnicos

- Nova rota reescrita em `src/routes/_authenticated/meu-painel.tsx`, com blocos em componentes menores sob `src/components/app/meu-painel/` (cards, evolução, status, tabela, prazos, histórico).
- Fonte de dados: leitura direta no Supabase via `useQuery` (React Query) por bloco, com `staleTime: 60_000` e chave incluindo o `user.id` da sessão (`supabase.auth.getUser()` / `useSession`), filtrando `user_id`/responsabilidade no próprio filtro da query. Nenhuma consulta sem filtro do usuário.
- Cálculo de atingimento, resolução de meta por período e classificação reutilizam `src/lib/metrics.ts` e `src/lib/format.ts` (nada de nova regra de negócio).
- Skeletons (`@/components/ui/skeleton`) em todos os cards, gráficos e tabela; estados vazios com orientação em cada bloco.
- Gráficos com recharts, cores por token do design system, responsivo com `ResponsiveContainer`.
- Sem alterações de banco de dados nem de RLS.
