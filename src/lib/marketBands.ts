/**
 * Bandas de referência de mercado independentes do cálculo estatístico.
 * Servem como contexto complementar em tooltips/legendas — NÃO substituem
 * o corte μ±z·σ por vertical.
 */

export const CONVERSION_MARKET_BAND =
  "Referência de mercado (independente de vertical): abaixo de 2% é baixa · em torno de 3% é média · acima de 3,5% é ótima.";

export function conversionBandLabel(pct: number): "baixa" | "média" | "ótima" {
  if (pct < 2) return "baixa";
  if (pct < 3.5) return "média";
  return "ótima";
}