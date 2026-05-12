// Forecast engine — pure client-side, no external deps.
// Combines weighted linear regression, CAGR, EWMA, and additive Holt-Winters.
// Weights are auto-derived from in-sample MAPE backtest on the last 3 points.

export type SerieMensal = { mes: string; valor: number | null }[];

export type ForecastPonto = { mes: string; valor: number; lower: number; upper: number };

export type Forecast = {
  pontos: ForecastPonto[];
  metodo: "hibrido";
  pesos: { reglin: number; ewma: number; holt_winters: number; cagr: number };
  diagnostico: string;
  insuficiente?: boolean;
};

/* --------------------------- helpers --------------------------- */
function nextMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function nextMonths(lastKey: string, n: number): string[] {
  const out: string[] = [];
  let k = lastKey;
  for (let i = 0; i < n; i++) {
    k = nextMonthKey(k);
    out.push(k);
  }
  return out;
}

function clean(serie: SerieMensal): { mes: string; valor: number }[] {
  return serie.filter((p) => p.valor != null && Number.isFinite(p.valor as number)).map((p) => ({ mes: p.mes, valor: p.valor as number }));
}

function mean(arr: number[]) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function std(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

/* ----------------------- 1) Weighted linreg ----------------------- */
/** Weighted linear regression on (i, y). Recent points get more weight. */
export function regressaoLinearPonderada(serie: SerieMensal, horizonte: number): number[] {
  const data = clean(serie);
  const n = data.length;
  if (n < 2) return new Array(horizonte).fill(data[0]?.valor ?? 0);
  const ws = data.map((_, i) => Math.pow(1.15, i)); // exponential recency
  const sw = ws.reduce((s, v) => s + v, 0);
  const xs = data.map((_, i) => i);
  const ys = data.map((d) => d.valor);
  const xbar = xs.reduce((s, x, i) => s + ws[i] * x, 0) / sw;
  const ybar = ys.reduce((s, y, i) => s + ws[i] * y, 0) / sw;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += ws[i] * (xs[i] - xbar) * (ys[i] - ybar);
    den += ws[i] * (xs[i] - xbar) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = ybar - slope * xbar;
  return Array.from({ length: horizonte }, (_, k) => Math.max(0, intercept + slope * (n + k)));
}

/* --------------------------- 2) CAGR --------------------------- */
export function cagrProjecao(serie: SerieMensal, horizonte: number): number[] {
  const data = clean(serie);
  const n = data.length;
  if (n < 2) return new Array(horizonte).fill(data[0]?.valor ?? 0);
  const first = data[0].valor;
  const last = data[n - 1].valor;
  if (first <= 0 || last <= 0) {
    return new Array(horizonte).fill(last);
  }
  const r = Math.pow(last / first, 1 / (n - 1)) - 1;
  return Array.from({ length: horizonte }, (_, k) => Math.max(0, last * Math.pow(1 + r, k + 1)));
}

/* --------------------------- 3) EWMA --------------------------- */
export function ewma(serie: SerieMensal, alpha = 0.4): number[] {
  const data = clean(serie);
  if (!data.length) return [];
  const out: number[] = [data[0].valor];
  for (let i = 1; i < data.length; i++) out.push(alpha * data[i].valor + (1 - alpha) * out[i - 1]);
  return out;
}

export function ewmaForecast(serie: SerieMensal, horizonte: number, alpha = 0.4): number[] {
  const sm = ewma(serie, alpha);
  const last = sm[sm.length - 1] ?? 0;
  return new Array(horizonte).fill(Math.max(0, last));
}

/* ----------------------- 4) Holt-Winters additive ----------------------- */
export function holtWinters(serie: SerieMensal, horizonte: number, m = 12): number[] {
  const data = clean(serie).map((d) => d.valor);
  if (data.length < 2 * m) return new Array(horizonte).fill(0);
  const alpha = 0.4, beta = 0.1, gamma = 0.2;
  // initial level/trend
  let level = mean(data.slice(0, m));
  let trend = (mean(data.slice(m, 2 * m)) - mean(data.slice(0, m))) / m;
  const season = new Array(m).fill(0);
  for (let i = 0; i < m; i++) season[i] = data[i] - level;
  for (let i = 0; i < data.length; i++) {
    const s = season[i % m];
    const lvlPrev = level;
    level = alpha * (data[i] - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - lvlPrev) + (1 - beta) * trend;
    season[i % m] = gamma * (data[i] - level) + (1 - gamma) * s;
  }
  return Array.from({ length: horizonte }, (_, k) => Math.max(0, level + (k + 1) * trend + season[(data.length + k) % m]));
}

/* --------------------------- Backtest MAPE --------------------------- */
function mape(actual: number[], pred: number[]): number {
  let sum = 0, n = 0;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] > 0 && Number.isFinite(pred[i])) {
      sum += Math.abs((actual[i] - pred[i]) / actual[i]);
      n++;
    }
  }
  return n ? (sum / n) * 100 : 100;
}

/* --------------------------- Hibrido --------------------------- */
export function forecastHibrido(serie: SerieMensal, horizonte: number, alpha = 0.4): Forecast {
  const data = clean(serie);
  const n = data.length;

  if (n < 4) {
    return {
      pontos: [],
      metodo: "hibrido",
      pesos: { reglin: 0, ewma: 0, holt_winters: 0, cagr: 0 },
      diagnostico: "Precisamos de pelo menos 4 meses de histórico para projetar.",
      insuficiente: true,
    };
  }

  // Backtest on last 3 points
  const btN = Math.min(3, n - 3);
  const train = serie.slice(0, n - btN);
  const actualTail = data.slice(n - btN).map((d) => d.valor);

  const methods: Array<{ key: "reglin" | "ewma" | "holt_winters" | "cagr"; preds: number[] }> = [
    { key: "reglin", preds: regressaoLinearPonderada(train, btN) },
    { key: "ewma", preds: ewmaForecast(train, btN, alpha) },
    { key: "cagr", preds: cagrProjecao(train, btN) },
  ];
  if (n >= 24) methods.push({ key: "holt_winters", preds: holtWinters(train, btN, 12) });

  const mapes = methods.map((m) => ({ key: m.key, mape: mape(actualTail, m.preds) }));
  const invs = mapes.map((m) => 1 / Math.max(0.5, m.mape));
  const sumInv = invs.reduce((s, v) => s + v, 0);
  const weights: Record<string, number> = { reglin: 0, ewma: 0, holt_winters: 0, cagr: 0 };
  mapes.forEach((m, i) => { weights[m.key] = invs[i] / sumInv; });

  // Final forecast
  const fcMethods: Array<{ key: "reglin" | "ewma" | "cagr" | "holt_winters"; preds: number[] }> = [
    { key: "reglin", preds: regressaoLinearPonderada(serie, horizonte) },
    { key: "ewma", preds: ewmaForecast(serie, horizonte, alpha) },
    { key: "cagr", preds: cagrProjecao(serie, horizonte) },
  ];
  if (n >= 24) fcMethods.push({ key: "holt_winters", preds: holtWinters(serie, horizonte, 12) });

  const final: number[] = [];
  for (let h = 0; h < horizonte; h++) {
    let v = 0;
    fcMethods.forEach((m) => { v += (weights[m.key] || 0) * (m.preds[h] || 0); });
    final.push(Math.max(0, v));
  }

  // Residual std for IC95 — use in-sample residual of weighted linreg on full series
  const fitted = regressaoLinearPonderada(serie.slice(0, n), 0); // empty
  // simpler: residuals = (last actual - one-step-ahead predicted) over EWMA
  const ewmaSeries = ewma(serie, alpha);
  const residuals: number[] = [];
  for (let i = 1; i < data.length; i++) residuals.push(data[i].valor - ewmaSeries[i - 1]);
  const sigma = std(residuals);

  const lastKey = data[data.length - 1].mes;
  const futureKeys = nextMonths(lastKey, horizonte);
  const pontos: ForecastPonto[] = futureKeys.map((mes, i) => {
    const grow = Math.sqrt(i + 1); // uncertainty grows with horizon
    return { mes, valor: final[i], lower: Math.max(0, final[i] - 1.96 * sigma * grow), upper: final[i] + 1.96 * sigma * grow };
  });

  const diag = mapes
    .sort((a, b) => a.mape - b.mape)
    .map((m) => `${m.key} MAPE ${m.mape.toFixed(1)}% (peso ${(weights[m.key] * 100).toFixed(0)}%)`)
    .join(" • ");

  return {
    pontos,
    metodo: "hibrido",
    pesos: weights as Forecast["pesos"],
    diagnostico: diag,
  };
}

/* ----------------------- Trend slope on log series ----------------------- */
/** Returns slope of linear regression on log(valor) over the last `windowMonths` months. */
export function inclinacaoLog(serie: SerieMensal, windowMonths = 6): number {
  const data = clean(serie).slice(-windowMonths).filter((d) => d.valor > 0);
  if (data.length < 3) return 0;
  const xs = data.map((_, i) => i);
  const ys = data.map((d) => Math.log(d.valor));
  const xbar = mean(xs); const ybar = mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - xbar) * (ys[i] - ybar); den += (xs[i] - xbar) ** 2; }
  return den === 0 ? 0 : num / den;
}

export function classificarTendencia(slope: number): { rotulo: string; cor: string } {
  if (slope >= 0.05) return { rotulo: "Crescimento exponencial", cor: "hsl(142 80% 40%)" };
  if (slope >= 0.02) return { rotulo: "Aceleração", cor: "hsl(142 65% 50%)" };
  if (slope > -0.01) return { rotulo: "Estabilidade", cor: "hsl(220 10% 60%)" };
  if (slope > -0.03) return { rotulo: "Desaceleração", cor: "hsl(28 90% 55%)" };
  return { rotulo: "Risco de retração", cor: "hsl(0 80% 55%)" };
}