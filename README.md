# Indicator Navigator

Crie uma aplicação web completa chamada provisoriamente de “Gestão de Indicadores”.

O sistema será utilizado por colaboradores internos de uma empresa e por usuários vinculados a unidades franqueadas.

O objetivo é permitir que cada setor cadastre, acompanhe e gerencie seus próprios indicadores, metas e resultados. Um mesmo usuário poderá participar de mais de um setor e poderá ter funções diferentes em cada setor.

Não crie apenas um protótipo visual. Crie uma aplicação funcional, responsiva, com autenticação, banco de dados, permissões reais, dashboards, formulários, filtros, histórico e auditoria.

==================================================

1. TECNOLOGIA E ESTRUTURA

==================================================

Utilize:

- React com TypeScript.

- Interface moderna, corporativa e responsiva.

- Lovable Cloud como backend principal.

- Caso o projeto esteja conectado ao Supabase, utilize Supabase Auth, PostgreSQL, Storage, Edge Functions e Row Level Security.

- Componentes reutilizáveis.

- Validação de formulários no frontend e também no backend.

- Datas e horários no padrão brasileiro.

- Valores monetários em Real brasileiro.

- Não armazenar permissões apenas no localStorage.

- Não confiar apenas na ocultação de elementos da interface.

- Implementar todas as permissões no banco de dados por meio de RLS e validação no backend.

A aplicação deverá ser preparada para crescimento, permitindo futuramente integrações com ERP, CRM, planilhas, APIs e ferramentas de BI.

==================================================

2. TIPOS DE USUÁRIOS

==================================================

Criar os seguintes perfis globais:

1. Superadministrador

- Possui acesso total ao sistema.

- Gerencia usuários, setores, franquias, indicadores, configurações e permissões.

- Visualiza todos os resultados.

- Pode corrigir cadastros e acessar logs de auditoria.

2. Administrador corporativo

- Gerencia usuários internos e franqueados.

- Gerencia setores e unidades franqueadas.

- Visualiza os indicadores corporativos.

- Pode criar relatórios consolidados.

- Não pode alterar configurações técnicas exclusivas do superadministrador.

3. Gestor de setor

- Pode gerenciar somente os setores nos quais possui a função de gestor.

- Pode criar, editar, arquivar e acompanhar indicadores do seu setor.

- Pode definir metas, responsáveis, periodicidade e regras de aprovação.

- Pode visualizar os usuários pertencentes ao seu setor.

- Pode aprovar ou rejeitar lançamentos do setor.

4. Colaborador interno

- Pode pertencer a mais de um setor.

- Visualiza os indicadores atribuídos a ele ou aos seus setores.

- Pode lançar resultados quando for responsável.

- Pode acompanhar suas metas e seu desempenho.

- Não pode visualizar dados de setores dos quais não participa.

5. Gestor de franquia

- Visualiza os dados das unidades franqueadas sob sua responsabilidade.

- Pode gerenciar usuários da sua franquia, conforme autorização.

- Pode acompanhar, aprovar ou lançar indicadores da franquia.

- Não pode visualizar dados de outras franquias.

6. Franqueado

- Visualiza somente os indicadores liberados para sua unidade.

- Pode lançar resultados dos indicadores atribuídos.

- Visualiza metas, prazos, evolução e histórico da própria unidade.

- Não pode acessar dados internos restritos da empresa.

7. Visualizador ou auditor

- Possui acesso somente para leitura.

- O acesso deve respeitar os setores e franquias aos quais estiver vinculado.

Os perfis globais não substituem os papéis dentro dos setores.

Um usuário poderá ser:

- Gestor no setor Comercial.

- Colaborador no setor Marketing.

- Visualizador no setor Financeiro.

==================================================

3. ESTRUTURA DE SETORES

==================================================

Criar um módulo de setores.

Cada setor deverá possuir:

- Nome.

- Código.

- Descrição.

- Cor de identificação.

- Ícone.

- Status ativo ou inativo.

- Data de criação.

- Gestores.

- Membros.

- Configuração de aprovação de resultados.

- Configuração de visibilidade.

- Ordem de exibição.

Exemplos de setores:

- Comercial.

- Marketing.

- Financeiro.

- Administrativo.

- Operações.

- Expansão.

- Recursos Humanos.

- Suporte ao Franqueado.

Um usuário poderá ser associado a vários setores através de uma tabela de relacionamento muitos-para-muitos.

Em cada vínculo entre usuário e setor, registrar:

- Usuário.

- Setor.

- Papel no setor.

- Data de entrada.

- Status.

- Quem realizou a inclusão.

==================================================

4. ESTRUTURA DE FRANQUIAS

==================================================

Criar um módulo de unidades franqueadas.

Cada franquia deverá possuir:

- Nome da unidade.

- Código da unidade.

- Razão social.

- Nome fantasia.

- CNPJ, como campo opcional.

- Cidade.

- Estado.

- Região.

- Data de início.

- Status.

- Gestor responsável.

- Franqueados e colaboradores vinculados.

- Observações.

Um usuário poderá estar vinculado a uma ou mais franquias.

Criar relacionamento muitos-para-muitos entre usuários e franquias, contendo:

- Usuário.

- Franquia.

- Papel na franquia.

- Status.

- Data de início do vínculo.

==================================================

5. CADASTRO DE INDICADORES

==================================================

Cada setor poderá cadastrar seus próprios indicadores.

O formulário de indicador deverá possuir:

- Nome do indicador.

- Código identificador.

- Descrição.

- Objetivo do indicador.

- Setor responsável.

- Categoria.

- Pilar estratégico.

- Público do indicador:

  - Colaboradores internos.

  - Franqueados.

  - Ambos.

- Abrangência:

  - Corporativo.

  - Setor.

  - Franquia.

  - Usuário individual.

- Responsáveis pelo indicador.

- Tipo de valor:

  - Número inteiro.

  - Número decimal.

  - Percentual.

  - Moeda.

  - Tempo.

  - Quantidade.

  - Sim ou não.

  - Nota de avaliação.

  - Texto qualitativo.

- Unidade de medida.

- Periodicidade:

  - Diária.

  - Semanal.

  - Quinzenal.

  - Mensal.

  - Trimestral.

  - Semestral.

  - Anual.

- Data de início.

- Data de encerramento opcional.

- Peso do indicador.

- Fonte dos dados.

- Forma de preenchimento:

  - Manual.

  - Importação.

  - Integração.

  - Cálculo automático.

- Regra de desempenho:

  - Quanto maior, melhor.

  - Quanto menor, melhor.

  - Faixa ideal.

  - Meta exata.

- Valor da meta.

- Valor mínimo.

- Valor máximo.

- Limite de atenção.

- Limite crítico.

- Necessita aprovação.

- Permite anexar comprovantes.

- Instruções de preenchimento.

- Status:

  - Rascunho.

  - Ativo.

  - Pausado.

  - Arquivado.

Permitir que um indicador seja compartilhado com mais de um setor, mas sempre mantendo um setor proprietário.

Somente gestores do setor proprietário e administradores poderão alterar a estrutura principal do indicador.

==================================================

6. METAS

==================================================

Criar um módulo de metas separado dos indicadores.

Uma meta poderá ser definida para:

- Toda a empresa.

- Um setor.

- Uma franquia.

- Um usuário.

- Um grupo de usuários.

- Um período específico.

Cada meta deverá possuir:

- Indicador.

- Tipo de escopo.

- Setor, franquia ou usuário relacionado.

- Período inicial.

- Período final.

- Valor da meta.

- Valor mínimo opcional.

- Valor máximo opcional.

- Peso.

- Observações.

- Criador.

- Data de criação.

Permitir metas diferentes para o mesmo indicador.

Exemplo:

O indicador “Faturamento mensal” poderá ter:

- Meta de R$ 100.000 para a franquia A.

- Meta de R$ 80.000 para a franquia B.

- Meta de R$ 500.000 para o setor Comercial corporativo.

==================================================

7. LANÇAMENTO DE RESULTADOS

==================================================

Criar uma área chamada “Lançamentos”.

O usuário deverá visualizar somente os indicadores para os quais possui autorização.

Cada lançamento deverá registrar:

- Indicador.

- Período de referência.

- Usuário responsável.

- Setor.

- Franquia, quando aplicável.

- Valor realizado.

- Meta correspondente.

- Comentário.

- Justificativa.

- Arquivo comprobatório opcional.

- Data do lançamento.

- Última atualização.

- Status:

  - Rascunho.

  - Enviado para aprovação.

  - Aprovado.

  - Rejeitado.

  - Atrasado.

- Aprovador.

- Data da aprovação.

- Motivo da rejeição.

Permitir salvar como rascunho antes do envio.

Quando um lançamento aprovado precisar ser alterado, não sobrescrever silenciosamente o dado anterior. Criar uma nova revisão e manter o histórico.

Impedir lançamentos duplicados para o mesmo indicador, escopo e período, salvo quando forem revisões autorizadas.

==================================================

8. FLUXO DE APROVAÇÃO

==================================================

Quando um indicador exigir aprovação:

1. O responsável preenche o resultado.

2. O lançamento fica como rascunho.

3. O usuário envia para aprovação.

4. O gestor recebe o lançamento pendente.

5. O gestor pode aprovar ou rejeitar.

6. Em caso de rejeição, o motivo será obrigatório.

7. O responsável poderá corrigir e reenviar.

8. Todas as ações deverão gerar registros no histórico.

Criar uma central de aprovações para gestores.

Exibir:

- Pendentes.

- Aprovados.

- Rejeitados.

- Atrasados.

- Filtros por setor, franquia, indicador, usuário e período.

==================================================

9. CÁLCULO DE DESEMPENHO

==================================================

Calcular automaticamente o percentual de atingimento.

Para indicadores em que quanto maior, melhor:

atingimento = valor realizado / meta * 100

Para indicadores em que quanto menor, melhor:

atingimento = meta / valor realizado * 100

Tratar divisão por zero corretamente.

Para indicadores de faixa ideal:

- Resultado dentro da faixa: meta atingida.

- Resultado fora da faixa: calcular o desvio em relação ao limite mais próximo.

Classificar o desempenho com parâmetros configuráveis:

- Atingido: 100% ou mais.

- Em atenção: entre 80% e 99,99%.

- Crítico: abaixo de 80%.

- Sem informação: não houve lançamento.

Permitir que o administrador altere esses limites nas configurações.

Criar um índice consolidado utilizando o peso dos indicadores.

Não utilizar média simples quando existirem pesos diferentes.

==================================================

10. DASHBOARDS

==================================================

Criar os seguintes dashboards:

A. Dashboard executivo

Disponível para administradores.

Mostrar:

- Total de indicadores ativos.

- Percentual de indicadores atingidos.

- Indicadores em atenção.

- Indicadores críticos.

- Indicadores sem lançamento.

- Evolução mensal.

- Resultado consolidado por setor.

- Resultado consolidado por franquia.

- Ranking de franquias.

- Indicadores com maior evolução.

- Indicadores com maior queda.

- Pendências de aprovação.

- Lançamentos atrasados.

B. Dashboard do setor

Mostrar:

- Indicadores do setor.

- Metas.

- Resultados.

- Evolução por período.

- Desempenho dos membros.

- Pendências.

- Indicadores críticos.

- Comparação entre períodos.

C. Dashboard da franquia

Mostrar:

- Indicadores disponíveis para a franquia.

- Resultado da unidade.

- Evolução.

- Metas atingidas.

- Metas em risco.

- Pendências de lançamento.

- Comparação com média geral, somente quando autorizada.

- Ranking, quando habilitado pelo administrador.

D. Meu dashboard

Mostrar:

- Meus indicadores.

- Indicadores dos meus setores.

- Minhas metas.

- Próximos prazos.

- Lançamentos pendentes.

- Resultados enviados.

- Histórico.

- Notificações.

Quando o usuário pertencer a mais de um setor, permitir:

- Visualização consolidada.

- Filtro por setor.

- Troca rápida de contexto no topo da interface.

==================================================

11. FILTROS E RELATÓRIOS

==================================================

Todos os dashboards deverão possuir filtros por:

- Período.

- Setor.

- Franquia.

- Região.

- Indicador.

- Categoria.

- Público.

- Responsável.

- Status.

- Tipo de resultado.

Criar relatórios exportáveis em:

- CSV.

- Excel, quando possível.

- PDF para relatórios executivos.

Criar uma página de relatório detalhado contendo:

- Nome do indicador.

- Definição.

- Meta.

- Resultado.

- Percentual de atingimento.

- Evolução.

- Responsáveis.

- Histórico de lançamentos.

- Comentários.

- Evidências.

==================================================

12. PÁGINAS DO SISTEMA

==================================================

Criar o seguinte menu lateral:

- Visão geral.

- Meu painel.

- Meus indicadores.

- Lançamentos.

- Aprovações.

- Setores.

- Franquias.

- Indicadores.

- Metas.

- Relatórios.

- Usuários.

- Auditoria.

- Configurações.

Exibir somente os menus permitidos para o usuário autenticado.

Criar as páginas:

- Login.

- Recuperação de senha.

- Primeiro acesso.

- Perfil do usuário.

- Dashboard.

- Lista de indicadores.

- Detalhes do indicador.

- Cadastro e edição de indicador.

- Lançamento de resultado.

- Central de aprovações.

- Gestão de setores.

- Gestão de franquias.

- Gestão de usuários.

- Relatórios.

- Auditoria.

- Configurações.

==================================================

13. BANCO DE DADOS

==================================================

Criar uma estrutura de banco de dados normalizada.

Tabelas principais:

1. profiles

- id

- full_name

- email

- avatar_url

- global_role

- user_type

- phone

- status

- created_at

- updated_at

2. sectors

- id

- name

- code

- description

- color

- icon

- active

- created_by

- created_at

- updated_at

3. user_sectors

- id

- user_id

- sector_id

- sector_role

- active

- joined_at

- created_by

4. franchises

- id

- name

- code

- legal_name

- document

- city

- state

- region

- status

- start_date

- created_at

- updated_at

5. user_franchises

- id

- user_id

- franchise_id

- franchise_role

- active

- joined_at

6. indicator_categories

- id

- name

- description

- sector_id

- active

7. indicators

- id

- name

- code

- description

- objective

- owner_sector_id

- category_id

- strategic_pillar

- audience

- scope

- value_type

- unit

- frequency

- direction

- data_source

- input_method

- default_target

- minimum_value

- maximum_value

- warning_threshold

- critical_threshold

- weight

- requires_approval

- allows_attachment

- instructions

- start_date

- end_date

- status

- created_by

- created_at

- updated_at

- deleted_at

8. indicator_shared_sectors

- id

- indicator_id

- sector_id

9. indicator_assignments

- id

- indicator_id

- user_id

- sector_id

- franchise_id

- assignment_role

- active

10. indicator_targets

- id

- indicator_id

- scope_type

- user_id

- sector_id

- franchise_id

- period_start

- period_end

- target_value

- minimum_value

- maximum_value

- weight

- notes

- created_by

- created_at

11. indicator_entries

- id

- indicator_id

- target_id

- user_id

- sector_id

- franchise_id

- period_start

- period_end

- actual_value

- qualitative_value

- comment

- justification

- status

- submitted_at

- approved_by

- approved_at

- rejection_reason

- revision_number

- previous_entry_id

- created_at

- updated_at

12. entry_attachments

- id

- entry_id

- file_name

- file_url

- file_type

- uploaded_by

- created_at

13. notifications

- id

- user_id

- title

- message

- type

- link

- read_at

- created_at

14. audit_logs

- id

- user_id

- action

- entity_type

- entity_id

- previous_data

- new_data

- ip_address

- created_at

15. system_settings

- id

- key

- value

- description

- updated_by

- updated_at

Utilizar enums ou validações consistentes para status, funções, públicos, periodicidades e tipos de valor.

Adicionar índices nas colunas utilizadas em filtros e relacionamentos.

Adicionar restrições para evitar registros duplicados.

Utilizar exclusão lógica nos registros importantes.

==================================================

14. REGRAS DE SEGURANÇA E RLS

==================================================

Criar políticas de Row Level Security para todas as tabelas sensíveis.

Regras obrigatórias:

- Superadministrador pode acessar todos os registros.

- Administrador corporativo pode acessar todos os dados operacionais.

- Gestor de setor acessa apenas os setores nos quais é gestor.

- Membro de setor acessa somente os setores aos quais pertence.

- Usuário vinculado a várias áreas acessa os dados de todas as áreas autorizadas.

- Franqueado acessa apenas dados das próprias franquias.

- Gestor de franquia acessa somente franquias sob sua responsabilidade.

- Indicadores internos não podem ser visualizados por franqueados.

- Indicadores destinados a franqueados não devem liberar informações internas indevidas.

- Usuário comum não pode alterar seu próprio perfil de permissão.

- Somente administradores podem criar funções globais administrativas.

- Aprovações devem ser feitas somente por usuários autorizados.

- Arquivos devem respeitar as mesmas permissões do lançamento relacionado.

- Logs de auditoria não podem ser alterados por usuários comuns.

Criar funções auxiliares seguras para verificar:

- Se o usuário é administrador.

- Se o usuário pertence ao setor.

- Se o usuário é gestor do setor.

- Se o usuário pertence à franquia.

- Se o usuário pode visualizar determinado indicador.

- Se o usuário pode editar determinado lançamento.

Não colocar lógica sensível exclusivamente no frontend.

==================================================

15. NOTIFICAÇÕES

==================================================

Criar notificações internas para:

- Novo indicador atribuído.

- Meta próxima do vencimento.

- Lançamento pendente.

- Lançamento atrasado.

- Resultado enviado para aprovação.

- Resultado aprovado.

- Resultado rejeitado.

- Indicador entrando em situação crítica.

Criar uma central de notificações no cabeçalho.

Permitir marcar como lida.

Preparar a estrutura para envio futuro por e-mail e WhatsApp, mas não integrar serviços externos nesta primeira versão.

==================================================

16. EXPERIÊNCIA E DESIGN

==================================================

Criar um design:

- Moderno.

- Profissional.

- Corporativo.

- Minimalista.

- Com boa hierarquia visual.

- Fácil para usuários com pouca familiaridade tecnológica.

Utilizar:

- Menu lateral recolhível.

- Cabeçalho com usuário, notificações e seletor de contexto.

- Cards de indicadores.

- Tabelas com paginação.

- Gráficos de linha, barras e rosca.

- Barras de progresso.

- Tags de status.

- Tooltips para explicar métricas.

- Estados vazios com orientações.

- Skeleton loading.

- Mensagens claras de sucesso e erro.

- Confirmação antes de ações destrutivas.

Cores de status:

- Verde para atingido.

- Amarelo para atenção.

- Vermelho para crítico.

- Cinza para sem informação.

- Azul para informações gerais.

Permitir personalização futura de:

- Logotipo.

- Nome da plataforma.

- Cor principal.

- Cor secundária.

- Imagem de login.

==================================================

17. DADOS DE DEMONSTRAÇÃO

==================================================

Criar dados iniciais apenas para demonstração:

Setores:

- Comercial.

- Marketing.

- Operações.

- Financeiro.

- Suporte ao Franqueado.

Franquias:

- Unidade Campinas.

- Unidade Belo Horizonte.

- Unidade Porto Alegre.

Indicadores de exemplo:

- Faturamento mensal.

- Número de novos clientes.

- Taxa de conversão.

- Ticket médio.

- Índice de satisfação.

- Tempo médio de atendimento.

- Número de leads gerados.

- Taxa de renovação.

- Produtos por cliente.

- Pendências operacionais.

Criar usuários de exemplo com diferentes níveis de acesso.

Os dados demonstrativos devem ser facilmente removíveis.

==================================================

18. CRITÉRIOS DE ACEITE

==================================================

Antes de considerar a aplicação concluída, validar:

1. Um usuário consegue participar de mais de um setor.

2. O mesmo usuário pode ser gestor em um setor e membro em outro.

3. Um gestor não consegue editar indicadores de setores sem autorização.

4. Um franqueado não consegue visualizar dados de outra franquia.

5. Indicadores internos não aparecem para usuários franqueados.

6. Indicadores destinados a ambos os públicos aparecem corretamente.

7. Os resultados são calculados com base nas metas corretas.

8. O histórico de alterações é preservado.

9. Os lançamentos podem passar por aprovação.

10. O dashboard muda conforme as permissões do usuário.

11. Os filtros funcionam em conjunto.

12. As políticas RLS impedem acesso direto indevido aos dados.

13. O sistema funciona em desktop, tablet e celular.

14. Não existem páginas importantes utilizando apenas dados mockados.

15. Erros de permissão mostram uma mensagem amigável sem expor detalhes técnicos.

Comece criando a estrutura do banco de dados, autenticação e permissões.

Depois implemente o layout principal e os módulos.

Não avance utilizando somente dados fictícios se o backend já estiver conectado.

Ao finalizar cada módulo, revise as permissões, estados de carregamento, estados vazios, mensagens de erro e responsividade.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gestao-indicadores.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f043de5e-8b67-4c38-a747-9761bbbd4f81).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
