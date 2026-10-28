# Roadmap

## Produtos e campanhas elegíveis (28/10)
- [ ] Limitar a lista a dez produtos com expansão e recolhimento.
- [ ] Mostrar produtos e campanhas elegíveis sincronizados do ML nas lojas conectadas; manter planilhas nas demais e verificar a troca de origem.

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
