/**
 * CPP Diarizada → Consolidated per-seller aggregation utilities.
 */

// Identity columns: keep LAST non-null value per seller
const IDENTITY_COLS = [
  "CUS_CUST_ID_SEL", "CUS_NICKNAME", "PROGRAMA", "INICIATIVA",
  "NIVEL_SOLUCION", "SAFRA", "SUB_CLUSTER_SELLER", "PARCEIRO",
  "GRUPO_ACAO", "REP_CURRENT_LEVEL",
] as const;

// Sum columns
const SUM_COLS = [
  "TGMV_LC", "TGMV_LC_ME2", "TSI", "TSI_ME2", "TSI_FULL",
  "GMV_LC", "F_TGMV_LC", "F_TSI", "TGMV_LC_FBM",
  "INV_PADS", "TGMV_LC_PADS", "TSI_PADS",
  "CDP_TGMV_LC", "CDP_TSI", "CDP_TGMV_INVESTIMENT_LC_SELLER",
  "CDP_TGMV_INVESTIMENT_SELLER_LC_REBATE", "CDP_TGMV_INVESTIMENT_SELLER_LC_SEM_REBATE",
  "ITEMS_OPTIN_CDP", "SELLERS_MINHA_PAGINA", "SUCC_SELLERS_MINHA_PAGINA",
  "VISITS_MATCH", "VISITS_CHEAPER", "VISITS_EXPENSIVE",
  "VIDEOS_PUBLI", "TOTAL_LIVELISTINGS", "VISITAS",
  "VISITAS_CLIPS", "TGMV_LC_CLIPS", "SI_CLIPS", "ORDERS_CLIPS",
  "TGMV_LC_FLEX", "TSI_FLEX",
] as const;

// Columns to keep last value (not sum)
const LAST_VALUE_COLS = [
  "REP_DELAYED_HT_RATE", "REP_CLAIMS_RATE", "REP_CANCELLATIONS_RATE",
  "REP_SELLER_CANCELLATIONS_RATE", "REP_DISPUTES_RATE",
  "SCORE_FINAL_CDP", "SCORE_FINAL_PADS", "SCORE_FINAL_FULL",
] as const;

export type CppRow = Record<string, string | number | null>;

export interface DailyRoasPoint {
  date: string;
  dow: number;
  roas: number | null;
  tgmvPads: number;
  invPads: number;
}

export interface ConsolidatedSeller extends Record<string, string | number | null> {
  CUS_CUST_ID_SEL: string;
  CUS_NICKNAME: string;
}

export interface CppAggregationResult {
  sellers: ConsolidatedSeller[];
  dailyRoas: DailyRoasPoint[];
  dowBenchmark: Record<number, number>;
  rawRows: CppRow[];
  dateRange: { min: string; max: string };
}

export interface PeriodMetrics {
  tgmv: number;
  tsi: number;
  visitas: number;
  invPads: number;
  tgmvPads: number;
  roas: number | null;
  txConversao: number | null;
  precoMedio: number | null;
  visitsCheaper: number;
  visitsMatch: number;
  visitsExpensive: number;
}

export interface PeriodComparison {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  deltas: Record<string, number | null>;
}

export interface DowMetrics {
  dow: number;
  label: string;
  tsi: number;
  tgmv: number;
  roas: number | null;
}

export function parseBrNumber(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const s = String(val).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function cleanCustId(raw: unknown): string {
  return String(raw || "").trim().replace(/[.,]0$/, "");
}

function getRowDate(row: CppRow): string {
  return String(row["TIM_DAY"] || row["DATA"] || row["data"] || "").trim();
}

/** Sum metrics from filtered raw rows */
function sumMetrics(rows: CppRow[]): PeriodMetrics {
  let tgmv = 0, tsi = 0, visitas = 0, invPads = 0, tgmvPads = 0;
  let visitsCheaper = 0, visitsMatch = 0, visitsExpensive = 0;
  for (const r of rows) {
    tgmv += parseBrNumber(r["TGMV_LC"]);
    tsi += parseBrNumber(r["TSI"]);
    visitas += parseBrNumber(r["VISITAS"]);
    invPads += parseBrNumber(r["INV_PADS"]);
    tgmvPads += parseBrNumber(r["TGMV_LC_PADS"]);
    visitsCheaper += parseBrNumber(r["VISITS_CHEAPER"]);
    visitsMatch += parseBrNumber(r["VISITS_MATCH"]);
    visitsExpensive += parseBrNumber(r["VISITS_EXPENSIVE"]);
  }
  return {
    tgmv, tsi, visitas, invPads, tgmvPads,
    // ERRO 1: ROAS = TGMV_LC_PADS / INV_PADS (correct)
    roas: invPads > 0 ? tgmvPads / invPads : null,
    txConversao: visitas > 0 ? (tsi / visitas) * 100 : null,
    precoMedio: tsi > 0 ? tgmv / tsi : null,
    visitsCheaper, visitsMatch, visitsExpensive,
  };
}

function calcDelta(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}

/** Compute metrics for a date range with previous period comparison */
export function computePeriodComparison(
  rows: CppRow[],
  sellerId: string | null,
  startDate: string,
  endDate: string
): PeriodComparison {
  let filtered = rows;
  if (sellerId) {
    filtered = filtered.filter(r => cleanCustId(r["CUS_CUST_ID_SEL"]) === sellerId);
  }

  const currentRows = filtered.filter(r => {
    const d = getRowDate(r);
    return d >= startDate && d <= endDate;
  });

  // Previous period of same length
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
  const prevStartStr = prevStart.toISOString().slice(0, 10);
  const prevEndStr = prevEnd.toISOString().slice(0, 10);

  const prevRows = filtered.filter(r => {
    const d = getRowDate(r);
    return d >= prevStartStr && d <= prevEndStr;
  });

  const current = sumMetrics(currentRows);
  const previous = sumMetrics(prevRows);

  return {
    current,
    previous,
    deltas: {
      tgmv: calcDelta(current.tgmv, previous.tgmv),
      tsi: calcDelta(current.tsi, previous.tsi),
      visitas: calcDelta(current.visitas, previous.visitas),
      invPads: calcDelta(current.invPads, previous.invPads),
      roas: current.roas !== null && previous.roas !== null && previous.roas > 0
        ? calcDelta(current.roas, previous.roas) : null,
      txConversao: current.txConversao !== null && previous.txConversao !== null && previous.txConversao > 0
        ? calcDelta(current.txConversao, previous.txConversao) : null,
      precoMedio: current.precoMedio !== null && previous.precoMedio !== null && previous.precoMedio > 0
        ? calcDelta(current.precoMedio, previous.precoMedio) : null,
    },
  };
}

/** Compute DOW breakdown for a seller in a date range */
export function computeDowBreakdown(
  rows: CppRow[],
  sellerId: string | null,
  startDate: string,
  endDate: string
): DowMetrics[] {
  const DOW_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  let filtered = rows;
  if (sellerId) {
    filtered = filtered.filter(r => cleanCustId(r["CUS_CUST_ID_SEL"]) === sellerId);
  }
  filtered = filtered.filter(r => {
    const d = getRowDate(r);
    return d >= startDate && d <= endDate;
  });

  const dowData: Record<number, { tsi: number; tgmv: number; invPads: number; tgmvPads: number }> = {};
  for (let i = 0; i < 7; i++) dowData[i] = { tsi: 0, tgmv: 0, invPads: 0, tgmvPads: 0 };

  for (const r of filtered) {
    const dateStr = getRowDate(r);
    const parsed = new Date(dateStr + "T12:00:00");
    if (isNaN(parsed.getTime())) continue;
    const dow = parsed.getDay();
    dowData[dow].tsi += parseBrNumber(r["TSI"]);
    dowData[dow].tgmv += parseBrNumber(r["TGMV_LC"]);
    dowData[dow].invPads += parseBrNumber(r["INV_PADS"]);
    dowData[dow].tgmvPads += parseBrNumber(r["TGMV_LC_PADS"]);
  }

  return Array.from({ length: 7 }, (_, i) => ({
    dow: i,
    label: DOW_LABELS[i],
    tsi: dowData[i].tsi,
    tgmv: dowData[i].tgmv,
    roas: dowData[i].invPads > 0 ? dowData[i].tgmvPads / dowData[i].invPads : null,
  }));
}

export interface DailySeriesPoint {
  date: string;
  gmv: number;
  tsi: number;
  invPads: number;
  tgmvPads: number;
  visitas: number;
  roas: number | null;
  gmvMM7: number | null;
  roasMM7: number | null;
}

/** Get daily multi-metric series for a seller (or all sellers if sellerId is null) */
export function getDailySeries(
  rows: CppRow[],
  sellerId: string | null,
  startDate: string,
  endDate: string
): DailySeriesPoint[] {
  const map = new Map<string, { gmv: number; tsi: number; invPads: number; tgmvPads: number; visitas: number }>();
  for (const r of rows) {
    if (sellerId && cleanCustId(r["CUS_CUST_ID_SEL"]) !== sellerId) continue;
    const d = getRowDate(r);
    if (d < startDate || d > endDate) continue;
    if (!map.has(d)) map.set(d, { gmv: 0, tsi: 0, invPads: 0, tgmvPads: 0, visitas: 0 });
    const entry = map.get(d)!;
    entry.gmv += parseBrNumber(r["TGMV_LC"]);
    entry.tsi += parseBrNumber(r["TSI"]);
    entry.invPads += parseBrNumber(r["INV_PADS"]);
    entry.tgmvPads += parseBrNumber(r["TGMV_LC_PADS"]);
    entry.visitas += parseBrNumber(r["VISITAS"]);
  }

  const sorted = Array.from(map.entries())
    .map(([date, v]) => ({
      date,
      gmv: v.gmv,
      tsi: v.tsi,
      invPads: v.invPads,
      tgmvPads: v.tgmvPads,
      visitas: v.visitas,
      roas: v.invPads > 0 ? v.tgmvPads / v.invPads : null,
      gmvMM7: null as number | null,
      roasMM7: null as number | null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute MM7
  for (let i = 0; i < sorted.length; i++) {
    if (i >= 6) {
      let sumGmv = 0, sumTgmvPads = 0, sumInvPads = 0;
      for (let j = i - 6; j <= i; j++) {
        sumGmv += sorted[j].gmv;
        sumTgmvPads += sorted[j].tgmvPads;
        sumInvPads += sorted[j].invPads;
      }
      sorted[i].gmvMM7 = sumGmv / 7;
      sorted[i].roasMM7 = sumInvPads > 0 ? sumTgmvPads / sumInvPads : null;
    }
  }

  return sorted;
}

export function aggregateSellers(rows: CppRow[]): CppAggregationResult {
  const map = new Map<string, {
    identity: Record<string, string | null>;
    sums: Record<string, number>;
    lastValues: Record<string, number>;
    maxMeses: number;
  }>();

  const dailyMap = new Map<string, { tgmvPads: number; invPads: number }>();
  let minDate = "9999-99-99";
  let maxDate = "0000-00-00";

  for (const row of rows) {
    const custId = cleanCustId(row["CUS_CUST_ID_SEL"]);
    if (!custId) continue;

    // Track date range
    const dateVal = getRowDate(row);
    if (dateVal.length >= 8) {
      if (dateVal < minDate) minDate = dateVal;
      if (dateVal > maxDate) maxDate = dateVal;
    }

    if (!map.has(custId)) {
      map.set(custId, {
        identity: {} as Record<string, string | null>,
        sums: {} as Record<string, number>,
        lastValues: {} as Record<string, number>,
        maxMeses: 0,
      });
      for (const col of SUM_COLS) map.get(custId)!.sums[col] = 0;
    }

    const entry = map.get(custId)!;

    for (const col of IDENTITY_COLS) {
      const v = row[col];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        entry.identity[col] = String(v).trim();
      }
    }

    for (const col of LAST_VALUE_COLS) {
      const v = row[col];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        entry.lastValues[col] = parseBrNumber(v);
      }
    }

    for (const col of SUM_COLS) {
      entry.sums[col] += parseBrNumber(row[col]);
    }

    const meses = parseBrNumber(row["MESES_NO_PROGRAMA"]);
    if (meses > entry.maxMeses) entry.maxMeses = meses;

    if (dateVal && dateVal.length >= 8) {
      if (!dailyMap.has(dateVal)) {
        dailyMap.set(dateVal, { tgmvPads: 0, invPads: 0 });
      }
      const d = dailyMap.get(dateVal)!;
      d.tgmvPads += parseBrNumber(row["TGMV_LC_PADS"]);
      d.invPads += parseBrNumber(row["INV_PADS"]);
    }
  }

  const dailyRoas: DailyRoasPoint[] = [];
  for (const [dateStr, vals] of dailyMap) {
    const parsed = new Date(dateStr + "T12:00:00");
    if (isNaN(parsed.getTime())) continue;
    dailyRoas.push({
      date: dateStr,
      dow: parsed.getDay(),
      roas: vals.invPads > 0 ? vals.tgmvPads / vals.invPads : null,
      tgmvPads: vals.tgmvPads,
      invPads: vals.invPads,
    });
  }
  dailyRoas.sort((a, b) => a.date.localeCompare(b.date));

  const dowSums: Record<number, { total: number; count: number }> = {};
  for (let i = 0; i < 7; i++) dowSums[i] = { total: 0, count: 0 };
  for (const d of dailyRoas) {
    if (d.roas !== null) {
      dowSums[d.dow].total += d.roas;
      dowSums[d.dow].count += 1;
    }
  }
  const dowBenchmark: Record<number, number> = {};
  for (let i = 0; i < 7; i++) {
    dowBenchmark[i] = dowSums[i].count > 0 ? dowSums[i].total / dowSums[i].count : 0;
  }

  const results: ConsolidatedSeller[] = [];

  for (const [custId, entry] of map) {
    const seller: ConsolidatedSeller = {
      ...entry.identity,
      ...entry.sums,
      ...entry.lastValues,
      CUS_CUST_ID_SEL: custId,
      CUS_NICKNAME: entry.identity["CUS_NICKNAME"] || custId,
      MESES_NO_PROGRAMA: entry.maxMeses,
    };

    const tgmv = entry.sums["TGMV_LC"] || 0;
    const gmvLc = entry.sums["GMV_LC"] || 0;
    const invPads = entry.sums["INV_PADS"] || 0;
    const tgmvPads = entry.sums["TGMV_LC_PADS"] || 0;
    const visitas = entry.sums["VISITAS"] || 0;
    const fTgmv = entry.sums["F_TGMV_LC"] || 0;
    const tgmvFull = entry.sums["TGMV_LC_FBM"] || 0;
    const cdpTgmv = entry.sums["CDP_TGMV_LC"] || 0;
    const cdpInv = entry.sums["CDP_TGMV_INVESTIMENT_LC_SELLER"] || 0;
    const listings = entry.sums["TOTAL_LIVELISTINGS"] || 0;
    const tsi = entry.sums["TSI"] || 0;

    // ERRO 1: ROAS = TGMV_LC_PADS / INV_PADS (not TGMV_LC / INV_PADS)
    // ERRO 5: sellers sem investimento → ROAS = null (N/A)
    seller["ROAS"] = invPads > 0 ? tgmvPads / invPads : null;
    seller["TX_CONVERSAO"] = visitas > 0 && tgmv > 0 ? tsi / visitas : null;
    // SHARE_FULL = GMV logístico Full (TGMV_LC_FBM) / TGMV_LC. F_TGMV_LC é métrica de meta CPP, não Full logístico.
    const rawShareFull = tgmv > 0 ? (tgmvFull / tgmv) * 100 : null;
    seller["SHARE_FULL"] = rawShareFull !== null ? Math.min(rawShareFull, 100) : null;
    seller["GMV_POR_VISITA"] = visitas > 0 ? tgmv / visitas : null;
    seller["SHARE_CDP"] = tgmv > 0 ? (cdpTgmv / tgmv) * 100 : null;
    seller["INVESTIMENTO_PERC_GMV"] = tgmv > 0 ? (invPads / tgmv) * 100 : null;
    seller["GMV_POR_LISTING"] = listings > 0 ? tgmv / listings : null;
    seller["ROAS_CDP"] = cdpInv > 0 ? cdpTgmv / cdpInv : null;

    const scoreCdp = Number(entry.lastValues["SCORE_FINAL_CDP"]) || 0;
    const scorePads = Number(entry.lastValues["SCORE_FINAL_PADS"]) || 0;
    const scoreFull = Number(entry.lastValues["SCORE_FINAL_FULL"]) || 0;
    const repDelayed = Number(entry.lastValues["REP_DELAYED_HT_RATE"]) || 0;
    const repComponent = (100 - repDelayed * 100);

    seller["SCORE_PRIORIDADE"] = Math.round(
      (scoreCdp * 0.30) + (scorePads * 0.25) + (scoreFull * 0.20) + (Math.max(0, repComponent) * 0.25)
    );

    results.push(seller);
  }

  return {
    sellers: results,
    dailyRoas,
    dowBenchmark,
    rawRows: rows,
    dateRange: { min: minDate === "9999-99-99" ? "" : minDate, max: maxDate === "0000-00-00" ? "" : maxDate },
  };
}
