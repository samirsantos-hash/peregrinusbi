// Estatística descritiva para a aba Carteira

export function sortAsc(arr: number[]): number[] {
  return [...arr].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
}

export function quantile(sortedAsc: number[], q: number): number {
  if (!sortedAsc.length) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedAsc[base + 1];
  return next != null ? sortedAsc[base] + rest * (next - sortedAsc[base]) : sortedAsc[base];
}

export function median(values: number[]): number {
  return quantile(sortAsc(values), 0.5);
}

export interface DescriptiveStats {
  n: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  sd: number;
  cv: number; // sd/mean
  skewness: number;
}

export function describe(values: number[]): DescriptiveStats {
  const arr = sortAsc(values);
  const n = arr.length;
  if (n === 0) return { n: 0, mean: 0, median: 0, min: 0, max: 0, q1: 0, q3: 0, iqr: 0, sd: 0, cv: 0, skewness: 0 };
  const sum = arr.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const q1 = quantile(arr, 0.25);
  const q3 = quantile(arr, 0.75);
  const med = quantile(arr, 0.5);
  const skew = sd > 0 ? arr.reduce((s, v) => s + ((v - mean) / sd) ** 3, 0) / n : 0;
  return {
    n,
    mean,
    median: med,
    min: arr[0],
    max: arr[n - 1],
    q1,
    q3,
    iqr: q3 - q1,
    sd,
    cv: mean !== 0 ? sd / Math.abs(mean) : 0,
    skewness: skew,
  };
}

// Curva ABC (80/95/100) sobre valores desc.
export interface AbcRow<T> {
  item: T;
  value: number;
  cumPct: number;
  klass: "A" | "B" | "C";
}
export function abc<T>(items: T[], getValue: (t: T) => number): AbcRow<T>[] {
  const total = items.reduce((s, it) => s + Math.max(0, getValue(it)), 0);
  if (total <= 0) return items.map((it) => ({ item: it, value: getValue(it), cumPct: 0, klass: "C" as const }));
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));
  let cum = 0;
  return sorted.map((it) => {
    const v = Math.max(0, getValue(it));
    cum += v;
    const pct = cum / total;
    const klass: "A" | "B" | "C" = pct <= 0.8 ? "A" : pct <= 0.95 ? "B" : "C";
    return { item: it, value: v, cumPct: pct, klass };
  });
}

// Regressão linear simples y = a + b*x → retorna slope, intercept, r²
export interface LinReg { slope: number; intercept: number; r2: number; }
export function linreg(xs: number[], ys: number[]): LinReg {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const slope = sxx !== 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const r2 = sxx * syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  return { slope, intercept, r2 };
}

// Média móvel simples
export function movingAverage(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < window) { out.push(null); continue; }
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += values[j];
    out.push(sum / window);
  }
  return out;
}

export function fmtBRL(v: number | null | undefined, digits = 0): string {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function fmtInt(v: number | null | undefined): string {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return Math.round(n).toLocaleString("pt-BR");
}
export function fmtPct(v: number | null | undefined, digits = 1): string {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return `${(n * 100).toFixed(digits)}%`;
}
// Histograma com curva normal teórica sobreposta
export interface HistBin { x0: number; x1: number; mid: number; count: number; normal: number; }
export function histogram(values: number[], bins = 18): HistBin[] {
  const arr = sortAsc(values);
  if (arr.length < 2) return [];
  const min = arr[0];
  const max = arr[arr.length - 1];
  if (max <= min) return [];
  const w = (max - min) / bins;
  const s = describe(arr);
  const out: HistBin[] = [];
  for (let i = 0; i < bins; i++) {
    const x0 = min + i * w;
    const x1 = x0 + w;
    const count = arr.filter((v) => (i === bins - 1 ? v >= x0 && v <= x1 : v >= x0 && v < x1)).length;
    const mid = (x0 + x1) / 2;
    const pdf = s.sd > 0
      ? (1 / (s.sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((mid - s.mean) / s.sd) ** 2)
      : 0;
    out.push({ x0, x1, mid, count, normal: pdf * arr.length * w });
  }
  return out;
}

export function fmtBRLShort(v: number | null | undefined): string {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `R$ ${(n / 1e9).toFixed(1).replace(".", ",")} bi`;
  if (abs >= 1e6) return `R$ ${(n / 1e6).toFixed(1).replace(".", ",")} mi`;
  if (abs >= 1e3) return `R$ ${(n / 1e3).toFixed(0)} mil`;
  return fmtBRL(n);
}

// ── OS-2 ────────────────────────────────────────────────────────────────────
// A média de faturamento descreve uma loja que não existe: a distribuição tem
// assimetria ~10 e as 5% maiores lojas concentram ~76% do total. A estatística
// padrão de carteira passa a ser mediana + faixa interquartil; a média continua
// disponível, mas nunca sozinha.
export interface ResumoCarteira {
  n: number;
  soma: number;
  media: number;
  mediana: number;
  p25: number;
  p75: number;
  p90: number;
  /** true quando n < 5: IQR com amostra mínima engana, exiba os valores individuais */
  amostraMinima: boolean;
}

export const N_MINIMO_IQR = 5;

export function resumoCarteira(values: number[]): ResumoCarteira {
  const arr = sortAsc(values);
  const n = arr.length;
  if (n === 0) {
    return { n: 0, soma: 0, media: 0, mediana: 0, p25: 0, p75: 0, p90: 0, amostraMinima: true };
  }
  const soma = arr.reduce((a, b) => a + b, 0);
  return {
    n,
    soma,
    media: soma / n,
    mediana: quantile(arr, 0.5),
    p25: quantile(arr, 0.25),
    p75: quantile(arr, 0.75),
    p90: quantile(arr, 0.9),
    amostraMinima: n < N_MINIMO_IQR,
  };
}

/** Separa positivos de não-positivos para eixos logarítmicos (log de ≤ 0 é indefinido). */
export function separarParaLog<T>(rows: T[], getValue: (t: T) => number): { plotaveis: T[]; omitidos: number } {
  const plotaveis = rows.filter((r) => Number.isFinite(getValue(r)) && getValue(r) > 0);
  return { plotaveis, omitidos: rows.length - plotaveis.length };
}
