import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicidadeMetricas = {
  // Período selecionado (agregado a partir de sellers_kpi_daily)
  inv_pads: number;
  gmv_pads: number;
  tsi_pads: number;
  gmv_total: number;

  // Métricas calculadas
  roas: number;
  acos: number;
  tacos: number;
  pct_gmv_ads: number;
  ticket_medio: number;

  // Scores mensais do ML (0–100) — vindos de cpp_mensal
  score_pads: number | null;
  score_acos: number | null;
  score_tacos: number | null;
  pct_dias_ativos: number | null;
  itens_com_ads_score: number | null;

  // Série histórica para o gráfico (últimos 12 meses)
  historico: {
    mes: string; // "2026-05"
    roas: number;
    acos: number;
    tacos: number;
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
  const { data: diario } = await supabase
    .from("sellers_kpi_daily")
    .select("inv_pads, tgmv_lc, tgmv_lc_pads, tsi_pads, data")
    .eq("seller_id", sellerUuid)
    .gte("data", fromDate)
    .lte("data", toDate);

  const rows = diario ?? [];
  const inv_pads = rows.reduce((s, r: any) => s + num(r.inv_pads), 0);
  const gmv_pads = rows.reduce((s, r: any) => s + num(r.tgmv_lc_pads), 0);
  const tsi_pads = rows.reduce((s, r: any) => s + num(r.tsi_pads), 0);
  const gmv_total = rows.reduce((s, r: any) => s + num(r.tgmv_lc), 0);

  const roas = inv_pads > 0 ? gmv_pads / inv_pads : 0;
  const acos = gmv_pads > 0 ? (inv_pads / gmv_pads) * 100 : 0;
  const tacos = gmv_total > 0 ? (inv_pads / gmv_total) * 100 : 0;
  const pct_gmv_ads = gmv_total > 0 ? (gmv_pads / gmv_total) * 100 : 0;
  const ticket_medio = tsi_pads > 0 ? gmv_pads / tsi_pads : 0;

  // ── 2) Scores ML do mês de referência ─────────────────────────────
  let mensal: any = null;
  if (Number.isFinite(custIdNum) && custIdNum > 0) {
    const { data } = await supabase
      .from("cpp_mensal")
      .select(
        "score_final_pads, pontuacao_acos, pontuacao_tacos, pontuacao_pct_dias_com_pads, pontuacao_itens_com_ads",
      )
      .eq("cus_cust_id_sel", custIdNum)
      .eq("tim_month_id", timMonthId)
      .limit(1)
      .maybeSingle();
    mensal = data;
  }

  // ── 3) Histórico mensal (últimos 12 meses até o mês de referência) ─
  let historico: PublicidadeMetricas["historico"] = [];
  if (Number.isFinite(custIdNum) && custIdNum > 0) {
    const { data: hist } = await supabase
      .from("cpp_mensal")
      .select("tim_month_id, inv_pads, tgmv_lc_pads, tsi_pads, tgmv_lc")
      .eq("cus_cust_id_sel", custIdNum)
      .lte("tim_month_id", timMonthId)
      .order("tim_month_id", { ascending: false })
      .limit(12);

    historico = (hist ?? [])
      .slice()
      .reverse()
      .map((r: any) => {
        const inv = num(r.inv_pads);
        const gmv = num(r.tgmv_lc_pads);
        const tot = num(r.tgmv_lc);
        const id = String(r.tim_month_id);
        return {
          mes: id.length === 6 ? `${id.slice(0, 4)}-${id.slice(4, 6)}` : id,
          roas: inv > 0 ? gmv / inv : 0,
          acos: gmv > 0 ? (inv / gmv) * 100 : 0,
          tacos: tot > 0 ? (inv / tot) * 100 : 0,
          inv,
          gmv_ads: gmv,
          tsi_ads: num(r.tsi_pads),
        };
      });
  }

  return {
    inv_pads,
    gmv_pads,
    tsi_pads,
    gmv_total,
    roas,
    acos,
    tacos,
    pct_gmv_ads,
    ticket_medio,
    score_pads: mensal?.score_final_pads ?? null,
    score_acos: mensal?.pontuacao_acos ?? null,
    score_tacos: mensal?.pontuacao_tacos ?? null,
    pct_dias_ativos: mensal?.pontuacao_pct_dias_com_pads ?? null,
    itens_com_ads_score: mensal?.pontuacao_itens_com_ads ?? null,
    historico,
  };
}

// ── Helpers de cor por performance ────────────────────────────────────
export function corRoas(v: number): string {
  return v >= BENCHMARKS_ADS.roas.excelente
    ? "#16A34A"
    : v >= BENCHMARKS_ADS.roas.bom
      ? "#4ade80"
      : v >= BENCHMARKS_ADS.roas.atencao
        ? "#D97706"
        : "#DC2626";
}

export function corAcos(v: number): string {
  return v <= BENCHMARKS_ADS.acos.excelente
    ? "#16A34A"
    : v <= BENCHMARKS_ADS.acos.bom
      ? "#4ade80"
      : v <= BENCHMARKS_ADS.acos.atencao
        ? "#D97706"
        : "#DC2626";
}

export function corTacos(v: number): string {
  return v <= BENCHMARKS_ADS.tacos.excelente
    ? "#16A34A"
    : v <= BENCHMARKS_ADS.tacos.bom
      ? "#4ade80"
      : v <= BENCHMARKS_ADS.tacos.atencao
        ? "#D97706"
        : "#DC2626";
}

export function corScore(v: number): string {
  return v >= BENCHMARKS_ADS.scorePads.bom
    ? "#16A34A"
    : v >= BENCHMARKS_ADS.scorePads.atencao
      ? "#D97706"
      : "#DC2626";
}

export function classRoas(v: number): string {
  return v >= BENCHMARKS_ADS.roas.excelente
    ? "Excelente"
    : v >= BENCHMARKS_ADS.roas.bom
      ? "Bom"
      : v >= BENCHMARKS_ADS.roas.atencao
        ? "Atenção"
        : "Crítico";
}

export function classAcos(v: number): string {
  return v <= BENCHMARKS_ADS.acos.excelente
    ? "Excelente"
    : v <= BENCHMARKS_ADS.acos.bom
      ? "Bom"
      : v <= BENCHMARKS_ADS.acos.atencao
        ? "Atenção"
        : "Crítico";
}

export function classTacos(v: number): string {
  return v <= BENCHMARKS_ADS.tacos.excelente
    ? "Eficiente"
    : v <= BENCHMARKS_ADS.tacos.bom
      ? "Bom"
      : v <= BENCHMARKS_ADS.tacos.atencao
        ? "Atenção"
        : "Alto";
}