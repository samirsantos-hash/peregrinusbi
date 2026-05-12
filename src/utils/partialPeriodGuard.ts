/**
 * Partial-period guard.
 * Detects months whose total GMV is a small fraction of the median of the
 * surrounding months (default: <30% of the 6-month median). Returned set
 * lets the UI badge them as "Mês parcial" or exclude them from trends.
 */

export interface PartialMonthInfo {
  monthKey: string;       // YYYY-MM
  gmvShare: number;       // 0..1, gmv/median
  isPartial: boolean;
}

export function detectPartialMonths<T extends Record<string, any>>(
  monthlyRows: T[],
  opts: { gmvField?: string; thresholdPct?: number; minMonths?: number } = {},
): Map<string, PartialMonthInfo> {
  const gmvField = opts.gmvField ?? "gmv";
  const threshold = opts.thresholdPct ?? 0.3;
  const minMonths = opts.minMonths ?? 4;
  const out = new Map<string, PartialMonthInfo>();
  if (!monthlyRows || monthlyRows.length < minMonths) return out;

  const monthly = monthlyRows
    .map((r) => ({
      monthKey: String(r.date || "").slice(0, 7),
      gmv: Number(r[gmvField]) || 0,
    }))
    .filter((r) => r.monthKey);

  const sortedGmv = monthly.map((m) => m.gmv).filter((v) => v > 0).sort((a, b) => a - b);
  if (sortedGmv.length < minMonths) return out;
  const median = sortedGmv[Math.floor(sortedGmv.length / 2)];
  if (!median) return out;

  for (const m of monthly) {
    const share = median > 0 ? m.gmv / median : 1;
    out.set(m.monthKey, {
      monthKey: m.monthKey,
      gmvShare: share,
      isPartial: share < threshold,
    });
  }
  return out;
}

export function isPartialMonth(date: string, info: Map<string, PartialMonthInfo>): boolean {
  return info.get(String(date).slice(0, 7))?.isPartial ?? false;
}