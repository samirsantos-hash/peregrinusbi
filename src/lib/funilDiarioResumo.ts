export type DiaFunil = { data: string; visitas?: number | null; pedidos?: number | null };
const medido = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export const receitaPorVisita = (receita: number, visitas: number | null) =>
  medido(receita) && medido(visitas) && visitas > 0 ? receita / visitas : null;

export function funilDiarioResumo(atual: DiaFunil[], anterior: DiaFunil[]) {
  const pares = new Map(anterior.map(d => [d.data, d]));
  const conversao = (d?: DiaFunil) => d && medido(d.visitas) && d.visitas > 0 && medido(d.pedidos) ? d.pedidos / d.visitas * 100 : null;
  return atual.map(d => {
    const dataAnterior = new Date(`${d.data}T00:00:00Z`);
    dataAnterior.setUTCDate(dataAnterior.getUTCDate() - 30);
    const p = pares.get(dataAnterior.toISOString().slice(0, 10));
    const visitas = medido(d.visitas) ? d.visitas : null;
    const taxa = conversao(d), taxaAnterior = conversao(p);
    return { data: d.data, visitas, conversao: taxa,
      deltaVisitas: visitas != null && medido(p?.visitas) && p.visitas > 0 ? (visitas / p.visitas - 1) * 100 : null,
      deltaConversao: taxa != null && taxaAnterior != null ? taxa - taxaAnterior : null };
  });
}