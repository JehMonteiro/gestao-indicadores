# Remover separadores do menu lateral

Ajustar `src/components/app/app-shell.tsx` para remover a divisória sutil (`border-t border-white/10`) entre os pares listados pelo usuário, mantendo-a nos demais pares.

## Alterações

1. Em `src/components/app/app-shell.tsx`:
   - Remover `pairTop: true` do item `Franquias` (`/desempenho-franquias`) no grupo "Acompanhamento".
   - Remover `pairTop: true` do item `Lançamentos Franquia` (`/lancamentos-franquia`) no grupo "Operação".
   - Remover `pairTop: true` do item `Indicadores Franquia` (`/indicadores-franquia`) no grupo "Estrutura".
   - Manter `pairTop: true` em `Metas Franquia` (`/metas-franquia`) e o separador existente continua ativo.

## Fora de escopo

- Nenhuma alteração de schema, RLS, dados ou outras rotas.
- Apenas ajuste visual no menu lateral.
