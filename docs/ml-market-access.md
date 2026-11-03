# Etapa 0 — caminhos e disponibilidade da API de mercado

## Visitas de concorrente — teste de 03/11, 14:28 UTC
- Sonda `concorrente_app`, autenticada pela conta master: catálogo retornou ofertas para MLB58098649 e selecionou o anúncio de terceiro MLB5452621083. Outro produto retornou 404, preservado como não confirmado.
- Período: 04/10/2026–02/11/2026, 30 dias UTC completos.
- `/items/MLB5452621083/visits/time_window?last=30&unit=day&ending=2026-11-02`: HTTP **403** com autorização de aplicativo.
- `/items/visits?ids=MLB5452621083&date_from=2026-10-04&date_to=2026-11-02`: HTTP **403** com a mesma autorização. Nenhum valor de visitas foi obtido; não há conexão útil a ativar na tela com essa autorização.
- Conversão permanece indisponível: requer pedidos pagos do anúncio no mesmo período, privados da conta autorizada. Não tentamos ler pedidos privados do concorrente nem usamos `sold_quantity` como substituto.
- A documentação de [consultas avançadas](https://developers.mercadolivre.com.br/pt_br/recurso-visits/servico-consultas-avancadas) menciona visitas públicas, mas não confirma a matriz atual de permissões destes caminhos; os 403 são evidência desta amostra, não prova de impossibilidade universal.
- [Autorização](https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-vendas/autenticacao-e-autorizacao) limita recursos privados a usuários que concederam permissão. [Pedidos](https://developers.mercadolivre.com.br/en_us/items-and-searches/order-management) são registros de transações, distintos do contador acumulado do anúncio.
- Diagnóstico implantado e testado; nove testes passaram e build OK. Tela preservada com preços reais e visitas/conversão indisponíveis. Para conversão real é necessária autorização da própria conta comparada e cobertura completa do período.

## Evidência adicional — tela Concorrentes em Preço
- Em 03/11/2026, busca autenticada por `pneu aro 15` via `ml-busca-concorrentes` (token de aplicativo do serviço existente) retornou HTTP 200 e 11 ofertas válidas.
- Para o produto MLB38180701, quatro ofertas apresentaram preços de R$384,75 a R$445,74; mediana R$415,245 (exibição R$415,25). Preço informado R$349,90: diferença −15,7% da mediana.
- Esta amostra confirma preços e ofertas para esta consulta, não elimina os 404 anteriores com token de loja nem comprova acesso universal. Visitas e conversão dos concorrentes continuam indisponíveis.
- Tela conferida com sessão autenticada em Preço → Concorrentes, sem erros de execução; tabela agrupa um produto exato do catálogo, não mistura medianas de produtos diferentes. Serviço existente não foi alterado.

## Verificação real
- Data: 03/11/2026, 14:04–14:06 UTC.
- Conta autorizada: AUTOPECASLONDRINA, sessão master com autorização de gestão confirmada no servidor.
- Anúncio próprio: MLB3340183167; categoria MLB47091. Amostra do catálogo: MLB60015049, MLB41183246, MLB37358277, MLB37486544.
- Somente GETs autenticados upstream, sequenciais, sem escritas no Mercado Livre ou persistência de negócio. Renovação de autorização segue o helper existente.
- Resultados guardados neste relatório são códigos, caminhos e presença/contagens permitidos, não respostas brutas.

Base: `https://api.mercadolibre.com`.

| Recurso/caminho | Evidência real | Situação e alternativa |
|---|---|---|
| `/items/{item_id}?include_attributes=all` próprio | HTTP 200; propriedade confirmada; campos de preço, vendidos, estoque, tipo e logística presentes | Disponível para amostra própria; não equivale a vendas pagas diárias |
| `/products/search?status=active&site_id=MLB&q={termo}&limit=3` | HTTP 200, três produtos | Disponível; pesquisar produtos não confirma disponibilidade das ofertas |
| `/products/{product_id}/items?limit=10` | HTTP 404 em quatro produtos, repetido | Não confirmado; não chamar 404 de ausência de concorrentes nem inventar faixa de preço |
| `/sites/MLB/search?q={termo}&limit=1` | HTTP 403 | Restrito para esta autorização; sem ranking orgânico ou primeira página |
| `/sites/MLB/domain_discovery/search?q={termo}&limit=1` | HTTP 200, uma categoria | Disponível; correspondência por termo exige confirmação do produto |
| `/trends/MLB/MLB47091` | HTTP 200, 40 registros | Disponível; sem volume de busca comprovado |
| `/highlights/MLB/category/MLB47091` | HTTP 200 | Disponível como resposta; esta sonda não contou a lista interna nem validou posições |
| `/items/{item_id}/visits/time_window?last=2&unit=day` próprio | HTTP 200, `total_visits` presente, zero registros em `results` | Disponível pontualmente; não comprova cobertura diária ou visitas por usuário |
| `/sites/MLB/listing_prices?price={preco}&category_id={categoria}&listing_type_id=gold_special&currency_id=BRL` | HTTP 200, `sale_fee_amount` presente | Disponível para cenário Clássico da amostra; não confirma todos os cenários |
| `/items/{item_id}/shipping_options?zip_code=01001000` próprio | HTTP 200 | Caminho responde; não validado como custo suportado pelo vendedor. CEP fixo é apenas dado da sonda |
| `/suggestions/items/{item_id}/details` próprio | HTTP 404 | Sem sugestão confirmada para a amostra; não concluir indisponibilidade universal |
| `/applications/{app_id}` | HTTP 403 com token da loja | Limite por hora não acessível por esta autorização; não trocar token para contornar a negativa |
| `/items/{item_id}/price_to_win?siteId=MLB&version=v2` | Não chamado: amostra não é anúncio de catálogo | Não confirmado nesta etapa; exige amostra própria elegível |
| `/items/{concorrente_id}`, `/items?ids={id}`, `/items/bulk?ids={id}` | Não chamados: ofertas não forneceram concorrente | Não confirmados; precisão de vendidos/estoque de terceiros não verificada |
| `/users/{seller_id}` de concorrente | Não chamado: falta vendedor concorrente confirmado | Reputação/medalha não confirmadas neste teste |
| `/items/{concorrente_id}/visits/time_window?last=2&unit=day` | Não chamado: falta concorrente | Visitas e conversão de terceiros continuam não confirmadas |

## Segurança e testes
- Diagnóstico `ml-market-access` aceita apenas UUID da conta e três grupos fixos; não aceita caminhos, IDs arbitrários ou URLs upstream do cliente.
- Primeiro valida sessão, acesso à conta e perfil master/desenvolvedor, depois relê a propriedade do anúncio próprio.
- HTTP interno de multiget é classificado separadamente do HTTP externo; 200 externo com 403 interno não vira disponível.
- Quatro testes automatizados passaram: entrada fechada, ausência de dados sensíveis na saída, classificação de HTTP interno e preservação de ausência.
- Verificação pelo navegador autenticado na área Mercado: chamada de diagnóstico HTTP 200; sem sessão HTTP 401; tentativa de incluir URL arbitrária HTTP 400.
- Página Mercado carregada; captura ficou com aviso preexistente de usuários sem acesso. Não foi alterado o painel e não se declara uma nova experiência visual implementada.
- Logs de compilação disponíveis: build OK. A função foi implantada e chamada com a sessão master; o invocador automático estava sem sessão e devolveu 401 corretamente.

## Consumo e coleta agendada
- Rodada final: grupos catálogo/concorrente/próprio consumiram 10/6/11 GETs, durações 8,0/4,6/8,7s. Rodadas de descoberta e navegador também efetuaram leituras; estes números não são o total global da API.
- Nenhum 429 nesta amostra; isso não demonstra capacidade disponível para coleta de toda a carteira.
- Rotinas atuais encontradas: Ads a cada 15 minutos; anúncios e melhorias de hora em hora; promoções a cada 3h; perguntas a cada 6h; renovação de token a cada 30min; resumo e tendências diários; reconciliação de notificações horária.
- Nova coleta diária **não foi ativada**. Orçamento por hora não confirmado (403), concorrentes não resolvidos e cobertura não medida; viabilidade fica pendente antes do monitoramento.

## Precisão e decisão
Presença de `sold_quantity` ou `available_quantity` não prova exatidão, vendas diárias, receita ou demanda. Diferenças de estoque e vendidos não serão usadas para calcular faturamento de concorrentes. Share, conversão do mercado e posição orgânica continuam fora do escopo validado.

**Resultado:** matriz inicial real concluída; validação completa de concorrentes e capacidade de agendamento bloqueada pelos retornos 404 das ofertas e 403 do limite do app. Próximo trabalho deve esclarecer oficialmente esses contratos e obter uma amostra válida, sem contornar permissões. As etapas 1–4 não foram iniciadas e exigem “OK, próxima etapa”.

## Referências oficiais localizadas
São referências documentais, não prova de permissão atual do aplicativo. Os resultados HTTP acima são a evidência da amostra.
- Busca de catálogo: https://developers.mercadolivre.com.br/pt_br/buscador-de-produtos
- Itens e buscas: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
- Tendências: https://developers.mercadolivre.com.br/pt_br/tendencias
- Visitas: https://developers.mercadolivre.com.br/pt_br/identificadores-de-produtos/recurso-visits
- Competição de catálogo: https://developers.mercadolivre.com.br/en_us/catalog-competition
- Reputação: https://developers.mercadolivre.com.br/pt_br/reputacao-de-vendedores
- Custos de envio: https://developers.mercadolivre.com.br/pt_br/custos-de-envio

A pesquisa documental encontrou indicação de migração de multiget para `/items/bulk?ids=`; não alteramos leitores existentes por essa informação sem teste de contrato real. Nesta amostra, multiget de terceiros ficou sem execução por falta de concorrente válido.