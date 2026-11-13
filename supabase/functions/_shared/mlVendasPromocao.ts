// Exclusive paid-order buckets; supplier IDs never imply a seller promotion.
export type VendaPromo = { id: string; tipo: string | null; pedidos: number; unidades: number; faturamento: number };
export function agruparVendasPromocao(itemId: string, pedidos: { id: string; unidades: number; faturamento: number; desconto: any | null | undefined }[]) {
  const grupos = new Map<string, VendaPromo>();
  const sem = { pedidos: 0, unidades: 0, faturamento: 0 };
  const desconhecida = { pedidos: 0, unidades: 0, faturamento: 0 };
  const vistos = new Set<string>();
  let naoLidos = 0;
  const somar = (g: typeof sem, p: typeof pedidos[number]) => { g.pedidos++; g.unidades += p.unidades; g.faturamento = Math.round((g.faturamento + p.faturamento) * 100) / 100; };
  for (const p of pedidos) {
    if (vistos.has(p.id)) continue;
    vistos.add(p.id);
    if (!Array.isArray(p.desconto?.details)) { naoLidos++; continue; }
    const details = p.desconto.details;
    if (details.some((d: any) => !Array.isArray(d?.items))) { somar(desconhecida, p); continue; }
    const doItem = details.filter((d: any) => d.items.some((i: any) => i?.id === itemId));
    if (!doItem.length) { somar(sem, p); continue; }
    const ids = new Map<string, { id: string; tipo: string }>();
    for (const d of doItem) {
      // Only explicit promotion identity on the sale; never infer from offer/campaign IDs.
      if (typeof d?.promotion_id !== 'string' || !d.promotion_id || typeof d?.promotion_type !== 'string' || !d.promotion_type) continue;
      ids.set(`${d.promotion_type}:${d.promotion_id}`, { id: d.promotion_id, tipo: d.promotion_type });
    }
    if (ids.size !== 1) { somar(desconhecida, p); continue; }
    const entrada = [...ids.entries()][0];
    if (!entrada) continue;
    const [chave, evidencia] = entrada;
    const g = grupos.get(chave) ?? { ...evidencia, pedidos: 0, unidades: 0, faturamento: 0 };
    somar(g, p); grupos.set(chave, g);
  }
  return { porPromocao: [...grupos.values()].sort((a, b) => b.faturamento - a.faturamento), semDesconto: sem, descontoSemPromocao: desconhecida, naoLidos };
}
