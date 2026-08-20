# Correção do erro 500 em franquias

## Diagnóstico (verificado)

O erro 500 **não** é por colunas ausentes. Consultei a tabela `franchises` e as 8 colunas citadas já existem (`city`, `support_group`, `created_in_system_at`, `deactivated_at`, `franchise_model`, `franchise_type`, além de `state` para UF e `opened_at` para a data de inauguração).

A causa real está no log de rede: toda chamada a `/rest/v1/franchises` retorna

```text
42P17 — infinite recursion detected in policy for relation "franchises"
```

A política de leitura "franchises read scoped" contém um `EXISTS` que consulta a própria tabela `franchises` (para achar unidades filhas via `parent_id`). Como a política é reavaliada dentro da subconsulta, o Postgres entra em recursão infinita. Isso derruba leitura, insert e upsert (que devolvem representação) — por isso a importação de 41 registros e o cadastro manual falham.

## Correção

Migration única que substitui a política de SELECT por uma versão sem auto-referência:

- Criar uma função `SECURITY DEFINER` em `private` (ex.: `private.can_view_franchise(uid, franchise_id)`) que encapsula as três condições: leitor da organização, vínculo direto em `user_franchises`, ou vínculo com uma unidade filha. Por ser `SECURITY DEFINER`, a consulta interna a `franchises` não reaplica a política e a recursão desaparece.
- Recriar a política de SELECT usando apenas essa função.
- Manter inalterada a política "franchises admin manage" (`private.is_admin`), que já permite insert/update/delete para administradores.

Nenhuma coluna nova, nenhum dado alterado ou removido.

## Verificação do código de escrita

Revisar o payload de gravação em `src/lib/supabase-data.ts` (`dbWrite.franchise`) e no importador `src/components/app/import-franchises-dialog.tsx` para garantir que só campos existentes na tabela sejam enviados e que ausências virem `null` em vez de `undefined`. Pela leitura atual os dois já seguem esse padrão; o ajuste será apenas pontual se algum campo escapar.

O formulário manual (`EntityDialog` em `/franquias`) não envia os campos novos — segue gravando pelo mesmo caminho, então volta a funcionar assim que a política for corrigida.

## Como validar

1. Recarregar `/franquias`: a lista carrega sem 500.
2. Importar a planilha de 41 linhas: conclui com toast de inseridas/atualizadas.
3. Criar e editar uma franquia manualmente: salva normalmente.
