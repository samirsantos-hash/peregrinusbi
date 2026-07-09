/**
 * Churn — z-score MoM por vertical (mês fechado vs mês anterior) + churn absoluto.
 * Enquanto o mês corrente estiver parcial, comparamos [closed] vs [prior] e usamos
 * o mês corrente apenas para detectar churn absoluto (tgmv_lc = 0 com histórico).
 */

export const CHURN_Z_MED = -1;
export const CHURN_Z_HIGH = -1.5;

export interface SellerMonthTriplet {
  sellerId: string;
  current: number;
  closed: number;
  prior: number;
}

export interface ChurnStat {
  vertical: string;
  n: number;
  meanDelta: number;
  sdDelta: number;
}

export interface ChurnSignal {
  type: "relative" | "absolute";
  severity: "media" | "alta";
  deltaPct?: number;
  zScore?: number;
  message: string;
}

function meanSd(values: number[]): { mean: number; sd: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, sd: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { mean, sd: 0 };
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  return { mean, sd: Math.sqrt(variance) };
}

function deltaClosedVsPrior(t: SellerMonthTriplet): number | null {
  if (t.prior <= 0) return null;
  return (t.closed - t.prior) / t.prior;
}

export function buildChurnStats(
  triplets: SellerMonthTriplet[],
  verticalOf: Record<string, string>,
  minN = 10,
): Record<string, ChurnStat> {
  const byVert: Record<string, number[]> = {};
  const globalVals: number[] = [];
  for (const t of triplets) {
    const d = deltaClosedVsPrior(t);
    if (d === null || !Number.isFinite(d)) continue;
    globalVals.push(d);
    const v = verticalOf[t.sellerId] || "SEM_VERTICAL";
    (byVert[v] ||= []).push(d);
  }
  const g = meanSd(globalVals);
  const out: Record<string, ChurnStat> = {};
  for (const [vert, arr] of Object.entries(byVert)) {
    if (arr.length >= minN) {
      const { mean, sd } = meanSd(arr);
      out[vert] = { vertical: vert, n: arr.length, meanDelta: mean, sdDelta: sd };
    } else {
      out[vert] = { vertical: vert, n: arr.length, meanDelta: g.mean, sdDelta: g.sd };
    }
  }
  out["__GLOBAL__"] = { vertical: "__GLOBAL__", n: globalVals.length, meanDelta: g.mean, sdDelta: g.sd };
  return out;
}

export function evaluateChurn(
  t: SellerMonthTriplet,
  vertical: string | null | undefined,
  stats: Record<string, ChurnStat>,
): ChurnSignal[] {
  const signals: ChurnSignal[] = [];

  if (t.current <= 0 && t.closed > 0 && t.prior > 0) {
    signals.push({
      type: "absolute",
      severity: "alta",
      message: "GMV zerado no mês corrente após 2 meses de vendas — churn absoluto",
    });
  }

  const d = deltaClosedVsPrior(t);
  if (d !== null && Number.isFinite(d)) {
    const s = stats[vertical || "SEM_VERTICAL"] || stats["__GLOBAL__"];
    if (s && s.sdDelta > 0) {
      const z = (d - s.meanDelta) / s.sdDelta;
      if (z <= CHURN_Z_HIGH) {
        signals.push({
          type: "relative",
          severity: "alta",
          deltaPct: d * 100,
          zScore: z,
          message: `Queda anômala vs vertical (z=${z.toFixed(2)})`,
        });
      } else if (z <= CHURN_Z_MED) {
        signals.push({
          type: "relative",
          severity: "media",
          deltaPct: d * 100,
          zScore: z,
          message: `Queda acima do usual na vertical (z=${z.toFixed(2)})`,
        });
      }
    }
  }

  return signals;
}