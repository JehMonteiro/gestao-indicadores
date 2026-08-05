# Correção: data de encerramento e erro ao lançar resultado

## Causa raiz (confirmada)

1. **Data de encerramento nunca é salva**: a tabela `indicators` no banco tem apenas `start_date` — a coluna `end_date` não existe. O formulário preenche o campo, mas a função de gravação não envia `end_date` no payload (não haveria onde gravar). Ao reabrir o indicador, o campo volta em branco.

2. **Erro ao lançar resultado (não é problema de data)**: o console mostra `42501 - new row violates row-level security policy for table "indicator_entries"`. A regra de acesso de criação de lançamentos ainda exige que o usuário seja administrador, membro do setor dono do indicador ou membro da empresa. A usuária do teste (colaboradora sem vínculo de setor/empresa) é bloqueada. Isso contraria a decisão anterior de remover as permissões de lançamentos do sistema. Nenhuma comparação de datas participa da falha.

## O que será feito

### Banco de dados
- Adicionar a coluna `end_date` (tipo data, opcional) em `indicators`.
- Substituir a regra de criação de lançamentos por uma que permita a qualquer usuário autenticado registrar o lançamento em seu próprio nome (mantendo a exigência de que o lançamento seja do próprio usuário). Nada mais das regras de leitura/edição/exclusão muda.

### Aplicação
- Incluir `end_date` na leitura e na gravação do indicador (criação e edição), enviando `null` quando o campo estiver vazio.
- Manter os campos de data como estão na interface (seletor de data nativo), apenas garantindo o envio no formato aceito pelo banco.
- Exibir mensagem amigável em caso de falha ao salvar o lançamento (já existe toast; será mantido e o erro deixará de ocorrer).

### Testes ponta a ponta
- Criar indicador com data de encerramento, salvar, reabrir e conferir a data.
- Editar um indicador existente alterando a data e conferir a persistência.
- Lançar resultado para indicador com e sem data de encerramento, verificando ausência de erros no console.

## Fora de escopo
Nenhuma outra regra de negócio, campo ou fluxo será alterado.
