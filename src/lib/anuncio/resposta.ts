import { MINIMO_VISITAS, notarConversao, notarVisitas } from './dimensoes';

export interface VisitasAnuncio { item_id: string; visitas: number | null }
export interface LoteResposta { periodo: { inicio: string; fim: string }; itens: VisitasAnuncio[]; coberturaCompleta: boolean; consultadoEm: string }
/** Include measured zero rates: excluding them would bias the catalog reference. */
export function medianaMedida(valores: (number | null)[]): number | null {
  const v = valores.filter((n): n is number => n !== null && Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length ? v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2 : null;
}
export function referenciasResposta(itens: { visitas: number | null; pedidos: number }[]) {
  const taxas = itens.filter(i => i.visitas !== null && i.visitas >= MINIMO_VISITAS);
  return { visitas: medianaMedida(itens.map(i => i.visitas)), conversao: medianaMedida(taxas.map(i => i.visitas !== null ? i.pedidos / i.visitas : null)), medidos: itens.filter(i => i.visitas !== null).length, taxasMedidas: taxas.length };
}
export function notasResposta(visitas: number | null, pedidos: number, refs: ReturnType<typeof referenciasResposta>) {
  return { visitasRelativas: notarVisitas(visitas, refs.visitas), conversao: notarConversao(visitas, pedidos, refs.conversao) };
}