/** Complete order cohort projection, one occurrence per distinct single-item order. */
export function experienciaPedidos(orders: any[], cust: string, inicio: string, fim: string) {
  const rows = new Map<string, { item_id: string; vendas: number; cancelamentos: number; reclamacoes: null; atrasos: null }>();
  const vistos = new Set<string>();
  const ambiguos = new Set<string>();
  for (const o of orders) {
    if (o.id == null || String(o.seller?.id) !== cust || !Number.isFinite(Date.parse(o.date_created)) || !Array.isArray(o.order_items) || !o.order_items.length) throw new Error('Experiência: cobertura dos pedidos não confirmada.');
    const dia = new Date(o.date_created).toISOString().slice(0, 10);
    if (dia < inicio || dia > fim || vistos.has(String(o.id))) continue;
    vistos.add(String(o.id));
    const ids = [...new Set<string>(o.order_items.map((l: any) => l.item?.id))];
    if (ids.some(id => typeof id !== 'string' || !/^MLB\d+$/.test(id))) throw new Error('Experiência: anúncio do pedido não confirmado.');
    for (const id of ids) {
      const r = rows.get(id) ?? { item_id: id, vendas: 0, cancelamentos: 0, reclamacoes: null, atrasos: null };
      if (o.status === 'paid') r.vendas++;
      if (o.status === 'cancelled') {
        if (ids.length === 1) r.cancelamentos++;
        else ambiguos.add(id);
      }
      rows.set(id, r);
    }
  }
  return [...rows.values()].map(r => ({ ...r, cancelamentos: ambiguos.has(r.item_id) ? null : r.cancelamentos }));
}