// Agrupa vendas pagas de um anúncio pela promoção identificada no desconto de cada pedido (/orders/{id}/discounts).
// Pedido sem desconto lido conta como "sem desconto"; pedido cujo desconto não pôde ser lido fica em naoLidos, nunca zero.
export type VendaPromo = { id: string; tipo: string | null; pedidos: number; unidades: number; faturamento: number };
export function agruparVendasPromocao(itemId: string, pedidos: { id: string; unidades: number; faturamento: number; desconto: any | null | undefined }[]) {
  const grupos = new Map<string, VendaPromo>();
  const sem = { pedidos: 0, unidades: 0, faturamento: 0 };
  const desconhecida = { pedidos: 0, unidades: 0, faturamento: 0 };
  let naoLidos = 0;
  for (const p of pedidos) {
    if (p.desconto === undefined) { naoLidos++; continue; }
    const details = Array.isArray(p.desconto?.details) ? p.desconto.details : [];
    const doItem = details.filter((d: any) => !Array.isArray(d?.items) || d.items.some((i: any) => i?.id === itemId));
    if (!doItem.length) { sem.pedidos++; sem.unidades += p.unidades; sem.faturamento += p.faturamento; continue; }
    const ids = new Set<string>();
    for (const d of doItem) {
      const cid = d?.supplier?.campaign_id ?? d?.campaign_id ?? d?.promotion_id ?? d?.supplier?.offer_id ?? d?.offer_id;
      if (cid == null || String(cid) === '') continue;
      const id = String(cid);
      if (ids.has(id)) continue; ids.add(id);
      const g = grupos.get(id) ?? { id, tipo: typeof d?.type === 'string' ? d.type : null, pedidos: 0, unidades: 0, faturamento: 0 };
      g.pedidos++; g.unidades += p.unidades; g.faturamento += p.faturamento; grupos.set(id, g);
    }
    if (!ids.size) { desconhecida.pedidos++; desconhecida.unidades += p.unidades; desconhecida.faturamento += p.faturamento; }
  }
  return { porPromocao: [...grupos.values()].sort((a, b) => b.faturamento - a.faturamento), semDesconto: sem, descontoSemPromocao: desconhecida, naoLidos };
}
