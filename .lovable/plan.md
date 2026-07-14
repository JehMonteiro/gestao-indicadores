## Situação

O fluxo já existe:

- `inviteUser` (server function) chama `supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: ".../definir-senha" })`.
- A página `/definir-senha` aceita o token do convite e chama `supabase.auth.updateUser({ password })`.

O que falta: **o e-mail em si não é entregue de forma confiável**, porque o projeto não tem domínio de e-mail configurado. Sem domínio, o backend usa o remetente padrão compartilhado, que tem limite estrito (poucos e-mails/hora), sem branding, e frequentemente cai em spam. Além disso, a UI ainda instrui o usuário a usar "Esqueci minha senha", como se o convite não fosse suficiente.

## Plano

### 1. Configurar domínio de e-mail do projeto

Abrir o diálogo de configuração de domínio para o usuário conectar um domínio próprio (ex.: `notify.seudominio.com`). Isso é pré-requisito para envio confiável.

<presentation-actions>
<presentation-open-email-setup>Configurar domínio de e-mail</presentation-open-email-setup>
</presentation-actions>

### 2. Provisionar infraestrutura de e-mail e templates de auth

Após o domínio estar configurado:

- Rodar `setup_email_infra` (filas pgmq, cron, tabelas de log/suppression).
- Rodar `scaffold_auth_email_templates` — gera os templates de auth (inclusive **invite** e **recovery**) usando a marca do app, e a webhook `/lovable/email/auth/webhook` que passa a interceptar os e-mails do Supabase Auth. A partir daí, todo `inviteUserByEmail` e todo `resetPasswordForEmail` sairão pelo domínio configurado, com template branded, sem limite baixo.
- Aplicar cores/tipografia do app (`src/styles.css`) nos templates gerados; corpo do e-mail continua com fundo `#ffffff`.

### 3. Ajustes de UI em `src/routes/_authenticated/usuarios.tsx`

- Trocar o texto explicativo do diálogo "Novo usuário" de "Oriente-o a usar 'Esqueci minha senha'" para: **"Enviaremos um e-mail com link para o usuário criar a senha e acessar a plataforma."**
- No toast de sucesso, indicar: `"Convite enviado para {email}"` em vez de apenas "Usuário criado".

### 4. Sem alterações no backend/server function

`inviteUser` e a página `/definir-senha` já estão corretos. Não há migração, não há mudança em RLS.

## Resultado esperado

Ao cadastrar um novo usuário em Usuários → Novo usuário, ele recebe um e-mail (do domínio do projeto, com marca) contendo link para `/definir-senha`, define a senha e entra na plataforma. O mesmo pipeline também melhora o e-mail de "Esqueci minha senha".
