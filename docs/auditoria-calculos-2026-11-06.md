# Auditoria do painel — lista para correção

**Data:** 06/11/2026. **Responsável pela solicitação:** Samir Santos — Ecom Solutions.

## Resultado e limites

Foram revisadas as entradas de todas as seções principais, seus cálculos e caminhos de leitura, além de Carteira, Gestão da carteira e Multilojas. A revisão encontrou problemas de cálculo, interpretação, ausência de medição e isolamento entre sessões. **Esta entrega é uma lista para correção: nenhuma regra de negócio foi alterada e nada foi publicado.**

“Confirmado” significa que o defeito foi identificado no caminho ativo do código; não significa que ocorreu em todas as lojas. Os exemplos numéricos são sintéticos, salvo as observações de tela expressamente identificadas. “Condicional” depende de volume ou sequência de uso. “Validar” indica evidência insuficiente para afirmar o erro definitivo.

### Verificações realizadas

- As 12 seções principais foram abertas com sessão autorizada e AUTOPECASLONDRINA: Resumo, Reputação, Preço, Publicidade, Oportunidades, Logística, Qualidade, Clips, Full, Correlações, Metas e Perguntas. Não apareceu a mensagem de falha do painel nem erro de execução nessa passagem. Isso não certifica todos os resultados, todas as subanálises ou todas as lojas.
- Na tela real, Qualidade mostrou **Score CDP 36**; o caminho de cálculo usa esse valor fixo. Clips mostrou a comparação **6,04% × 5,50%**, com unidades da loja apresentadas como pedidos. Correlações mostrou Full sem dados e orientação de “maior impacto”, coerentes com os defeitos abaixo.
- Suíte existente executada pelo revisor: **518 testes aprovados e 1 ignorado**. Testes aprovados não invalidam os defeitos que ainda não possuem reprodução específica nas suítes.
- Registros do aplicativo publicado, entre 30/10 e 06/11 às 04:45 UTC: **200 rejeições não tratadas do tipo AbortError**, 195 na página inicial e 5 em Admin. O motivo registrado é disputa de bloqueio entre solicitações. A causa e o efeito sobre a sessão ainda precisam de reprodução; não é evidência de ataque.
- O teste obrigatório de acesso público foi executado. Ele acessa somente documentos e arquivos públicos; **não mede capacidade do painel autenticado**.

## Ordem de correção recomendada

1. Isolamento de dados na troca de usuário e taxas/pontuações enganosas de Qualidade.
2. Conversão de Clips e segurança da recomendação de reposição.
3. Ausência de medição, datas e denominadores em Resumo, Publicidade, Metas, Carteira e Multilojas.
4. Última posição, leituras completas, referências entre pares e redação das análises.
5. Reproduzir os erros de bloqueio de sessão e validar casos condicionais antes de fechar a auditoria.

## Lista por seção

### Acesso e estabilidade

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 01 | Urgente · confirmado no código; ocorrência depende da sessão | A saída limpa dados salvos, mas não as consultas em memória. Ao sair de A e entrar em B sem fechar a aplicação, resultados anteriores podem reaparecer ou ser salvos para B. Não foi demonstrada nova autorização no servidor. | Cancelar e limpar consultas na mudança de identidade, antes de restaurar dados; separar chaves por usuário e testar troca de conta, falha de rede e saída em outra aba. |
| 02 | Alta · erro registrado; causa a validar | 200 rejeições não tratadas por disputa de bloqueio de solicitações no aplicativo publicado. Não ocorreu durante a passagem autenticada desta auditoria. | Reproduzir concorrência entre renovação de sessão, abas e solicitações; tratar cancelamento esperado e confirmar recuperação sem perder sessão. |

### Qualidade

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 03 | Urgente · confirmado | Taxa de reclamações fracionária é exibida e avaliada como percentual: **0,06 vira 0,06%, quando significa 6%**. Pode parecer saudável e pontuar quase 99/100. | Unificar escala, formatação e limites nos pilares de Logística e Reputação do Quality Index; identificar referências internas separadamente das oficiais. |
| 04 | Urgente · confirmado | Ausência de reclamações vira zero; nível desconhecido ganha 50 pontos; SEO sem evidência pode ganhar pontuação e “Todos os critérios OK”. | Preservar desconhecido e cobertura por pilar; suspender nota e conformidade sem evidência obrigatória. |
| 05 | Alta · confirmado | Score CDP recebe **36** sempre que há faturamento em promoção; score de 1/100 pode virar 100/100 por detecção automática de escala; referências fixas não demonstram mesma vertical e período. | Usar score medido ou indicador interno com fórmula explícita; escala definida por contrato; referência compatível e datada. |
| 06 | Alta · confirmado | McKinsey descarta zeros válidos. Dimensões `[100,0,0,0]` viram média **100**, em vez de **25**, favorecendo recomendação de investimento. | Distinguir zero medido de desconhecido, incluir zeros na média e exigir cobertura mínima para classificar. |

### Clips

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 07 | Urgente · confirmado | Conversão Clips usa pedidos/visitas; conversão geral usa unidades/visitas e chama unidades de pedidos. Com 100 pedidos, 200 unidades e 1.000 visitas, a loja deveria ter 10%, não 20%. A diferença sustenta conclusão causal sobre vídeo. | Comparar pedidos com pedidos, nas mesmas datas medidas; se só houver unidades, rotular unidades/visita e retirar comparação e causalidade. |
| 08 | Alta · confirmado | Falta de performance positiva é interpretada como anúncio sem vídeo. Vídeo publicado sem visitas pode entrar como ausência de Clip e oportunidade perdida. | Separar publicação confirmada, performance registrada e situação desconhecida; não concluir ausência de vídeo sem inventário. |

### Resumo

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 09 | Alta · confirmado no histórico | Período anterior incompleto pode servir de base integral. R$100/dia em 30 dias contra apenas 10 dias disponíveis informa **+200%**, apesar do ritmo idêntico. | Validar cobertura dos dois períodos; comparar recortes equivalentes ou suspender variação integral. |
| 10 | Alta · confirmado no histórico | Visitas ausentes viram zero; faturamento completo é dividido por visitas parciais. Dois dias com R$1.000 cada e visitas `[100, desconhecido]` geram R$20/visita sem denominador completo. | Preservar ausência; parear numeradores e denominadores nas mesmas datas medidas e informar cobertura. |

### Publicidade

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 11 | Alta · confirmado no histórico | Leituras com erro e métricas ausentes podem terminar como zeros/vazio. Receita Ads desconhecida com investimento R$100 pode produzir ROAS 0 e ACOS 0%. | Propagar erros; razões e totais desconhecidos ficam indisponíveis; exigir cobertura compatível. |
| 12 | Alta · confirmado na gestão | TACOS combina investimento dos 30 dias atuais com faturamento de outra posição de 30 dias, sem confirmar alinhamento. R$300/R$10 mil = 3%; posição antiga de R$20 mil produz 1,5%. | Obter faturamento nas mesmas datas medidas do investimento; sem alinhamento confirmado, não calcular TACOS. |
| 13 | Alta · confirmado na gestão | Unidades desconhecidas são tratadas como nenhuma venda, permitindo alerta de “investidos sem venda”. Outras somas também substituem desconhecido por zero. | Exigir unidades medidas iguais a zero para esse alerta e cobertura válida para ROAS, CTR e conversão. |
| 14 | Alta · confirmado no caminho histórico; truncamento condicional | Ranking histórico anuncia produtos mais vendidos no período, mas ordena por campo identificado em outra apresentação como visitas; usa última posição e limita 5.000 linhas em ordem crescente antes de deduplicar. | Confirmar unidade do campo, corrigir rótulo/ordenador e ler universo completo. O painel atual de vendidos acumulados tem ressalva correta e não deve ser confundido com esse caminho. |

### Correlações

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 15 | Alta · confirmado | Três pares da tabela geral procuram propriedades que os dados entregues não possuem. Full usa um nome diferente do contrato, por isso pode aparecer “Sem dados” mesmo disponível. | Corrigir o mapeamento de Full; manter outros pares somente quando houver métricas realmente medidas, sem fabricar conversão. |
| 16 | Alta · confirmado | Tabela geral aceita Pearson com três observações, devolve zero para séries constantes e recomenda “maior impacto”. Associação não comprova efeito nem mecanismo do algoritmo. | Reutilizar Pearson com pelo menos sete pares e variação; resultado indefinido permanece indisponível; retirar linguagem causal. A matriz explicativa de sinergia já possui essas salvaguardas. |

### Preço

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 17 | Alta · confirmado | Leitura estratégica chama composição das faixas de preço de percentual de visitas, sem unidade confirmada nem vínculo com tráfego. | Usar “participação na composição das faixas de preço”; não inferir visitas ou queda de conversão. |
| 18 | Alta · confirmado | Variação de preço rival e faturamento próprio vira elasticidade e causalidade; faturamento médio vira liderança de categoria. Metades desiguais distorcem crescimento: dois meses de R$100 mil contra três iguais indicam +50%. | Comparar janelas equivalentes; apresentar variações observadas sem atribuição; retirar liderança sem participação de mercado medida. |
| 19 | Alta · confirmado | 30% é apresentado como gatilho de penalização/rebaixamento automático, sem evidência de ranking no fluxo. | Identificar 30% como limiar interno de investigação, não regra oficial nem prova de penalização. |

### Oportunidades e campanhas

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 20 | Alta · confirmado no histórico | Consolidação mistura descrição recente com máximos antigos de pedidos, estoque e descontos; participação ativa antiga pode permanecer ativa. Cria uma posição que nunca existiu. | Preservar a última posição integral; máximos históricos em campos separados; deduplicar ofertas dentro da mesma data. |
| 21 | Alta · confirmado | Cofinanciadas escolhe maior desconto histórico, não a posição mais recente. Desconto antigo de 20% pode substituir o atual de 5%. | Priorizar data recente; desempatar descontos apenas na mesma data e com critério explícito. |
| 22 | Alta · condicional ao volume | Elegibilidade e qualidade fazem leitura única sem paginação. Limite de resposta pode excluir anúncios ou posições recentes e contaminar oportunidades/McKinsey. | Ler todas as páginas com ordem estável ou última posição por anúncio no servidor; indicar cobertura e rejeitar leitura incompleta. |

### Logística e reposição

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 23 | Alta · confirmado | Cards usam última posição; gráfico usa período selecionado. Janeiro R$900 sem Full e fevereiro R$100 todo Full geram card **100%**, embora o período tenha **10%**. | Somar bases de todo o período ou rotular “última medição” e mostrar a data; manter ausências. |
| 24 | Alta · confirmado | Cenário “Migrar 10 p.p. para Full” calcula 10% dos outros modais, não do total; aumento de conversão de 30% é assumido. Com GMV R$1.000 e residual R$500, migra R$50 em vez de R$100. | Retirar promessa ou usar cenário explicitamente hipotético; 10 p.p. = mínimo entre 10% do total e residual; efeito não é comprovado. |
| 25 | Urgente para validar · conflito de unidade | Reposição no caminho alternativo usa `pedidos_7d` como consumo, mas outras apresentações o identificam como visitas. 70 visitas e sete unidades/semana com estoque 14 podem gerar cobertura 1,4 dia em vez de 14 e envio 266 em vez de 14. A unidade precisa de confirmação; não afirmar demanda. | Bloquear recomendação quantitativa sem unidade confirmada; exigir unidades efetivamente vendidas. O caminho conectado bem-sucedido usa unidades e não é o alvo desse achado. Falha de leitura não deve autorizar inferência alternativa. |

### Full e referências da carteira

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 26 | Alta · confirmado; volume também condiciona amostra | Taxa de Venda pode ampliar pares para outros subclusters quando o grupo é pequeno; limitações de leitura podem enviesar mediana. | Usar somente mesmo subcluster, excluir a própria loja e paginar; abaixo do mínimo, deixar referência indisponível. |
| 27 | Alta · confirmado | Deep Dive soma ausência como zero e gera baixa adesão Full/Ads/promoção ou loja ociosa sem medição. | Cobertura por métrica; proporções, variações e alertas somente com denominadores e janelas compatíveis. |
| 28 | Alta · confirmado | Comparação por vertical interpreta mês atual ausente como queda de 100%; erros podem parecer vazio ou carregamento eterno. | Meses desconhecidos permanecem indisponíveis; crescimento exige duas medições; exibir erro e carregamento separadamente. |
| 29 | Alta · confirmado | Mecanismos de desconto ocultam erros auxiliares, acionam leitura alternativa e fabricam zeros; receita pode virar “regular” sem composição medida. | Propagar erros, distinguir vazio de falha e preencher somente mecanismos medidos. |

### Metas

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 30 | Alta · confirmado | Mês sem medição vira realizado zero e atingimento 0%; estoque ainda não carregado pode parecer zero anúncios em risco. | Realizado desconhecido fica indisponível; exigir posição válida e distinguir carregamento, erro e medição zero. |

### Alertas e riscos

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 31 | Alta · confirmado | Mês corrente sem registro vira faturamento zero e “churn absoluto” de severidade alta. Ausências de taxas também viram zero. | Churn absoluto exige receita zero confirmada e cobertura corrente; ausência gera aviso de cobertura, não risco comercial inventado. |

### Perguntas

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 32 | Alta · mediana confirmada; cobertura condicional | Histórico anunciado como 90 dias lê no máximo 1.000 perguntas e pode preencher dias não cobertos com zero. Mediana par escolhe o elemento superior: `[0,5h;3h]` vira 3h, em vez de 1,75h. | Paginar ou limitar rótulo à cobertura confirmada; média dos dois elementos centrais para amostra par; informar base das respostas válidas. |

### Carteira, Gestão e Multilojas

| ID | Prioridade / certeza | Problema e impacto | Correção proposta |
|---|---|---|---|
| 33 | Alta · confirmado | Multilojas divide linhas canceladas por pedidos distintos e conta cancelados duas vezes quando incluídos na base. Um pedido pago e um cancelado com duas linhas podem virar 66,7%, em vez de 50%; com a opção ligada, podem virar 33,3%. | Deduplicar pedidos com identidade consistente; cancelados/total de pedidos, sem dupla contagem, independente do filtro financeiro. |
| 34 | Alta · condicional à existência de histórico | Gestão lê posições em ordem recente, mas uma sobrescrita por loja retém a mais antiga. Carteira de dados soma todas as posições de categorias enquanto KPI usa só a última: 100 anúncios em duas datas viram 200 no gráfico e 100 no KPI. | Preservar primeira posição da ordem recente ou selecionar última por loja; categorias e KPI devem usar a mesma data/base. São dois caminhos distintos a corrigir. |
| 35 | Alta · condicional ao volume | Gestão calcula universo e histórico sobre consultas limitadas a 5.000 linhas. 3.000 lojas × dois meses podem deixar apenas 2.000 linhas do mês anterior, ainda oferecido como completo. | Paginação completa e cobertura por período; rejeitar agregados parciais ou identificá-los claramente. |

## Pontos revisados sem novo defeito identificado no percurso examinado

- **Reputação:** estudo e perfil separam janelas, preservam taxas desconhecidas e identificam referências provisórias. Os defeitos de reclamações acima pertencem ao **Quality Index**, não a uma conclusão de que toda a seção de Reputação está incorreta.
- **Preço principal e concorrentes:** índice derivado é separado do BPC; comparação restrita a um produto de catálogo; não foi encontrada inferência de receita, visitas ou conversão de terceiros.
- **Promoções atuais:** participação atual não é usada para inventar atribuição histórica, ROAS ou ROI. Resultados financeiros continuam dependentes de vínculos e custos confirmados.
- **Comparação de anúncios, título e SWOT:** métricas desconhecidas preservadas e referências dos demais anúncios próprios; não foi identificado ranking oficial fabricado nesse percurso.
- **Full por produto:** alocação examinada usa receita diária por anúncio, restrições e pesos de demanda; não se apresenta como retorno financeiro ou quantidade a enviar. O achado de reposição é outro caminho.
- **Flex e envios:** cobertura e unidades separadas, comparações da mesma loja e localização confirmada quando exigida.
- **Clips técnico e ranking atual:** ausência preservada e pedidos distintos de unidades. O defeito está no comparativo agregado.
- **Financeiros examinados:** ROAS/ACOS usam razão de totais; não se encontrou média simples de ROAS nesses cálculos. A validade ainda depende de cobertura, datas e denominadores.

## Itens adicionais que não devem ser encerrados como “corrigidos” sem validação

- Reapresentação após revogação de permissão, sessão expirada e troca de conta devem ter teste autenticado específico, inclusive com falha de rede.
- Verificação de serialização examina apenas parte de estruturas complexas; não foi confirmado um resultado ativo corrompido por esse caso.
- Referências globais usadas em grupos pequenos e comparação de meses com 28/29/31 dias merecem revisão metodológica; não atribuir diferença de duração a desempenho.
- Conferência visual realizada em uma loja e uma subanálise por seção. Não houve certificação integral de todas as lojas, todos os gráficos, ações de escrita ou desempenho sob carga autenticada.

## Localizadores para a etapa de correção

Os caminhos abaixo são referências para executar a lista, não textos a exibir no painel:

- Acesso: `src/components/PersistenciaCache.tsx:12–20`, `src/lib/cachePainel.ts:31–33`, saída em `src/hooks/useAuth.ts`.
- Qualidade: `src/lib/queries/qualityIndex.ts:85–96,145–157,226–265`; `src/components/dashboard/QualityIndexPanel.tsx:25–66`; montagem `src/pages/Index.tsx:658–672`; `QualityKpiCards.tsx:25–49,119–158`; `McKinseyActionPlans.tsx:17–30`.
- Clips: `src/components/dashboard/ClipsAudiencePanel.tsx:375–405,434–475,689–757`.
- Resumo: `src/components/dashboard/ResumoExecutivo.tsx:10–83`; mapeamento em `useSellerData.ts` e `useSellerDailyData.ts`.
- Publicidade: `src/lib/queries/publicidade.ts:44–146`; `src/pages/Publicidade.tsx:65–91`; `src/lib/adsAnalise.ts:145–207,355–399`; `supabase/functions/_shared/mlAdsGestao.ts:131–168`; `adsGranular.ts:119–145`.
- Correlações: `src/components/seller/CorrelacaoPanel.tsx:14–41,128–132`; `src/lib/correlacao.ts:1–15`.
- Preço: `src/components/dashboard/CompetitivenessInsights.tsx:67–161`; `src/lib/queries/insightsPrecificacao.ts:45–65`; `PriceCompetitivenessChart.tsx:36–40`.
- Oportunidades: `src/components/dashboard/OpportunitiesPanel.tsx:52–91`; `src/lib/queries/campanhasCofinanciadas.ts:90–100`; `useEligibility.ts:35–39`; `useListingsQuality.ts:62–86`.
- Logística: `src/components/dashboard/LogisticsPanel.tsx:55–92,211–235`; `StockoutRiskPanel.tsx:25–32`; validar contrato de consumo do ramo alternativo de ruptura.
- Full/carteira: `src/hooks/usePockData.ts:136–145,181–209,251–269`; `src/lib/carteiraDeepDive/calculo.ts:104–126`; `src/components/pock/VerticalCarteirasTabela.tsx:17–58`.
- Metas/riscos: `MetasPanel.tsx:65–105,207–211`; `useSellerRiskPanel.ts:85–105`; `src/lib/risk/churnRisk.ts`.
- Perguntas: `supabase/functions/ml-sync-loja/index.ts:219–248`, incluindo escolha do elemento central; `src/components/ml/MlAoVivo.tsx:286–300`.
- Consolidações: `src/pages/Multilojas.tsx:72–87,205–216`; `GestaoCarteira.tsx:108–180,231–235`; `Carteira.tsx:181–186,247–254,454–465`; `useCarteiraData.ts:141`.

**Critério de fechamento futuro:** cada correção deve reproduzir o caso numérico que falhava, preservar permissões e passar por leitura autenticada do resultado; “sem dado” não deve ser removido quando a medição continua ausente.