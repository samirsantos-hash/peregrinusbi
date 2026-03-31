/**
 * CPP Diarizada → Consolidated per-seller aggregation utilities.
 */

// Identity columns: keep LAST non-null value per seller
const IDENTITY_COLS = [
  "CUS_CUST_ID_SEL", "CUS_NICKNAME", "PROGRAMA", "INICIATIVA",
  "NIVEL_SOLUCION", "SAFRA", "SUB_CLUSTER_SELLER", "PARCEIRO",
  "GRUPO_ACAO",
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
  "REP_DELAYED_HT_RATE", "REP_CLAIMS_RATE", "REP_CANCELLATIONS_RATE", "REP_DISPUTES_RATE",
  "SCORE_FINAL_CDP", "SCORE_FINAL_PADS", "SCORE_FINAL_FULL",
] as const;

export type CppRow = Record<string, string | number | null>;

export interface DailyRoasPoint {
  date: string;
  dow: number; // 0=Sun, 6=Sat
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
  dowBenchmark: Record<number, number>; // dow → avg ROAS
}

function parseBrNumber(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const s = String(val).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function aggregateSellers(rows: CppRow[]): CppAggregationResult {
  const map = new Map<string, {
    identity: Record<string, string | null>;
    sums: Record<string, number>;
    lastValues: Record<string, number>;
    maxMeses: number;
  }>();

  // Daily aggregation for ROAS chart
  const dailyMap = new Map<string, { tgmvPads: number; invPads: number }>();

  for (const row of rows) {
    const custId = String(row["CUS_CUST_ID_SEL"] || "").trim().replace(/[.,]0$/, "");
    if (!custId) continue;

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

    // Identity: overwrite with last non-null
    for (const col of IDENTITY_COLS) {
      const v = row[col];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        entry.identity[col] = String(v).trim();
      }
    }

    // Last value cols (reputation, scores)
    for (const col of LAST_VALUE_COLS) {
      const v = row[col];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        entry.lastValues[col] = parseBrNumber(v);
      }
    }

    // Sums
    for (const col of SUM_COLS) {
      entry.sums[col] += parseBrNumber(row[col]);
    }

    // Max MESES_NO_PROGRAMA
    const meses = parseBrNumber(row["MESES_NO_PROGRAMA"]);
    if (meses > entry.maxMeses) entry.maxMeses = meses;

    // Daily ROAS aggregation (try TIM_DAY, DATA, or data columns)
    const dateVal = String(row["TIM_DAY"] || row["DATA"] || row["data"] || "").trim();
    if (dateVal && dateVal.length >= 8) {
      if (!dailyMap.has(dateVal)) {
        dailyMap.set(dateVal, { tgmvPads: 0, invPads: 0 });
      }
      const d = dailyMap.get(dateVal)!;
      d.tgmvPads += parseBrNumber(row["TGMV_LC_PADS"]);
      d.invPads += parseBrNumber(row["INV_PADS"]);
    }
  }

  // Build daily ROAS array
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

  // DOW benchmark: average ROAS per day of week
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

  // Build consolidated sellers
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

    // Derived KPIs
    const tgmv = entry.sums["TGMV_LC"] || 0;
    const invPads = entry.sums["INV_PADS"] || 0;
    const tgmvPads = entry.sums["TGMV_LC_PADS"] || 0;
    const visitas = entry.sums["VISITAS"] || 0;
    const fTgmv = entry.sums["F_TGMV_LC"] || 0;
    const cdpTgmv = entry.sums["CDP_TGMV_LC"] || 0;
    const cdpInv = entry.sums["CDP_TGMV_INVESTIMENT_LC_SELLER"] || 0;
    const listings = entry.sums["TOTAL_LIVELISTINGS"] || 0;
    const tsi = entry.sums["TSI"] || 0;

    seller["ROAS"] = invPads > 0 ? tgmvPads / invPads : null;
    seller["TX_CONVERSAO"] = visitas > 0 && tgmv > 0 ? tsi / visitas : null;
    seller["SHARE_FULL"] = tgmv > 0 ? (fTgmv / tgmv) * 100 : null;
    seller["GMV_POR_VISITA"] = visitas > 0 ? tgmv / visitas : null;
    seller["SHARE_CDP"] = tgmv > 0 ? (cdpTgmv / tgmv) * 100 : null;
    seller["INVESTIMENTO_PERC_GMV"] = tgmv > 0 ? (invPads / tgmv) * 100 : null;
    seller["GMV_POR_LISTING"] = listings > 0 ? tgmv / listings : null;
    seller["ROAS_CDP"] = cdpInv > 0 ? cdpTgmv / cdpInv : null;

    // Priority Score [3.1]
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

  return { sellers: results, dailyRoas, dowBenchmark };
}
