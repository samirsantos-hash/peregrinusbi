# Architecture Rules

- Daily summary, calendar-gap charts, occurrence-normalized weekdays and 30-day investment diagnostics share the pure `src/lib/analiseDiaria.ts` calculator; pass daily data explicitly and never use monthly fallback for daily claims to avoid fabricated dates and hourly estimates.

- CDP participation history and goal-attainment scores use the pure `src/lib/cdpEvolucao.ts` calculator over trailing calendar-day windows; reuse the existing promotion threshold and label attainment separately from imported official scores to prevent invented ML ratings.
- Multilojas presentation is scoped by `.multilojas-page` and shared page primitives; keep visual changes separate from aggregation and access rules to preserve existing analytics.

- Mercado Livre OAuth callbacks consume one-time state only after token exchange and finish only authorization-critical work before redirecting; schedule historical backfills with `EdgeRuntime.waitUntil` to avoid gateway timeouts.- Lojistas sem login conectam o Mercado Livre por convite público de uso único (`/conectar/:token`, 7 dias), validado apenas no servidor; convites são acessíveis só pelas funções do servidor.

- Listas completas de lojas no frontend usam `fetchAllRows` (src/lib/fetchAllRows.ts) com ordem estável; o servidor corta em 1000 linhas e lojas além disso sumiam das buscas.
- A revisão de planilhas com IA (Admin → Revisão IA) detecta inconsistências com regras determinísticas no navegador (src/lib/revisaoPlanilha.ts) e envia só os alertas à função `revisar-planilha` (só admin) para o modelo resumir; o modelo nunca inventa achados nem grava dados.
- A leitura de carteira (modelo Deep Dive) não tem tela própria: `CarteiraNaSecao` entra nas seções existentes do painel quando nenhuma loja está selecionada; cálculo em funções puras em src/lib/carteiraDeepDive/calculo.ts (mesma janela de dias) e limites só em src/config/limiaresCarteira.ts.
- index.html declara `lang="pt-BR"` e bloqueia tradução automática (`translate="no"`, meta google notranslate): o tradutor do navegador altera o DOM e derruba o React com erro de insertBefore.
- A busca de concorrentes (`ml-busca-concorrentes`, aba Preço) usa token de aplicativo do ML e o catálogo (`/products/search` + `/products/:id/items`), chamadas sequenciais: `/sites/MLB/search` responde 403 para aplicativos e chamadas paralelas dão 429.
- `ml-importar-anuncios` (só admin) lê MLBs conhecidos por cust_id e consulta `/items` em lotes de 20, gravando em `ml_anuncios`; com token de aplicativo o ML responde 403 para anúncios de terceiros, então só funciona com token da própria loja conectada.
- Sistema de Design Peregrinus: tokens só em src/index.css (`:root` = tema claro padrão, `.dark` opcional; cores legadas são aliases da paleta `--ec-*`), formatação numérica só em src/lib/format.ts (utils/formatters.ts delega) e componentes base em src/components/ds (KpiCard, BandBar, TargetBar, Alert, EmptyState, PageHeader); medidores circulares renderizam BandBar.
- Indicadores Pock derivados (Taxa de Venda vs mediana do mesmo subcluster, Favorabilidade ponderada pelas metas de src/config/limiaresCarteira.ts) ficam em src/lib/pockIndicadores.ts; a função `recomendar-seller` só redige texto a partir das métricas enviadas, sem ler nem gravar dados.
- A "Referência da vertical" do GrowthPotentialPanel é a mediana (faixa P25–P75) dos índices mensais dos pares da mesma vertical, sem o próprio seller, calculada em src/lib/referenciaVertical.ts; com menos de 5 pares não há curva, para evitar comparação circular.
