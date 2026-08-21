# Indicadores Franquia: opção "Todas as franquias"

## Objetivo

No botão "Novo indicador" da página Indicadores Franquia, permitir escolher "Todas as franquias". Ao salvar, o sistema cria uma cópia do indicador para cada unidade franqueada, cada uma editável separadamente.

## Como vai funcionar

1. Em `/indicadores-franquia`, clicar em "Novo indicador" abre o diálogo de seleção já existente.
2. No topo da lista aparece uma opção destacada: **Todas as franquias (N unidades)**, acima do campo de busca dos resultados.
3. Escolhendo uma unidade específica: fluxo atual, sem mudança.
4. Escolhendo "Todas as franquias": abre o mesmo formulário de indicador de franquia, em modo "todas", com o campo "Franquia" mostrando "Todas as franquias (N unidades)" e um aviso de que serão criados N indicadores.
5. Ao salvar, é criado um indicador por unidade, com o mesmo nome, objetivo, classificação, mensuração, metas e datas — cada um vinculado à sua franquia e com código único próprio.
6. Mensagem de sucesso: "N indicadores criados" e redirecionamento para `/indicadores-franquia`, onde as N linhas aparecem.

Observação: como são cópias independentes, editar ou excluir uma delas depois não afeta as demais.

## Detalhes técnicos

- `src/components/app/selecionar-franquia-dialog.tsx`: adicionar um item fixo "Todas as franquias" no topo, com contagem de unidades (`franchises.filter(isFranquia)`). A prop passa a ser `onSelect(franchiseId: string | "all")`.
- `src/components/app/indicadores-page.tsx`: no `onSelect`, se o valor for `"all"`, navegar para `/franquias/todas/indicadores/novo`; caso contrário, manter `/franquias/$id/indicadores/novo`.
  - `todas` é um sentinela do parâmetro `$id` da rota existente, evitando criar uma nova rota.
- `src/routes/_authenticated/franquias.$id.indicadores.novo.tsx`: quando `id === "todas"`, renderizar `<FranquiaIndicadorForm allFranchises />` em vez de `franchiseId={id}`.
- `src/components/app/franquia-indicador-form.tsx`:
  - Nova prop opcional `allFranchises?: boolean`; `franchiseId` passa a ser opcional.
  - Em modo "todas": breadcrumb sem link para uma unidade, título "Novo indicador para todas as franquias", campo "Franquia" exibindo "Todas as franquias (N unidades)" em modo leitura, e um alerta informando que serão criados N indicadores independentes.
  - Lista de responsáveis: em modo "todas", usar todos os `profiles` (sem filtro por `user_franchises`).
  - No `submit`, em modo "todas": iterar sobre as unidades e, para cada uma, montar o `Indicator` com `newId()`, código único gerado com `makeUniqueIndicatorCode` acumulando os códigos já gerados no laço (evita colisão), `entity_scope: "franquia"`, `entity_id` e `franchise_id` da unidade. Persistir com `await upsert(...)` sequencialmente, registrar um `logAudit` por indicador, re-hidratar o store uma única vez ao final, e navegar para `/indicadores-franquia`.
  - Validações atuais (nome obrigatório, `firstIntegerError`) rodam uma vez antes do laço.
  - Se não houver nenhuma franquia cadastrada, bloquear o envio com um toast de erro.

## Verificação

- Build e typecheck.
- Preview: abrir o diálogo, confirmar a opção "Todas as franquias" com a contagem correta, criar um indicador de teste e conferir que aparece uma linha por unidade na listagem, cada uma com a franquia correta.
