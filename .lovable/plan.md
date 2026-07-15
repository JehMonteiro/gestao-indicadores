## Plano

1. **Recarregar dados após salvar lançamentos e metas**
   - Depois de cadastrar um lançamento, buscar novamente os dados do backend e hidratar a loja local antes/depois da navegação.
   - Fazer o mesmo ao salvar/excluir metas, para que os painéis usem os registros persistidos mais recentes.

2. **Corrigir seleção do “último” lançamento/meta nos painéis**
   - Ajustar “Visão geral”, “Meu painel” e “Meus indicadores” para escolher o registro mais recente por período/data, em vez de depender da ordem atual do array.
   - Considerar lançamentos `aprovado` nos indicadores consolidados, mantendo rascunhos/enviados fora dos KPIs finais.

3. **Associar meta correta ao lançamento**
   - Nas métricas, procurar a meta do mesmo indicador, período e empresa do lançamento.
   - Se não houver meta exata, usar fallback por indicador/período e depois a mais recente.

4. **Validar o fluxo principal**
   - Conferir que um novo lançamento aprovado aparece em “Lançamentos” e altera “Visão geral” / “Meu painel”.
   - Conferir que mudanças em metas impactam os percentuais calculados.