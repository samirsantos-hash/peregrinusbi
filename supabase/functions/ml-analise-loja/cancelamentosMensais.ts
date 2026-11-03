// Monthly order values are not reputation rates, refunds or net losses.
export function janelaMensal(mes: string, agora = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new Error('Informe um mês válido.');
  const inicio = `${mes}-01`;
  const hoje = agora.toISOString().slice(0, 10);
  if (inicio >= hoje) throw new Error('O mês ainda não possui dias completos.');
  const ultimo = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const ontem = new Date(Date.parse(hoje) - 864e5).toISOString().slice(0, 10);
  const fim = ultimo < ontem ? ultimo : ontem;
  return { mes, inicio, fim, parcial: fim < ultimo };
}

const valor = (v: unknown): number | null => {
  if (typeof v !== 'number' && !(typeof v === 'string' && /^\d+(\.\d+)?$/.test(v))) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
export type DiaCancelamento = { data: string; pedidosPagos: number; cancelados: number; faturamento: number | null; valorCancelado: number | null };

export function projetarCancelamentosMensais(orders: any[], inicio: string, fim: string) {
  const dias = new Map<string, DiaCancelamento>();
  for (let t = Date.parse(inicio); t <= Date.parse(fim); t += 864e5) {
    const data = new Date(t).toISOString().slice(0, 10);
    dias.set(data, { data, pedidosPagos: 0, cancelados: 0, faturamento: 0, valorCancelado: 0 });
  }
  const seen = new Set<string>();
  for (const o of orders) {
    if (o.id == null || typeof o.date_created !== 'string') throw new Error('Cobertura de pedidos não confirmada.');
    const id = String(o.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const d = dias.get(o.date_created.slice(0, 10));
    if (!d) throw new Error('Pedido fora do período solicitado.');
    if (o.status !== 'paid' && o.status !== 'cancelled') continue;
    // Use the same monetary field and currency for paid and cancelled orders.
    const amount = o.currency_id === 'BRL' ? valor(o.total_amount) : null;
    const key = o.status === 'paid' ? 'faturamento' : 'valorCancelado';
    if (o.status === 'paid') d.pedidosPagos++; else d.cancelados++;
    d[key] = d[key] == null || amount == null ? null : Math.round((d[key] + amount) * 100) / 100;
  }
  const serie = [...dias.values()];
  const soma = (key: 'faturamento' | 'valorCancelado') => serie.every(d => d[key] != null)
    ? Math.round(serie.reduce((s, d) => s + (d[key] ?? 0), 0) * 100) / 100 : null;
  const faturamento = soma('faturamento'), valorCancelado = soma('valorCancelado');
  return {
    faturamento, valorCancelado,
    pedidosPagos: serie.reduce((s, d) => s + d.pedidosPagos, 0),
    cancelados: serie.reduce((s, d) => s + d.cancelados, 0),
    proporcao: valorCancelado != null && faturamento != null && faturamento > 0 ? valorCancelado / faturamento : null,
    valoresCompletos: faturamento != null && valorCancelado != null,
    serie,
  };
}