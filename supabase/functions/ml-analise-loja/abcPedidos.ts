// Strict, buyer-free projection for ABC; missing paid-line evidence suspends totals.
export function agregarPedidosAbc(orders: any[], cust: string, inicio: string, fim: string) {
  const itens = new Map<string, { mlb: string; titulo: string; sku: string | null; unidades: number; faturamentoCents: number; pedidos: number; ultimaVenda: string | null; status: string | null }>();
  const seen = new Set<string>();
  for (const o of orders) {
    if (o.id == null || String(o.seller?.id) !== cust) throw new Error('Loja ou identificação dos pedidos não confirmada.');
    if (seen.has(String(o.id))) continue;
    seen.add(String(o.id));
    const timestamp = Date.parse(o.date_created);
    if (!Number.isFinite(timestamp)) throw new Error('Data dos pedidos não confirmada.');
    const dia = new Date(timestamp).toISOString().slice(0, 10);
    if (dia < inicio || dia > fim || o.status !== 'paid') continue;
    if (o.currency_id !== 'BRL' || !Array.isArray(o.order_items) || !o.order_items.length) throw new Error('Valores dos pedidos pagos não confirmados.');
    const vistos = new Set<string>();
    for (const l of o.order_items) {
      const mlb = l.item?.id, q = l.quantity, p = l.unit_price;
      if (typeof mlb !== 'string' || !/^MLB\d+$/.test(mlb) || !Number.isSafeInteger(q) || q <= 0 || typeof p !== 'number' || !Number.isFinite(p) || p < 0) throw new Error('Valores por anúncio não confirmados.');
      const cents = Math.round(p * 100) * q;
      const i = itens.get(mlb) ?? { mlb, titulo: l.item.title ?? mlb, sku: null, unidades: 0, faturamentoCents: 0, pedidos: 0, ultimaVenda: null, status: null };
      i.unidades += q; i.faturamentoCents += cents;
      if (!Number.isSafeInteger(i.unidades) || !Number.isSafeInteger(i.faturamentoCents)) throw new Error('Valores fora do limite de precisão.');
      if (!vistos.has(mlb)) i.pedidos++;
      vistos.add(mlb);
      i.ultimaVenda = i.ultimaVenda == null || dia > i.ultimaVenda ? dia : i.ultimaVenda;
      itens.set(mlb, i);
    }
  }
  return [...itens.values()];
}

export async function lerCatalogoAbc(get: (path: string) => Promise<any>, cust: string) {
  const ids = new Set<string>();
  for (const status of ['active', 'paused']) {
    let scroll: string | null = null, encerrado = false;
    const scrolls = new Set<string>();
    for (let pagina = 0; pagina < 100; pagina++) {
      const p = await get(`/users/${cust}/items/search?search_type=scan&status=${status}&limit=100${scroll ? `&scroll_id=${encodeURIComponent(scroll)}` : ''}`);
      if (!Array.isArray(p.results) || p.results.some((id: unknown) => typeof id !== 'string' || !/^MLB\d+$/.test(id))) throw new Error('Catálogo não confirmado.');
      p.results.forEach((id: string) => ids.add(id));
      if (!p.results.length) { encerrado = true; break; }
      if (typeof p.scroll_id !== 'string' || scrolls.has(p.scroll_id)) throw new Error('Paginação do catálogo não confirmada.');
      scroll = p.scroll_id; scrolls.add(scroll);
    }
    if (!encerrado) throw new Error('Catálogo incompleto; análise suspensa.');
  }
  return [...ids];
}