# Usuários: remover tudo relacionado a franqueados

O módulo de usuários passa a ser exclusivo de colaboradores internos. Nada é removido do banco nem do módulo de Franquias — apenas o cadastro/gestão de usuários deixa de expor franquia.

## 1. Cadastro e edição de usuário (`usuarios.tsx`)

- Perfis globais disponíveis: Superadmin, Admin corporativo, Gestor de setor, Colaborador, Auditor. Saem "Gestor de franquia" e "Franqueado".
- Some o campo "Tipo" (interno/franqueado): todo usuário criado por aqui é interno.
- No diálogo de vínculos, remove a coluna "Franquias" e o formulário de adicionar franquia/papel. Fica só Setores, ocupando a largura toda.
- Papéis de setor no seletor: Gestor, Colaborador, Visualizador (nada com referência a franqueado).

## 2. Listagem de usuários

- Remove a coluna "Franquias" e a coluna "Tipo" da tabela.
- Não há filtros de franquia hoje na página; nada a remover ali.

## 3. Perfil do usuário (`perfil.tsx`)

- Remove a seção "Franquias vinculadas". Mantém setores.

## 4. Cabeçalho / seletor de contexto (`app-shell.tsx`)

- Remove o seletor rápido de franquia do cabeçalho, mantendo o de setor.

## 5. Backend

- `users.functions.ts` (convite): o schema de papel global aceita apenas os cinco papéis internos; convites com papel de franquia passam a ser rejeitados.
- Não há validação que exija franquia obrigatória para nenhum perfil, e o convite nunca escreveu em `user_franchises` — nada mais a ajustar. A tabela e suas políticas permanecem intactas para o módulo de Franquias.

## 6. Dados de demonstração (`src/mocks/seed.ts`)

- Usuários de exemplo com papel/tipo de franqueado passam a internos e os vínculos `userFranchises` de exemplo saem do seed, sem tocar nas franquias, indicadores ou metas.

## 7. Compatibilidade com dados existentes

- Os tipos `GlobalRole`/`FranchiseRole` continuam existindo, então usuários já cadastrados como franqueado seguem funcionando: aparecem na lista com o papel atual, apenas sem edição de vínculo de franquia pela tela de usuários. As permissões e telas de Franquias continuam funcionando como hoje.

## 8. Validação

Conferir no preview: criar/editar usuário sem nenhuma menção a franquia, lista sem coluna de franquia, perfil sem franquias vinculadas e cabeçalho sem troca de contexto por franquia.

## Detalhes técnicos

Arquivos: `src/routes/_authenticated/usuarios.tsx`, `src/routes/_authenticated/perfil.tsx`, `src/components/app/app-shell.tsx`, `src/lib/users.functions.ts`, `src/mocks/seed.ts`. Sem migration.
