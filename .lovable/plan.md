# Corrigir limite de 1000 registros na leitura de chamados

Hoje o módulo lê os chamados numa única consulta (`src/hooks/use-chamados.ts`, `useChamadosTodos`) com `.limit(20000)`. O backend ignora esse número e devolve no máximo 1000 linhas, então KPIs, gráficos, tabela, filtros e histórico de lotes ficam truncados quando há mais registros (caso atual: 818 hoje, mas o teto volta a aparecer assim que passar de 1000).

## O que muda

- Buscar os chamados em páginas de 1000 registros, em laço, até a página vir incompleta — juntando tudo num único conjunto.
- Como todas as outras telas do módulo (KPIs, gráficos, tabela detalhada, filtros e histórico de lotes) derivam desse mesmo conjunto em memória, elas passam a refletir o total real sem mudanças adicionais de lógica.
- Manter o spinner/skeleton já existente enquanto todas as páginas carregam.
- Registrar no console, apenas em desenvolvimento, o total carregado: `[chamados] N registros carregados`.
- Preview de importação continua limitado a 10 linhas (é amostra intencional). A exclusão de lote e a inserção em blocos de 100 permanecem como estão.

## Detalhes técnicos

- Em `src/hooks/use-chamados.ts`: extrair uma função `fetchAllChamados()` que faz `.select("*").order("aberto_em", { ascending: false }).range(from, to)` em laço com `PAGE_SIZE = 1000`, propagando erro; remover o `.limit(20000)`.
- Ordenação estável: manter `order` em toda página (a coluna real é `aberto_em`, não `data_abertura`), com desempate por `id` para evitar registros repetidos/faltando entre páginas.
- Log condicionado a `import.meta.env.DEV`.
- Sem mudanças de banco, de RLS ou de tipos.
