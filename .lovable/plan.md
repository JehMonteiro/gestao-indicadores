# Novo indicador com contexto de escopo/franquia

## O que foi verificado

- A página de detalhe da franquia (`/franquias/$id`) hoje mostra apenas dados cadastrais e vínculos — **não existe** aba "Indicadores" nem botão "Novo Indicador" nela.
- O único botão "Novo indicador" do sistema está em `src/components/app/indicadores-page.tsx` (linha 80), componente compartilhado por `/indicadores` (escopo empresa) e `/indicadores-franquia` (escopo franquia). Ele leva a `/indicadores/novo` sem nenhum contexto.
- O formulário `/indicadores/novo` já tem os campos "Escopo" (empresa/franquia) e "Unidade" (lista de franquias), ambos começando vazios — por isso o indicador criado a partir de `/indicadores-franquia` nasce como empresa e não aparece na lista de franquia.

Ou seja: a rota de destino está correta, o que falta é o **contexto** ser transportado. Aplico a Opção A.

## Correção

1. `/indicadores/novo` passa a aceitar search params validados: `escopo` (`empresa` | `franquia`) e `unidade` (id da franquia, opcional).
2. No formulário, quando `escopo` vier na URL:
   - `entity_scope` já inicia com esse valor e o select fica bloqueado (com texto "Definido pelo contexto");
   - se `unidade` vier, o select "Unidade" e o campo "Empresa" iniciam preenchidos com a franquia e ficam bloqueados;
   - o subtítulo da página mostra o contexto (ex.: "Franquias › FRANQUIA 1002 › Novo indicador").
3. Botão "Novo indicador" em `indicadores-page.tsx` passa a mandar `search={{ escopo }}` conforme a prop de escopo da tela. Em `/indicadores` continua "empresa", em `/indicadores-franquia` vai "franquia".
4. Após salvar: se veio `unidade`, volta para `/franquias/$id`; caso contrário, segue para o detalhe do indicador como hoje (comportamento atual preservado).
5. Cancelar volta para a listagem de origem (`/indicadores-franquia` quando escopo=franquia).

## Aba Indicadores na franquia (opcional, incluída)

Para o critério "o indicador aparece na listagem daquela franquia", adiciono em `/franquias/$id` um card **Indicadores da unidade**: lista os indicadores com `entity_scope = franquia` e `entity_id` igual à unidade (nome, código, grupo, status, link para o detalhe) e um botão "Novo indicador" que navega para `/indicadores/novo?escopo=franquia&unidade=<id>`.

## Detalhes técnicos

- `validateSearch` em `src/routes/_authenticated/indicadores.novo.tsx` com Zod-like parse manual (mesmo padrão já usado em `/franquias?aba=`), valores inválidos são ignorados.
- Nenhuma mudança de schema, RLS ou dados: `entity_scope`/`entity_id` já existem em `indicators` e já são gravados pelo formulário.
- A separação de listagens (`/indicadores` vs `/indicadores-franquia`) já funciona via `filterByScope`; nenhum ajuste necessário lá.
