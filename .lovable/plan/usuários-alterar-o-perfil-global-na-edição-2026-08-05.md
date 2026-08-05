# Usuários: alterar o perfil global na edição

Hoje o diálogo de edição de usuário só permite gerenciar vínculos de setor. O perfil global aparece apenas como etiqueta na listagem. Vamos permitir alterá-lo com segurança.

Observação importante: o perfil global não fica na tabela de perfis — ele é guardado numa tabela separada de papéis (`user_roles`), que é o padrão seguro contra escalonamento de privilégio. A alteração será feita lá; a tela continua mostrando "Perfil global" normalmente.

## 1. Diálogo de edição de usuário

- Novo bloco "Perfil global" no topo do diálogo, com seletor preenchido com o perfil atual: Superadmin, Admin corporativo, Gestor de setor, Colaborador, Auditor.
- Botão "Salvar perfil" habilitado só quando o valor muda.
- Confirmação antes de salvar: "Tem certeza que deseja alterar o perfil global de <nome> de X para Y?".
- Sucesso: toast "Perfil global atualizado" e recarga dos dados. Erro: toast com a mensagem retornada.

## 2. Permissões

- Só Superadmin e Admin corporativo veem o bloco; para os demais o campo não é exibido (a página inteira já é restrita a administradores).
- Admin corporativo não vê a opção "Superadmin" no seletor e não pode editar o perfil de quem já é Superadmin (bloco exibido desabilitado com aviso curto).
- Ninguém altera o próprio perfil global: para o usuário logado o bloco fica desabilitado com a explicação.
- As mesmas três regras são revalidadas no servidor, então burlar a interface não funciona.

## 3. Auditoria

Cada alteração grava um registro de auditoria com ação "update"/entidade "user", contendo o usuário alterado, o perfil anterior, o novo perfil e quem executou. Aparece na tela de Auditoria.

## 4. Validação

Conferir: abrir edição de um usuário, trocar o perfil, confirmar e ver a lista atualizada; como Admin corporativo, a opção Superadmin não aparece; a alteração consta em Auditoria.

## Detalhes técnicos

- Nova server function `updateUserGlobalRole` em `src/lib/users.functions.ts` com `requireSupabaseAuth`: valida papel do chamador via `context.supabase`, bloqueia auto-alteração, bloqueia concessão/remoção de `superadmin` por admin corporativo, e então substitui a linha em `user_roles` usando o client admin. Grava o log de auditoria com o client do próprio chamador (satisfaz a política de insert própria).
- Sem migration: as políticas atuais de `user_roles` já restringem a escrita a administradores; as regras extras (auto-alteração e promoção a superadmin) são aplicadas na server function.
- UI em `src/routes/_authenticated/usuarios.tsx`: novo bloco no diálogo existente + `AlertDialog` de confirmação, reutilizando `roleLabels`/`selectableRoles` e `loadAllFromSupabase` para recarregar o store.
