## Plano

1. **Corrigir o usuário do lançamento**
   - Alterar o formulário de novo lançamento para só salvar quando houver usuário autenticado carregado.
   - Remover o fallback `u-colab`, que não é um UUID real e faz o banco rejeitar o salvamento.

2. **Persistir antes de navegar**
   - Trocar o salvamento atual “em segundo plano” por um salvamento aguardado no banco para lançamentos.
   - Só redirecionar para a lista depois que o banco confirmar o cadastro.
   - Se houver erro, manter o usuário no formulário e mostrar mensagem clara.

3. **Manter a lista sincronizada**
   - Após salvar com sucesso, atualizar o estado local com o registro confirmado.
   - Garantir que, ao recarregar a sessão, os lançamentos venham da tabela `indicator_entries` e não desapareçam.

4. **Ajustar atualização de status**
   - Fazer aprovar/rejeitar aguardar a confirmação do banco antes de mudar a tela definitivamente.
   - Evitar estado otimista que aparenta salvar, mas some depois caso a política do banco bloqueie.

5. **Validação**
   - Testar o fluxo de criar lançamento, voltar para a lista e recarregar para confirmar que o lançamento permanece.