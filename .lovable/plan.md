## Objetivo
Traduzir o email de convite de novo usuário para português do Brasil, ajustando o template padrão do Supabase (assunto + corpo), sem configurar domínio customizado.

## Escopo
Apenas o template de convite (`invite`). Recuperação de senha e demais emails ficam como estão, salvo pedido posterior.

## Alterações

### 1. Configurar template de convite em PT-BR
Via `supabase--configure_auth`, definir:

- **Assunto:** `Você foi convidado para a Gestão de Indicadores`
- **Corpo (HTML):** mensagem em português com saudação, explicação e botão/link `{{ .ConfirmationURL }}` apontando para `/definir-senha`, mantendo as variáveis do Supabase (`{{ .Email }}`, `{{ .ConfirmationURL }}`).

Texto proposto do corpo:

```
Olá,

Você foi convidado(a) para acessar a plataforma Gestão de Indicadores.

Para criar sua senha e ativar seu acesso, clique no link abaixo:

[Definir minha senha]({{ .ConfirmationURL }})

Se você não esperava este convite, ignore este email.

Equipe Gestão de Indicadores
```

O link `{{ .ConfirmationURL }}` já direciona para `/definir-senha`, que trata `token_hash` e cria a sessão (correção anterior).

### 2. Sem alterações de código
Nenhuma mudança em rotas, componentes ou funções server — a página `/definir-senha` já está preparada.

## Observações
- Emails continuam sendo enviados pelo remetente padrão do Supabase (não `marketing@nocta.com.br`), pois isso exige domínio verificado.
- Se depois quiser remetente próprio + template com marca, seria necessário configurar domínio de email.