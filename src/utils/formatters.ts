/**
 * Camada de compatibilidade: delega tudo para src/lib/format.ts (fonte única).
 */
import { brl, brlCurto, numCurto, delta, pctFracao, num } from "@/lib/format";
const nf2 = (v: number, casas: number) => num(v, casas);

/** R$ 1.041,00 */
export const fmtBRL = (value: number): string => brl(value, true);
/** Abrevia só acima de 1 mi: R$ 1,2 mi · R$ 558.512 */
export const fmtBRLCompact = (value: number): string => brlCurto(value);
/** Número com vírgula decimal */
export const fmtNum = (value: number, decimals = 2): string => nf2(value, decimals);
/** Abrevia só acima de 1 mi: 1,2 mi · 280.000 */
export const fmtNumCompact = (value: number): string => numCurto(value);
/** +12,5% / −3,2% (valor em pontos percentuais) */
export const fmtPct = (value: number, decimals = 1): string => delta(value, decimals);
/** Taxas REP_* em fração (0..1): 0,125 → "12,5%" */
export const fmtTaxa = (fracao: number | null | undefined, decimals = 1): string => pctFracao(fracao, decimals);

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Eixo X: "Mar 2025" (consolidado) ou "12/03" (diário). */
export const formatChartDate = (dateStr: string, granularity: "consolidated" | "daily" = "daily"): string => {
  const [y, m, d] = dateStr.split("-");
  if (granularity === "consolidated") return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  return `${d}/${m}`;
};
