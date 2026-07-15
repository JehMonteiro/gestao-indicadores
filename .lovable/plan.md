## Plano para corrigir o cadastro de lançamentos

1. **Corrigir a regra do banco que está bloqueando o cadastro**
   - Ajustar a política de inserção de lançamentos para permitir usuários administradores criarem lançamentos mesmo sem vínculo direto em `user_sectors`/`user_franchises`.
   - Manter as regras de segurança para usuários não administradores.

2. **Corrigir o preenchimento de setor/franquia no lançamento**
   - No formulário de novo lançamento, gravar `sector_id` a partir do setor responsável do indicador.
   - Para indicadores vinculados a uma franquia, usar a franquia do próprio indicador como padrão quando aplicável.
   - Evitar enviar valores incoerentes que façam a política do banco rejeitar o cadastro.

3. **Melhorar a mensagem de erro no formulário**
   - Trocar a mensagem genérica por uma mensagem mais útil quando o banco rejeitar o cadastro.
   - Manter o usuário no formulário para corrigir os dados, sem parecer que salvou.

4. **Validar o fluxo**
   - Testar cadastrar um lançamento, voltar para a lista e confirmar que ele aparece.
   - Recarregar a página/lista para confirmar que o lançamento permanece salvo.