export type ActionItem = {
  prioridade: 1 | 2 | 3;
  acao: string;
  porqueImporta: string;
  condicao: (d: any) => boolean;
};

const num = (v: any) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

export const ACOES_RESUMO: ActionItem[] = [
  {
    prioridade: 1,
    acao: "Verificar Full% na aba Logística",
    porqueImporta:
      "Full é o fator de maior peso no algoritmo. Se < 30%, é a causa mais provável de GMV estagnado.",
    condicao: (d) => num(d?.shareFullPct) > 0 && num(d?.shareFullPct) < 30,
  },
  {
    prioridade: 1,
    acao: "Ativar opt-in na Central de Promoção (Oportunidades)",
    porqueImporta:
      "CDP é o 2º fator mais importante. Itens sem opt-in perdem posicionamento orgânico gratuito.",
    condicao: (d) => num(d?.itensSemOptin) > 0,
  },
  {
    prioridade: 2,
    acao: "TACOS > 8%? Verifique se o crescimento é ads-dependent.",
    porqueImporta: "TACOS alto + GMV estável = negócio vulnerável se a verba for cortada.",
    condicao: (d) => num(d?.tacos) > 8,
  },
];

export const ACOES_FATURAMENTO: ActionItem[] = [
  {
    prioridade: 1,
    acao: "GMV caindo? Cheque tendência mensal antes da reunião com o seller.",
    porqueImporta:
      "Algoritmo favorece crescimento consistente. Declínio reduz exposição orgânica.",
    condicao: (d) => num(d?.gmvTrend) < 0,
  },
  {
    prioridade: 2,
    acao: "Correlação Ads↔GMV > 0.8? Reduza dependência via Full e CDP.",
    porqueImporta: "Se a verba cair, o GMV cai junto. Crescimento sem proteção orgânica.",
    condicao: (d) => num(d?.corrAdsGmv) > 0.8,
  },
  {
    prioridade: 2,
    acao: "TACOS > 8% sem crescimento? Auditar campanhas.",
    porqueImporta: "TACOS alto consome margem sem expandir mercado.",
    condicao: (d) => num(d?.tacos) > 8,
  },
];

export const ACOES_LOGISTICA: ActionItem[] = [
  {
    prioridade: 1,
    acao: "Full% < 30%? Leve à reunião com GM: quais SKUs migrar para Full?",
    porqueImporta: "Full é o maior alavancador de posicionamento disponível.",
    condicao: (d) => num(d?.shareFullPct) > 0 && num(d?.shareFullPct) < 30,
  },
  {
    prioridade: 2,
    acao: "Taxa de atrasos > 5%? Investigar CD e embalagem.",
    porqueImporta:
      "Atraso derruba Shipping Score e retira a tag 'chegará amanhã' dos itens Full.",
    condicao: (d) => num(d?.taxaAtrasos) > 5,
  },
  {
    prioridade: 3,
    acao: "Full + Flex < 50%? Avalie ativar Flex para capitais.",
    porqueImporta: "Cobertura logística mínima para competir no topo.",
    condicao: (d) => num(d?.shareFullPct) + num(d?.shareFlexPct) < 50,
  },
];

export const ACOES_QUALIDADE: ActionItem[] = [
  {
    prioridade: 1,
    acao: "IPI < 50? Abra a tabela de anúncios críticos e corrija os 3 piores.",
    porqueImporta: "Cada anúncio com IPI < 50 está fora das primeiras 20 posições.",
    condicao: (d) => num(d?.pontuacaoIpi) > 0 && num(d?.pontuacaoIpi) < 50,
  },
  {
    prioridade: 1,
    acao: "Score CDP = 0? Vá em Oportunidades e ative opt-in.",
    porqueImporta:
      "CDP desativado é o desperdício de alavancagem mais comum e mais fácil de corrigir.",
    condicao: (d) => num(d?.scoreCdp) === 0,
  },
  {
    prioridade: 2,
    acao: "Ficha técnica < 80%? Priorize campos obrigatórios da categoria.",
    porqueImporta:
      "Buscas específicas (ex: 'pastilha Cruze 2019') não encontram o anúncio sem a ficha.",
    condicao: (d) => num(d?.scoreCaracteristica) > 0 && num(d?.scoreCaracteristica) < 80,
  },
];

export const ACOES_PRECO: ActionItem[] = [
  {
    prioridade: 1,
    acao: "% Não Competitivo > 30%? Ajuste preço dos 5 SKUs mais visitados.",
    porqueImporta:
      "O algoritmo penaliza anúncios que atraem cliques mas não convertem — preço alto é a causa mais frequente.",
    condicao: (d) => num(d?.pctNaoCompetitivo) > 30,
  },
  {
    prioridade: 2,
    acao: "Use o quadrante 🚀 da Matriz McKinsey para escolher SKUs para CDP.",
    porqueImporta:
      "Preço competitivo + CDP ativa = efeito multiplicador no posicionamento.",
    condicao: () => true,
  },
];

export const ACOES_OPORTUNIDADES: ActionItem[] = [
  {
    prioridade: 1,
    acao: "Exporte a lista de itens sem opt-in e leve para a próxima reunião.",
    porqueImporta: "Cada item elegível sem opt-in = posição de topo não aproveitada.",
    condicao: (d) => num(d?.itensSemOptin) > 0,
  },
  {
    prioridade: 2,
    acao: "Verifique gap de desconto: seller aplicando menos que o ML sugere?",
    porqueImporta:
      "Desconto insuficiente não ativa a tag de promoção e não gera o tráfego esperado.",
    condicao: (d) => num(d?.gapDescontoMedio) > 0,
  },
];

export const ACOES_REPUTACAO: ActionItem[] = [
  {
    prioridade: 1,
    acao: "Reputação não é verde? Toda outra ação é secundária até normalizar.",
    porqueImporta:
      "Reputação amarela/vermelha é freio estrutural que nenhum investimento compensa.",
    condicao: (d) =>
      typeof d?.nivelReputacao === "string" &&
      !d.nivelReputacao.toLowerCase().includes("green"),
  },
  {
    prioridade: 2,
    acao: "Reclamações > 2%? Investigue motivos e ajuste descrição/ficha.",
    porqueImporta:
      "Reclamação = comprador desapontado. Evita-se com descrição precisa e compatibilidade verificada.",
    condicao: (d) => num(d?.taxaReclamacoes) > 2,
  },
  {
    prioridade: 2,
    acao: "Cancelamentos > 2%? Reduza catálogo e aumente profundidade nos SKUs principais.",
    porqueImporta: "Cancelamentos altos sinalizam estoque mal gerido.",
    condicao: (d) => num(d?.taxaCancelamentos) > 2,
  },
];

export const ACOES_GRANTS: ActionItem[] = [
  {
    prioridade: 1,
    acao: "Verba expirando em < 7 dias? Acionar GM imediatamente.",
    porqueImporta: "Grant vencido = oportunidade perdida sem recuperação.",
    condicao: (d) => num(d?.diasParaExpirar) > 0 && num(d?.diasParaExpirar) <= 7,
  },
  {
    prioridade: 2,
    acao: "Sem verba ativa? Verifique elegibilidade com o GM.",
    porqueImporta: "Grants multiplicam GMV sem custo direto quando bem alocados.",
    condicao: (d) => !d?.temVerbaAtiva,
  },
];

export const ACOES_POR_ABA: Record<string, ActionItem[]> = {
  efficiency: ACOES_RESUMO,
  executive: ACOES_FATURAMENTO,
  logistics: ACOES_LOGISTICA,
  quality: ACOES_QUALIDADE,
  competitiveness: ACOES_PRECO,
  opportunities: ACOES_OPORTUNIDADES,
  reputation: ACOES_REPUTACAO,
  grants: ACOES_GRANTS,
};