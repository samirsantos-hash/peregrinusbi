/* Estatística própria do módulo Multilojas — sem dependência nova. */

export const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);

export function quantile(a: number[], q: number): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
export const median = (a: number[]) => quantile(a, 0.5);

export function sd(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map((v) => (v - m) ** 2)) / (a.length - 1));
}

/** HHI em pontos (0–10.000) sobre uma lista de valores. */
export function hhi(values: number[]): number {
  const t = sum(values);
  if (t <= 0) return 0;
  return sum(values.map((v) => ((v / t) * 100) ** 2));
}

export function gini(values: number[]): number {
  const v = values.filter((x) => x > 0).sort((a, b) => a - b);
  const n = v.length;
  if (n < 2) return 0;
  const t = sum(v);
  if (t <= 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) acc += (2 * (i + 1) - n - 1) * v[i];
  return acc / (n * t);
}

export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den ? num / den : 0;
}

const ranks = (a: number[]): number[] => {
  const idx = a.map((v, i) => [v, i] as [number, number]).sort((p, q) => p[0] - q[0]);
  const r = new Array(a.length).fill(0);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
};
export const spearman = (x: number[], y: number[]) => pearson(ranks(x), ranks(y));

export function linreg(y: number[]): { slope: number; intercept: number; r2: number } {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0, r2: 0 };
  const x = y.map((_, i) => i);
  const mx = mean(x), my = mean(y);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); den += (x[i] - mx) ** 2; }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  const ssTot = sum(y.map((v) => (v - my) ** 2));
  const ssRes = sum(y.map((v, i) => (v - (intercept + slope * i)) ** 2));
  return { slope, intercept, r2: ssTot ? 1 - ssRes / ssTot : 0 };
}

/** Média móvel trailing; null nos primeiros (w-1) pontos. */
export function mm(a: number[], w: number): (number | null)[] {
  return a.map((_, i) => (i < w - 1 ? null : mean(a.slice(i - w + 1, i + 1))));
}

/** Média móvel centrada (para decomposição). */
export function mmCentrada(a: number[], w: number): (number | null)[] {
  const h = Math.floor(w / 2);
  return a.map((_, i) => (i < h || i >= a.length - h ? null : mean(a.slice(i - h, i + h + 1))));
}

export const diff = (a: (number | null)[]): (number | null)[] =>
  a.map((v, i) => (i === 0 || v == null || a[i - 1] == null ? null : v - (a[i - 1] as number)));

/** Decomposição aditiva clássica com período semanal. */
export function decompor(y: number[], periodo = 7) {
  const trend = mmCentrada(y, periodo);
  const detr = y.map((v, i) => (trend[i] == null ? null : v - (trend[i] as number)));
  const fases: number[][] = Array.from({ length: periodo }, () => []);
  detr.forEach((v, i) => { if (v != null) fases[i % periodo].push(v); });
  const bruto = fases.map((f) => (f.length ? median(f) : 0));
  const ajuste = mean(bruto);
  const sazonal = bruto.map((v) => v - ajuste);
  const seas = y.map((_, i) => sazonal[i % periodo]);
  const resid = y.map((v, i) => (trend[i] == null ? null : v - (trend[i] as number) - seas[i]));
  const r = resid.filter((v): v is number => v != null);
  const dsz = y.map((v, i) => v - seas[i]);
  const varR = sd(r) ** 2;
  const forcaSaz = Math.max(0, 1 - varR / Math.max(1e-9, sd(r.map((v, i) => v + seas[i])) ** 2));
  const tr = trend.filter((v): v is number => v != null);
  const forcaTend = Math.max(0, 1 - varR / Math.max(1e-9, sd(tr) ** 2 + varR));
  return { trend, sazonal, seas, resid, dsz, forcaSaz, forcaTend };
}

/** CUSUM dos z-scores — localiza quebra estrutural de regime. */
export function cusum(y: number[]): number[] {
  const m = mean(y), s = sd(y) || 1;
  let acc = 0;
  return y.map((v) => (acc += (v - m) / s));
}

/* ---------------- Forecast: dessazonalização + Holt amortecido ---------------- */
export const FC_PARAMS = { jan: 28, phi: 0.70, al: 0.10, be: 0.05 };

export type Forecast = {
  valores: number[]; lower: number[]; upper: number[];
  sazonal: number[]; sigma: number;
};

function sazonalRobusta(y: number[], periodo = 7): number[] {
  const c = mmCentrada(y, periodo);
  const fases: number[][] = Array.from({ length: periodo }, () => []);
  y.forEach((v, i) => { if (c[i] != null) fases[i % periodo].push(v - (c[i] as number)); });
  const bruto = fases.map((f) => (f.length ? median(f) : 0));
  const aj = mean(bruto);
  return bruto.map((v) => v - aj);
}

export function forecast(y: number[], h: number, p = FC_PARAMS): Forecast {
  if (y.length < 8) {
    const base = mean(y);
    return { valores: Array(h).fill(Math.max(0, base)), lower: Array(h).fill(0), upper: Array(h).fill(base * 2), sazonal: Array(7).fill(0), sigma: 0 };
  }
  const S = sazonalRobusta(y, 7);
  const d = y.map((v, i) => v - S[i % 7]);
  const jan = d.slice(-Math.min(p.jan, d.length));
  let L = jan[0], T = jan.length > 1 ? jan[1] - jan[0] : 0;
  const fit: number[] = [];
  for (let i = 1; i < jan.length; i++) {
    const prev = L + p.phi * T;
    fit.push(prev);
    const Lp = L;
    L = p.al * jan[i] + (1 - p.al) * prev;
    T = p.be * (L - Lp) + (1 - p.be) * p.phi * T;
  }
  const res = jan.slice(1).map((v, i) => v - fit[i]);
  const sigma = sd(res);
  const n = y.length;
  const valores: number[] = [], lower: number[] = [], upper: number[] = [];
  let acc = 0;
  for (let k = 1; k <= h; k++) {
    acc += Math.pow(p.phi, k);
    const v = Math.max(0, L + acc * T + S[(n + k - 1) % 7]);
    const band = 1.96 * sigma * Math.sqrt(k);
    valores.push(v);
    lower.push(Math.max(0, v - band));
    upper.push(v + band);
  }
  return { valores, lower, upper, sazonal: S, sigma };
}

export type BacktestFold = { corte: number; vies: number; mape: number; rmse: number };

/** Walk-forward honesto: retreina cortando os últimos N dias e compara com o realizado. */
export function backtest(y: number[], cortes = [30, 45, 60], p = FC_PARAMS): BacktestFold[] {
  const out: BacktestFold[] = [];
  for (const c of cortes) {
    if (y.length < c + 20) continue;
    const treino = y.slice(0, y.length - c);
    const real = y.slice(y.length - c);
    const f = forecast(treino, c, p).valores;
    const sr = sum(real), sf = sum(f);
    const vies = sr ? (sf - sr) / sr : 0;
    const ape = real.map((v, i) => (v > 0 ? Math.abs(v - f[i]) / v : 0)).filter((v) => v > 0);
    const mape = ape.length ? mean(ape) : 0;
    const rmse = Math.sqrt(mean(real.map((v, i) => (v - f[i]) ** 2)));
    out.push({ corte: c, vies, mape, rmse });
  }
  return out;
}

/* ---------------- formatação ---------------- */
export const fBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const fBRL2 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fShort = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `R$ ${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `R$ ${(v / 1e3).toFixed(1)}k`;
  return fBRL(v);
};
export const fInt = (v: number) => Math.round(v).toLocaleString("pt-BR");
export const fPct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const fDelta = (v: number, d = 1) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d)}%`;

export const faixaHHI = (h: number) =>
  h > 2500 ? { label: "crítico", tone: "red" } :
  h > 1500 ? { label: "elevado", tone: "amber" } :
  h > 800 ? { label: "moderado", tone: "steel" } : { label: "diluído", tone: "green" };