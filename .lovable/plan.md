# Valores inteiros em indicadores, metas e lançamentos

Restringir os valores numéricos cadastrados a números inteiros, mantendo decimais apenas nos tipos Percentual, Decimal e Tempo. O percentual de atingimento calculado continua podendo ter casas decimais.

## Regra única de tipos

Criar uma regra central usada por todas as telas e pelo banco:

- Inteiro obrigatório: Número inteiro, Quantidade, Moeda, Nota de avaliação
- Decimais permitidos: Percentual, Número decimal, Tempo

## 1. Indicadores (novo e edição)

Campos afetados: Meta padrão, Valor mínimo, Valor máximo, Peso.

- Quando o tipo de valor exigir inteiro, os campos passam a usar passo 1, bloqueiam a digitação de vírgula/ponto e exibem mensagem de validação ao tentar salvar um valor com casas decimais.
- Ao trocar o tipo de valor para um tipo inteiro, os valores já digitados com decimais são sinalizados para correção (não salvam silenciosamente arredondados).
- Limite de atenção e Limite crítico continuam como estão: são percentuais de faixa de classificação, não valores do indicador. Se quiser que também virem inteiros, é só avisar.
- Observação: hoje o Peso não aparece no formulário (é fixo em 1). Ele será tratado como inteiro na validação, sem introduzir um campo novo.

## 2. Metas

Campo afetado: Valor da meta (mínimo e máximo ainda não existem no formulário de metas; a regra fica pronta caso sejam adicionados).

- Hoje o valor da meta é forçado a inteiro para todos os tipos. Passa a seguir a regra: inteiro nos tipos aplicáveis e decimais liberados em Percentual, Decimal e Tempo.
- A exibição na tabela de metas passa a usar a formatação do tipo do indicador (ex.: 87,5% continua com uma casa).

## 3. Lançamento de resultados

Campo afetado: Valor realizado.

- Passo 1 e bloqueio de decimais quando o indicador for de tipo inteiro; passo 0,01 quando for Percentual, Decimal ou Tempo.
- Mensagem clara ao tentar salvar valor com casas decimais em indicador inteiro.

## 4. Banco de dados

Abordagem de menor risco: manter as colunas como numeric e validar como inteiro por gatilho, em vez de converter o tipo das colunas.

Migration que:

- Cria uma função auxiliar que informa se um tipo de valor exige inteiro.
- Arredonda os valores já cadastrados com casas decimais em indicadores (meta padrão, mínimo, máximo), metas (valor, mínimo, máximo) e lançamentos (valor realizado), apenas quando o indicador for de tipo inteiro.
- Registra em uma tabela de auditoria de arredondamento (`public.integer_rounding_log`, somente leitura para administradores) qual registro, qual campo, valor antigo e valor novo, para revisão posterior.
- Não toca em registros de indicadores Percentual, Decimal ou Tempo.
- Adiciona gatilhos de validação em indicadores, metas e lançamentos que rejeitam gravações com casas decimais nos campos afetados, com mensagem de erro em português.

## 5. Backend

Além dos gatilhos, a camada de escrita da aplicação valida antes de enviar e converte a mensagem do banco em um aviso legível na tela, para o usuário entender exatamente qual campo está errado.

## 6. Cálculos

O cálculo de atingimento não muda: continua produzindo percentuais com casas decimais (ex.: 87,5%). Apenas a entrada de dados fica restrita.

## 7. Dados de demonstração

- Ajustar os dados de exemplo do aplicativo (`src/mocks/seed.ts`) para valores inteiros nos indicadores de tipo inteiro, quantidade, moeda e nota.
- Ajustar a rotina de dados de demonstração do banco para gerar valores inteiros nesses casos.

## 8. Validação final

- Cadastrar indicador de Moeda e confirmar recusa de R$ 100.000,50 e aceitação de R$ 100.000.
- Cadastrar indicador Percentual e confirmar que 87,5% é aceito.
- Conferir na tabela de auditoria quais registros foram arredondados e que as contagens de indicadores, metas e lançamentos permanecem iguais.

## Detalhes técnicos

- Nova função em `src/lib/format.ts` (ou `src/lib/value-rules.ts`): `requiresInteger(value_type)` e `validateNumericValue(value, value_type)`.
- Telas alteradas: `indicadores.novo.tsx`, `indicadores.$id.editar.tsx`, `metas.tsx`, `lancamentos.novo.tsx`, além de `import-indicators-dialog.tsx` para validar valores importados.
- Escrita: validação em `src/lib/supabase-data.ts` (indicator/target/entry) e no store local.
- Banco: gatilhos `BEFORE INSERT OR UPDATE` em `indicators`, `targets` e `indicator_entries`, consultando `indicators.value_type`. No banco o enum de tipos cobre inteiro, decimal, percentual e moeda — quantidade, nota e tempo existem só na aplicação e ficam validados na camada de aplicação.
