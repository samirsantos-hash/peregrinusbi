// Pure order projection: never return buyers, addresses or raw orders.
export function janelaAnalise(agora = new Date(), dias = 30) {
  const fim = new Date(agora); fim.setUTCHours(0, 0, 0, 0);
  const inicio = new Date(fim.getTime() - dias * 864e5);
  return { inicio: inicio.toISOString().slice(0, 10), fim: new Date(fim.getTime() - 1).toISOString().slice(0, 10) };
}
export function projetarPedidos(orders: any[], inicio: string, fim: string) {
  const serie = new Map<string, { data: string; faturamento: number; pedidos: number; unidades: number; cancelados: number }>();
  for (let t = Date.parse(inicio); t <= Date.parse(fim); t += 864e5) {
    const data = new Date(t).toISOString().slice(0, 10);
    serie.set(data, { data, faturamento: 0, pedidos: 0, unidades: 0, cancelados: 0 });
  }
  const itens = new Map<string, { id: string; unidades: number; faturamento: number; diario: Record<string, number> }>();
  const seen = new Set<string>();
  for (const o of orders) {
    if (seen.has(String(o.id))) continue;
    seen.add(String(o.id));
    const dia = String(o.date_created ?? '').slice(0, 10), s = serie.get(dia);
    if (!s) continue;
    if (o.status === 'cancelled') { s.cancelados++; continue; }
    if (o.status !== 'paid') continue;
    s.pedidos++;
    for (const l of o.order_items ?? []) {
      const id = l.item?.id;
      const q = Number(l.quantity), p = Number(l.unit_price);
      if (!id || !Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) continue;
      const receita = q * p;
      s.unidades += q; s.faturamento += receita;
      const item = itens.get(id) ?? { id, unidades: 0, faturamento: 0, diario: {} };
      item.unidades += q; item.faturamento += receita; item.diario[dia] = (item.diario[dia] ?? 0) + receita;
      itens.set(id, item);
    }
  }
  const linhas = [...serie.values()];
  const total = linhas.reduce((s, r) => ({ faturamento: s.faturamento + r.faturamento, pedidos: s.pedidos + r.pedidos, unidades: s.unidades + r.unidades, cancelados: s.cancelados + r.cancelados }), { faturamento: 0, pedidos: 0, unidades: 0, cancelados: 0 });
  return { ...total, taxaCancelamento: total.pedidos + total.cancelados > 0 ? total.cancelados / (total.pedidos + total.cancelados) : null, ticket: total.pedidos > 0 ? total.faturamento / total.pedidos : null, serie: linhas, itens: [...itens.values()] };
}