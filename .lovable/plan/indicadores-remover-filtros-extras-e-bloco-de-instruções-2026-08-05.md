# Indicadores: remover filtros extras e bloco de instruções

## Situação atual (verificada)

A barra de filtros da listagem de indicadores (`/indicadores`) já possui apenas: busca por nome/código, Setor e Status. Os filtros "Público", "Unidade", "Regra de desempenho" e "Forma de preenchimento" não existem na listagem nem em relatórios — nada a remover ali. Isso será apenas confirmado.

O que de fato existe hoje e será removido é o bloco de instruções de preenchimento.

## Mudanças

1. Detalhes do indicador (aba Definição)
   - Remover a linha "Instruções" exibida quando o indicador tem texto preenchido.

2. Formulário de novo indicador
   - Remover o campo "Instruções de preenchimento" e deixar de enviar `instructions` ao salvar.
   - O card mantém "Permite anexar comprovantes" e "Fonte dos dados"; o título passa de "Instruções" para "Complementos".

3. Formulário de edição de indicador
   - Mesma remoção do campo e do título, preservando os demais campos.

4. Importação de indicadores (CSV)
   - Remover `instructions` da lista de campos aceitos e do texto de ajuda, para não reintroduzir o bloco.

## Fora do escopo (não muda)

- Campos Público, Unidade, Regra de desempenho e Forma de preenchimento continuam no cadastro/edição e no banco.
- Coluna `instructions` permanece no banco (sem migração), apenas deixa de ser exibida/editada.
- Cálculo de atingimento continua usando `direction` internamente, sem alteração.

## Validação

- Listagem de indicadores: confirmar que a barra de filtros tem só busca, Setor e Status.
- Detalhes e formulários: confirmar ausência de qualquer bloco de instruções.
- Abrir um indicador com meta e lançamento e confirmar que o percentual de atingimento segue igual.
