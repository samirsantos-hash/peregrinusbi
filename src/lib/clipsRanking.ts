export type ClipsPorAnuncio = { sellerId: string; itemId: string; date: string; visitas: number | null; pedidos: number | null };
export function rankingClips(itens: ClipsPorAnuncio[], ordem: 'conversao' | 'visitas') {
  const latest = new Map<string, ClipsPorAnuncio>();
  for (const item of itens) {
    const key = `${item.sellerId}:${item.itemId}`;
    const anterior = latest.get(key);
    if (!anterior || item.date > anterior.date) latest.set(key, item);
  }
  return [...latest.values()].filter(i => i.visitas != null && Number.isFinite(i.visitas) && i.visitas > 0)
    .map(i => ({ ...i, conversao: i.pedidos != null && Number.isFinite(i.pedidos) && i.pedidos >= 0 && i.visitas != null ? i.pedidos / i.visitas * 100 : null }))
    .filter(i => ordem === 'visitas' || i.conversao != null)
    .sort((a, b) => ordem === 'conversao' ? (b.conversao ?? 0) - (a.conversao ?? 0) || (b.visitas ?? 0) - (a.visitas ?? 0) : (b.visitas ?? 0) - (a.visitas ?? 0));
}