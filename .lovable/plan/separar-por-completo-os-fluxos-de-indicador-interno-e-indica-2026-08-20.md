# Separar por completo os fluxos de Indicador Interno e Indicador de Franquia

## O que foi verificado no projeto

- `indicators` já tem as colunas necessárias: `entity_scope` (enum `empresa` | `franquia`), `entity_id` (FK para `franchises`) e `franchise_id`. Também existe uma coluna antiga `scope` (enum `corporativo` | `setor` | `franquia`) usada só internamente pelo formulário (sempre gravada como `"setor"`).
- `/indicadores/novo` hoje tem `validateSearch` com `escopo/unidade/empresa` e trava campos condicionalmente — é exatamente o remendo a remover.
- `franquias.$id.tsx` é hoje uma rota folha (detalhe da unidade), com o card "Indicadores da unidade" já filtrando por `entity_scope = "franquia" && entity_id = $id`.
- A sidebar tem hoje uma entrada global "Indicadores Franquia" (`/indicadores-franquia`).

Sobre a migration sugerida: **não é necessária e não será feita**. Criar uma nova coluna `scope TEXT` colidiria com a coluna `scope` já existente (que é um enum) e duplicaria `entity_scope`. A distinção pedida já é garantida por `entity_scope` + `entity_id`/`franchise_id`.

## Rotas

Manter intactas: `/indicadores`, `/indicadores/novo`, `/indicadores/$id`, `/indicadores/$id/editar`.

Criar as rotas aninhadas de franquia:

```text
franquias.$id.tsx                              -> vira layout (renderiza <Outlet />)
franquias.$id.index.tsx                        -> detalhe atual da unidade (conteúdo movido)
franquias.$id.indicadores.novo.tsx             -> criação
franquias.$id.indicadores.$indId.tsx           -> detalhe
franquias.$id.indicadores.$indId.editar.tsx    -> edição
```

O route tree é regenerado automaticamente pelo plugin ao criar os arquivos.

## Formulário de indicador de franquia (novo componente próprio)

Um componente compartilhado por criar/editar, sem qualquer dependência de search params:

- Campos: Nome, Objetivo, Grupo estratégico, Responsáveis (usuários vinculados àquela franquia, via `user_franchises`), Tipo de valor, Frequência, Direção, Meta padrão, limiares de alerta e crítico, Data início/fim, Status.
- Franquia exibida como texto somente leitura (nome vindo de `$id`).
- Não exibe setor interno, escopo, nem seleção de empresa/unidade.
- Grava sempre `entity_scope = "franquia"`, `entity_id = $id`, `franchise_id = $id`, `owner_sector_id = null`.
- Breadcrumb: Franquias › `<Nome>` › Indicadores › Novo indicador.
- Salvar e Cancelar voltam para `/franquias/$id`.

Detalhe (`/franquias/$id/indicadores/$indId`): reaproveita a apresentação do detalhe atual do indicador, com breadcrumb da franquia e botão Editar apontando para a rota aninhada.

## Formulário de indicador interno (`/indicadores/novo`)

- Remove `validateSearch` e todo o uso de `escopo/unidade/empresa`.
- Remove o select de Escopo, o select de Unidade/Empresa e o breadcrumb condicional.
- Passa a gravar sempre `entity_scope = "empresa"` (equivalente a "corporativo" neste schema) e `entity_id = null`, `franchise_id = null`.
- Mesmo tratamento em `/indicadores/$id/editar`: sem campos de escopo/franquia.

## Listagens

- `/indicadores`: passa a exibir indicadores com `entity_scope = "empresa"` **ou** `entity_scope` nulo (hoje os nulos ficam invisíveis); nunca os de franquia.
- Card "Indicadores da unidade" em `/franquias/$id`: mantém o filtro por unidade, com os links apontando para `/franquias/$id/indicadores/$indId` e o botão "Novo indicador" para `/franquias/$id/indicadores/novo`, sem search params.

## Sidebar

- Mantém "Indicadores" → `/indicadores`.
- Remove a entrada "Indicadores Franquia" e a rota `/indicadores-franquia` (acesso passa a ser só pela franquia). "Lançamentos Franquia" e "Metas Franquia" ficam como estão.

## Verificação final

Navegador headless: criar um indicador por cada fluxo e conferir que cada um aparece apenas na sua listagem, que a URL de franquia não tem search params, e que salvar/cancelar volta para `/franquias/$id`. Uma busca no codebase deve terminar sem nenhuma ocorrência de `escopo=`/`unidade=`/`empresa=` como search param.
