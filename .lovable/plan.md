Plano para corrigir os erros na importação de indicadores:

1. Ajustar o importador de Excel
- Tornar a coluna `franchise`/Empresa obrigatória.
- Validar se o nome ou código da empresa existe em Empresas antes de salvar.
- Melhorar a busca ignorando acentos, maiúsculas/minúsculas e pequenas diferenças como “Beneficios” versus “Benefícios”.
- Se a empresa não existir, exibir erro claro: `Linha X: empresa "..." não encontrada`.

2. Corrigir o salvamento da empresa
- Salvar sempre o `franchise_id` correspondente à empresa encontrada.
- Não permitir que indicador importado fique sem empresa.
- Atualizar indicadores existentes considerando nome + empresa, evitando que linhas de empresas diferentes sobrescrevam umas às outras.

3. Corrigir o erro das linhas 4 e 5
- O arquivo enviado tem indicadores com o mesmo nome para empresas diferentes.
- Hoje o código automático fica igual para linhas repetidas, causando conflito no banco.
- Vou gerar código interno incluindo a empresa, por exemplo:
  - `VISUALIZACOES_QUANTIDADE_NOCTA_FRANQUIA`
  - `VISUALIZACOES_QUANTIDADE_CEO`
- Isso evita substituição ou falha ao salvar.

4. Melhorar a mensagem de erro
- Quando o Supabase retornar erro em formato de objeto, exibir a mensagem real em vez de `erro desconhecido`.

5. Remover “Corporativo” de Indicadores
- Remover a opção `— Corporativo (todas)` do campo Empresa em:
  - Novo indicador
  - Editar indicador
- Exigir seleção de uma empresa.
- Trocar exibições de lista que mostram `Corporativo` quando não há empresa para `Empresa não informada`, apenas como fallback para dados antigos.

Arquivos a alterar:
- `src/components/app/import-indicators-dialog.tsx`
- `src/routes/_authenticated/indicadores.novo.tsx`
- `src/routes/_authenticated/indicadores.$id.editar.tsx`
- `src/routes/_authenticated/indicadores.index.tsx`
- `src/routes/_authenticated/meus-indicadores.tsx`, se necessário para remover o rótulo Corporativo nas visualizações.