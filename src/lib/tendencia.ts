/** Tendência de uma série pela reta de mínimos quadrados. */
export type SentidoTendencia = "crescendo" | "estavel" | "caindo";

export interface Tendencia {
  sentido: SentidoTendencia;
  /** Variação da reta do primeiro ao último ponto, em % da média. */
  variacaoPct: number;
  media: number;
  /** Valor da reta em cada índice. */
  reta: (i: number) => number;
}

/** Faixa morta: variação da reta abaixo de ±5% da média é "estável". */
export const LIMIAR_ESTAVEL_PCT = 5;

export function calcularTendencia(valores: number[]): Tendencia | null {
  const v = valores.filter((x) => Number.isFinite(x));
  const n = v.length;
  if (n < 3) return null;
  const mx = (n - 1) / 2;
  const my = v.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  v.forEach((y, i) => { num += (i - mx) * (y - my); den += (i - mx) ** 2; });
  const b = den ? num / den : 0;
  const a = my - b * mx;
  const variacaoPct = my !== 0 ? ((b * (n - 1)) / Math.abs(my)) * 100 : 0;
  const sentido: SentidoTendencia =
    variacaoPct > LIMIAR_ESTAVEL_PCT ? "crescendo" : variacaoPct < -LIMIAR_ESTAVEL_PCT ? "caindo" : "estavel";
  return { sentido, variacaoPct, media: my, reta: (i) => Math.max(0, a + b * i) };
}
