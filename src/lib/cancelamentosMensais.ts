export type DiaCancelamento = { data: string; pedidosPagos: number; cancelados: number; faturamento: number | null; valorCancelado: number | null };
export type CancelamentoMensal = {
  periodo: { mes: string; inicio: string; fim: string; parcial: boolean };
  faturamento: number | null; valorCancelado: number | null; cancelados: number; pedidosPagos: number;
  proporcao: number | null; valoresCompletos: boolean; coberturaCompleta: boolean; serie: DiaCancelamento[];
};
export function mesesDoPeriodo(de?: string, ate?: string, agora = new Date()) {
  const hoje = agora.toISOString().slice(0, 10);
  const mesFinal = (ate && ate < hoje ? ate : hoje).slice(0, 7);
  const mesInicial = de?.slice(0, 7) ?? mesFinal;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mesInicial) || mesInicial > mesFinal) return [];
  const meses: string[] = [];
  for (let m = mesInicial; m <= mesFinal;) {
    meses.push(m);
    const dt = new Date(`${m}-01T00:00:00Z`);
    dt.setUTCMonth(dt.getUTCMonth() + 1);
    m = dt.toISOString().slice(0, 7);
  }
  return meses.reverse();
}
export function mesAnterior(mes: string) {
  const d = new Date(`${mes}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}
/** Compare matching completed calendar days; never partial against a full month. */
export function compararCancelamentos(atual: CancelamentoMensal, anterior: CancelamentoMensal) {
  if (!atual.coberturaCompleta || !anterior.coberturaCompleta || atual.valorCancelado == null) return null;
  const dias = atual.periodo.parcial ? Number(atual.periodo.fim.slice(8, 10)) : null;
  const linhas = anterior.serie.filter(d => dias == null || Number(d.data.slice(8, 10)) <= dias);
  if (!linhas.length || (dias != null && linhas.length !== dias) || linhas.some(d => d.valorCancelado == null)) return null;
  const valorAnterior = Math.round(linhas.reduce((s, d) => s + (d.valorCancelado ?? 0), 0) * 100) / 100;
  return { valorAnterior, variacao: valorAnterior > 0 ? (atual.valorCancelado - valorAnterior) / valorAnterior : null, dias };
}