# Importação de franquias via XLSX

Novo botão "Importar Excel" na aba Franquias de `/franquias`, com dialog de upload, pré-visualização e importação em lote (upsert por Nome Fantasia).

## 1. Banco de dados

A tabela de empresas/franquias hoje tem: `name`, `code`, `entity_type`, `parent_id`, `city`, `state`, `status`, `opened_at`, `is_demo`, datas de sistema. Migration única adicionando colunas nullable:

- `support_group` (Grupos)
- `created_in_system_at` (date)
- `deactivated_at` (date)
- `franchise_model` (Modelos de Franquia)
- `franchise_type` (Tipo de Franquia)

"Inaugurada" reaproveita a coluna existente `opened_at`; "UF" → `state`; "Municipio" → `city`. Nenhuma coluna removida, nenhum registro apagado. Sem mudanças de RLS/GRANT (as políticas atuais já cobrem a tabela).

## 2. Leitura da planilha

Colunas lidas (todas as demais ignoradas silenciosamente): Nome Fantasia, UF, Municipio, Inaugurada, Grupos, Data Criação Sistema, Data Inativação, Modelos de Franquia, Tipo de Franquia.

Tratamento:
- Nome Fantasia obrigatório; linha sem nome é pulada e contabilizada como erro.
- Datas em `DD/MM/YYYY` (ou data nativa do Excel) convertidas para `YYYY-MM-DD`; valor inválido vira `null`, sem erro.
- UF em maiúsculas e trim; Municipio só trim; Grupos/Modelos/Tipo apenas trim (texto livre, valores esperados não são exclusivos).
- Status: `inativa` quando houver Data Inativação válida, senão `ativa`.

## 3. Upsert

- Correspondência por `name` normalizado (trim + case-insensitive) dentro das franquias já carregadas na store: existe → atualiza os campos importados; não existe → insere.
- Novas franquias entram com `entity_type = 'franquia'` e `parent_id` = Nocta Franquia (mesma regra do cadastro manual), e `code` gerado a partir do nome com checagem de unicidade.
- Gravação em lotes de 200 via upsert, para performance.
- Ao concluir, recarrega a lista com o utilitário `fetchAll` (sem truncar em 1000).

## 4. Dialog

Mesmo padrão visual de `ImportIndicatorsDialog`:
1. Botão "Baixar modelo (.xlsx)" com o cabeçalho exato das 9 colunas e a linha de exemplo informada.
2. Área de arrastar/clicar para `.xlsx` ou `.xls`.
3. Pré-visualização das 5 primeiras linhas (só colunas importadas, nomes amigáveis) + total de linhas detectadas.
4. "Confirmar importação" → toast com inseridas, atualizadas e erros; dialog fecha se não houver erros.

## Detalhes técnicos

- Novo componente `src/components/app/import-franchises-dialog.tsx`, usando `xlsx` (já instalado) e o mesmo layout do importador de indicadores.
- Botão renderizado em `src/routes/_authenticated/franquias.index.tsx`, aba Franquias, apenas para superadmin/admin corporativo (mesma regra de `canEdit`).
- `src/mocks/types.ts` (`Franchise`) e os mapeadores/upserts de `src/lib/supabase-data.ts` ganham os campos novos.
- Preview segue limitado a 5 linhas de propósito; a releitura pós-importação usa `fetchAll`.
