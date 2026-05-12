/**
 * Aggregates daily KPI records into monthly buckets.
 * Sums additive metrics; averages ratio metrics.
 */
import { monthKey as getMonthKey } from "@/lib/dates";
import { detectPartialMonths } from "./partialPeriodGuard";

export function aggregateKpisByMonth<T extends Record<string, any>>(kpis: T[]): T[] {
  if (kpis.length === 0) return [];

  const buckets: Record<string, { items: T[] }> = {};

  for (const k of kpis) {
    const dateStr: string = k.date || "";
    const monthKey = getMonthKey(dateStr);
    if (!buckets[monthKey]) buckets[monthKey] = { items: [] };
    buckets[monthKey].items.push(k);
  }

  // Additive fields (summed)
  const sumFields = [
    "gmv", "tsi", "tgmv", "revenue", "adsInvestment",
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

  const result: T[] = [];

  const sortedKeys = Object.keys(buckets).sort();
  for (const monthKey of sortedKeys) {
    const { items } = buckets[monthKey];
    const base = { ...items[0] } as any;

    // Canonical date = first of the month (or first actual date in data)
    base.date = `${monthKey}-01`;
    base.id = `agg-${monthKey}`;

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

  // Tag partial months (parasitic / incomplete data) so charts can badge them.
  const partialInfo = detectPartialMonths(result, { gmvField: "gmv", thresholdPct: 0.3 });
  for (const r of result) {
    const info = partialInfo.get(String((r as any).date).slice(0, 7));
    (r as any).__partial = info?.isPartial ?? false;
    (r as any).__partialShare = info?.gmvShare ?? 1;
  }
  return result;
}
