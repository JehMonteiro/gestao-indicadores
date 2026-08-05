# Correção da visibilidade de indicadores para colaboradores

## O que a investigação encontrou

Consultei o banco e o código de visibilidade. Fatos confirmados:

1. **Não existe tabela de atribuições** (`indicator_assignments`) nem de setores compartilhados (`indicator_shared_sectors`). O responsável é um único campo na tabela de indicadores (`responsible_user_id`), e o compartilhamento de setores existe só na interface — nunca é salvo no banco (é sempre gravado como lista vazia).
2. **Todos os indicadores existentes estão com responsável vazio** (`responsible_user_id` nulo), inclusive os criados recentemente. Ou seja: a atribuição feita na tela não chegou ao banco em nenhum registro atual.
3. **O único colaborador interno cadastrado não tem nenhum vínculo de setor.** Só existe um vínculo de setor no sistema inteiro, e ele é do superadministrador. Sem vínculo, tanto a regra do banco quanto o filtro da tela escondem o indicador — corretamente, segundo a regra atual.
4. **Nem a regra do banco nem o filtro da tela consideram o responsável direto.** Ambos olham apenas para "setor proprietário" (e escopo corporativo). Um responsável direto que não seja membro do setor não enxerga o próprio indicador.
5. Os indicadores em questão estão com status `ativo` e setor proprietário preenchido — isso não é a causa.

**Causa raiz (dupla):** o colaborador não pertence ao setor do indicador (vínculo ausente), e a regra de visibilidade não tem o caminho alternativo "sou o responsável direto". Além disso, os setores compartilhados escolhidos no cadastro são descartados na gravação.

## O que será feito

### 1. Visibilidade por responsável direto (banco e tela)
- Ajustar a regra de leitura de indicadores no banco para permitir: administradores, escopo corporativo, membro do setor proprietário **ou** responsável direto pelo indicador.
- Ajustar o filtro da tela (`useVisibleIndicators`) com a mesma lógica, para que "Meus indicadores", listagem e painel sigam exatamente a regra do banco.
- A atribuição de responsável passa a ser **aditiva**: continuar mostrando o indicador para todos os membros do setor, além do responsável.

### 2. Setores compartilhados passam a ser persistidos
- Criar a tabela de setores compartilhados do indicador, com as permissões de acesso adequadas.
- Salvar/ler os setores compartilhados no cadastro e edição de indicador.
- Incluir "membro de setor compartilhado" na regra de visibilidade do banco e da tela.

### 3. Vínculo de setor do colaborador
- Manter a tela de Usuários como ponto de gestão dos vínculos (já existe) e garantir que o vínculo criado ali seja gravado no banco e recarregado na sessão do usuário afetado.
- Nenhum vínculo será criado automaticamente por mim sem sua confirmação — o colaborador citado precisa ser vinculado ao setor do indicador (posso fazer isso no teste ponta a ponta, se você autorizar).

### 4. Atualização da lista após criar/editar
- Após criar, editar ou atribuir responsável, recarregar os dados do indicador na sessão para eliminar lista desatualizada.

### 5. Testes
- Colaborador membro do setor, não responsável → vê o indicador em "Meus indicadores" e no painel.
- Colaborador responsável direto, sem vínculo de setor → vê o indicador.
- Colaborador sem vínculo e sem atribuição → **não** vê o indicador.

Nada será alterado em metas, lançamentos ou franquias.

## Detalhes técnicos

- Migração: nova tabela `public.indicator_shared_sectors` (`indicator_id`, `sector_id`, único por par) com GRANTs para `authenticated`/`service_role`, RLS ligada, leitura para membros/admins e escrita para admins/gestores do setor proprietário.
- Migração: substituir a policy `indicators read scope` por uma que inclua `responsible_user_id = auth.uid()` e `EXISTS (indicator_shared_sectors + private.is_member_of_sector)`.
- `src/lib/permissions.ts`: adicionar checagem de `responsible_ids.includes(user.id)` e usar `shared_sector_ids` reais.
- `src/lib/supabase-data.ts`: carregar/gravar `shared_sector_ids` a partir da nova tabela (hoje é fixo `[]`), mantendo `responsible_user_id` no upsert.
- `indicadores.novo.tsx` / `indicadores.$id.editar.tsx`: enviar os setores compartilhados e re-hidratar o store após salvar.
