# Validação das melhorias aprovadas — CND27

## Conferência da pré-visualização (20/10/2026)

Sessão autenticada, seleção CND27, Resumo, filtro 30D: **20/09/2026–19/10/2026**. Nenhuma alteração em registros ou reimportação.

Comparação entre resposta da consulta diária real e tela:
- 30 dias com registro de 30 dias do período.
- Faturamento total: R$ 76.153,06.
- Média por dia: R$ 2.538,44 (tela arredondada para R$ 2.538).
- Recorde: 07/10/2026, R$ 5.904,72 (tela R$ 5.905).
- Mediana diária observada na tela: R$ 2.134.
- Sete dias da semana visíveis, normalizados por 4 a 5 ocorrências, sem pesos horários.
- Diagnóstico: 0,52% de investimento, requisito financeiro do Tier 3, distância de 0,73 p.p. até Tier 2; Meta Peregrinus 3% separada.
- Nenhuma exceção de execução no fluxo. 167 testes passaram em 30 arquivos.

Esta é validação painel × dados gravados, não certificação painel × conta Mercado Livre. O recorte não corresponde ao outubro isolado do documento.

## Matriz técnica de origem (confidencial; não exibida na interface)

| Indicador | Campos reais | Cálculo e ressalva |
|---|---|---|
| Média por dia | sellers_kpi_daily.data, tgmv_lc | Soma no intervalo ÷ dias calendário inclusivos; datas ausentes continuam lacunas no gráfico |
| Mediana | sellers_kpi_daily.data, tgmv_lc | Mediana dos totais diários observados, inclui zero registrado, exclui ausentes |
| Recorde | sellers_kpi_daily.data, tgmv_lc | Maior soma diária no intervalo e sua data |
| Faturamento × investimento | sellers_kpi_daily.data, tgmv_lc, inv_pads | Um ponto por dia, sem fallback mensal; mês incompleto hachurado |
| Tráfego semanal | sellers_kpi_daily.data, visits, tsi | Visitas/unidades por ocorrências observadas, conversão soma tsi ÷ soma visits; unidades não equivalem necessariamente a pedidos |
| ROAS | tgmv_lc_pads, inv_pads da base escolhida para o período | Soma das vendas atribuídas ÷ soma investimento; cartão Resumo respeita a base do filtro, Publicidade usa diário |
| ACOS | inv_pads, tgmv_lc_pads | Soma investimento ÷ soma vendas atribuídas × 100; preservado |
| TACOS | inv_pads, tgmv_lc | Soma investimento ÷ soma faturamento bruto × 100; inverso não é retorno atribuível a Ads |
| CPA existente | inv_pads, tsi_pads | Origem da razão de cada registro; média exibida existente foi preservada nesta aprovação, requer validação ponderada separada |
| Requisito de investimento | sellers_kpi_daily.data, inv_pads, tgmv_lc | Razão dos totais dos 30 dias calendário até o último registro; sem fallback mensal; 0,5/1,25/2,5% são apenas o requisito financeiro |
| Meta Peregrinus | Meta interna documentada | 3% sobre faturamento bruto em 30 dias, distinta dos requisitos dos tiers |
| CPC | Cliques pagos ausentes no caminho atual | Removido proxy investimento/visitas; não exibir valor sem relatório de cliques |
| ROI e ACOS máximo | Custos reais ausentes | Não calcular margem com hipótese de custo de 55% ou tarifa de 24,4% |

## Pendências externas

- Product Ads completo de setembro/outubro para conferir investimento, vendas atribuídas e cliques. Nenhum R$ 333,51 ou 512 cliques foi gravado a partir do PDF.
- Definição do período e fonte de validação: 01–19/10 ou 01–20/10.
- Custos da mercadoria, tarifas, frete e impostos para ROI/ACOS de equilíbrio.
- Exportação horária real para eventual volta da grade horária.
- Conciliação não é importada hoje; a regra de filtragem por tipo de venda e operação só se aplica à futura integração desse relatório. Não substituir unidades/pedidos atuais por 574/437 do PDF.
- Documentação oficial do Marketplace não foi verificada nesta alteração; tabela de tiers segue os critérios fornecidos pelo usuário.