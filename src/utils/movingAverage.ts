/**
 * Simple trailing moving average over a numeric field.
 * Returns null for the first (window-1) points so recharts skips them.
 */
export function withMovingAverage<T extends Record<string, any>>(
  rows: T[],
  sourceKey: keyof T,
  targetKey: string,
  window: number,
): (T & Record<string, number | null>)[] {
  const out = rows.map((r) => ({ ...r, [targetKey]: null as number | null }));
  for (let i = 0; i < out.length; i++) {
    if (i < window - 1) continue;
    let sum = 0;
    let count = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const v = Number(out[j][sourceKey]);
      if (Number.isFinite(v)) {
        sum += v;
        count++;
      }
    }
    if (count > 0) (out[i] as any)[targetKey] = sum / count;
  }
  return out as any;
}
