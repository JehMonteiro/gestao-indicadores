# Novo Indicador em contexto de franquia — verificar e finalizar

## O que já existe no código hoje (verificado)

- `src/routes/_authenticated/indicadores.novo.tsx` **já declara** `validateSearch` para `escopo` e `unidade`, lê via `Route.useSearch()`, e desabilita os campos **Escopo**, **Unidade** e **Empresa** quando vêm do contexto.
- `src/routes/_authenticated/franquias.$id.tsx` já usa `<Link to="/indicadores/novo" search={{ escopo: "franquia", unidade: id }}>`, que é a forma tipada equivalente a `navigate({ search })`.
- Salvar/cancelar já retorna para `/franquias/$id` quando há `unidade`.
- `/indicadores` já filtra por escopo (`filterByScope(indicators, "empresa")`), então indicadores de franquia não aparecem lá.

Observação: o projeto usa `escopo = "empresa" | "franquia"` (não `"corporativo"`), e `routeTree.gen.ts` não muda ao adicionar search params — o tipo de search é inferido do arquivo da rota, não gerado no route tree. Ou seja, a ausência de diff nesse arquivo não indica que a correção não foi aplicada.

Como o comportamento relatado ainda falha na prática, o primeiro passo é reproduzir de verdade, não reescrever às cegas.

## Passos

1. **Reproduzir com navegador headless**: entrar em `/franquias/<id>`, clicar em "Novo indicador", capturar a URL final, o estado dos campos Escopo/Unidade/Empresa e erros de console. Isso define a causa real (ex.: lista de franquias ainda não carregada quando o formulário monta, botão fora da área visitada pelo usuário, ou outro botão em outra aba apontando para `/indicadores/novo` sem search).
2. **Corrigir a causa encontrada.** Hipótese principal: `contextFranchise` é resolvido a partir do store, que carrega de forma assíncrona; se as franquias chegarem depois da montagem, o campo Empresa fica vazio/destravado. Correção: travar os campos por `unidade` (o search param) e não pela presença do objeto carregado, e sincronizar o nome exibido quando os dados chegarem.
3. **Passar também o nome da franquia** no link (`empresa: franchise.name`) para que o contexto apareça imediatamente, sem depender do carregamento do store.
4. **Breadcrumb real** no topo do formulário ("Franquias › `<Nome>` › Novo indicador") com link para `/franquias`, no lugar do texto simples atual.
5. **Garantir a persistência**: no submit, forçar `entity_scope = "franquia"` e `entity_id = unidade` quando o contexto existir, mesmo que o usuário não toque nos selects.
6. **Revalidar** no navegador: URL com os três parâmetros, campos travados e preenchidos, indicador salvo aparecendo na franquia e ausente em `/indicadores`, e retorno para `/franquias/<id>` ao salvar e ao cancelar.

## Detalhes técnicos

- `validateSearch` passa a aceitar `empresa?: string` (apenas exibição) além de `escopo` e `unidade`.
- Travas passam a usar `!!unidade` em vez de `!!contextFranchise`; o rótulo exibido usa `contextFranchise?.name ?? empresa`.
- Nenhuma alteração de schema no banco; nenhum arquivo de rota novo (a rota `/indicadores/novo` já existe e o route tree já a contém).
