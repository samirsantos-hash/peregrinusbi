/**
 * Fixture de regressão — loja "Sinoscar Farrapos".
 *
 * Caso real que gerava "linha reta" no gráfico GMV mês vs mês:
 * - ago/2026 é parcial (só dias 1–6 importados);
 * - jul/2026 é mês fechado (31 dias).
 * A comparação precisa usar a MESMA janela (dias 1–6) e a curva do mês parcial
 * não pode se prolongar após o dia 6.
 */
import type { PontoDiario } from "@/lib/gmvMesVsMes";

export const SINOSCAR_AGO_1_6: PontoDiario[] = [
  { date: "2026-08-01", gmv: 12000 },
  { date: "2026-08-02", gmv: 9500 },
  { date: "2026-08-03", gmv: 14300 },
  { date: "2026-08-04", gmv: 11100 },
  { date: "2026-08-05", gmv: 13750 },
  { date: "2026-08-06", gmv: 10350 },
];

/** jul/2026 completo: dias 1–6 com valores conhecidos, 7–31 constantes. */
export const SINOSCAR_JUL_COMPLETO: PontoDiario[] = [
  { date: "2026-07-01", gmv: 10000 },
  { date: "2026-07-02", gmv: 10000 },
  { date: "2026-07-03", gmv: 10000 },
  { date: "2026-07-04", gmv: 10000 },
  { date: "2026-07-05", gmv: 10000 },
  { date: "2026-07-06", gmv: 11000 },
  ...Array.from({ length: 25 }, (_, i) => ({
    date: `2026-07-${String(i + 7).padStart(2, "0")}`,
    gmv: 8000,
  })),
];

/** Total dos dias 1–6 de jul = 61.000 */
export const SINOSCAR_JUL_JANELA_1_6 = 61000;
/** Total de ago (dias 1–6) = 71.000 */
export const SINOSCAR_AGO_TOTAL = 71000;
/** Total de jul completo = 61.000 + 25 * 8.000 */
export const SINOSCAR_JUL_TOTAL = 61000 + 25 * 8000;

export const SINOSCAR_FARRAPOS: PontoDiario[] = [
  ...SINOSCAR_JUL_COMPLETO,
  ...SINOSCAR_AGO_1_6,
];
