## Diagnóstico

A tela `/definir-senha` mostra "Não foi possível definir a senha. O link pode ter expirado." porque a página **nunca troca o token do link por uma sessão**. Hoje ela apenas escuta `onAuthStateChange` e chama `getSession()`, o que só cobre o fluxo antigo com `#access_token` no hash.

Os e-mails atuais do Supabase (invite, recovery, magiclink) chegam como:

```
/definir-senha?token_hash=pkce_xxx&type=invite
```

ou, no fluxo PKCE:

```
/definir-senha?code=xxx
```

Nenhum desses formatos gera sessão sozinho — precisa chamar `supabase.auth.verifyOtp({ token_hash, type })` (para `token_hash`) ou `supabase.auth.exchangeCodeForSession(code)` (para `code`). Como isso não é feito, `updateUser({ password })` roda sem sessão e devolve erro, o que a UI traduz como "link expirado".

## Plano

Alterar apenas `src/routes/definir-senha.tsx`:

1. No `useEffect` de bootstrap, ler a URL logo na montagem:
   - Se houver `?token_hash=...&type=...` (invite | recovery | magiclink | signup | email_change), chamar `supabase.auth.verifyOtp({ token_hash, type })`.
   - Senão, se houver `?code=...`, chamar `supabase.auth.exchangeCodeForSession(code)`.
   - Senão, cair no comportamento atual (hash com `#access_token` → `getSession()` / `onAuthStateChange`).
   - Após sucesso, limpar os parâmetros da URL com `window.history.replaceState` para evitar reuso.
2. Enquanto o token está sendo trocado, manter `sessionReady=false` e o botão desabilitado ("Validando convite...").
3. Se a troca falhar, marcar um estado `linkInvalid=true` e exibir a mensagem já existente de link inválido/expirado — sem mostrar toast de erro genérico antes do usuário clicar em "Definir senha".
4. Só habilitar o submit quando `sessionReady=true`. O `handleSetPassword` continua igual (`supabase.auth.updateUser({ password })` + redirect para `/meu-painel`).

Sem mudanças em backend, migrações, `inviteUser`, ou templates de e-mail — o link já é válido; falta apenas consumi-lo no cliente.

## Resultado esperado

Ao clicar no link do e-mail de convite (ou de "esqueci minha senha"), a página valida o token, cria a sessão, o usuário define a senha e é redirecionado para `/meu-painel` sem o falso "link expirado".
