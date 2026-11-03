# Cancelamentos reais por mês

## O que mudar
- Substituir o cartão compacto “Cancelamentos × faturamento” por **valor dos pedidos cancelados**, quantidade e **valor cancelado ÷ faturamento pago do mesmo mês**. Essa relação não é a taxa oficial de reputação nem perda líquida ou estorno confirmado.
- Apresentar os meses do período selecionado, com comparação ao mês anterior. Mês corrente limitado a ontem e identificado como parcial; não comparar um mês parcial com um mês completo.
- Mostrar R$ 0 e 0% quando a leitura completa comprovar zero cancelamentos e houver faturamento positivo, mesmo em séries constantes. Sem faturamento, mostrar o valor cancelado e informar que não há base para percentual.
- Manter as outras correlações e o visual atual. Os indicadores de Preço continuam usando planilhas.

## Origem dos dados
- Os registros encontrados para AMERICAFERRAMENTAS têm somente taxa histórica de reputação zero, sem valores de pedidos cancelados comprovados; isso não permite calcular o montante financeiro.
- Os resumos sincronizados de outras lojas têm valores diários, mas não garantem cobertura mensal completa. Não serão usados como prova de um mês fechado.
- Usar a leitura de pedidos da API da própria loja, com autorização existente e cobertura integral do mês. Faturamento e cancelamentos do cartão virão dessa mesma leitura, sem combinar faturamento importado com cancelamentos da API.
- **AMERICAFERRAMENTAS está sem conexão ativa identificada:** a tela informará “Conecte a loja para consultar cancelamentos reais”, em vez de inventar zero. Os valores dessa loja só poderão ser verificados após sua autorização no Mercado Livre.

## Detalhes técnicos
- Estender `ml-analise-loja` com modo mensal limitado a um mês por chamada, preservando permissões, escopo da loja, paginação completa, deduplicação e ausência de dados de compradores na resposta.
- Somar os valores informados de pedidos `cancelled` separadamente do faturamento dos pedidos `paid`, por mês de criação do pedido e status atual. Valor ausente não vira zero; a resposta informa a cobertura e não chama cancelamento de prejuízo ou estorno.
- Criar calculador puro e apresentação mensal reutilizável nas sínteses de Visão geral e Publicidade, com consultas sob demanda e reutilização das respostas. Remover apenas a síntese de Pearson dos cancelamentos; a matriz detalhada permanece associação identificada.
- Atualizar contratos e regras de arquitetura, sem criar armazenamento de pedidos ou alterar permissões.

## Verificação
- Testar soma de pedidos cancelados, deduplicação, zero comprovado sem variação, valor ausente, denominador zero, limites mensais e mês parcial.
- Conferir a leitura e os valores na tela em uma loja conectada; conferir o aviso de conexão na AMERICAFERRAMENTAS. A conferência dos valores reais da AMERICAFERRAMENTAS permanece dependente de sua conexão.