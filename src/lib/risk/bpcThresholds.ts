/**
 * BPC risk thresholds — μ − 1,2816·σ por vertical, com piso 0,55 e fallback global
 * quando a vertical tem menos de 20 sellers ativos.
 *
 * Validação empírica (2026-07): μ−1,2816·σ aproxima bem o p10 empírico em 5/6
 * verticais (|Δ| ≤ 0,024). Piso 0,55 evita saturar o corte no piso natural de 0,50.
 */

export const BPC_Z = 1.2816; // percentil-10 sob normalidade
export const BPC_MIN_N_VERTICAL = 20;
export const BPC_FLOOR = 0.55;

export interface BpcVerticalStat {
  vertical: string;
  n: number;
  mean: number;
  sd: number;
  threshold: number;
  source: "vertical" | "global"; // vertical se n>=BPC_MIN_N_VERTICAL, senão global
}

export interface BpcThresholdModel {
  perVertical: Record<string, BpcVerticalStat>;
  global: { n: number; mean: number; sd: number; threshold: number };
}

function meanSd(values: number[]): { mean: number; sd: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, sd: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { mean, sd: 0 };
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  return { mean, sd: Math.sqrt(variance) };
}

function threshold(mean: number, sd: number): number {
  return Math.max(BPC_FLOOR, mean - BPC_Z * sd);
}

/**
 * @param bpcBySeller  { sellerId → bpc (0..1) } — apenas sellers ativos.
 * @param verticalOf   { sellerId → vertical dominante }
 */
export function buildBpcThresholds(
  bpcBySeller: Record<string, number>,
  verticalOf: Record<string, string>,
): BpcThresholdModel {
  const perVerticalRaw: Record<string, number[]> = {};
  const globalValues: number[] = [];
  for (const [sid, bpc] of Object.entries(bpcBySeller)) {
    if (!Number.isFinite(bpc)) continue;
    globalValues.push(bpc);
    const v = verticalOf[sid] || "SEM_VERTICAL";
    (perVerticalRaw[v] ||= []).push(bpc);
  }
  const g = meanSd(globalValues);
  const globalStat = {
    n: globalValues.length,
    mean: g.mean,
    sd: g.sd,
    threshold: threshold(g.mean, g.sd),
  };
  const perVertical: Record<string, BpcVerticalStat> = {};
  for (const [vert, arr] of Object.entries(perVerticalRaw)) {
    if (arr.length >= BPC_MIN_N_VERTICAL) {
      const { mean, sd } = meanSd(arr);
      perVertical[vert] = {
        vertical: vert,
        n: arr.length,
        mean,
        sd,
        threshold: threshold(mean, sd),
        source: "vertical",
      };
    } else {
      perVertical[vert] = {
        vertical: vert,
        n: arr.length,
        mean: globalStat.mean,
        sd: globalStat.sd,
        threshold: globalStat.threshold,
        source: "global",
      };
    }
  }
  return { perVertical, global: globalStat };
}

export function bpcThresholdFor(
  model: BpcThresholdModel,
  vertical: string | null | undefined,
): BpcVerticalStat {
  const key = vertical || "SEM_VERTICAL";
  return (
    model.perVertical[key] || {
      vertical: key,
      n: 0,
      mean: model.global.mean,
      sd: model.global.sd,
      threshold: model.global.threshold,
      source: "global",
    }
  );
}
