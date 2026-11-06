import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicidadeMetricas = {
  // Período selecionado (agregado a partir de sellers_kpi_daily)
  inv_pads: number;
  gmv_pads: number;
  tsi_pads: number;
  gmv_total: number;

  // Métricas calculadas
  /** null = sem datas com investimento e receita medidos juntos. */
  roas: number | null;
  acos: number | null;
  tacos: number | null;
  pct_gmv_ads: number | null;
  ticket_medio: number | null;
  /** Datas do período com investimento medido / total de datas lidas. */
  dias_medidos: number;
  dias_lidos: number;

  // Scores mensais do ML (0–100) — vindos de cpp_mensal
  score_pads: number | null;
  score_acos: number | null;
  score_tacos: number | null;
  pct_dias_ativos: number | null;
  itens_com_ads_score: number | null;

  // Série histórica para o gráfico (últimos 12 meses)
  historico: {
    mes: string; // "2026-05"
    roas: number | null;
    acos: number | null;
    tacos: number | null;
    inv: number;
    gmv_ads: number;
    tsi_ads: number;
  }[];
};

export const BENCHMARKS_ADS = {
  roas: { critico: 3, atencao: 5, bom: 8, excelente: 12 },
  acos: { excelente: 10, bom: 20, atencao: 35, critico: 50 },
  tacos: { excelente: 2, bom: 5, atencao: 10, critico: 15 },
  diasAtivos: { critico: 50, atencao: 70, bom: 85 },
  scorePads: { critico: 40, atencao: 60, bom: 75 },
} as const;

/** Valor medido ou null (vazio não vira zero). */
const med = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

type LinhaAds = { inv_pads?: unknown; tgmv_lc?: unknown; tgmv_lc_pads?: unknown; tsi_pads?: unknown; data?: unknown };

/** Agrega o período pareando numerador e denominador nas mesmas datas medidas. */
export function agregarPublicidade(rows: LinhaAds[]) {
  let inv = 0, gmvAds = 0, tsiAds = 0, gmvTot = 0;
  let invRoas = 0, gmvRoas = 0, invTacos = 0, totTacos = 0, gmvAdsPart = 0, totPart = 0, gmvTicket = 0, tsiTicket = 0;
  let diasInv = 0;
  for (const r of rows) {
    const i = med(r.inv_pads), g = med(r.tgmv_lc_pads), t = med(r.tsi_pads), tot = med(r.tgmv_lc);
    if (i != null) { inv += i; diasInv++; }
    if (g != null) gmvAds += g;
    if (t != null) tsiAds += t;
    if (tot != null) gmvTot += tot;
    if (i != null && g != null) { invRoas += i; gmvRoas += g; }
    if (i != null && tot != null) { invTacos += i; totTacos += tot; }
    if (g != null && tot != null) { gmvAdsPart += g; totPart += tot; }
    if (g != null && t != null) { gmvTicket += g; tsiTicket += t; }
  }
  return {
    inv_pads: inv, gmv_pads: gmvAds, tsi_pads: tsiAds, gmv_total: gmvTot,
    roas: invRoas > 0 ? gmvRoas / invRoas : null,
    acos: gmvRoas > 0 ? (invRoas / gmvRoas) * 100 : null,
    tacos: totTacos > 0 ? (invTacos / totTacos) * 100 : null,
    pct_gmv_ads: totPart > 0 ? (gmvAdsPart / totPart) * 100 : null,
    ticket_medio: tsiTicket > 0 ? gmvTicket / tsiTicket : null,
    dias_medidos: diasInv, dias_lidos: rows.length,
  };
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Converte YYYY-MM-DD em tim_month_id (YYYYMM). */
export function dateToTimMonthId(dateStr: string): number {
  const [y, m] = dateStr.split("-");
  return Number(`${y}${m}`);
}

/**
 * Busca métricas de publicidade combinando:
 *  - sellers_kpi_daily: agregado do período (inv_pads, gmv_pads, tsi_pads, gmv_total)
 *  - cpp_mensal: scores ML do mês de referência + histórico de 12 meses
 */
export async function getPublicidadeMetricas(
  supabase: SupabaseClient,
  params: {
    sellerUuid: string;          // sellers_kpi_daily.seller_id
    custId: number | string;     // cpp_mensal.cus_cust_id_sel
    fromDate: string;            // YYYY-MM-DD
    toDate: string;              // YYYY-MM-DD
  },
): Promise<PublicidadeMetricas> {
  const { sellerUuid, custId, fromDate, toDate } = params;
  const custIdNum = typeof custId === "string" ? Number(custId) : custId;
  const timMonthId = dateToTimMonthId(toDate);

  // ── 1) Agregado diário do período ─────────────────────────────────
  const { data: diario, error: erroDiario } = await supabase
    .from("sellers_kpi_daily")
    .select("inv_pads, tgmv_lc, tgmv_lc_pads, tsi_pads, data")
    .eq("seller_id", sellerUuid)
    .gte("data", fromDate)
    .lte("data", toDate);
  if (erroDiario) throw erroDiario;

  const agg = agregarPublicidade(diario ?? []);

  // ── 2) Scores ML do mês de referência ─────────────────────────────
  let mensal: any = null;
  if (Number.isFinite(custIdNum) && custIdNum > 0) {
    const { data, error } = await supabase
      .from("cpp_mensal")
      .select(
        "score_final_pads, pontuacao_acos, pontuacao_tacos, pontuacao_pct_dias_com_pads, pontuacao_itens_com_ads",
      )
      .eq("cus_cust_id_sel", custIdNum)
      .eq("tim_month_id", timMonthId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    mensal = data;
  }

  // ── 3) Histórico mensal (últimos 12 meses até o mês de referência) ─
  let historico: PublicidadeMetricas["historico"] = [];
  if (Number.isFinite(custIdNum) && custIdNum > 0) {
    const { data: hist, error: erroHist } = await supabase
      .from("cpp_mensal")
      .select("tim_month_id, inv_pads, tgmv_lc_pads, tsi_pads, tgmv_lc")
      .eq("cus_cust_id_sel", custIdNum)
      .lte("tim_month_id", timMonthId)
      .order("tim_month_id", { ascending: false })
      .limit(12);
    if (erroHist) throw erroHist;

    historico = (hist ?? [])
      .slice()
      .reverse()
      .map((r: any) => {
        const invM = med(r.inv_pads), gmvM = med(r.tgmv_lc_pads), totM = med(r.tgmv_lc);
        const inv = invM ?? 0;
        const gmv = gmvM ?? 0;
        const tot = totM ?? 0;
        const id = String(r.tim_month_id);
        return {
          mes: id.length === 6 ? `${id.slice(0, 4)}-${id.slice(4, 6)}` : id,
          roas: invM != null && gmvM != null && inv > 0 ? gmv / inv : null,
          acos: invM != null && gmvM != null && gmv > 0 ? (inv / gmv) * 100 : null,
          tacos: invM != null && totM != null && tot > 0 ? (inv / tot) * 100 : null,
          inv,
          gmv_ads: gmv,
          tsi_ads: num(r.tsi_pads),
        };
      });
  }

  return {
    ...agg,
    score_pads: mensal?.score_final_pads ?? null,
    score_acos: mensal?.pontuacao_acos ?? null,
    score_tacos: mensal?.pontuacao_tacos ?? null,
    pct_dias_ativos: mensal?.pontuacao_pct_dias_com_pads ?? null,
    itens_com_ads_score: mensal?.pontuacao_itens_com_ads ?? null,
    historico,
  };
}

// ── Helpers de cor por performance ────────────────────────────────────
export function corRoas(v: number | null): string {
  if (v == null) return "hsl(var(--muted-foreground))";
  return v >= BENCHMARKS_ADS.roas.excelente
    ? "hsl(var(--ok))"
    : v >= BENCHMARKS_ADS.roas.bom
      ? "hsl(var(--emerald-glow))"
      : v >= BENCHMARKS_ADS.roas.atencao
        ? "hsl(var(--attention-text))"
        : "hsl(var(--crit))";
}

export function corAcos(v: number | null): string {
  if (v == null) return "hsl(var(--muted-foreground))";
  return v <= BENCHMARKS_ADS.acos.excelente
    ? "hsl(var(--ok))"
    : v <= BENCHMARKS_ADS.acos.bom
      ? "hsl(var(--emerald-glow))"
      : v <= BENCHMARKS_ADS.acos.atencao
        ? "hsl(var(--attention-text))"
        : "hsl(var(--crit))";
}

export function corTacos(v: number | null): string {
  if (v == null) return "hsl(var(--muted-foreground))";
  return v <= BENCHMARKS_ADS.tacos.excelente
    ? "hsl(var(--ok))"
    : v <= BENCHMARKS_ADS.tacos.bom
      ? "hsl(var(--emerald-glow))"
      : v <= BENCHMARKS_ADS.tacos.atencao
        ? "hsl(var(--attention-text))"
        : "hsl(var(--crit))";
}

export function corScore(v: number): string {
  return v >= BENCHMARKS_ADS.scorePads.bom
    ? "hsl(var(--ok))"
    : v >= BENCHMARKS_ADS.scorePads.atencao
      ? "hsl(var(--attention-text))"
      : "hsl(var(--crit))";
}

export function classRoas(v: number | null): string {
  if (v == null) return "Sem dado";
  return v >= BENCHMARKS_ADS.roas.excelente
    ? "Excelente"
    : v >= BENCHMARKS_ADS.roas.bom
      ? "Bom"
      : v >= BENCHMARKS_ADS.roas.atencao
        ? "Atenção"
        : "Crítico";
}

export function classAcos(v: number | null): string {
  if (v == null) return "Sem dado";
  return v <= BENCHMARKS_ADS.acos.excelente
    ? "Excelente"
    : v <= BENCHMARKS_ADS.acos.bom
      ? "Bom"
      : v <= BENCHMARKS_ADS.acos.atencao
        ? "Atenção"
        : "Crítico";
}

export function classTacos(v: number | null): string {
  if (v == null) return "Sem dado";
  return v <= BENCHMARKS_ADS.tacos.excelente
    ? "Eficiente"
    : v <= BENCHMARKS_ADS.tacos.bom
      ? "Bom"
      : v <= BENCHMARKS_ADS.tacos.atencao
        ? "Atenção"
        : "Alto";
}