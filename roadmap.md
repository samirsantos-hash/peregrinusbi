# Roadmap

## Actions do HTML — 06/11
- [x] Aplicada hierarquia de ações compactas, ícones, hover, foco e seleção aos controles existentes, incluindo portais; preservados Home, permissões e confirmações. Acabamento estático e realce por opacidade, sem borda giratória promocional.
- [x] AUTOPECASLONDRINA: modo didático/avançado e Todo período conferidos com leitura real, dois temas e 390px com movimento reduzido, sem erros; 15 regressões e build OK. Controles cabem na tela; existe excesso horizontal em conteúdo analítico abaixo, não alterado. k6 público: 28.458 requisições, zero falhas, p95 77,90ms; não mede painel autenticado. Somente em teste.

## Motion do HTML — 06/11
- [x] Entrada progressiva de cartões ao aparecerem (800ms, 30px, sequência de 80ms), títulos e conteúdo; controles, abas e detalhes com resposta discreta; menus 220ms e laterais 240ms. Preservados Home, gráficos reais, reflexos e dados; sem blur animado ou barras em loop.
- [x] Loja real e cartões de reputação visíveis após entrada; menus, abertura/fechamento lateral, celular 390px e movimento reduzido conferidos sem erros. 19 regressões passaram e build OK. k6 público: 28.484 requisições, zero falhas, p95 55,39ms; não mede painel autenticado. Sem publicar.

## Ícones Lucide — 06/11
- [x] Padronizar Lucide na navegação e árvore, tendências, reputação, preço, campanhas, Clips, diagnósticos e importações; preservar marca, dados e permissões.
- [x] Loja real e reputação conferidas em desktop/390px sem excesso horizontal; 18 regressões passaram. k6 público prévio: 28.483 requisições, zero falhas, p95 62,89ms; não mede painel autenticado. Sem publicar.

## Boas-vindas Laser beam — 06/11
- [x] Usar a cena original local do HTML na entrada autenticada do dashboard, com boas-vindas breves e botão para continuar; não repetir na navegação e respeitar movimento reduzido.
- [x] Cena original renderizada isoladamente; entrada autenticada, encerramento automático e movimento reduzido conferidos sem erros. Captura da composição com texto não concluída: a cena encerrou antes da captura no navegador de teste. k6 público: 28.471 requisições, zero falhas, p95 79ms; não mede a cena nem painel autenticado. Somente em teste.

## Funil em camadas curvas — 06/11
- [x] Aplicar o desenho da referência às etapas existentes do funil de conversão: topo elíptico, laterais afuniladas, volume e cores do tema, sem alterar cálculos.
- [x] Quatro testes passaram; funil com dados reais conferido nos dois temas e em 390px, números completos e sem erros/excesso horizontal. k6 público prévio: 28.527 requisições, zero falhas, p95 78,97ms; não mede painel autenticado. Somente em teste. Aplicado ao desenho de etapas existente; gráficos diários preservados.

## Sigilo da origem dos dados — 06/11
- [x] Registrar a restrição de não citar planilha/API nos textos aos usuários e neutralizar essas referências nas quatro subcategorias do estudo de reputação, preservando períodos, cobertura e limitações.
- [x] Sete regressões passaram; estudo nas quatro subcategorias e perfil/medalha com textos neutros, preservando datas e limitações. k6 público: 28.468 requisições, zero falhas, p95 80,91ms; somente entrega pública. Sem publicar.

## Reflexos e resposta de cartões — 06/11
- [x] Reflexo localizado de borda verde e superfície suave inspirado no HTML; compressão somente em cartões com ação existente, sem inclinação em cartões informativos, navegação ou Home.
- [x] Quatro regressões e build OK; cartão real de faturamento conferido com reflexo seguindo ponteiro, pressão 0,98, seleção e teclado; cartão cabe em 390px e nenhum erro. Gestão de Carteira já apresenta excesso horizontal em outros gráficos/tabelas, não alterados neste pedido. k6 público: 28.486 requisições, zero falhas, p95 81,67ms; não mede painel autenticado. Sem publicar.

## Entrada suave e círculo de carregamento — 06/11
- [x] Substituir letras caindo por entrada de títulos/conteúdo inspirada no HTML; círculo pequeno durante consultas, sem bloquear página nem mudar Home.
- [x] Três testes e build OK; sessão real desktop/390px confirmou entrada dos títulos, círculo durante consultas, remoção ao terminar, ausência de letras caindo, movimento reduzido sem giro e nenhum erro/excesso horizontal. k6 público: 28.430 requisições, zero falhas, p95 79,62ms; não mede painel autenticado. Sem publicar. Movimento reproduzido sem blur animado para preservar desempenho/acessibilidade.

## Letras durante carregamento — 06/11
- [x] Chuva de letras sobre o painel somente enquanto consultas carregam; preservados ambiente, cliques e movimento reduzido, sem ler ou alterar textos reais.
- [x] Dois testes e build OK; sessão real desktop/mobile confirmou camada sem bloquear cliques, remoção ao concluir consultas, movimento reduzido sem efeito e nenhum erro/excesso horizontal. k6 público: 28.437 requisições, zero falhas, p95 82,48ms; não mede painel autenticado. Sem publicar. HTML disponível não contém letras caindo; efeito adaptado.

## Comparação SWOT de anúncios — 06/11
- [x] Comparação existente com quatro gráficos (visitas, pedidos, conversão e receita por visita), foco por anúncio e matriz SWOT; referência pela mediana dos outros selecionados, ameaças externas não verificadas e tabela detalhada preservada.
- [x] Oito testes e build OK; dois anúncios reais da AUTOPECASLONDRINA conferidos, oito barras, troca de foco e celular 390px sem excesso horizontal ou erros. k6 público prévio: 28.470 requisições, zero falhas, p95 HTTP 79,25ms; somente entrega pública, não mede painel autenticado/ML. Sem publicar.

## Analisador de título v2 — 06/11
- [x] Analisador local em Anúncios → Correlações, com repetição/pontuação e sugestões revisáveis; limite público da categoria separado da nota, ausência não vira 60.
- [x] 19 testes e build OK; título real MLB5381969652 com 60 caracteres e limite da categoria confirmado no navegador em 200. Preservados códigos/medidas e termos não comprovados como ruído; corte de 45 é estimativa fora da nota. Revisão/cópia/restauração conferidas em sessão real a 1280px/390px, sem erros ou excesso horizontal. k6 prévio 28.444 requisições, zero falhas, p95 HTTP 81,39ms (público somente). Sem IA, escrita ML ou publicação.

## Análises por anúncio organizadas por assunto — 06/11
- [x] Criar Anúncios → Correlações com desempenho, conteúdo, promoções, Full/estoque e limites do estudo; reutilizar leituras existentes, sem ranking inventado.
- [x] Dar acesso pelo ramo Correlações do painel, mantendo preço e reputação nas seções próprias e preservando permissões e loja nos atalhos.
- [x] 14 testes e build OK; comparação real do MLB5476651802: 386 visitas, 23 pedidos, R$1.530,89 e conversão 5,96%, sem confirmar alterações. Lista de qualidade, oferta com 10 linhas, celular 390px e atalhos ida/volta mantendo AUTOPECASLONDRINA conferidos. k6 prévio 28.444 requisições, zero falhas, p95 HTTP 82,57ms (público, não mede painel autenticado). Somente teste, sem publicar.

## Funil suave, impressões e carrinhos — 06/11
- [x] Funil histórico sem polígonos rígidos e cores âmbar; cartões e curvas diárias suavizados. Impressões reais Product Ads separadas: AUTOPECASLONDRINA 2.059.882 em 29/30 dias, comparação anterior indisponível com lacunas.
- [x] API pública documentada não confirmou leitura de carrinhos abertos/abandonados; packs agrupam compras, não carrinhos abandonados. Sete testes e build OK; sessão real 1280px/390px sem erros ou excesso horizontal. k6 público prévio 28.528 requisições, zero falhas, p95 60,74ms; não mede painel autenticado. Sem publicar.

## Indicadores sem dado em Publicidade — 06/11
- [x] AUTOPECASLONDRINA: falta 05/11 na publicidade diária; indicadores agora mostram somente datas cobertas, com período parcial explícito e sem alterar totais do período inteiro. Participação 10,8%, TACOS 2,01%, 29/30 datas (07/10–04/11).
- [x] 14 testes e build OK; sessão real e celular 390px sem erros/excesso horizontal. k6 público prévio: 28.410 requisições, zero falhas, p95 65,07ms; não mede painel autenticado. Sem publicar.

## Promoções em Oportunidades — 06/11
- [x] Consulta ao vivo em AUTOPECASLONDRINA: API respondeu 200, 20/20 pedidos pagos com descontos disponíveis, 4 com identificador de campanha, zero correspondências nas promoções/ofertas locais verificadas; janela 07/10–05/11. Amostra e ausência de vínculo não autorizam totais nem ROAS/ROI; sem mudanças na API ou publicação.
- [x] Incluída subanálise Promoções com adesões confirmadas e cobertura; estado atual separado de resultados históricos.
- [x] ROAS/ROI explicitamente indisponíveis sem atribuição/custos; AUTOPECASLONDRINA com 6 promoções, atualização conferida, sem erros ou excesso horizontal em 390px. Dez testes e build OK; k6 público 28.419 requisições, zero falhas, p95 61,04ms (não mede painel logado). Sem publicar.
- [ ] Resultados financeiros por promoção: dependem de atribuição histórica por venda e custos realizados confirmados, ausentes no contrato atual.

## Caixa de preço e margem — 06/11
- [x] Janela compacta centralizada; modos preço de venda e margem desejada, custos/taxas explícitos por anúncio, sem persistência dos custos ou mudança na autorização/prévia.
- [x] Cinco testes passaram; janela centralizada (480px desktop, 358px mobile) na sessão real. Custos fictícios de teste 60+10, taxas 10%, margem 20% resultaram em R$100; prévia ML confirmou antes R$130,73/depois R$100 e alerta de queda, sem clicar Confirmar. Build OK; k6 público 28.454 requisições, zero falhas, p95 63,17ms (não mede painel logado). Sem publicar.

## Linhas do funil e receita por visita — 06/11
- [x] Dois gráficos diários com variação vs a data 30 dias antes; lacunas mantidas. Card receita por visita com comparação por totais cobertos do período, sem lucro estimado.
- [x] Quatro testes passaram; AUTOPECASLONDRINA com 30/30 dias, duas linhas por gráfico e receita por visita R$6,02 (+10,5%); conferida nos dois temas a 1280px e celular 390px, sem excesso horizontal ou erros. Build OK; k6 público 28.444 requisições, zero falhas, p95 62,96ms (não mede painel logado). Sem publicar.

## Enquadramento do funil — 06/11
- [x] Visitas e conversão com altura de conteúdo em vez de metade dos dois gráficos; alinhados no topo e duas colunas no celular, mantendo vidro, dados e comparações.
- [x] AUTOPECASLONDRINA conferida nos dois temas a 1280px e no celular a 390px: cartões com 164px de altura, números completos, sem excesso horizontal ou erros. Build OK; k6 público prévio 28.431 requisições, zero falhas, p95 68,27ms (não mede painel logado). Sem publicar.

## Escrita da marca — 06/11
- [x] Escrita original ecom solutions isolada da referência, com by Peregrinus na Home, recuperação e cabeçalho comum das análises; águia, campos, ambiente e fontes dos dados preservados.
- [x] Marca carregada nos dois temas da Home e cabeçalho autenticado; celular 390px sem excesso horizontal ou erros. Build OK; k6 público 28.439 requisições, zero falhas, p95 65,43ms (não mede painel logado). Somente em teste, sem publicar.

## Estudo de reputação — 05/11 às 23:54
- [x] Distribuídos estado observado e avaliações no Resumo; taxas API/mensais nos Indicadores; gráfico/tabela de meses fechados na Análise; confiabilidade e referências provisórias em Perfil/tier/requisitos. Leitura crua preserva ausência e frações, sem reputação diária ou risco automático sem denominador.
- [x] 19 testes passaram e build OK; AUTOPECASLONDRINA nas quatro subcategorias, 1280px e Resumo a 390px sem excesso horizontal. k6 público prévio: 28.440 requisições, zero falhas, p95 71,32ms; não mede painel autenticado. Somente teste.
- [ ] Percentil da vertical, ocorrências/distância em pedidos, piso de volume e histórico de medalhas: aguardam pares/janelas/denominadores confirmados, limites oficiais e fotografias datadas; não inferidos.

## Modo claro e proporções — 05/11 às 22:45
- [x] Home e painel claros com ambiente cinza/verde/amarelo suave, vidro branco translúcido, reflexo de canto e contornos escuros sutis; cores de métricas preservadas.
- [x] Comparada hierarquia dos KPIs reais do HTML: valores padrão 30px/600 (não 36px globais), etiquetas principais 14px, notas/eixos 12px; eixos usam Geist como painel, Home mantém DM Sans. Carteira mantém 22px com redução por espaço para números inteiros. Sessão real conferida em 1280px e 390px, troca claro/escuro, campos editáveis e nenhum erro ou excesso horizontal. Dez testes e build OK; não auditadas individualmente todas as telas. Sem publicar.
- [x] k6 público prévio: 1.000 usuários, 28.492 requisições, zero falhas, p95 63,81ms; somente entrega pública, não mede painel autenticado.

## Vidro da Home e painel — 05/11 às 22:32
- [x] Material compartilhado com transparência real, degradê verde, blur 24px/saturação 150%, cantos e reflexo restrito à borda; Home mantém marca, campos, botão e ambiente. Removido fundo 90% opaco do painel; interiores não acumulam blur.
- [x] Home e carteira autenticada conferidas em 1280px e 390px, campos editáveis, mesmos parâmetros de vidro e nenhum erro ou excesso horizontal. Dez testes passaram; build OK. k6 público prévio: 1.000 usuários, 28.482 requisições, zero falhas, p95 58,91ms; não mede painel autenticado. Somente teste, sem publicar.

## Leitura da conta e sinergia — 05/11 às 22:14
- [x] Sexto cartão com média oficial ML de 93,2/100 em 9 de 188 anúncios ativos da AUTOPECASLONDRINA; 179 sem avaliação explícitos, sem IA nem substituição pelo índice da carteira.
- [x] Sinergia e cancelamentos mensais reorganizados; 28 testes passaram, sessão real em 1280px e 390px sem erros ou excesso horizontal, build OK. k6 público prévio: 28.409 requisições, zero falhas, p95 69,80ms; não mede painel autenticado. Somente teste, sem publicar.
- [ ] Renomear ausência para DX bloqueado: API não confirmou modalidade de 771 pedidos (67,4%); manter ausência explícita até existir evidência de envio, sem inventar classificação.

## Evolução diária e síntese da conta — 05/11 às 21:29
- [x] Faturamento em barras e faixa conjunta de pedidos pagos/cancelados dia a dia, cancelados em vermelho; série existente da API, sem rateio mensal. Cancelamentos rotulados por status atual e data de criação: não há evidência de quem cancelou.
- [x] Saúde da conta compacta (282px no desktop) e cartão de síntese: receita −0,4%, pedidos −3,5%, ticket +3,2%, unidades −3,6%, custo Ads −26,4%, meta 67,5% na AUTOPECASLONDRINA. Mesma consulta/cache de Ads reutilizada, sem IA. Quatro testes passaram, sessão real desktop/390px sem erros ou excesso horizontal, três séries de barras e build OK. k6 público prévio: resultado abaixo; não mede painel logado. Somente teste.

## Correção das margens e vidro — 05/11 às 21:19
- [x] Removidos limite central de 1400px e margens de 48px; margem externa agora 20px. Regra opaca corrigida: vidro confirmado com degradê branco 3,5%/verde 4,5% e blur 24px. Sessão real em 1143px, 1605px e 390px sem erros ou valores cortados; build OK. k6 público prévio: 28.459 requisições, zero falhas, p95 76,15ms (não mede painel logado). Somente teste.

## Ajuste da leitura da carteira — 05/11 às 21:08
- [x] Faixas de cinco cartões preenchem a largura no computador; valores indivisíveis em Geist, comparações com quebra segura e vidro verde translúcido na leitura, sem alterar dados ou Home. Sessão real conferida em 1143px, 1605px e 390px: valores completos, sem excesso horizontal nem erros; 8 testes passaram e build OK. k6 público prévio: 28.403 requisições, zero falhas, p95 74,23ms (não mede painel logado). Somente teste.

## Reprodução fiel do HTML — 05/11 às 20:56
- [x] Aplicados fonte Geist local da referência, materiais Ledger, contornos, medidas e seleção neutra ao painel protegido; Home e dados preservados. Parâmetros centralizados nos tokens de src/index.css.
- [x] AUTOPECASLONDRINA autenticada: resumo com valores e reputação em 1280px/536px, sem erro ou excesso horizontal; Home com estilos idênticos, 8 regressões passaram e build OK. Teste público prévio: 28.446 requisições, zero falhas, p95 77,83ms; não mede painel logado. Somente teste. Estrutura funcional, marca e animação ambiental local preservadas, não substituídas pela página demonstrativa do HTML.

## Ambiente e marca — esclarecimento (05/11 às 19:55)
- [x] Preservada Home aprovada, retirado “Acesso ao Painel” e refinados pesos DM Sans da marca; campos e reação do botão intactos.
- [x] Ambiente verde contínuo com chuva diagonal local e fumaça; chuva adicional do HTML apenas no carregamento; vidro transmite o verde por transparência e degradê de tokens.
- [x] Acesso e painel com sessão de Samir conferidos em desktop e celular, sem erros nem excesso horizontal; 2 testes passaram e build OK. k6 público prévio: 28.399 requisições, zero falhas (não mede painel autenticado). Não publicado.
- [x] Aplicado E comercial original enviado em image-148.png na marca da Home e no ícone da aba, preservando falcão e nome. Imagem sem fundo conferida em desktop/mobile, sem erros e build OK; teste público prévio passou. Sem publicar.

## Identidade do HTML nos detalhes (05/11)
- [x] Incorporadas as orientações Extract HTML Design System v2: catálogo design-system.html já presente no ZIP; referência comparada visualmente. Reutilizados padrões de navegação (12px), busca (8px), linhas sutis e cartões internos; retirado brilho excessivo e blur por célula. Mantidos DM Sans, vidro e identidade Peregrinus; não substituir por textos de demonstração. Dez testes passaram, incluindo chuva apenas enquanto carrega.
- [x] Identidade Ledger do HTML (linhas finas, rótulos em caixa alta com traço, títulos leves, brilho verde) nas laterais de promoções e melhorias, mantendo DM Sans e verde da marca. Corrigidos: códigos crus do ML, percentuais com ponto, nível em espanhol, pendências repetidas e cor âmbar fora da paleta.
- [x] Chuva adicional do HTML só enquanto há dados carregando; esclarecimento posterior preserva ambiente original contínuo.

## Sinais de promoções na lista (05/11)
- [x] Coluna Promoções: X vermelho sem participação; um check verde sem fundo por promoção ativa ou programada (convites não contam). AUTOPECASLONDRINA: 14 sem e 36 com promoções nos 50 primeiros.

## Alterações confirmadas nos anúncios (05/11)
- [x] Medida cada confirmação com itens aplicados (status feito) em preço, publicidade e promoções, com quantidade; testes e esquema válidos.
- [ ] Atribuir alterações às melhorias de IA: as melhorias só sugerem texto e não geram ação; impacto fica como comparação semanal antes/depois, não causalidade.

## Medição e publicação da árvore (05/11)
- [x] Medidas abertura explícita de Resumo e mudanças nas subanálises de Reputação, Preço e Publicidade; contexto não sensível, sem IDs, com acesso de consultoria positivo validado (inclui masters/admins/gerentes; falso também pode indicar verificação pendente).
- [x] Seis eventos catalogados e esquema válido; 12 testes passaram, build OK e sessão master confirmou quatro eventos com coletor local substituto, sem erros. Não comprova ingestão publicada; não há ranking histórico destes eventos novos. k6 público: 28.356 requisições, zero falhas, p95 94,25ms; não mede painel logado. Segurança básica sem achados; análise profunda não executada.
- [x] Manter alterações somente na área de teste, sem publicar, conforme pedido de 05/11 às 19:36 UTC; solicitações anteriores canceladas antes de executar.

## Árvore de acessos e detalhes laterais (05/11)
- [x] Árvore por assunto e subanálise com subaba, links antigos e permissões preservados; páginas específicas para resumo, reputação, preço, publicidade, logística, qualidade, Clips, oportunidades e Full.
- [x] Resumo com resultados essenciais; reputação com medalha da API, tier associado, perfil importado e tabela dos limites existentes sem classificar por receita ou proxy de cancelamentos. AUTOPECASLONDRINA: Gold/Tier 2 e Mature; ausência de dados explícita.
- [x] Promoções e melhorias em lateral direita não modal de 420px no computador e 88vw no celular, sem escurecer/bloquear lista; troca direta conferida e somente uma lateral aberta, confirmações comerciais preservadas.
- [x] 47 testes passaram e build OK; sessão master navegou requisitos, evolução de preço e dez produtos reais; celular 390px com árvore e promoções conferidos, sem erros de execução. Última repetição mobile interrompida ao voltar ao painel; fluxo mobile já conferido anteriormente. k6 prévio 1.000 usuários: 28.388 requisições, zero falhas, p95 público 87,39ms; não mede painel autenticado.

## Modal real dos pedidos (05/11)
- [x] Mix usa envios reais da API própria com cobertura explícita, consultas deduplicadas e limite de 45s/500 envios; não usa anúncio como prova. Coleta e ponto de coleta distintos; postagem em agência não é prova de Correios.
- [x] 12 testes passaram, build OK e leitura implantada. AUTOPECASLONDRINA: 1.133 pedidos pagos, 362 identificados (313 Full, 49 Coleta), 771 não identificados nesta execução limitada; cobertura parcial confirmada na tela autenticada. k6 público prévio: 1.000 usuários, 28.357 requisições, zero falhas, p95 108,96 ms; não mede painel autenticado.
- [ ] Identificar transportadora Correios: resposta/campo oficial de transportadora ainda não confirmado; não inferir pelo tipo drop_off.

## Busca de loja na Publicidade (05/11)
- [x] Seletor da Publicidade reutiliza a busca existente por nome ou Cust ID, somente nas contas já autorizadas, preservando a troca de conta e as consultas.
- [x] Sessão master: nome, Cust ID, troca para MERCALANI, ausência de resultado e celular 390px conferidos; zero erros de página. k6 público prévio: 100 usuários, 2.200 requisições, zero falhas, p95 127,18 ms; não mede painel autenticado.

## Recomendações abertas (05/11)
- [x] Instrumentada a abertura dos diagnósticos por anúncio no controle existente, com categoria e contexto, sem IDs ou textos privados; fechamento e itens sem diagnóstico não contam.
- [x] Seis controles existentes cobertos: desempenho/planos por anúncio, planos por segmento, pilares de qualidade, plano de ação e retenção da carteira. Riscos sem detalhe e links genéricos não contam; Full legado não é montado em tela e não foi alterado.
- [x] Catálogo validado (3 eventos), 25 testes aprovados e build OK. Sessão master abriu o diagnóstico de promoções da AUTOPECASLONDRINA: categoria promotions/contexto seller_quality_index e conteúdo revelado confirmados com coletor substituto local. Fechamento validado em testes; navegador interrompido após abertura. Não comprova ingestão publicada.
- [x] k6 prévio público: 100 usuários, 2.218 requisições, zero falhas, p95 124,22 ms; não mede painel autenticado.

## Trocas de loja (05/11)
- [x] Evento project.seller_selection_changed nos controles existentes: origem e escopo, sem identificadores privados; mesma loja e troca de anúncio na mesma loja não contam.
- [x] Catálogo validado (2 eventos), 9 testes e build OK. Sessão master abriu AUTOPECASLONDRINA e voltou à carteira: dois eventos com origem/escopo conferidos em coletor substituto local; não comprova ingestão publicada. Repetição no controle do painel não concluída no navegador; mesma seleção e anúncio da mesma loja cobertos nos testes de navegação.
- [x] k6 público prévio: 1.000 usuários, 28.310 requisições, zero falhas, p95 110,51 ms; não mede painel autenticado.

## Aberturas de análises (05/11)
- [x] Registrado project.seller_analysis_opened nas navegações existentes de loja/anúncio e seleção de loja real no painel; nível, origem e escopo único, sem nomes/IDs/URLs. Filtros, retorno à carteira e renderizações não contam.
- [x] Catálogo validado (1 evento); 7 testes aprovados. AUTOPECASLONDRINA aberta na sessão master, um evento conferido com coletor substituto local; não comprova ingestão publicada. Navegação de anúncios validada em teste de componente. Build OK. k6 prévio: 100 usuários, 2.202 requisições, zero falhas, p95 público 117,47 ms, sem painel autenticado.

## Produtos e busca de loja (05/11)
- [x] Anúncios com largura ampliada, imagens e fontes maiores, divisórias e busca por nome/ID nas contas autorizadas; tabela de produtos com acabamento equivalente, sem alterar consultas ou permissões.
- [x] Build OK; sessão master buscou AUTOPECASLONDRINA por nome (50 anúncios), MERCALANI por ID e trocou a loja; busca sem resultado conferida, computador/celular sem erros ou transbordamento. k6 prévio: 100 usuários, 2.231 requisições, zero falhas e p95 público 74,61 ms; não mede painel autenticado.

## Qualidade e melhores Clips (05/11)
- [x] Radar técnico separado de metas de Clips; ausência e pacote legado de qualidade totalmente zerado não recebem classificação crítica. Ranking de até 10 anúncios com visitas, pedidos, conversão e datas, sem distribuir totais da loja.
- [x] Seis testes e build OK; AUTOPECASLONDRINA autenticada em computador/celular sem erros ou transbordamento: medição 01/11 com 1.009 visitas, 45 pedidos, 4,46% e R$4.863,22 via Clips. Ranking por anúncio indisponível nessa loja, explicitado sem inventar vencedores. k6 público prévio: 100 usuários, 2.223 requisições, zero falhas e p95 83,26 ms; não mede painel logado.

## Avisos de monitoramento (05/11)
- [x] Restaurada visualização para 38 legados não revisados; 50/50 legados têm leitura, 8 revisados intocados. Escopo e edição inalterados; reparo idempotente em scripts/restaurar-carteira-legado.sql.
- [x] GETs Ads com prazo de 80 s, paginação interrompível e marcador condicionado à gravação completa. Função implantada: AUTOPECASLONDRINA retornou HTTP 200 em 82,53 s, 96 campanhas, 962 anúncios, 165 pendências (não cobertura completa).
- [x] Cópias invalidadas antes/depois de escritas e troca de identidade; análises e permissões não ativam emergência. Refetch após mutação não herda staleTime infinito.
- [x] 105 regressões passaram, build OK; carteira master autenticada abriu sem bloqueio/erros. Fluxo pós-gravação em emergência verificado por teste de rede simulado, não por edição de dados reais de cliente. k6 prévio: 100 usuários, 2.222 requisições, zero falhas, p95 90,62 ms (somente entrega pública).

## Teste de carga com 1.000 pessoas (04/11)
- [x] Executada uma única simulação pública: pico confirmado de 1.000 usuários, 60 segundos de platô, interrupção por falhas e sem login, IA, banco ou Mercado Livre.
- [x] 28.189 requisições, uma falha (0,00355%), p95 de páginas 158,04 ms e máximo 6,59 s; limites aprovados, 3,81 GB recebidos. Resultados em docs/teste-carga-k6.md; não certifica painel autenticado. Teste de configuração passou; opção global ignorada pelo k6 removida e configuração inspecionada sem nova carga.

## Teste de carga com 100 pessoas (04/11)
- [x] k6 executado com subida gradual, 100 usuários virtuais por um minuto e redução gradual; somente páginas e arquivos públicos, sem login, IA, banco ou Mercado Livre.
- [x] 2.209 requisições, zero falhas, p95 de páginas 164,92 ms; limites aprovados e resultado em docs/teste-carga-k6.md. A simulação não certifica capacidade do painel autenticado.

## Visibilidade das integrações master (04/11)
- [x] Quatro masters confirmadas, incluindo Vitória; lista completa independente de quem conectou, não-masters permanecem restritos ao proprietário. Doze testes passaram; Samir autenticado exibiu 39 contas (inclui demo desativada), com MERCALANI e demais ausentes visíveis. As quatro categorias foram conferidas na base; navegador exercitado somente como Samir.

## BPC calculado sobre dados reais (04/11)
- [x] Índice de composição calculado pela soma das faixas importadas, com valores de origem e fórmula; distinto do BPC oficial importado e sem converter unidade desconhecida em visitas.
- [x] Doze testes e build OK; AUTOPECASLONDRINA autenticada em 1280/536px: (9.253,20 + 19.998,00)/35.869,20 = 0,815; 587 visitas separadas, capturas sem transbordamento ou erros.
- [ ] Contagens reais de visitas por faixa: unidade da fonte não documentada; valores decimais e soma acima de visitas impedem tratá-los como contagens. Depende de dicionário/relatório de origem que confirme unidade e escala, sem reenvio obrigatório dos arquivos já armazenados.

## Plotagem de Preço (04/11)
- [x] Decimal pt-BR do índice, índice importado separado da composição, cobertura por registros (não sellers/rivais), cartões sem títulos cortados e divisórias no diagnóstico; fonte planilha preservada. Percentual da tabela corrigido de faixas/visitas para faixas/comparações, sem alegar visitas perdidas ou rebaixamento automático.
- [x] Nove testes passaram e build OK; AUTOPECASLONDRINA autenticada em 1280/536px: BPC 0,815, cobertura 1 de 1 registro e tabela 22,3% (antes 571,2% com denominador incompatível); capturas sem transbordamento ou erros de execução.

## Cancelamentos reais mensais (03/11)
- [x] Base sem valores mensais identificados; leitura API própria com cobertura integral e limites UTC conferidos, sem escrita no ML.
- [x] Síntese substituída por valor cancelado mensal e proporção ao faturamento pago do mês; comparação parcial usa mesmos dias anteriores.
- [x] 26 testes passaram; build OK; AMERICAFERRAMENTAS exibe necessidade de conexão. AUTOPECASLONDRINA: outubro completo com 102 cancelados, R$12.706,86, faturamento pago R$135.157,73, proporção 9,40%; novembro parcial e comparação anterior conferidos.
- [ ] Consultar valores reais da AMERICAFERRAMENTAS: depende de autorização/conexão ativa da loja ao Mercado Livre.

## Diagnósticos artificiais em Preço (03/11)
- [x] Removidos adesão CDP fixa, score padrão 50 e alertas de tração sem preço/elegibilidade; cobertura sem inferir cluster/concorrentes, fonte planilha preservada. Seis testes e build OK; AMERICAFERRAMENTAS autenticada: quatro ausências, 67 visitas e alertas falsos de pedidos zero removidos. Importações antigas continuam sem distinguir ausência de zero; recuperar valores exige planilha original.

## Ausência de comparação nos cartões de Preço (03/11)
- [x] Quatro cartões sem denominador mostram ausência; zero real e visitas preservados. Três testes passaram, build OK; AMERICAFERRAMENTAS autenticada conferida por captura: quatro ausências e 67 visitas.

## Categorias e permissões por usuário (03/11)
- [x] Confirmar somente Ana Paula, Fabrício e Samir como master; usuários existentes seguem o conjunto legado até revisão, novos sem liberações.
- [x] Checklist por função em Administração → Usuários, visualizar/alterar separados, dependência leitura/ação, aprovação atômica exclusiva de master e auditoria; concessão direta bloqueada.
- [x] Aplicar guardas nas telas, tabelas, consultas e ações ML/importações/exportações; 11 testes passaram, build OK. Sessão master aprovou preço visualizar/alterar em usuário temporário e revogou; releitura persistida, tentativa de autopromoção/concessão negada, loja escondida e consulta direta recusada; tela bloqueada conferida, usuário temporário removido. Não houve escrita comercial ML. As três masters foram conferidas na base; somente Samir foi exercitado no navegador.

## Validar visitas e conversão concorrentes (03/11)
- [x] Sonda protegida implantada e executada como master: oferta MLB5452621083 obtida do catálogo; ambos os caminhos de visitas responderam 403 com autorização de aplicativo, período 04/10–02/11. Nove testes passaram e build OK.
- [x] Documentação de autorização/pedidos verificada: conversão exige pedidos pagos privados da conta comparada; não usar vendidos acumulados. Resultado registrado em docs/ml-market-access.md.
- [ ] Mostrar visitas/conversão reais: bloqueado pelo 403 das visitas e falta de autorização da própria conta comparada para pedidos pagos. Tela mantém indisponível; não contornar permissões.

## Concorrentes na aba Preço (03/11)
- [x] Preço → Concorrentes: busca, seleção de produto exato, tabela com linhas, preço atual/original, vendedor, Full/frete e diferença da mediana; visitas e conversão indisponíveis, sem estimar vendas de terceiros. Resumo preservado.
- [x] Nove testes passaram e build OK; busca autenticada “pneu aro 15” retornou 11 ofertas, quatro do produto selecionado, R$384,75–R$445,74, mediana R$415,25. Tabela conferida por captura, sem erros de execução. Visitas/conversão de concorrentes continuam sem acesso confirmado.

## Plano de pesquisa de mercado baseado no documento AvantPro (03/11)
- [x] Localizar os endpoints da API no código e no documento; mapa incluído no plano, distinguindo uso atual, restrições e caminhos ainda não validados. Consulta real de acesso fica na etapa 0.
- [x] Preparar plano incremental, reaproveitando Mercado e Tendências, preservando o visual e rejeitando métricas não comprovadas de concorrentes.
- [x] Etapa 0: diagnóstico protegido implantado, 4 testes passaram; leituras reais master e chamada autenticada no navegador. Matriz em docs/ml-market-access.md: catálogo/tendências/visitas próprias/tarifas respondem; busca geral 403, ofertas de quatro produtos 404, limite do app 403. Sem escrita ML ou mudanças visuais.
- [ ] Completar evidência de concorrentes e dimensionamento: bloqueado por ofertas 404 e limite do app 403; preço para ganhar exige amostra própria de catálogo. Não ativar coleta nem inferir vendidos/receita. Etapas 1–4 aguardam “OK, próxima etapa”.

## Atualizar novas lojas integradas (29/10)
- [x] Atualizar os oito temas do resumo das 19 contas conectadas desde 27/10; GREATPOOL e BELLOSHOPLTDA concluíram após repetir falha temporária. Conferido por leitura persistida e tela Integrações autenticada, sem escrita no Mercado Livre.
- [ ] Ads de POWERPLACEACESSORIOS, POWERPLACEBATERIAS e RUMOBATERIAS continuam com erro da API. Cargas detalhadas de anúncios, perguntas, promoções e Ads bloqueadas: acesso atual recusado por ml_pode_gerir_conta (403); históricos mensais continuam pendentes. Não contornar permissões nem declarar cobertura completa.

## Flex em Logística (29/10)
- [x] Aba Flex com filtro mensal, capital paulista ou todas as lojas acessíveis, faturamento, unidades, evolução com cobertura por mês e tabela por loja; ausência explícita e comparação mensal completa.
- [x] Cinco testes passaram; sessão real: quatro lojas da capital, três medidas, setembro R$8.401,95 e 78 unidades; mês agosto, todas as lojas e busca conferidos, 536px sem transbordamento, build OK e sem erros de execução. Home e resumo logístico preservados.

## TACOS e gráfico das campanhas (29/10)
- [x] TACOS na tabela e detalhes sobre faturamento pago da loja nas mesmas datas UTC completas; vendas atribuídas e investimento juntos em linhas distintas, sem transformar lacunas em zero. Gráfico agregado também usa linhas.
- [x] 95 testes distintos passaram. AUTOPECASLONDRINA: campanha MLB5476651802, investimento R$351,61, receita Ads R$1.307,52, TACOS 0,27%; duas linhas e TACOS diário conferidos, celular 390px, sem erros de execução; build OK.

## Completar custos diários de Ads (29/10)
- [x] Corrigir interrupção/reinício pelas primeiras campanhas: custos por campanha antes do histórico por anúncio, retomada das lacunas e leituras antigas; erros e custos ausentes não fecham cobertura. Rotina disponível, sem escrita no ML; 91 testes passaram.
- [x] AUTOPECASLONDRINA: 95 campanhas × 90 dias = 8.550 custos reais, nenhum null; 60 dias comparáveis completos (2.850 linhas por período). 29/09–28/10: R$3.581,59, 2,73% do faturamento, atingimento 91,0%; anterior R$3.901,51. Dois cartões conferidos na tela após animação, sem erros. Histórico por anúncio ainda tem dias pendentes, sem afetar esses cartões; outras lojas seguem a retomada automática, não verificadas individualmente.

## Apple Design no painel inteiro (29/10)
- [x] Materiais por hierarquia, DM Sans, feedback imediato, superfícies estáveis e menus com entrada/saída coerentes; Home e dados preservados.
- [x] AUTOPECASLONDRINA: 13 seções nos dois temas, 11 páginas adicionais, menu lateral a 536px e navegação até Preço; sem transbordamento nas seções, nenhum erro de execução, 31 testes passaram, build OK e Home com estilos idênticos. Movimento reduzido sem pulsação; contraste ampliado sem blur. CPP sem arquivo; Multilojas e Carteira de dados ainda carregando; detalhes de grupo/programa/anúncio não verificados por falta de vínculo navegável. Não alterar consultas como parte do visual.

## Investimento e tiers na Visão geral (28/10)
- [x] Dois cartões no resumo: investimento/faturamento e atingimento da meta interna de 3%, com requisitos financeiros Tier 1/2/3 separados. Mesmas datas UTC do resumo e anterior, custos diários por campanha paginados; ausência de cobertura não vira zero. Quinze testes passaram; AUTOPECASLONDRINA conferida autenticada em 1280/536px, sem erros/transbordamento; custo indisponível por cobertura incompleta, meta monetária calculável pelo faturamento real. Fluxo com custo completo não verificável nesta loja.

## Comparação entre períodos na Visão geral
- [x] Dois intervalos independentes na Visão geral, faturamento/visitas/unidades lado a lado, inversão e variação B × A; histórico diário paginado e cobertura explícita, sem misturar API. Seis testes passaram; AUTOPECASLONDRINA 28/09–12/10 × 13–27/10: R$65.138 × R$68.536, 11.026 × 10.855 visitas, 589 × 544 unidades. Inversão e erro de datas conferidos, dois temas e 536px sem transbordamento; build OK.

## Modo claro do catálogo (28/10)
- [x] Reforçar o efeito vidro: transparência de 22–60%, desfoque 24px, bisel branco e fundo levemente contrastante; títulos legíveis, sete seções conferidas com dados reais, Home idêntica, 536px sem transbordamento e build OK.
- [x] Adaptar o material do catálogo (sem tema claro próprio) em vidro branco, textura delicada e verde da Home nas superfícies compartilhadas e menus. AUTOPECASLONDRINA conferida em Visão geral, Preço, Publicidade, Logística, Qualidade, Clips e Correlações; gráficos carregados, 536px sem transbordamento, modo escuro preservado, Home com estilos idênticos na comparação, nenhum erro de execução e build OK. Dados não alterados.

## Gráficos no celular (28/10)
- [x] Remover recorte das legendas, permitir quebra de linha e ajustar margens, datas e eixos em áreas e barras; AUTOPECASLONDRINA conferida em Publicidade a 320/375/390/1280px e área de Logística a 375px, sem cortes nos eixos ou transbordamento; dez testes passaram e build OK. Dados e Home preservados.

## Proporção do título e briefing (28/10)
- [x] Aumentar a abertura da Visão geral: DM Sans, título 32/40px, resumo 16/28px, metadados 13px e prefixo “Resumo:”, mantendo o cálculo por período; AUTOPECASLONDRINA conferida em 1280/536px, sem transbordamento, Home idêntica e build OK.
- [x] Comparar a referência e corrigir a hierarquia em DM Sans: título 26/32px, resumo 14/24px, etiquetas 12/16px e títulos de bloco 18/24px; DGSULCHEVROLET conferida em 1143 e 536px nos dois temas, sem transbordamento ou erros. Fonte carregada, Home com medidas idênticas e build OK; números e cálculos preservados.

## Gráficos minimalistas (28/10)
- [x] Suavizar cores e contornos, retirar brilho pesado e limitar barras de publicidade a 20px; AUTOPECASLONDRINA conferida na Visão geral e Publicidade, sem transbordamento a 536px; dez testes passaram, Home fora dos seletores.

## Atribuição real e leitura personalizada (28/10)
- [ ] Série por promoção bloqueada: contrato de vínculo histórico não confirmado; nova leitura real da AUTOPECASLONDRINA teve 20 pedidos, 17 leituras e nenhuma correspondência local. Não inferir por participação atual ou identificadores de outra origem.
- [x] Leitura personalizada por loja, período e cobertura em Oportunidades; AUTOPECASLONDRINA conferida na tela com 85% de cobertura da amostra, cinco testes passaram e build OK. Sem atribuição ou causalidade inventadas.

## Proporção dos cartões executivos (28/10)
- [x] Aplicar dimensões da variante compacta do HTML, números legíveis e comparações alinhadas; duas colunas até haver espaço para quatro. Dados reais conferidos em 1280, 1143 e 536px, sem erros; Home não alterada.

## Ranking de vídeos no espaço de cobertura (28/10)
- [x] Adicionar lista com alternância entre conversão e visitas via Clips no espaço livre; cálculo por última medição pareada, três testes passaram.
- [x] AUTOPECASLONDRINA: espaço e alternância conferidos, sem erros; ausência de dados explícita. Ranking populado não verificável: banco não possui anúncios com visitas via Clips e pedidos medidos; nunca distribuir totais da loja.

## Produtos e campanhas elegíveis (28/10)
- [x] Limitar a lista a dez produtos com expansão e recolhimento; três testes passaram.
- [x] Produtos sincronizados e campanhas elegíveis ao vivo em AUTOPECASLONDRINA: 10/20/10 linhas conferidas. Planilhas preservadas em 2ELETRO INFO: 10 linhas e expansão/recolhimento conferidos, sem erros de página.

## Campanhas promocionais por venda (28/10)
- [x] Testar recurso de descontos com sessão real: AUTOPECASLONDRINA, 20 pedidos, 17 leituras e 3 respostas 404; identificadores de campanha/oferta presentes, nenhuma correspondência nas promoções locais verificadas. Sem expor pedidos/compradores.
- [ ] Gráfico por promoção bloqueado: falta contrato validado de correspondência entre desconto da venda e promoção, incluindo descontos combinados; não inferir pela adesão atual.
- [x] Exibir limitação e verificação sob demanda em Oportunidades, mantendo médias importadas separadas de uma série diária da API.

## Vidro lateral, topo e carregamento (28/10)
- [x] Aplicar transparência e contorno da referência no topo e lateral; unificar fontes e números, preservando Home (estilos comparados antes/depois).
- [x] Suavizar indicadores e placeholders com duração proporcional, sem alterar consultas; AUTOPECASLONDRINA conferida com valores finais, dois temas e movimento reduzido, sem transbordamento ou erros; quatro testes passaram.

## Referência design-system em todo o painel (28/10)
- [x] Uniformizar vidro, controles, tabelas, carteira legada, detalhes por nível e menus pela referência; Home conferida com estilos idênticos, dados e identidade preservados.
- [x] Conferir 13 seções da AUTOPECASLONDRINA, 11 páginas principais, abas de Admin/gestão/ML e 13 abas de Multilojas; temas e 536px verificados. Corrigir transbordamento em Oportunidades, Perguntas e gestão; nenhum erro de execução.
- [ ] Conferir conteúdo analítico de Carteira de dados — leitura permaneceu carregando; CPP exibiu ausência de arquivo. Grupo/programa/anúncio detalhado sem vínculo/dados navegáveis na loja testada; loja e categoria conferidas. Não alterar leitura ou importar dados como parte do ajuste visual.

## Corrigir vidro das seções pela Home (27/10)
- [x] Aplicar material verde translúcido inspirado no resultado visual da captura da Home, sem cordas; cartões e gráfico da AUTOPECASLONDRINA conferidos na Visão geral, sem erros de execução. Estilo compartilhado nas demais seções.
- [x] Corrigir raio, borda e sombra ao passar o mouse; retirar inclinação e reflexo exclusivos do painel. Comparação automática com a Home passou para as superfícies verificadas em Visão geral, Preço e Correlações; dois temas conferidos, sem transbordamento.
- [x] Igualar composição das superfícies ao cartão de acesso, eliminar reflexos e camadas conflitantes; Visão geral, Preço e Correlações conferidas com AUTOPECASLONDRINA nos dois temas, sem transbordamento. Demais seções recebem os estilos compartilhados.

## Glass suave como o acesso (27/10)
- [x] Suavizar superfícies, bordas, reflexos e contraste decorativo do painel; Visão geral, Correlações e Publicidade conferidas na AUTOPECASLONDRINA, incluindo 536px sem transbordamento. Dados e fórmulas preservados; Build OK.

## Gráfico combinado e matriz de sinergia (27/10)
- [x] Mostrar síntese com gráfico combinado e correlações na Visão geral e versão detalhada em Publicidade e Correlações, com fórmulas e fontes separadas; AUTOPECASLONDRINA conferida nas três seções e agrupamento semanal acionado.
- [x] Corrigir matriz legada para não converter dados ausentes ou séries constantes em correlação zero; 10 testes passaram. API: Ads × faturamento r=0,42, visitas diárias indisponíveis; manter Sem dado. Build OK.

## Retomar áreas da Visão geral (27/10)
- [x] Reproduzir cores, textura vítrea, bordas, proporções e comparações das referências nas duas áreas, sem alterar dados; AUTOPECASLONDRINA conferida em 1280px e 536px sem transbordamento, vidro com blur 24px/saturação 150%, bordas 16px e gráfico visível. Build OK.
- [x] Restaurar a disposição do resumo executivo e da evolução diária conforme as duas imagens, preservando dados reais e saúde da conta; AUTOPECASLONDRINA conferida com seis indicadores e gráfico diário renderizado, sem alterar cálculos. Build OK.

## Identidade do acesso no painel inteiro
- [x] Unificar superfícies, campos, botões e tipografia com o HTML do acesso nas páginas protegidas, sem cordas ou mudanças nos dados; Visão geral GMABSOLUTA conferida nos dois temas e em tela estreita. Estilos compartilhados aplicados às demais seções, sem auditoria individual de todas elas.

## Refino visual do painel (27/10)
- [x] Aplicar especificação de vidro fumado enviada: superfície 3,5%, borda 8%, bisel, blur, etiquetas, tooltips e base escura no painel; GMABSOLUTA conferida nos dois temas e tela estreita sem transbordamento; dados e movimento reduzido preservados. Sem brilho roxo ou transition-all.
- [x] Suavizar sombras nos dois temas e uniformizar bisel, cabeçalho e acabamento dos indicadores, sem alterar informações; GMABSOLUTA conferida nos dois temas e em 536px, sem transbordamento; movimento reduzido preservado.
- [x] Melhorar distribuição dos KPIs, leitura em DM Sans e contraste das comparações, preservando vidro, dados e integrações; GMABSOLUTA conferida nos dois temas, tela de 536px sem transbordamento e movimento reduzido sem inclinação. Correção de contraste dos números no tema claro validada visualmente.

## Otimização de indicadores (27/10)
- [x] Restringir carteiras grandes no servidor, sequenciar páginas sem consultas especulativas; classificação, tendências, últimos KPIs, verticais e consolidação mensal por RPC com RLS do usuário; mix lê último snapshot e contagem mantém 45 dias.
- [x] Cloud disponível em Mini (mudança anterior concluída); 23 testes passaram, GMABSOLUTA conferida e amostra de 100 lojas: 742 linhas históricas → 118 linhas de carteira, totais sem diferença; classificação 451 linhas e inclinação equivalente. Não atribuída melhora de latência/custo à otimização; falta janela representativa de produção, sem bloqueio da entrega.

## Estrutura visual enviada (27/10)
- [x] Adaptar estrutura do catálogo HTML ao painel: superfícies neutras, navegação, controles e hierarquia, preservando DM Sans, identidade Peregrinus, dados e integrações.
- [x] Conferir GMABSOLUTA com dados reais, navegação para Preço, reflexo localizado, gráfico nos dois temas e tela estreita sem transbordamento; 19 testes de cálculo passaram. Outras telas recebem estilos compartilhados, sem auditoria individual.

## Sinergia e dependência de publicidade
- [x] Remover a segunda análise visível em Publicidade no modo evolução (API mantida, histórico separado); AUTOPECASLONDRINA: duas seções antes, uma depois; dez testes passaram.
- [x] Incluir cálculos compartilhados de participação atribuída a Ads, TACOS e associação investimento × faturamento, com períodos alinhados e dados ausentes preservados.
- [x] Mostrar detalhes em Publicidade e síntese na Visão geral; 13 testes passaram e GMABSOLUTA conferida nas duas telas: r=0,38 em 29 datas; participação e TACOS indisponíveis enquanto faltam métricas diárias de Ads.

## Vidro branco global (27/10)
- [x] Unificar quadros e banners com branco gelo translúcido e reflexo que acompanha o mouse, preservando dados e cores de alerta.
- [x] Conferir Publicidade da GMABSOLUTA e Preço com sessão real, contraste nos dois temas, tela estreita sem transbordamento e movimento reduzido; demais seções recebem o estilo compartilhado.

## Organização macro → micro e Full (26/10)
- [x] Ordenar navegação macro → micro; Resumo como abertura, detalhes por anúncio após indicadores de Qualidade, funil em Faturamento e produtos Full ao final.
- [x] Priorizar indicadores reais da API no Resumo com 30 dias UTC completos, comparação anterior e histórico separado; leitura incompleta suspende totais.
- [x] Renomear Pock para Full e recomendar até 20 produtos vendidos fora do Full com média/covariância da receita diária, alertas ML e dimensões originais das fotos; sem prometer elegibilidade/envio/lucro.
- [x] Nove testes passaram e navegação autenticada conferida em VALDEMIR e GMABSOLUTA; GMABSOLUTA: 445 pedidos pagos, R$160.641, cancelamento 7,10%, 20 candidatos Full; busca por MLB e ajuste de proteção conferidos.

## Avisos do desenvolvedor (23/10)
- [x] Atribuir perfil Desenvolvedor a Samir sem alterar acesso às lojas e proteger atribuição no servidor.
- [x] Criar painel privado com árvore de perfis, avisos de Ads, falhas de atualização/carregamento, lentidão e sinais operacionais registrados.
- [x] Conferir painel com sessão real, reconhecimento persistido, leitura anônima bloqueada e 84 testes; outro usuário autenticado não foi testado no navegador.
- [ ] Detecção de ataques — depende de uma fonte de eventos de segurança externa ao painel; falhas operacionais não são classificadas como ataques.

## Gestão de Product Ads (22/10)
- [x] Criar painel na seção Publicidade com campanhas reais, indicadores, períodos e filtros.
- [ ] Editar orçamento/meta e pausar/ativar campanhas — aguarda contrato oficial de escrita e "OK, próxima etapa".
- [x] Validar consultas reais e cálculos: VALDEMIR 30 dias R$ 610,09 → R$ 3.782,12, ROAS 6,20x; 6 testes.

## Qualidade — estatísticas por anúncio (22/10)
- [x] Mostrar tipo Clássico/Premium, visitas, vendas e conversão no mesmo período; promoção atual consultada por anúncio.
- [x] Comparar até 4 anúncios da própria loja e indicar destaques observados, sem inventar volume de buscas.
- [x] Testar cálculos (4 testes) e comparar no painel dois anúncios da VALDEMIR: 862/165 visitas, 66/4 pedidos pagos, conversão 7,66%/2,42%, promoção ativa/não.
- [ ] Cliques Ads por anúncio — indisponíveis na consulta atual; exibidos como Sem dado, sem repartir totais de campanha.

## Gestão no Mercado Livre (só servidor, uma etapa por vez)
- [x] Pré-requisito: APP_URL correto (retorno 302 para ecomperegrinus.com.br confirmado).
- [ ] Etapa 1 — base comum (auditoria, pedidos de ação, ajustes por conta, webhook, notificações) — aguarda respostas às dúvidas.
- [ ] Etapas 2–6 — Ads leitura, Ads gestão, promoções, perguntas, testes/contratos.

## Retorno Mercado Livre (21/10)
- [x] Convite conferido (válido até 27/10) e APP_URL corrigido.
- [x] Corrigir destino do callback, impedir loop e testar o retorno publicado: quatro testes; acesso direto 200, erros 302 para ecomperegrinus.com.br, sem troca de tokens.
- [ ] Validar autorização completa — depende de o lojista autorizar no Mercado Livre.

## Melhorias aprovadas CND27 (20/10)
- [x] Usar série diária em média, mediana, recorde, evolução e distribuição semanal normalizada.
- [x] Retirar ROI sem custos e CPC proxy; apresentar TACOS e separar tiers da Meta Peregrinus.
- [x] Testar cálculos e conferir o fluxo com uma loja real: CND27 20/09–19/10, média R$ 2.538,44 e recorde 07/10 R$ 5.904,72; 167 testes, sem exceções.
- [x] Registrar matriz de origem e validação em docs/validacao-cnd27.md.
- [ ] Reimportar Product Ads e validar painel × conta no mesmo período — aguarda relatórios completos e definição do recorte.
- [ ] Liberar ROI/ACOS de equilíbrio e visão horária — aguarda custos e exportação horária reais.

## CDP e Multilojas (16/10)
- [x] Calcular e apresentar evolução de participação e pontuação CDP com dados reais e testes.
- [x] Organizar as seções Multilojas com a identidade visual do painel, sem alterar regras de acesso ou dados.
- [x] Verificar cálculos (16 testes), gráfico CDP da SINOSCAR FARRAPOS e Diretoria Multilojas com base publicada na pré-visualização; navegação completa não verificada.

## Correções estatísticas (ordens de serviço, set/2026)
- [x] OS-1 — Alerta de churn por z-score modificado (MAD), flag `ALERTS_USE_ROBUST_Z`
- [x] OS-4 — Encolhimento empírico de Bayes nos rankings, flag `RANKINGS_USE_SHRINKAGE`
- [x] OS-2 — Mediana + IQR e escala logarítmica em faturamento
- [ ] OS-5 — Estado tri-valorado (ativo / sem_participacao / sem_dado)
- [ ] OS-3 — Controle de FDR (Benjamini-Hochberg) na matriz de correlação
- [ ] OS-6 — Decomposição STL nas séries diárias
- [ ] OS-7 — Seleção de indicadores por componente nos radares

## Blindagem (v2) — pendente
- [ ] Bloco 7 — signup fechado, MFA para admin, expiração de sessão
- [ ] Bloco 8 — verificação final (revisão de segurança, teste de vazamento, varredura do bundle)

## Painel admin
- [x] Alerta de dados desatualizados (somente admin geral) no painel inicial

## Sistema de Design Peregrinus (13/10)
- [x] Tokens claros padrão, aliases legados, tipografia, format.ts, componentes ds/, medidores → barras de faixa
- [x] Diagnóstico só no Resumo
- [ ] Reorganizar cada tela com um número focal (KpiCard ds)
- [ ] Gráficos: período parcial hachurado, ordenação por valor, pizzas >4 fatias → tabela, connectNulls=false
- [ ] Revisar ~440 toFixed restantes fora de "%"/"x" para format.ts
- [x] Levar cartões branco gelo + setas boas/ruins às demais seções (sem publicar)

## Ads, Oportunidades e Clips (26/10)
- [x] Setas vs período anterior de mesma duração em todos os KPIs de Product Ads, incluindo TACOS (TACOS só na janela de 30 dias).
- [x] Botão Campanhas: tabela sob demanda e gráfico diário da campanha clicada (investimento, vendas, ROAS, ACOS, TACOS, cliques, CPC, CTR).
- [x] Oportunidades: promoções via API com investimento da loja, rebate do ML, recomendação pelo maior rebate e aviso amarelo até 7 dias; sem API segue a planilha.
- [x] Radar de qualidade/Clips movido para a aba Clips.
