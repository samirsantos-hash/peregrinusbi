import { parseItemVisits } from '../_shared/mlItemStats.ts';

export function validarPeriodoResposta(inicio: string, fim: string, agora = new Date()) {
  const a = Date.parse(inicio), b = Date.parse(fim);
  const hoje = Date.parse(agora.toISOString().slice(0, 10));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || !Number.isFinite(a) || !Number.isFinite(b) || new Date(a).toISOString().slice(0, 10) !== inicio || new Date(b).toISOString().slice(0, 10) !== fim || b - a !== 29 * 864e5 || b >= hoje) throw new Error('Informe 30 dias completos para visitas e vendas.');
}

/** Only allowlisted counts; seller ownership precedes visits. No raw orders. */
export async function lerRespostaAnuncios(get: (path: string) => Promise<any>, cust: string, ids: string[], inicio: string, fim: string) {
  validarPeriodoResposta(inicio, fim);
  if (!ids.length || ids.length > 20 || new Set(ids).size !== ids.length || ids.some(id => !/^MLB\d+$/.test(id))) throw new Error('Informe de 1 a 20 anúncios distintos.');
  const lote = await get(`/items?ids=${ids.join(',')}&attributes=id,seller_id`).catch(() => null);
  const confirmados: string[] = [];
  for (const id of ids) {
    let item = Array.isArray(lote) ? lote.find(e => e.code === 200 && e.body?.id === id)?.body : null;
    if (!item) item = await get(`/items/${id}?attributes=id,seller_id`).catch(() => null);
    if (!item || item.id !== id) continue;
    if (String(item.seller_id) !== cust) throw new Error('Anúncio fora da loja selecionada.');
    confirmados.push(id);
  }
  const visitas = new Map<string, number | null>();
  if (confirmados.length) {
    const raw = await get(`/items/visits?ids=${confirmados.join(',')}&date_from=${inicio}&date_to=${fim}`).catch(() => null);
    for (const id of confirmados) visitas.set(id, parseItemVisits(raw, id));
    // Fixed explicit date range; never fall back to a rolling window with different dates.
    for (const id of confirmados) if (visitas.get(id) == null) {
      const rawItem = await get(`/items/visits?ids=${id}&date_from=${inicio}&date_to=${fim}`).catch(() => null);
      visitas.set(id, parseItemVisits(rawItem, id));
    }
  }
  const itens = ids.map(item_id => ({ item_id, visitas: visitas.get(item_id) ?? null }));
  return { periodo: { inicio, fim }, itens, coberturaCompleta: itens.every(i => i.visitas !== null), consultadoEm: new Date().toISOString() };
}