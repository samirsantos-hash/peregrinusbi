// Today's paid sales (São Paulo calendar day, partial until now). Returns only aggregates and
// top-listing titles/thumbnails; buyer identities are counted, never returned.
type Get = (path: string) => Promise<any>;
export async function lerVendasHoje(get: Get, custId: string) {
  const agora = new Date();
  const dia = new Date(agora.getTime() - 3 * 36e5).toISOString().slice(0, 10);
  const de = `${dia}T00:00:00.000-03:00`;
  const url = (off: number) => `/orders/search?seller=${custId}&order.date_created.from=${encodeURIComponent(de)}&order.date_created.to=${encodeURIComponent(agora.toISOString())}&sort=date_asc&limit=50&offset=${off}`;
  const first = await get(url(0));
  const total = first.paging?.total;
  if (!Array.isArray(first.results) || !Number.isSafeInteger(total) || total > 1000) throw new Error('Cobertura de pedidos não confirmada.');
  const orders = [...first.results];
  for (let off = 50; off < total; off += 50) { const p = await get(url(off)); if (!Array.isArray(p.results)) throw new Error('Cobertura de pedidos não confirmada.'); orders.push(...p.results); }
  const unicos = new Map(orders.map(o => [String(o.id), o]));
  if (unicos.size < total) throw new Error('Cobertura de pedidos não confirmada.');
  let faturamento = 0, pedidos = 0, unidades = 0; const compradores = new Set<string>();
  const itens = new Map<string, { id: string; titulo: string; unidades: number; faturamento: number }>();
  for (const o of unicos.values()) {
    if (o.status !== 'paid' || String(o.seller?.id) !== custId) continue;
    pedidos++; if (o.buyer?.id != null) compradores.add(String(o.buyer.id));
    for (const l of o.order_items ?? []) {
      const q = Number(l.quantity), p = Number(l.unit_price), id = l.item?.id;
      if (!id || !Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) continue;
      faturamento += q * p; unidades += q;
      const i = itens.get(id) ?? { id, titulo: l.item?.title ?? id, unidades: 0, faturamento: 0 };
      i.unidades += q; i.faturamento += q * p; itens.set(id, i);
    }
  }
  const top = [...itens.values()].sort((a, b) => b.faturamento - a.faturamento).slice(0, 5).map(i => ({ ...i, faturamento: Math.round(i.faturamento * 100) / 100, thumbnail: null as string | null }));
  if (top.length) {
    const lote: any = await get(`/items?ids=${top.map(t => t.id).join(',')}&attributes=id,thumbnail,secure_thumbnail`).catch(() => null);
    if (Array.isArray(lote)) for (const e of lote) { const t = top.find(x => x.id === e?.body?.id); if (t && e.code === 200) t.thumbnail = e.body.secure_thumbnail ?? e.body.thumbnail ?? null; }
  }
  let visitas: number | null = null;
  try { const v = await get(`/users/${custId}/items_visits?date_from=${dia}&date_to=${dia}`); if (Number.isFinite(Number(v?.total_visits))) visitas = Number(v.total_visits); } catch { /* unknown stays null */ }
  return { dia, faturamento: Math.round(faturamento * 100) / 100, pedidos, unidades, compradores: compradores.size, visitas, conversao: visitas ? pedidos / visitas : null, ticket: pedidos ? faturamento / pedidos : null, top, consultadoEm: agora.toISOString() };
}
