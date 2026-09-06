/**
 * Churn — desvio do MoM por vertical (mês fechado vs mês anterior) + churn absoluto.
 * Enquanto o mês corrente estiver parcial, comparamos [closed] vs [prior] e usamos
 * o mês corrente apenas para detectar churn absoluto (tgmv_lc = 0 com histórico).
 *
 * OS-1 (set/2026): o estimador padrão passou a ser o z-score modificado (mediana +
 * MAD). O z clássico continua calculado e disponível para comparação, mas está
 * @deprecated para alertas — média e desvio-padrão não são robustos a outliers e
 * sinalizavam ~16% da carteira todo mês.
 */

import { getLimiar } from "@/lib/stats/config";
import { flagAtiva } from "@/lib/stats/flags";
import { mediana, MIN_N_Z_ROBUSTO, zModificado } from "@/lib/stats/robust";

/** @deprecated para alertas — mantido apenas para o modo clássico (flag desligada). */
export const CHURN_Z_MED = -1;
/** @deprecated para alertas — mantido apenas para o modo clássico (flag desligada). */
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
  /** @deprecated para alertas — estimador clássico */
  meanDelta: number;
  /** @deprecated para alertas — estimador clássico */
  sdDelta: number;
  /** mediana dos deltas (estimador robusto, OS-1) */
  medianDelta?: number;
  /** desvio absoluto mediano dos deltas (0 = dispersão nula, não usar) */
  madDelta?: number;
}

export interface ChurnSignal {
  type: "relative" | "absolute";
  severity: "media" | "alta";
  deltaPct?: number;
  zScore?: number;
  /** estimador que gerou o sinal — exigência de procedência das OS */
  estimador?: "robusto_mad" | "classico_z";
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

function medianMad(values: number[]): { median: number; mad: number } {
  if (values.length === 0) return { median: 0, mad: 0 };
  const med = mediana(values);
  return { median: med, mad: mediana(values.map((v) => Math.abs(v - med))) };
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
  const gRob = medianMad(globalVals);
  const out: Record<string, ChurnStat> = {};
  for (const [vert, arr] of Object.entries(byVert)) {
    if (arr.length >= minN) {
      const { mean, sd } = meanSd(arr);
      const rob = medianMad(arr);
      out[vert] = {
        vertical: vert,
        n: arr.length,
        meanDelta: mean,
        sdDelta: sd,
        medianDelta: rob.median,
        madDelta: rob.mad,
      };
    } else {
      out[vert] = {
        vertical: vert,
        n: arr.length,
        meanDelta: g.mean,
        sdDelta: g.sd,
        medianDelta: gRob.median,
        madDelta: gRob.mad,
      };
    }
  }
  out["__GLOBAL__"] = {
    vertical: "__GLOBAL__",
    n: globalVals.length,
    meanDelta: g.mean,
    sdDelta: g.sd,
    medianDelta: gRob.median,
    madDelta: gRob.mad,
  };
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
  if (d === null || !Number.isFinite(d)) return signals;

  const s = stats[vertical || "SEM_VERTICAL"] || stats["__GLOBAL__"];
  if (!s) return signals;

  const usarRobusto = flagAtiva("ALERTS_USE_ROBUST_Z");

  if (usarRobusto) {
    // Amostra pequena demais ou dispersão nula: não há base para julgar anomalia.
    if (s.n < MIN_N_Z_ROBUSTO) return signals;
    if (s.medianDelta === undefined || !s.madDelta) return signals;
    const mz = zModificado(d, s.medianDelta, s.madDelta);
    const alerta = -Math.abs(getLimiar("mad_z_alerta"));
    const atencao = -Math.abs(getLimiar("mad_z_atencao"));
    if (mz <= alerta) {
      signals.push({
        type: "relative",
        severity: "alta",
        deltaPct: d * 100,
        zScore: mz,
        estimador: "robusto_mad",
        message: `Queda anômala vs vertical (z robusto = ${mz.toFixed(2)})`,
      });
    } else if (mz <= atencao) {
      signals.push({
        type: "relative",
        severity: "media",
        deltaPct: d * 100,
        zScore: mz,
        estimador: "robusto_mad",
        message: `Queda acima do usual na vertical (z robusto = ${mz.toFixed(2)})`,
      });
    }
    return signals;
  }

  // Modo clássico (flag desligada) — preservado para reversão.
  if (s.sdDelta > 0) {
    const z = (d - s.meanDelta) / s.sdDelta;
    if (z <= CHURN_Z_HIGH) {
      signals.push({
        type: "relative",
        severity: "alta",
        deltaPct: d * 100,
        zScore: z,
        estimador: "classico_z",
        message: `Queda anômala vs vertical (z=${z.toFixed(2)})`,
      });
    } else if (z <= CHURN_Z_MED) {
      signals.push({
        type: "relative",
        severity: "media",
        deltaPct: d * 100,
        zScore: z,
        estimador: "classico_z",
        message: `Queda acima do usual na vertical (z=${z.toFixed(2)})`,
      });
    }
  }

  return signals;
}
