## Mudanças em `src/routes/_authenticated/metas.tsx`

**Tabela (listagem):**
- Remover a coluna **Escopo**.
- Manter a coluna **Empresa** (que já existe e mostra a franquia/Corporativo).

**Diálogo "Nova meta":**
- Remover o campo **Peso**.
- Remover o campo **Escopo** (select com Empresa/Setor/Franquia).
- Substituir por um campo **Empresa** (select de franquias), obrigatório, indicando de qual empresa é a meta. Esse valor será gravado em `franchise_id`.
- O `scope_type` passa a ser derivado automaticamente: `"franquia"` quando `franchise_id` estiver preenchido (comportamento padrão agora que toda meta tem empresa).

**Observações:**
- Não altero o schema do banco — os campos `weight` e `scope_type` continuam existindo no tipo/tabela, apenas deixam de ser expostos na UI. `weight` será salvo com valor padrão `1`.
- Nenhuma outra tela é afetada (verifiquei que Metas vive somente neste arquivo).
