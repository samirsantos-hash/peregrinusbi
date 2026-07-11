// Conteúdos didáticos baseados no algoritmo real do Mercado Livre.
// Pesos: CRÍTICO = Full + CDP | ESSENCIAL = Reputação + Desconto Pix
// IMPORTANTE = Volume Vendas + Preço Competitivo.

export type AlgoTooltipContent = {
  oque: string;
  algoritmo: string;
  seBom?: string;
  seRuim?: string;
  correlacao?: string;
  benchmark?: string;
};

export const TOOLTIPS: Record<string, AlgoTooltipContent> = {
  // ─── RESUMO ────────────────────────────────────────────────────────────
  gmv: {
    oque: "Faturamento Bruto (GMV) — soma de todas as vendas no período, antes de cancelamentos e devoluções.",
    algoritmo: "O algoritmo ML usa o histórico de GMV para definir a posição na busca. Sellers com GMV crescendo recebem mais exposição orgânica — o ML quer mostrar quem vende.",
    seBom: "Crescimento consistente → o algoritmo amplifica o alcance organicamente.",
    seRuim: "Queda por 2+ meses → revisar logística (Full), preço competitivo e aderência à Central de Promoção.",
    correlacao: "GMV ↑ quando: Full% ↑, CDP Opt-in ativo, % Não Competitivo < 30%.",
    benchmark: "Meta mínima: crescimento MoM positivo 3 meses consecutivos.",
  },
  roas: {
    oque: "ROAS — para cada R$ 1 investido em Ads, quantos R$ de faturamento foram gerados.",
    algoritmo: "Ads (PADS) são posição COMPRADA — diferente da Central de Promoção que é orgânica. ROAS alto significa anúncios pagos convertendo, mas não substitui otimização orgânica.",
    seBom: "ROAS > 10x → Ads muito eficientes. Considerar aumentar verba para escalar.",
    seRuim: "ROAS < 2x → Ads custando mais do que retornam. Revisar segmentação, título e preço antes de aumentar verba.",
    correlacao: "ROAS depende de: Título otimizado, Fotos fundo branco, Preço competitivo e Estoque robusto.",
    benchmark: "< 2x vermelho | 2–5x atenção | 5–10x bom | > 10x excelente.",
  },
  acos: {
    oque: "ACOS — % do faturamento de Ads consumido pelo investimento. Inverso do ROAS.",
    algoritmo: "ML Ads funciona por CPC. ACOS alto indica que o anúncio atrai cliques mas não converte — o algoritmo penaliza CTR sem conversão rebaixando o anúncio.",
    seBom: "ACOS < 10% → campanha eficiente.",
    seRuim: "ACOS > 25% → alto CTR sem compra. Verificar alinhamento entre título, imagem e preço.",
    correlacao: "ACOS ↓ quando Preço Competitivo ↑ e Fotos de qualidade ↑.",
    benchmark: "Meta: ACOS < 15% para maioria das categorias.",
  },
  tacos: {
    oque: "TACOS — investimento em Ads como % do faturamento TOTAL.",
    algoritmo: "Mostra o peso real dos Ads no negócio. TACOS subindo + GMV estável = seller dependendo cada vez mais de verba paga sem crescimento orgânico.",
    seBom: "TACOS estável ou caindo com GMV crescendo → o orgânico está sustentando o crescimento.",
    seRuim: "TACOS > 8% com GMV estagnado → ads-driven, risco de retração se verba for cortada.",
    correlacao: "TACOS saudável exige: Full% alto + CDP ativo + IPI alto.",
    benchmark: 'Alerta "Margem em fuga" dispara quando TACOS ↑ + GMV estável.',
  },
  cpa: {
    oque: "CPA — custo por aquisição. Quanto se gastou em Ads por pedido gerado.",
    algoritmo: "Proxy de eficiência de aquisição. CPA alto indica que segmentação ou criativos não estão convertendo o tráfego pago em pedidos.",
    seBom: "CPA abaixo da margem unitária do produto → campanha lucrativa.",
    seRuim: "CPA > margem do produto → cada pedido novo destrói valor.",
    benchmark: "Comparar contra ticket médio: CPA ideal < 10% do ticket.",
  },
  tgmv: {
    oque: "TGMV — faturamento líquido de cancelamentos e devoluções. É o que realmente ficou.",
    algoritmo: "O ML mede a saúde do seller pelo TGMV. Devoluções altas reduzem o TGMV e sinalizam problema de confiança que o algoritmo penaliza.",
    seBom: "TGMV ≈ GMV → taxa de devolução/cancelamento saudável.",
    seRuim: "Gap grande entre GMV e TGMV → investigar causa (compatibilidade, qualidade, expectativa do anúncio).",
    correlacao: "TGMV depende de BS% e Taxa de Cancelamento da aba Reputação.",
    benchmark: "Razão TGMV/GMV > 95% é saudável.",
  },
  notaSaudeOperacao: {
    oque: "Score ponderado de saúde operacional (0–100): logística, SEO, conversão e promoções.",
    algoritmo: "Proxy do que o algoritmo do ML vê internamente. Os 4 pilares — Logística, CDP, Reputação e Relevância — estão refletidos nesse número.",
    seBom: "> 80 → operação preparada para escalar Ads sem desperdiçar verba.",
    seRuim: "< 60 → investir mais em Ads agora vai desperdiçar verba. Corrigir operação primeiro.",
    correlacao: "Sobe quando: Full% ↑ + CDP ativo + IPI > 70 + Reputação verde.",
    benchmark: "Meta mínima: 70. Para Tier 1: 80+.",
  },
  // ─── FATURAMENTO ────────────────────────────────────────────────────
  tendenciaMensal: {
    oque: "Inclinação da curva de faturamento nos últimos meses.",
    algoritmo: "O ML favorece anúncios de sellers com histórico crescente. Mesmo sem Full, um seller com crescimento consistente recebe mais exposição por prova de conversão histórica.",
    seBom: "Inclinação positiva 3+ meses → algoritmo amplifica organicamente.",
    seRuim: "Inclinação negativa → urgência em revisar Full, CDP e preço.",
    correlacao: "Resultado de: Logística × Qualidade × CDP ativo.",
    benchmark: "Slope > 0 por 3 meses consecutivos = saúde mínima.",
  },
  corr_ads_gmv: {
    oque: "Correlação Pearson (-1 a 1) entre Investimento em Ads e GMV.",
    algoritmo: "Correlação alta (>0.7) indica que o crescimento depende de tráfego pago. Ideal: GMV cresce mesmo quando Ads fica estável — orgânico funcionando.",
    seBom: "Correlação < 0.5 com GMV crescendo → orgânico funcionando.",
    seRuim: 'Correlação > 0.8 → negócio "ads-dependent". Se orçamento cair, GMV cai junto.',
    correlacao: "Para reduzir dependência: aumentar Full%, otimizar IPI, ativar CDP.",
    benchmark: "Correlação saudável: entre 0.3 e 0.6.",
  },
  // ─── LOGÍSTICA ───────────────────────────────────────────────────────
  shareFullPct: {
    oque: "% do faturamento ou unidades enviadas via Mercado Envios Full.",
    algoritmo: '⚠️ CRÍTICO. Full é o fator de MAIOR peso isolado no algoritmo. Itens Full recebem a tag "Chegará amanhã" que dobra a conversão. Sellers Full dominam o topo via shipping_highlighted_fulfillment.',
    seBom: "Full% > 60% → algoritmo empurra para o topo de forma orgânica e gratuita.",
    seRuim: "Full% < 30% → desvantagem estrutural no algoritmo. Prioridade máxima: plano de migração para Full.",
    correlacao: "Full ↑ → Conversão ↑ → GMV ↑ → Histórico ↑ → Mais exposição orgânica.",
    benchmark: "Habilitação no plano: +8,9% sobre GMV. Meta Tier 1: > 60%. Mínimo: > 30%.",
  },
  shareFlexPct: {
    oque: "% de unidades enviadas via Mercado Envios Flex (entrega no mesmo dia em capitais).",
    algoritmo: 'Flex é alternativa ao Full. Ativa a tag "Chegará hoje" em grandes capitais, com peso similar ao Full.',
    seBom: "Flex ativo em capitais → cobre o gap de entrega rápida mesmo sem Full.",
    seRuim: "Full baixo E Flex = 0 → sem nenhum fator de velocidade. Desvantagem máxima.",
    correlacao: "Full + Flex > 60% = cobertura premium. Entre 30–60% = transição. < 30% = desvantagem estrutural.",
    benchmark: "Habilitação no plano: +4,1% sobre GMV. Recomendado em capitais enquanto se constrói Full.",
  },
  logisticsMixEvolution: {
    oque: "Evolução do mix logístico (Full / Flex / Agência) mês a mês.",
    algoritmo: "A migração de Agência para Full é a alavanca de maior impacto único que um consultor pode entregar.",
    seBom: "Linha Full subindo mês a mês → trajetória de otimização correta.",
    seRuim: "Full estagnado ou caindo → verificar estoque no CD, ruptura ou operação.",
    correlacao: "Mix Logístico é o principal driver da tendência de GMV de longo prazo.",
    benchmark: "+10pp em Full normalmente gera 15–25% de crescimento em GMV em 60 dias.",
  },
  // ─── QUALIDADE ──────────────────────────────────────────────────────
  ipi: {
    oque: "IPI (Item Performance Index) — score 0–100 de qualidade do anúncio calculado pelo ML.",
    algoritmo: "⚠️ ESSENCIAL. IPI baixo penaliza o ranking orgânico. Considera: título, fotos, ficha técnica, estoque e histórico de devoluções.",
    seBom: "IPI > 70 → anúncio elegível para posições de destaque orgânico.",
    seRuim: "IPI < 50 → anúncio invisível no orgânico. Ads caros e ineficientes.",
    correlacao: "Exige: Título < 60 chars | Fotos fundo branco | Ficha 100% preenchida.",
    benchmark: "Meta mínima: 70. Alerta crítico: < 50.",
  },
  scoreCdp: {
    oque: "Score de aderência à Central de Promoção — 36 pontos se ativo, 0 se não participa.",
    algoritmo: "⚠️ CRÍTICO. CDP é um dos 2 fatores com MAIS peso (ao lado do Full). Gera tag 'Oferta Imperdível' e abas exclusivas → tráfego adicional orgânico gratuito.",
    seBom: "Score 36 → seller com combustível máximo de algoritmo ativo.",
    seRuim: "Score 0 → deixar de ganhar posicionamento orgânico gratuito. Prioridade 1.",
    correlacao: "CDP ativo → tag promoção → tráfego ↑ → vendas ↑ → IPI ↑ → posição ↑.",
    benchmark: "Qualquer seller com margem > 5% deve estar ativo.",
  },
  scorePads: {
    oque: "Score de saúde dos Ads (PADS) — 0–100.",
    algoritmo: "Score baixo indica CTR sem conversão — o algoritmo penaliza rebaixando o próprio anúncio pago.",
    seBom: "> 70 → campanha convertendo bem. Considerar escalar verba.",
    seRuim: "< 40 → urgente otimizar título e imagem antes de continuar investindo.",
    correlacao: "Sobe com: Preço competitivo + Fotos de qualidade + Título com keywords.",
    benchmark: "Score < 40 + ROAS < 2x = interromper Ads e corrigir o anúncio.",
  },
  pontuacaoAtributos: {
    oque: "Score da ficha técnica, título e fotos do anúncio (0–100).",
    algoritmo: "O ML indexa pelo título e ficha técnica. Ficha incompleta = invisível para buscas específicas. Para autopeças: Marca + Part Number + Modelo + Ano são obrigatórios.",
    seBom: "> 80 → capturando buscas orgânicas específicas.",
    seRuim: "< 60 → perdendo tráfego orgânico qualificado.",
    correlacao: "Atributos ↑ → CTR ↑ → Conversão ↑ → IPI ↑ → Posição ↑.",
    benchmark: "Meta: 100% da ficha preenchida.",
  },
  saudeCodigoBarras: {
    oque: "Saúde do EAN/GTIN — validade dos códigos de barras.",
    algoritmo: "EAN válido é pré-requisito para Lojas Oficiais e para o ML reconhecer o produto no catálogo. Sem EAN: não entra em comparações de preço.",
    seBom: "> 90% → catálogo estruturado.",
    seRuim: "< 70% → perdendo visibilidade em comparadores e buscas de marca.",
    correlacao: "EAN ↑ → Pontuação de Atributos ↑ → IPI ↑.",
    benchmark: "Meta: 100% para Platinum/Gold.",
  },
  atratividadeOferta: {
    oque: "Score de atratividade — preço + frete grátis + promoções (0–100).",
    algoritmo: "Desconto no Pix tem peso 'Alto/Essencial'. Frete grátis é pré-requisito para muitas posições de destaque.",
    seBom: "> 75 → oferta atrativa para competir nas primeiras posições.",
    seRuim: "< 50 → preço/condições abaixo da concorrência. O algoritmo esconde.",
    correlacao: "Desconto Pix 27%+ + Frete Grátis = combinação que o algoritmo máxima favorece.",
    benchmark: "Desconto Pix mínimo depende da categoria — ver CDP.",
  },
  // ─── CLIPS ──────────────────────────────────────────────────────────
  coberturaCLips: {
    oque: "Cobertura de Clips — % de itens elegíveis com vídeo publicado.",
    algoritmo: "Canal de tráfego orgânico novo no ML. Itens com vídeo recebem destaque adicional na busca e nas páginas de produto.",
    seBom: "> 50% → boa cobertura, canal ativo.",
    seRuim: "< 20% → oportunidade orgânica gratuita não explorada.",
    correlacao: "Clips ↑ → CTR ↑ → Conversão ↑ → IPI ↑.",
    benchmark: "Meta: 20 clips/mês, 8.000 visitas, 40 pedidos via clips.",
  },
  visitasViaClips: {
    oque: "% das visitas totais vindas de Clips.",
    algoritmo: "Visitas via Clips têm menor custo de aquisição e tendem a ter conversão mais alta — o comprador já viu o produto em movimento.",
    seBom: "> 5% → canal orgânico contribuindo significativamente.",
    seRuim: "≈ 0% → clips publicados sem alcance. Revisar primeiros 3s e hashtags.",
    correlacao: "Clips com fundo branco + demonstração + < 30s têm melhor performance.",
    benchmark: "Sellers com > 10% visitas via Clips reportam até 20% de incremento em conversão.",
  },
  // ─── PREÇO ──────────────────────────────────────────────────────────
  pctNaoCompetitivo: {
    oque: "% de visitas onde o preço do seller era maior que o do concorrente.",
    algoritmo: "⚠️ IMPORTANTE. Preço competitivo tem peso 'Médio-Alto'. ML cruza CTR com conversão em tempo real — anúncio caro com cliques sem conversão é progressivamente rebaixado.",
    seBom: "< 20% → preço competitivo na maioria das visitas.",
    seRuim: "> 30% → algoritmo começa a esconder o anúncio.",
    correlacao: "% Não Competitivo ↑ → Conversão ↓ → IPI ↓ → Posição ↓.",
    benchmark: "Mediana de mercado: 29,4% — acima disso, você está abaixo da média.",
  },
  matrizMckinsey: {
    oque: "Matriz 2×2: Atratividade de Mercado × Força Competitiva.",
    algoritmo: "Anúncios em 🚀 'Investir Agressivamente' são os candidatos a entrar na CDP com desconto alto. Anúncios em ⚠ 'Descontinuar' não devem receber verba de Ads.",
    seBom: "Maioria em 🚀 ou 🔄 → carteira saudável.",
    seRuim: "Maioria em ⚙ ou ⚠ → catálogo sem tração. Revisão necessária.",
    correlacao: "Posição = função de: Full%, CDP, IPI e % Preço Competitivo.",
    benchmark: "Meta: > 50% dos SKUs em 🚀 ou 🔄.",
  },
  // ─── OPORTUNIDADES ─────────────────────────────────────────────────
  itensSemOptin: {
    oque: "Itens elegíveis à CDP que ainda não fizeram opt-in.",
    algoritmo: "⚠️ CRÍTICO. Item elegível sem opt-in perde visibilidade. Mas a entrada deve ser avaliada pela margem disponível — não force opt-in em itens que não suportam o desconto.",
    seBom: "0 itens elegíveis sem opt-in com margem suficiente → combustível orgânico maximizado.",
    seRuim: "Itens com margem ok sem opt-in → ação imediata. Antes, verificar se há campanha com COPARTICIPAÇÃO disponível (ML divide o custo do desconto).",
    correlacao: "Opt-in → tag → tráfego ↑ → conversão ↑ → IPI ↑ → posição ↑.",
    benchmark: "Fluxo: 1) campanha com coparticipação? Entrar. 2) Senão, margem suporta desconto mínimo? Entrar. 3) Senão, reduzir custo operacional primeiro.",
  },
  gapDesconto: {
    oque: "Gap entre o desconto sugerido pelo ML e o aplicado pelo seller.",
    algoritmo: "Sellers que vão além do desconto sugerido ganham destaque adicional. Goodyear com 27% bateu Speedmax com 13% mesmo com menos histórico.",
    seBom: "Gap zero ou negativo (deu mais que o sugerido) → máxima vantagem.",
    seRuim: "Gap positivo grande → desconto insuficiente para entrar na promoção.",
    correlacao: "Desconto > sugerido → algoritmo favorece → tráfego amortiza o desconto.",
    benchmark: "Cada 5pp extras tendem a dobrar o tráfego da promoção.",
  },
  // ─── REPUTAÇÃO ──────────────────────────────────────────────────────
  nivelReputacao: {
    oque: "Nível de reputação: Verde Escuro (Platinum) → Verde (Gold/Silver) → Amarelo → Vermelho.",
    algoritmo: "⚠️ Pré-requisito #1. Nenhuma ação de Ads ou CDP tem efeito pleno enquanto a reputação não for verde. Amarelo = algoritmo começa a penalizar. Vermelho = risco de suspensão.",
    seBom: "Verde Escuro (Platinum) → máxima visibilidade. Foque em Full e CDP para crescer.",
    seRuim: "Amarelo = urgência. Vermelho = parar tudo e escalar para GM.",
    correlacao: "Resultado de: Reclamação + Atraso + Cancelamento.",
    benchmark: "Tier 1: green_platinum | Tier 2: green_gold | Tier 3: green_silver.",
  },
  taxaReclamacoes: {
    oque: "Taxa de reclamações formais (rep_claims_rate).",
    algoritmo: "Reclamação formal é o sinal mais grave. O algoritmo penaliza imediatamente sellers com taxa crescente. > 3% = alerta de rebaixamento.",
    seBom: "< 1% → operação de alta qualidade.",
    seRuim: "> 3% alerta. > 5% risco de suspensão. Ação imediata.",
    correlacao: "Reclamações altas = descrição enganosa OU incompatibilidade OU logística com defeito.",
    benchmark: "Meta: < 2%. Tier 1 exige < 1%.",
  },
  taxaAtrasos: {
    oque: "Taxa de envios com atraso (rep_delayed_ht_rate).",
    algoritmo: "Único fator que NEUTRALIZA o Full sem tirar o item do CD. Quando sobe, o Shipping Score cai, a tag 'chegará amanhã' some e o item passa a competir como se fosse Coleta — mesmo estando no Full.",
    seBom: "< 5% → logística dentro do SLA do ML.",
    seRuim: "> 10% → crise. Verificar etiquetagem, ruptura no CD ou janela de despacho.",
    correlacao: "Atraso ↑ → Shipping Score ↓ → Tag some → Conversão ↓ → Posição ↓.",
    benchmark: "Meta: < 5%. 5–10% = atenção. > 10% = crise logística.",
  },
  taxaCancelamentos: {
    oque: "Taxa de cancelamentos iniciados pelo seller (rep_cancellations_rate).",
    algoritmo: "ML interpreta como 'seller sem estoque' ou 'não conseguiu entregar'. Reduz Estoque Score e sinaliza má gestão de inventário.",
    seBom: "< 1% → estoque e operação bem geridos.",
    seRuim: "> 3% → algoritmo esconde anúncios progressivamente.",
    correlacao: "Cancelamento alto + OOS alto = catálogo mal gerido. Reduzir SKUs, aumentar profundidade.",
    benchmark: "Meta: < 2%.",
  },
  // ─── GRANTS ─────────────────────────────────────────────────────────
  verbaAtiva: {
    oque: "Verba (Grant) ativa — crédito do programa para investimento em Ads ou outros fins.",
    algoritmo: "Grants bem aplicados em Ads multiplicam GMV sem custo direto. Cada R$ retorna 5–15x dependendo do ROAS do seller.",
    seBom: "Verba ativa com prazo > 30 dias → planejamento tranquilo.",
    seRuim: "Verba expirando < 7 dias → contato imediato com GM.",
    correlacao: "Grant → Ads ↑ → GMV ↑ → Histórico ↑ → Posição orgânica ↑.",
    benchmark: "Gastar nos últimos 15 dias do prazo. Antes: planejar. Depois: executar.",
  },
  diasExpiracaoGrant: {
    oque: "Dias restantes até o vencimento da verba ativa.",
    algoritmo: "Grant vencido = perda de alavancagem. O ML não recompensa retrospectivamente — a janela é o prazo da verba.",
    seBom: "> 30 dias → verde. Tempo hábil para planejar.",
    seRuim: "< 7 dias → vermelho. Acionar GM com urgência.",
    correlacao: "Expiração frequente indica falta de orientação consultiva.",
    benchmark: "Verde > 30d | Amarelo 8–30d | Vermelho ≤ 7d | Expirado.",
  },
  // ─── EFETIVIDADE vs CATEGORIA ──────────────────────────────────────
  efetividadeCategoria: {
    oque: "Índice do seller vs MEDIANA dos pares da mesma categoria (não vs teto, nem vs meta). 100% = igual à mediana.",
    algoritmo: "Calculado em dimensões relativas: GMV, Conversão, Reputação (claims + atrasos, proxy de Tempo de Resposta ao cliente), Share Full, ROAS e ACOS. A dimensão mais fraca é o ponto de alavanca real — nunca interprete o índice geral sozinho.",
    seBom: "≥ 150% Líder de Categoria | 130–149% Performance Excedente | 110–129% Acima da Média.",
    seRuim: "90–109% Na Média (sem vantagem) | 70–89% Gap de Vendas | < 70% Potencial de Recuperação (urgência).",
    correlacao: "Ordem de investigação sugerida quando o índice geral está fraco: (1) Reputação e Tempo de Resposta — freio estrutural, corrige antes de tudo; (2) Share Full — maior peso isolado no algoritmo; (3) Conversão — preço, fotos, ficha técnica, CDP; (4) ROAS/ACOS — segmentação e qualidade de Ads; (5) GMV — consequência das anteriores. Ex: índice 95% com Share Full em 61% ⇒ migrar para Full é a ação de maior impacto antes de mexer em Ads ou preço.",
    benchmark: "Diferenças entre 95–105% são estatisticamente irrelevantes — qualquer variação mensal as apaga. Tempo de Resposta entra hoje via proxy de claims + atrasos; quando o dado bruto de resposta ao comprador for ingerido, vira dimensão própria.",
  },
  // ─── MIX LOGÍSTICO COMPLETO ────────────────────────────────────────
  shareCorreios: {
    oque: "% do mix logístico via Correios (fora da malha Mercado Envios).",
    algoritmo: "Correios não tem nenhum benefício de plano nem de algoritmo — sem tag de velocidade, sem peso na habilitação. É ponto de partida, não de chegada.",
    seBom: "0% → seller 100% dentro da malha ML.",
    seRuim: "> 5% do mix → primeiro passo é migrar para qualquer modal ME (LOC, Places, Cross-docking) antes de pensar em Full/Flex.",
    benchmark: "Meta: 0%. Sair do Correios é o primeiro passo para entrar na malha de benefícios.",
  },
  shareCrossdocking: {
    oque: "% do mix via Cross-docking — despacho para hub regional do ML.",
    algoritmo: "Modal de emergência. Sem tag de velocidade, sem peso no plano. Usar apenas quando LOC e Places estão indisponíveis na região.",
    seBom: "< 5% → uso pontual, como esperado.",
    seRuim: "> 20% → modal de emergência virou padrão. Verificar se LOC/Places estão disponíveis.",
    benchmark: "Pirâmide ideal: Full > Flex > Coleta/Places > Cross-docking > Correios.",
  },
  // ─── CLIPS — par visitas × conversão ───────────────────────────────
  clipsConversao: {
    oque: "Conversão das visitas vindas de Clips comparada à conversão geral do seller.",
    algoritmo: "O clip deve PRÉ-QUALIFICAR o comprador antes do clique. A pergunta certa não é 'tem clip?', é 'o clip está convertendo?'.",
    seBom: "Visitas altas + conversão ≥ geral → clip funcionando como vendedor. Replicar formato nos outros SKUs.",
    seRuim: "Visitas altas + conversão < geral → clip atrai mas não convence. Revisar os primeiros 3s e a demonstração do produto em uso.",
    correlacao: "Visitas baixas + conversão alta = ajustar hashtags/horário. Tudo baixo = refilmar com nova abordagem.",
    benchmark: "Meta EcomConsult: 20 clips/mês, 8.000 visitas, 40 pedidos.",
  },

  // ─── ALIASES / KEYS COMPLEMENTARES ─────────────────────────────────
  posicaoVsVertical: {
    oque: "Índice de efetividade do seller comparado à MEDIANA dos sellers da mesma categoria/vertical.",
    algoritmo: "Calculado por dimensão relativo ao benchmark da categoria específica do seller. Compara GMV, conversão, reputação e ROAS.",
    seBom: "> 130% em pelo menos 3 dimensões → vantagem competitiva real na vertical.",
    seRuim: "< 80% em qualquer dimensão → gap estrutural vs concorrência direta.",
    correlacao: "Reflete o resultado conjunto da operação comercial e logística.",
    benchmark: "100% indica sincronia perfeita com a mediana do mercado de atuação.",
  },
  fullFbm: {
    oque: "Mercado Envios Full (FBM) — armazenamento e expedição gerenciados diretamente pelo CD do ML.",
    algoritmo: "⚠️ CRÍTICO. Fator com MAIOR peso isolado no algoritmo (+8,9% sobre GMV esperado). Libera a tag 'Chegará amanhã' gerando saltos imediatos de conversão.",
    seBom: "Full% > 60% → cobertura logística premium, tração orgânica otimizada.",
    seRuim: "Full% < 30% → desvantagem estrutural severa contra concorrentes da categoria.",
    correlacao: "Full ↑ → Conversão ↑ → Histórico de Vendas ↑ → Exposição Orgânica ↑.",
    benchmark: "Meta Tier 1: > 60%. Mínimo competitivo tolerável: > 30%.",
  },
  flexEnvio: {
    oque: "Mercado Envios Flex — entregas no mesmo dia (Same-Day) por frota própria ou motoboy.",
    algoritmo: "Ativa a tag 'Chegará hoje' em grandes centros metropolitanos. Peso de +4,1% sobre o GMV como acelerador de posicionamento.",
    seBom: "Flex ativo + Full estruturado → blindagem de velocidade logística nas capitais.",
    seRuim: "Flex inativo em capital → perda do público de urgência que compra via filtros de velocidade.",
    correlacao: "Aumenta a conversão instantânea de anúncios locais.",
    benchmark: "Recomendado para cobrir inventário de giro que ainda não migrou para o Full.",
  },
  coletaLoc: {
    oque: "Mercado Envios Coleta (LOC) — coleta diária da malha do ML diretamente no galpão do seller.",
    algoritmo: "Patamar intermediário básico da rede integrada. Não gera selos de velocidade instantâneos, mas mantém o tracking em SLA monitorado.",
    seBom: "SLA de expedição cumprido → proteção do índice de atraso da reputação.",
    seRuim: "Perda das janelas de coleta → rep_delayed_ht_rate dispara e derruba o termômetro da conta.",
    correlacao: "Modal de transição padrão na evolução operacional: LOC → Flex → Full.",
    benchmark: "SLA interno de faturamento/etiquetagem deve ser < 2 horas após a venda.",
  },
  placesEnvio: {
    oque: "Mercado Envios Places — agências físicas parceiras onde o seller faz o drop-off dos pacotes.",
    algoritmo: "Garante rastreamento nativo e proteção de disputa logística. Usado na calibração de contas do Grupo B.",
    seBom: "Despacho feito antes do cut-off diário → postagem em dia e fluxo seguro.",
    seRuim: "Atrasos frequentes no drop-off → penalização equivalente a atraso de coleta.",
    correlacao: "Evita perda de reputação por problemas em transportadoras terceiras.",
    benchmark: "Manter envio em < 24h para blindar o score de frete.",
  },
  crossDocking: {
    oque: "Cross-docking / Agência Tradicional — envio para hubs regionais sem fluxo de velocidade acelerada.",
    algoritmo: "Posicionamento inferior na pirâmide algorítmica. Sem vantagens de tags de relevância ou conversão impulsionada.",
    seBom: "Usado estritamente para cauda longa (SKUs de baixíssimo giro).",
    seRuim: "Mais de 40% do catálogo em Cross-docking → seller perde relevância orgânica.",
    correlacao: "Reduzir este modal é a forma mais barata de melhorar o tempo de entrega simulado.",
    benchmark: "Meta: reduzir a participação para menos de 20% do mix total.",
  },
  correiosEnvio: {
    oque: "Envios via Correios (contrato próprio, fora da malha Mercado Envios).",
    algoritmo: "🚫 PENALIZAÇÃO TOTAL. O algoritmo zera qualquer ganho estrutural. Sem rastreio integrado, sem proteção financeira.",
    seBom: "Nunca é bom. Usar apenas nos primeiros 15 dias de onboarding de sellers das categorias C e D.",
    seRuim: "Vendas travadas no modelo → conta estagnada na última página de buscas.",
    correlacao: "Migrar para Mercado Envios causa ganho imediato de ~15% em visitas orgânicas.",
    benchmark: "Meta: 0% de participação.",
  },
};