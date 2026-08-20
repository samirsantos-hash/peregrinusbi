/**
 * Estatística de razões (ROAS, ACOS, TACOS).
 *
 * REGRA: agregado = razão dos totais. Nunca média de razões.
 *   ROAS_agregado  = Σ TGMV_LC_PADS / Σ INV_PADS
 *   ACOS_agregado  = Σ INV_PADS / Σ TGMV_LC_PADS x 100
 *   TACOS_agregado = Σ INV_PADS / Σ TGMV_LC x 100
 * A média de razões distorce o resultado (verificado em 202607, 402 sellers:
 * ROAS -35,5%, ACOS +204%, TACOS +135%).
 * A mediana das razões é usada apenas para descrever o "seller típico",
 * sempre rotulada como mediana.
 */

export interface UnidadeRazao {
  inv: number;
  tgmvPads: number;
  tgmv: number;
}

export function mediana(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

/** Percentil por interpolação linear (0–100). */
export function percentil(values: number[], p: number): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const idx = ((v.length - 1) * p) / 100;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return v[lo];
  return v[lo] + (v[hi] - v[lo]) * (idx - lo);
}

/** Posição percentual de um valor dentro de uma distribuição (0–100). */
export function percentilDoValor(valor: number, values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n));
  if (v.length < 5) return null; // base insuficiente para percentil confiável
  const abaixo = v.filter((x) => x < valor).length;
  const iguais = v.filter((x) => x === valor).length;
  return Math.round(((abaixo + iguais / 2) / v.length) * 100);
}

export interface EstatisticaRazoes {
  /** sellers considerados na base (com investimento > 0) */
  nComInvestimento: number;
  /** sellers sem investimento, excluídos das razões */
  nSemInvestimento: number;
  nTotal: number;
  pctSemInvestimento: number;

  totalInv: number;
  totalTgmvPads: number;
  totalTgmv: number;

  /** razão dos totais */
  roasAgregado: number | null;
  acosAgregado: number | null;
  tacosAgregado: number | null;

  /** mediana das razões — o seller típico */
  roasMediana: number | null;
  acosMediana: number | null;
  tacosMediana: number | null;

  /** dispersão p10–p90 das razões */
  roasP10: number | null;
  roasP90: number | null;
  acosP10: number | null;
  acosP90: number | null;
  tacosP10: number | null;
  tacosP90: number | null;

  /** investimento: mediana e média explícitas + concentração */
  invMediana: number | null;
  invMedia: number | null;
  shareTop10Pct: number | null;

  /** distribuições brutas, para cálculo de percentil do seller */
  distRoas: number[];
  distAcos: number[];
  distTacos: number[];
}

export function calcularEstatisticaRazoes(unidades: UnidadeRazao[]): EstatisticaRazoes {
  const totalInv = unidades.reduce((s, u) => s + (u.inv || 0), 0);
  const totalTgmvPads = unidades.reduce((s, u) => s + (u.tgmvPads || 0), 0);
  const totalTgmv = unidades.reduce((s, u) => s + (u.tgmv || 0), 0);

  const comInv = unidades.filter((u) => (u.inv || 0) > 0);
  const semInv = unidades.length - comInv.length;

  const distRoas = comInv.filter((u) => u.inv > 0).map((u) => u.tgmvPads / u.inv);
  const distAcos = comInv.filter((u) => u.tgmvPads > 0).map((u) => (u.inv / u.tgmvPads) * 100);
  const distTacos = comInv.filter((u) => u.tgmv > 0).map((u) => (u.inv / u.tgmv) * 100);

  const invs = comInv.map((u) => u.inv).sort((a, b) => b - a);
  const nTop10 = Math.max(1, Math.ceil(invs.length * 0.1));
  const somaTop10 = invs.slice(0, nTop10).reduce((s, v) => s + v, 0);

  return {
    nComInvestimento: comInv.length,
    nSemInvestimento: semInv,
    nTotal: unidades.length,
    pctSemInvestimento: unidades.length ? (semInv / unidades.length) * 100 : 0,

    totalInv,
    totalTgmvPads,
    totalTgmv,

    roasAgregado: totalInv > 0 ? totalTgmvPads / totalInv : null,
    acosAgregado: totalTgmvPads > 0 ? (totalInv / totalTgmvPads) * 100 : null,
    tacosAgregado: totalTgmv > 0 ? (totalInv / totalTgmv) * 100 : null,

    roasMediana: mediana(distRoas),
    acosMediana: mediana(distAcos),
    tacosMediana: mediana(distTacos),

    roasP10: percentil(distRoas, 10),
    roasP90: percentil(distRoas, 90),
    acosP10: percentil(distAcos, 10),
    acosP90: percentil(distAcos, 90),
    tacosP10: percentil(distTacos, 10),
    tacosP90: percentil(distTacos, 90),

    invMediana: mediana(comInv.map((u) => u.inv)),
    invMedia: comInv.length ? totalInv / comInv.length : null,
    shareTop10Pct: totalInv > 0 && invs.length ? (somaTop10 / totalInv) * 100 : null,

    distRoas,
    distAcos,
    distTacos,
  };
}

/** Reconciliação: ACOS agregado x Σ INV / Σ TGMV_PADS recalculado à parte. */
export function reconciliarAcos(
  exibido: number | null,
  totalInv: number,
  totalTgmvPads: number,
): { conferido: boolean; divergencia: number | null; recalculado: number | null } {
  const recalculado = totalTgmvPads > 0 ? (totalInv / totalTgmvPads) * 100 : null;
  if (exibido == null || recalculado == null) return { conferido: false, divergencia: null, recalculado };
  const divergencia = Math.abs(exibido - recalculado);
  return { conferido: divergencia < 0.01, divergencia, recalculado };
}
