import { differenceInCalendarDays, isValid, parseISO } from "date-fns";

export interface DiaComparacao {
  data: string;
  tgmv_lc: number | null;
  visits: number | null;
  tsi: number | null;
}
export interface IntervaloComparacao { de: string; ate: string }
export const metricasComparacao = ["tgmv_lc", "visits", "tsi"] as const;
export type MetricaComparacao = typeof metricasComparacao[number];

export function totalPeriodo(serie: DiaComparacao[], intervalo: IntervaloComparacao) {
  const inicio = parseISO(intervalo.de);
  const fim = parseISO(intervalo.ate);
  const valido = isValid(inicio) && isValid(fim) && intervalo.de <= intervalo.ate;
  const dias = valido ? differenceInCalendarDays(fim, inicio) + 1 : 0;
  const linhas = serie.filter(d => d.data >= intervalo.de && d.data <= intervalo.ate);
  const metricas = Object.fromEntries(metricasComparacao.map(campo => {
    const medidas = linhas.filter(d => d[campo] !== null && Number.isFinite(Number(d[campo])));
    const cobertura = new Set(medidas.map(d => d.data)).size;
    return [campo, {
      valor: valido && medidas.length ? medidas.reduce((s, d) => s + Number(d[campo]), 0) : null,
      cobertura,
      completa: valido && cobertura === dias,
    }];
  })) as Record<MetricaComparacao, { valor: number | null; cobertura: number; completa: boolean }>;
  return { valido, dias, metricas };
}

export function variacaoPeriodos(a: ReturnType<typeof totalPeriodo>, b: ReturnType<typeof totalPeriodo>, campo: MetricaComparacao) {
  const base = a.metricas[campo];
  const atual = b.metricas[campo];
  if (!base.completa || !atual.completa || base.valor === null || atual.valor === null || base.valor === 0) return null;
  return (atual.valor - base.valor) / base.valor * 100;
}