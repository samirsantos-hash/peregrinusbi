// Markowitz min-variance allocation helpers.
// Given a per-asset time series of values (e.g. GMV per product per day),
// compute log/simple returns, mean returns, covariance matrix and the
// long-only minimum-variance weights via closed form Σ⁻¹·1 / (1ᵀΣ⁻¹1)
// followed by negative-clip + renormalisation (Markowitz long-only heuristic).

export interface AssetSeries {
  id: string;
  label: string;
  values: number[]; // aligned to common date axis
}

export interface MarkowitzResult {
  id: string;
  label: string;
  meanReturn: number;     // mean of daily simple returns
  volatility: number;     // stdev of daily returns
  weight: number;         // long-only min-variance weight [0..1]
  lastValue: number;      // last observed value (GMV)
}

export interface MarkowitzBundle {
  rows: MarkowitzResult[];
  correlation: number[][]; // n x n correlation of returns
  ids: string[];
}

function simpleReturns(v: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < v.length; i++) {
    const prev = v[i - 1];
    if (prev > 0 && isFinite(prev) && isFinite(v[i])) {
      r.push((v[i] - prev) / prev);
    } else {
      r.push(0);
    }
  }
  return r;
}

function mean(v: number[]): number {
  if (!v.length) return 0;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a), mb = mean(b);
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (n - 1);
}

// Invert a square matrix via Gauss-Jordan. Returns null if singular.
function invert(m: number[][]): number[][] | null {
  const n = m.length;
  const a: number[][] = m.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let i = 0; i < n; i++) {
    // pivot
    let pivot = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[pivot][i])) pivot = k;
    }
    if (Math.abs(a[pivot][i]) < 1e-12) return null;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    const div = a[i][i];
    for (let j = 0; j < 2 * n; j++) a[i][j] /= div;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = a[k][i];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[k][j] -= factor * a[i][j];
    }
  }
  return a.map((row) => row.slice(n));
}

export function markowitzMinVariance(series: AssetSeries[]): MarkowitzBundle {
  const n = series.length;
  if (!n) return { rows: [], correlation: [], ids: [] };

  const returns = series.map((s) => simpleReturns(s.values));
  const means = returns.map(mean);
  const vols = returns.map((r) => Math.sqrt(covariance(r, r)));
  const lastValues = series.map((s) => s.values[s.values.length - 1] ?? 0);

  // Equal-weight fallback when we don't have enough history
  const hasHistory = returns.every((r) => r.length >= 3);
  let weights: number[];

  if (!hasHistory || n === 1) {
    weights = new Array(n).fill(1 / n);
  } else {
    // Build covariance matrix with small ridge for numerical stability
    const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const c = covariance(returns[i], returns[j]);
        cov[i][j] = c;
        cov[j][i] = c;
      }
      cov[i][i] += 1e-6; // ridge
    }
    const inv = invert(cov);
    if (!inv) {
      weights = new Array(n).fill(1 / n);
    } else {
      // w = Σ⁻¹·1 / (1ᵀΣ⁻¹1)
      const ones = inv.map((row) => row.reduce((a, b) => a + b, 0));
      const denom = ones.reduce((a, b) => a + b, 0) || 1;
      let w = ones.map((x) => x / denom);
      // Long-only projection: clip negatives, renormalise (repeat once)
      for (let iter = 0; iter < 5; iter++) {
        w = w.map((x) => (x < 0 ? 0 : x));
        const s = w.reduce((a, b) => a + b, 0);
        if (s <= 0) { w = new Array(n).fill(1 / n); break; }
        w = w.map((x) => x / s);
        if (w.every((x) => x >= 0)) break;
      }
      weights = w;
    }
  }

  // Correlation matrix (Pearson) on the same returns vectors
  const correlation: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const cij = covariance(returns[i], returns[j]);
      const denom = (vols[i] || 0) * (vols[j] || 0);
      const corr = denom > 1e-12 ? Math.max(-1, Math.min(1, cij / denom)) : i === j ? 1 : 0;
      correlation[i][j] = corr;
      correlation[j][i] = corr;
    }
  }

  const rows = series.map((s, i) => ({
    id: s.id,
    label: s.label,
    meanReturn: means[i] ?? 0,
    volatility: vols[i] ?? 0,
    weight: weights[i] ?? 0,
    lastValue: lastValues[i],
  }));

  return { rows, correlation, ids: series.map((s) => s.id) };
}
