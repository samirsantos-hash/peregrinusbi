/**
 * Fixtures compartilhadas de casos extremos.
 *
 * Servem para travar o comportamento dos cálculos percentuais em CI:
 * base zero, NaN/null, numerador maior que a base e valores negativos.
 */

export interface LinhaVisitas {
  nome: string;
  visits: number | null | undefined;
  visitsExpensive: number | null | undefined;
}

/** Razões numerador/denominador cobrindo todos os extremos. */
export const RAZOES_EXTREMAS: { nome: string; numerador: any; denominador: any }[] = [
  { nome: "normal", numerador: 25, denominador: 100 },
  { nome: "base zero", numerador: 10, denominador: 0 },
  { nome: "base negativa", numerador: 10, denominador: -50 },
  { nome: "base null", numerador: 10, denominador: null },
  { nome: "base undefined", numerador: 10, denominador: undefined },
  { nome: "base NaN", numerador: 10, denominador: NaN },
  { nome: "numerador NaN", numerador: NaN, denominador: 100 },
  { nome: "numerador null", numerador: null, denominador: 100 },
  { nome: "numerador negativo", numerador: -30, denominador: 100 },
  { nome: "numerador maior que a base", numerador: 5695, denominador: 100 },
  { nome: "numerador igual a base", numerador: 100, denominador: 100 },
  { nome: "base infinita", numerador: 10, denominador: Infinity },
  { nome: "numerador infinito", numerador: Infinity, denominador: 100 },
  { nome: "base fracionaria", numerador: 0.5, denominador: 0.25 },
];

/** Séries diárias de visitas (o caso real dos 5.694,9% incluído). */
export const SERIES_VISITAS: { nome: string; linhas: LinhaVisitas[] }[] = [
  {
    nome: "serie saudavel",
    linhas: [
      { nome: "d1", visits: 1000, visitsExpensive: 250 },
      { nome: "d2", visits: 800, visitsExpensive: 100 },
    ],
  },
  {
    nome: "regressao 5694 por cento",
    linhas: [
      { nome: "d1", visits: 12, visitsExpensive: 683 },
      { nome: "d2", visits: 8, visitsExpensive: 456 },
    ],
  },
  {
    nome: "base zero em todos os dias",
    linhas: [
      { nome: "d1", visits: 0, visitsExpensive: 120 },
      { nome: "d2", visits: 0, visitsExpensive: 0 },
    ],
  },
  {
    nome: "valores nulos e NaN",
    linhas: [
      { nome: "d1", visits: null, visitsExpensive: 50 },
      { nome: "d2", visits: NaN, visitsExpensive: NaN },
      { nome: "d3", visits: 500, visitsExpensive: null },
    ],
  },
  {
    nome: "negativos",
    linhas: [
      { nome: "d1", visits: -100, visitsExpensive: 40 },
      { nome: "d2", visits: 200, visitsExpensive: -40 },
    ],
  },
  { nome: "serie vazia", linhas: [] },
];

/** Taxas REP_*_RATE que chegam ora em 0–1, ora em 0–100. */
export const TAXAS_BRUTAS: { nome: string; valor: any }[] = [
  { nome: "fracao 0.02", valor: 0.02 },
  { nome: "fracao 1", valor: 1 },
  { nome: "percentual 2.5", valor: 2.5 },
  { nome: "percentual 100", valor: 100 },
  { nome: "acima de 100", valor: 5694.9 },
  { nome: "zero", valor: 0 },
  { nome: "negativo", valor: -0.3 },
  { nome: "null", valor: null },
  { nome: "undefined", valor: undefined },
  { nome: "NaN", valor: NaN },
  { nome: "string vazia", valor: "" },
];