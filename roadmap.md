# Roadmap

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
