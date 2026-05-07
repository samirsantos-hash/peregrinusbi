// Pure insight generators – one per KPI – pt-BR strings, factual only.

export interface MesAgg {
  mes: number; // tim_month_id e.g. 202503
  tgmv_total: number;
  count_ativos: number;
  ticket: number;
  count_queda: number;
  count_crescimento: number;
}

export interface SellerCarteira {
  cus_nickname: string;
  tgmv_lc: number;
  tgmv_lc_prev: number;
  vs_pm_pct: number;
  dias_expiracao: number;
}

const fmtC = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);

const fmtP = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export function insightTGMV(serie: MesAgg[]): string {
  if (serie.length < 2) return "Dados insuficientes para análise de tendência.";
  const last = serie[serie.length - 1];
  const mm3 = serie.slice(-3).reduce((s, m) => s + m.tgmv_total, 0) / Math.min(serie.length, 3);
  const delta = mm3 > 0 ? ((last.tgmv_total - mm3) / mm3) * 100 : 0;
  return `TGMV de ${String(last.mes).slice(4)}/${String(last.mes).slice(0, 4)} foi ${fmtC(last.tgmv_total)}, ${fmtP(delta)} vs média 3M.`;
}

export function insightSellersAtivos(serie: MesAgg[]): string {
  if (serie.length < 2) return "Dados insuficientes.";
  const cur = serie[serie.length - 1];
  const prev = serie[serie.length - 2];
  const delta = cur.count_ativos - prev.count_ativos;
  const tickDir = cur.ticket > prev.ticket ? "subiu" : cur.ticket < prev.ticket ? "caiu" : "estável";
  const tickPct = prev.ticket > 0 ? Math.abs(((cur.ticket - prev.ticket) / prev.ticket) * 100).toFixed(1) : "0";
  return `Base ${delta >= 0 ? "subiu" : "caiu"} de ${prev.count_ativos} → ${cur.count_ativos} (${delta >= 0 ? "+" : ""}${delta}). Ticket médio ${tickDir} ${tickPct}%.`;
}

export function insightTicketMedio(values: number[]): string {
  if (values.length === 0) return "Sem dados de distribuição.";
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const ratio = mean > 0 ? median / mean : 1;
  const tipo = ratio < 0.7 ? "concentrada" : ratio > 0.9 ? "distribuída" : "moderada";
  // Simple Gini
  const n = sorted.length;
  let giniNum = 0;
  for (let i = 0; i < n; i++) giniNum += (2 * (i + 1) - n - 1) * sorted[i];
  const gini = n > 0 && mean > 0 ? giniNum / (n * n * mean) : 0;
  return `Mediana ${fmtC(median)} vs média ${fmtC(mean)} → carteira ${tipo}. Gini: ${(gini * 100).toFixed(0)}%.`;
}

export function insightQueda(sellers: SellerCarteira[]): string {
  if (sellers.length === 0) return "Nenhum seller em queda neste filtro 🎉";
  const sorted = [...sellers].sort((a, b) => (b.tgmv_lc_prev - b.tgmv_lc) - (a.tgmv_lc_prev - a.tgmv_lc));
  const top5 = sorted.slice(0, 5);
  const totalLoss = sellers.reduce((s, r) => s + Math.max(r.tgmv_lc_prev - r.tgmv_lc, 0), 0);
  const top5Loss = top5.reduce((s, r) => s + Math.max(r.tgmv_lc_prev - r.tgmv_lc, 0), 0);
  const pct = totalLoss > 0 ? ((top5Loss / totalLoss) * 100).toFixed(0) : "0";
  return `Top 5 em queda concentram ${pct}% da perda total (${fmtC(totalLoss)}).`;
}

export function insightCrescimento(sellers: SellerCarteira[]): string {
  if (sellers.length === 0) return "Nenhum seller em crescimento neste filtro.";
  const totalGain = sellers.reduce((s, r) => s + Math.max(r.tgmv_lc - r.tgmv_lc_prev, 0), 0);
  const highFlyers = sellers.filter((s) => s.tgmv_lc_prev > 0 && ((s.tgmv_lc - s.tgmv_lc_prev) / s.tgmv_lc_prev) * 100 > 100);
  return `${sellers.length} sellers ganharam ${fmtC(totalGain)} este mês. ${highFlyers.length} cresceram > 100%.`;
}

export function insightVencimento(sellers: SellerCarteira[]): string {
  if (sellers.length === 0) return "Nenhuma concessão próxima do vencimento.";
  const ate30 = sellers.filter((s) => s.dias_expiracao <= 30);
  const tgmvRisco = ate30.reduce((s, r) => s + r.tgmv_lc, 0);
  const grandes = ate30.filter((s) => s.tgmv_lc > 100000);
  return `${ate30.length} concessões expiram em ≤ 30 dias (${fmtC(tgmvRisco)} em TGMV). ${grandes.length} sellers > R$ 100k.`;
}