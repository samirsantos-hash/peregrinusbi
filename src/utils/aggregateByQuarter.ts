/**
 * Aggregates KPI records into quarterly (Q1-Q4) buckets.
 * Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
 */

function getQuarterKey(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  const q = Math.ceil(m / 3);
  return `${y}-Q${q}`;
}

function getQuarterLabel(key: string): string {
  // key = "2025-Q1" → canonical date = first month of quarter
  const [y, qPart] = key.split("-");
  const qNum = parseInt(qPart.replace("Q", ""), 10);
  const firstMonth = String((qNum - 1) * 3 + 1).padStart(2, "0");
  return `${y}-${firstMonth}-01`;
}

// Additive fields (summed)
const sumFields = [
  "gmv", "tsi", "tgmv", "revenue", "adsInvestment", "tgmvPads",
  "visits", "visitsExpensive", "visitsMatch", "visitsCheaper",
  "tgmvFull", "tgmvFlex", "cdpTgmv",
  "sellersClipsPubli", "visitasClips", "siClips", "ordersClips", "tgmvLcClips",
];

// Ratio / score fields (averaged)
const avgFields = [
  "roas", "acos", "tacos", "cpa",
  "scorePhoto", "scoreTitle", "scoreOferta", "scoreCaracteristica",
  "scoreFull", "scorePads",
  "llPicturesScore", "llTitleScore", "llTechSpecsScore", "llDescriptionScore",
  "llPriceScore", "llStockAvailabilityScore", "llFreeShippingScore", "llPromotionsScore",
  "pctFull", "pctFlex", "pctPostagem",
  "upliftGmvM1", "gmvM1", "minPriceRival",
  "repClaimsRate", "repDelayedRate", "repCancellationsRate",
  "pontuacaoLlGtin",
];

export function aggregateKpisByQuarter<T extends Record<string, any>>(kpis: T[]): T[] {
  if (kpis.length === 0) return [];

  const buckets: Record<string, { items: T[] }> = {};

  for (const k of kpis) {
    const dateStr: string = k.date || "";
    if (!dateStr) continue;
    const qKey = getQuarterKey(dateStr);
    if (!buckets[qKey]) buckets[qKey] = { items: [] };
    buckets[qKey].items.push(k);
  }

  const result: T[] = [];
  const sortedKeys = Object.keys(buckets).sort();

  for (const qKey of sortedKeys) {
    const { items } = buckets[qKey];
    const base = { ...items[0] } as any;

    base.date = getQuarterLabel(qKey);
    base.id = `agg-${qKey}`;

    for (const field of sumFields) {
      if (field in base) {
        base[field] = items.reduce((s: number, k: any) => s + (Number(k[field]) || 0), 0);
      }
    }

    for (const field of avgFields) {
      if (field in base) {
        const validItems = items.filter((k: any) => k[field] !== 0 && k[field] != null);
        base[field] = validItems.length > 0
          ? validItems.reduce((s: number, k: any) => s + (Number(k[field]) || 0), 0) / validItems.length
          : 0;
      }
    }

    // Keep string fields from most recent item
    const latest = items.sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""))[items.length - 1];
    base.repLevel = (latest as any).repLevel || base.repLevel;
    base.statusPhoto = (latest as any).statusPhoto || base.statusPhoto;
    base.statusTitle = (latest as any).statusTitle || base.statusTitle;
    base.productName = (latest as any).productName || base.productName;
    base.productId = (latest as any).productId || base.productId;

    result.push(base as T);
  }

  return result;
}
