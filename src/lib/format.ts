/**
 * Formatação numérica única do Sistema de Design Peregrinus (pt-BR).
 * Vírgula decimal, ponto de milhar, abreviação SÓ acima de 1 milhão ("R$ 1,2 mi").
 * Taxas: `pct` recebe valor já em pontos percentuais (12,5 → "12,5%");
 * `pctFracao` recebe fração (0,125 → "12,5%"). Nunca multiplique por 100 fora daqui.
 */
const nf = (min: number, max: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });

const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export const SEM_DADO = "—";

/** Número inteiro com milhar: 280.000 */
export const num = (v: number | null | undefined, casas = 0): string =>
  ok(v) ? nf(casas, casas).format(v) : SEM_DADO;

/** Moeda completa: R$ 558.512 (ou com centavos) */
export const brl = (v: number | null | undefined, centavos = false): string =>
  ok(v)
    ? v.toLocaleString("pt-BR", {
        style: "currency", currency: "BRL",
        minimumFractionDigits: centavos ? 2 : 0, maximumFractionDigits: centavos ? 2 : 0,
      })
    : SEM_DADO;

/** Abrevia só acima de 1 milhão: 1,2 mi · 3,4 bi. Abaixo, número completo. */
export const numCurto = (v: number | null | undefined): string => {
  if (!ok(v)) return SEM_DADO;
  const a = Math.abs(v);
  if (a >= 1e9) return `${nf(0, 1).format(v / 1e9)} bi`;
  if (a >= 1e6) return `${nf(0, 1).format(v / 1e6)} mi`;
  return nf(0, 0).format(v);
};

/** Moeda abreviada só acima de 1 milhão: R$ 1,2 mi · R$ 558.512 */
export const brlCurto = (v: number | null | undefined): string => {
  if (!ok(v)) return SEM_DADO;
  const a = Math.abs(v);
  if (a >= 1e6) return `R$ ${numCurto(v)}`;
  return brl(v);
};

/** Percentual a partir de pontos percentuais: 0,57% */
export const pct = (v: number | null | undefined, casas = 1): string =>
  ok(v) ? `${nf(casas, casas).format(v)}%` : SEM_DADO;

/** Percentual a partir de fração: 0,0057 → 0,6% */
export const pctFracao = (v: number | null | undefined, casas = 1): string =>
  ok(v) ? pct(v * 100, casas) : SEM_DADO;

/** Variação com sinal: +8,4% / −3,2% */
export const delta = (v: number | null | undefined, casas = 1): string =>
  ok(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${nf(casas, casas).format(Math.abs(v))}%` : SEM_DADO;

/** Multiplicador: 4,2x */
export const vezes = (v: number | null | undefined, casas = 1): string =>
  ok(v) ? `${nf(casas, casas).format(v)}x` : SEM_DADO;
