# Remover o limite silencioso de 1000 linhas em todas as leituras

A API do banco trunca qualquer leitura sem paginação explícita em 1000 linhas, sem erro. Hoje só o módulo de Chamados foi corrigido (com laço próprio). Todas as demais telas — indicadores, lançamentos, metas, setores, empresas/franquias, usuários, notificações e auditoria — ainda leem sem paginação e podem exibir números truncados.

## Nomes reais das tabelas

A lista do pedido usa nomes em português; no banco elas são: `indicators` (indicadores), `indicator_entries` (lançamentos), `targets` (metas), `sectors` (setores), `franchises` (empresas/franquias), `profiles` + `user_roles` (usuários), `notifications`, `audit_logs`, `chamados`. Não existe tabela `import_lots`: o histórico de lotes é derivado em memória do próprio conjunto de chamados, então ele fica correto automaticamente.

## O que muda

1. **Novo utilitário único** `src/lib/supabase-fetch-all.ts` com `fetchAll(...)`: recebe a query já montada (colunas, filtros, ordenação), aplica `.range()` em páginas de 1000 em laço até esgotar, propaga erro e loga em desenvolvimento o total carregado por tabela. Uma variante aceita um cliente alternativo, para uso no servidor (tela de auditoria, que usa cliente administrativo).

2. **Carregamento principal do app** (`src/lib/supabase-data.ts`, função que carrega todos os dados): passam a usar `fetchAll` as leituras de `sectors`, `franchises`, `indicators`, `indicator_shared_sectors`, `targets`, `indicator_entries`, `user_sectors`, `user_franchises`, `notifications`, `audit_logs`, `profiles` e `user_roles`. Este é o ponto que hoje trunca indicadores, lançamentos e metas.

3. **Meu Painel** (`src/lib/use-my-dashboard.ts`): as seis leituras (metas, indicadores próprios, lançamentos do usuário, indicadores complementares, metas por indicador, setores) passam a usar `fetchAll`. Listas `in(...)` grandes continuam divididas por página normalmente.

4. **Chamados** (`src/hooks/use-chamados.ts`): substituir o laço criado ontem pelo utilitário compartilhado, mantendo ordenação por data de abertura e desempate por id — sem duplicar lógica de paginação.

5. **Auditoria de dados** (`src/lib/audit-data.functions.ts`): as contagens brutas de `indicator_entries`, `targets`, `indicators` e `profiles` passam a usar a variante servidor do utilitário, para que os totais exibidos deixem de parar em 1000.

6. **Limites intencionais preservados**, cada um com comentário explicando o motivo: preview de importação de chamados/indicadores (10 linhas), buscas de autocomplete, e a lista "últimos 200 registros de auditoria" da tela `/auditoria-dados`.

7. Cada chamada ao utilitário recebe o comentário `// fetchAll — contorna limite 1000 do PostgREST`.

## Detalhes técnicos

- Assinatura: `fetchAll<T>(build: (sb) => query, table: string): Promise<T[]>`, com `PAGE_SIZE = 1000`; internamente chama `build(...).range(from, to)` a cada iteração e concatena.
- Log condicionado a `import.meta.env.DEV` (o utilitário roda no navegador; `process.env.NODE_ENV` não existe no bundle do cliente).
- A tipagem do parâmetro `build` usa um retorno genérico de query para não explodir o tempo de checagem de tipos; consumidores mantêm o tipo pelo genérico `T`.
- Leituras de linha única (`maybeSingle`, perfil do usuário logado, `app_settings`) continuam como estão.
- Nenhuma mudança de banco, RLS ou schema.
- Verificação: `tsgo` e conferência no navegador de que os KPIs de chamados batem com o total real e que as listagens de indicadores/lançamentos/metas trazem todos os registros.
