# Pesquisa de mercado e precificação — implantação na Peregrinus

## Objetivo
Adaptar as ideias do documento AvantPro para melhorar decisões de preço, concorrência e oportunidades, usando somente a API oficial do Mercado Livre. Aproveitar as áreas existentes e preservar o visual Peregrinus, a Home e as permissões atuais.

**Execução por etapas:** aprovar o plano inicia apenas a etapa 0. Ao concluir cada etapa, apresentar resultados e limitações e aguardar “OK, próxima etapa”. Não publicar nem alterar anúncios, preços ou campanhas durante este projeto.

## O que já existe
- **Estudo de mercado:** parte de um anúncio da loja, consulta ofertas do catálogo, faixa de preços, termos em alta, mais vendidos, situação no catálogo e tarifas; guarda estudos para comparação e oferece parecer da IA.
- **Tendências:** histórico semanal do Brasil e das categorias relevantes da loja, com cobertura dos termos nos títulos.
- **Preço e Anúncios:** busca de concorrentes pelo catálogo, consultas de desempenho da própria loja e sugestões de melhorias sem aplicação automática.

Esses recursos serão ampliados, não recriados em uma página paralela.

## Etapa 0 — Validar os dados disponíveis
**Entrega:** matriz com cada recurso marcado como disponível, restrito ou não confirmado, com data da verificação, precisão e alternativa segura.

- Testar leituras de catálogo, detalhes de concorrentes, reputação, logística, tarifas e visitas com uma conta autorizada.
- Confirmar restrições de busca por palavra-chave, disponibilidade e precisão dos vendidos e do estoque de terceiros e acesso a visitas.
- Separar dados públicos permitidos de dados exclusivos da loja conectada.
- Verificar limites de chamadas e viabilidade da coleta agendada sem prejudicar as atualizações das lojas.

**Critério de conclusão:** testes reais registrados sem expor tokens, compradores ou pedidos; nenhuma métrica prometida com base apenas nas hipóteses do documento. O retorno 403 não será contornado com raspagem, extensão ou outro token sem autorização.

## Etapa 1 — Ampliar a pesquisa instantânea
**Entrega:** ampliar **Estudo de mercado** com pesquisa por termo, link do Mercado Livre ou anúncio próprio, conforme os acessos confirmados.

- Categoria, tendências e mais vendidos, distinguindo posições oficiais de rankings não disponíveis.
- Ofertas comparáveis do catálogo: preço, vendedor, reputação/medalha, tipo de anúncio, modalidade de envio e frete grátis, quando disponíveis.
- Faixa de preço mínimo, mediana e máximo; posição do anúncio próprio e quantidade de ofertas consideradas.
- Identificar correspondência por catálogo, GTIN ou título; separar kits, condições e produtos diferentes e informar quando a consulta foi limitada ou truncada. Excluir a própria loja da referência de concorrentes.
- Tabela com busca, ordenação, links externos seguros e exportação para Excel.
- Dez ofertas iniciais com expansão, mantendo os padrões atuais do painel.
- Data da consulta, categoria e cobertura visíveis; campos desconhecidos ficam indisponíveis, nunca zero.

**Critério de conclusão:** pesquisar com uma loja autorizada e conferir resultados e exportação; testar ausência de ofertas, falha da API, carregamento e acesso negado, nos dois temas e em celular/computador.

## Etapa 2 — Monitorar preços e concorrentes
**Entrega:** aba **Monitorados** na área existente, com inclusão/remoção por loja, histórico de preços e alertas de mudança confirmada.

- Registrar medições diárias de preço, reputação e logística; estoque e vendidos apenas quando a leitura for permitida e com sua precisão identificada.
- Mostrar última coleta, dias sem medição, itens inativos e erros de cobertura.
- Comparar preço anterior e atual do mesmo anúncio, sem transformar dias ausentes em estabilidade.
- Definir antes da ativação os limites de itens, horário, retenção e orçamento de chamadas, a partir dos resultados da etapa 0; a coleta deve retomar pendências.

**Critério de conclusão:** coletar e reler medições persistidas, comprovar que repetir a rotina não duplica o dia e verificar alertas apenas após duas medições comparáveis.

**Não incluído automaticamente:** vendas diárias, faturamento ou conversão de concorrentes. Diferenças em vendidos arredondados e em estoque não comprovam vendas. Mesmo um contador exato não comprova receita paga, cancelamentos ou o preço efetivo das vendas. Essas métricas exigiriam uma validação separada antes de qualquer estimativa.

## Etapa 3 — Precificação e oportunidades
**Entrega:** calculadora na seção **Preço**, ligada ao estudo do anúncio, sem criar uma área redundante.

- Informar custo, impostos, frete e margem-alvo; usar tarifas atuais quando confirmadas e comparar Clássico/Premium.
- Calcular contribuição e preço para a margem-alvo, com todos os custos e a data da tarifa explícitos; valores faltantes não geram lucro presumido.
- Cruzar a simulação com a faixa das ofertas comparáveis e `price_to_win` somente do anúncio próprio.
- Simular promoção sem aplicá-la.
- Apresentar tendências e mais vendidos como sinais de oportunidade, não como volume de buscas ou demanda comprovada.
- IA apenas explica os números calculados; não inventa vendas, tarifas, ranking ou potencial financeiro.

**Critério de conclusão:** testes numéricos de contribuição, margem, tarifas, dados ausentes e preço-alvo, seguidos de uma simulação real conferida na tela, sem escrita no Mercado Livre.

## Etapa 4 — Distribuir os resultados nas seções
Após validar as etapas anteriores, inserir resumos com acesso ao detalhe, sem duplicar tabelas completas:

| Seção | Conteúdo a acrescentar |
|---|---|
| Preço | Posição na faixa de mercado e mudanças de concorrentes monitorados |
| Reputação | Comparação com os vendedores das ofertas comparáveis |
| Logística / Flex | Participação das modalidades e frete grátis na amostra de ofertas, sem chamar a amostra de mercado inteiro |
| Oportunidades / Publicidade | Termos em alta, mais vendidos e preço relativo, sem prometer demanda ou posição orgânica |
| Qualidade / Anúncios | Termos relevantes e diferenças de atributos disponíveis; sugestões apenas |
| Full | Presença de Full nas ofertas comparáveis, sem dimensionar estoque com vendas de terceiros não validadas |
| Alertas & Riscos | Mudança confirmada de preço e situação atual do catálogo próprio |
| Integrações | Última coleta e cobertura por loja; nunca exibir tokens |
| Carteira / Multilojas | Comparações dentro da mesma categoria e de produtos realmente comparáveis, com cobertura explícita |
| Desenvolvedor | Falhas e consumo medido das coletas, sem dados sensíveis |

**Fora deste plano:** share de categoria, meta de share, conversão do mercado, índice “demanda ÷ concorrência”, ranking orgânico, novos entrantes na primeira página e testes A/B com escrita. Dependem de dados ou autorizações que o documento não comprova. Clips e Perguntas permanecem como estão.

## Detalhes técnicos
- Reutilizar `/mercado`, `src/pages/Mercado.tsx`, `EstudoMercado`, `AbaTendencias`, `ml-market-study`, `ml-trends-sync`, `ml-busca-concorrentes` e os cálculos de `_shared/mlMercado.ts`.
- Tokens exclusivamente nas funções do servidor, com o renovador compartilhado existente; chamadas sequenciais, lotes de até 20 itens, tratamento de 403/429 e limites de execução.
- Consolidar o tratamento de falhas da busca existente antes de ampliar a coleta; diagnósticos devem guardar apenas códigos e contagens permitidos, nunca respostas brutas da API.
- Reutilizar estudos e tendências persistidos. Introduzir monitoramento e medições apenas após a etapa 0, vinculados à conta e respeitando sua autorização atual: master vê todas; demais perfis somente contas autorizadas. Não copiar as políticas de “apenas dono” do documento, pois eliminariam a colaboração por carteira.
- Novas tabelas em `public` com concessões explícitas e RLS; medições escritas somente pelo servidor e leituras protegidas, incluindo exportações e agregações. Histórico idempotente por conta, anúncio e data, preservando lacunas e precisão.
- Links de entrada devem ser validados e convertidos em identificadores; não buscar URLs arbitrárias fornecidas pelo usuário.
- Sem mistura entre API e planilhas; séries da loja continuam com datas e definições existentes. Estatísticas de concorrentes representam somente ofertas efetivamente lidas e comparáveis.
- Atualizar `docs/ml-gestao.md`, regras de arquitetura e testes ao mudar contratos. Conferir acesso permitido e negado, retomada de coleta, cobertura e cálculos; validar o fluxo autenticado com dados reais antes de concluir cada etapa.
- Preservar tokens de cor, vidro, DM Sans, formatação pt-BR, controles existentes e acessibilidade; ignorar a sugestão azul/navy do documento.

## Ordem de prioridade
1. Validar acesso e precisão.
2. Ampliar pesquisa usando o catálogo já disponível.
3. Monitorar preços com histórico confiável.
4. Oferecer simulação de contribuição e preço.
5. Distribuir resumos nas seções existentes.

Não atribuir prazos ou prometer cobertura total antes dos testes de acesso e do dimensionamento das coletas.

## Mapa inicial dos caminhos da API
Base pública: `https://api.mercadolibre.com`. Todos os acessos passam pelo servidor com token autorizado; a presença de um caminho não garante acesso a dados de terceiros.

| Finalidade | Caminho | Situação no projeto |
|---|---|---|
| Busca de catálogo | `GET /products/search?site_id=MLB&q={termo}` | Usado |
| Produto e ofertas | `GET /products/{product_id}` e `GET /products/{product_id}/items` | Usados |
| Categoria | `GET /categories/{category_id}` | Usado no estudo |
| Tendências | `GET /trends/MLB` e `GET /trends/MLB/{category_id}` | Usados |
| Mais vendidos | `GET /highlights/MLB/category/{category_id}` | Usado |
| Destaque do anúncio/produto | `GET /highlights/MLB/item/{item_id}` e `GET /highlights/MLB/product/{product_id}` | Usados |
| Competição do anúncio próprio | `GET /items/{item_id}/price_to_win?siteId=MLB&version=v2` | Usado |
| Tarifas | `GET /sites/MLB/listing_prices` | Usado; parâmetros por cenário |
| Visitas próprias | `GET /items/visits?ids={item_id}&date_from={data}&date_to={data}` | Usado |
| Histórico de visitas próprio | `GET /items/{item_id}/visits/time_window?last=30&unit=day&ending={data}` | Usado como alternativa |
| Descoberta de categoria por termo | `GET /sites/MLB/domain_discovery/search?q={termo}` | Proposto; validar |
| Reputação | `GET /users/{seller_id}` | Usado para a própria loja; validar acesso e campos de terceiros |
| Detalhes em lote | `GET /items?ids={ids}` | Usado para dados próprios; terceiros têm restrições registradas |
| Sugestão de preço | `GET /suggestions/items/{item_id}/details` | Proposto; validar para anúncio próprio |
| Frete | `GET /items/{item_id}/shipping_options` ou `GET /users/{seller_id}/shipping_options/free` | Propostos; validar parâmetros e significado dos custos |
| Busca geral | `GET /sites/MLB/search?q={termo}` | Restrição 403 registrada; não sustenta ranking orgânico |
| Visitas de terceiros | Caminhos de visitas citados no documento | Não confirmados; não usar para conversão de mercado |

Os caminhos de visitas `/visits/items` citados no documento não serão copiados sem confirmação; o painel usa `/items/visits` para anúncios próprios.