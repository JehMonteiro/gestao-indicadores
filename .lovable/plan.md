## Contexto

No cadastro de indicadores o campo é chamado **Empresa** (mapeado para `franchise_id`) e é obrigatório para todo indicador — inclusive os de escopo `setor`. Hoje 11 dos 12 indicadores existentes têm escopo `setor` com uma empresa vinculada.

No formulário **Novo lançamento**, o seletor da empresa só aparece quando `scope === "franquia"`, e o rótulo usa "Franquia". Como a maioria dos indicadores é `setor`, o usuário não vê a empresa na hora de lançar — só a vê para 1 indicador.

## O que mudar

Arquivo: `src/routes/_authenticated/lancamentos.novo.tsx`

1. **Renomear rótulo** de "Franquia" para "Empresa" (mantendo consistência com o cadastro de indicadores).
2. **Mostrar o campo Empresa para todos os indicadores** que tenham empresa associada (não apenas escopo `franquia`):
   - Se o indicador já tem `franchise_id` definido (caso da maioria), exibir a Empresa como campo bloqueado/pré-selecionado com o nome da empresa do indicador.
   - Se o indicador tem escopo `franquia` sem `franchise_id` fixo, manter o seletor atual listando as empresas disponíveis.
   - Se o indicador não tem nenhuma empresa associada (verdadeiramente corporativo/global), o campo fica oculto.
3. **Garantir persistência**: `entryFranchiseId` no `save()` deve usar o `franchise_id` do indicador quando existir, para que o lançamento fique atrelado à empresa correta mesmo em indicadores de escopo `setor`.
4. **Validação**: exigir Empresa selecionada sempre que o indicador tiver empresa associada, com mensagem "Selecione uma empresa".

## Fora do escopo

- Não altera o cadastro de indicadores, o schema, nem políticas RLS.
- Não altera a lista de indicadores mostrada no dropdown (todos os indicadores já são listados).
- Não mexe nas telas de aprovação/edição de lançamento.
