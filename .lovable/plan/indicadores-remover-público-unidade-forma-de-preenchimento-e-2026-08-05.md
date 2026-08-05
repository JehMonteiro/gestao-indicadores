# Indicadores: remover Público, Unidade, Forma de preenchimento e Complementos

## Escopo confirmado

O card "Complementos" (Permite anexar comprovantes + Fonte dos dados) sai por completo, junto com o anexo de comprovantes no lançamento de resultado.

Campos eliminados: `audience`, `unit`, `input_method`, `allows_attachment`, `data_source`.

## Mudanças

1. Formulário de cadastro e edição de indicador
   - Remover os selects "Público" e "Forma de preenchimento", o campo "Unidade" e o card "Complementos" inteiro.
   - Remover esses campos do estado do formulário e do payload salvo.

2. Detalhes do indicador
   - Remover as linhas "Público", "Forma de preenchimento", "Permite anexo" e "Fonte"; "Tipo de valor" deixa de exibir a unidade entre parênteses.

3. Listagem, relatórios e demais telas
   - Todas as chamadas de formatação de valor deixam de receber unidade (listagem de indicadores, metas, lançamentos, relatórios, visão geral, meu painel, detalhe do lançamento).
   - Nenhum filtro atual usa esses campos; nada a remover na barra de filtros.

4. Lançamento de resultado
   - Rótulo do valor realizado sem sufixo de unidade e remoção do bloco de anexo de comprovantes (que dependia de "Permite anexar").

5. Importação por planilha
   - Remover as colunas `audience`, `unit`, `input_method`, `allows_attachment`, `data_source` do modelo, do texto de ajuda e do processamento.

6. Tipos e camada de dados
   - Remover os campos do tipo `Indicator` e os tipos `Audience`/`InputMethod`; remover leitura e escrita desses campos em `supabase-data`.
   - Ajustar a regra de visibilidade que hoje usa `audience` para não depender mais dele.
   - Ajustar os indicadores de exemplo (seed) para não usarem esses campos.

7. Banco de dados (migration)
   - `ALTER TABLE public.indicators DROP COLUMN IF EXISTS audience, unit, input_method, allows_attachment, data_source;`
   - Nenhuma outra tabela referencia essas colunas; os indicadores existentes permanecem, apenas sem esses dados.

## Fora do escopo

Nenhum outro campo, regra de cálculo (a "Regra de desempenho"/`direction` continua), permissão ou fluxo muda.

## Validação

- Abrir cadastro, edição e detalhes de um indicador e confirmar a ausência dos quatro itens.
- Abrir listagem, metas, lançamentos, relatórios e painéis e confirmar que os valores continuam exibidos corretamente (sem unidade).
- Rodar verificação de tipos e conferir que indicadores já cadastrados continuam carregando após a migration.
