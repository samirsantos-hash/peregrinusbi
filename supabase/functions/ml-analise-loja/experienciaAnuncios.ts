import { validarPeriodoResposta } from './respostaAnuncios.ts';

/** Only item-owned, allowlisted experience metadata; never forward upstream bodies. */
export async function lerExperienciaAnuncios(get: (path: string) => Promise<any>, cust: string, ids: string[], inicio: string, fim: string) {
  validarPeriodoResposta(inicio, fim);
  if (!ids.length || ids.length > 20 || new Set(ids).size !== ids.length || ids.some(id => !/^MLB\d+$/.test(id))) throw new Error('Informe de 1 a 20 anúncios distintos.');
  const itens = [];
  for (const item_id of ids) {
    const item = await get(`/items/${item_id}?attributes=id,seller_id`).catch(() => null);
    if (item && String(item.seller_id) !== cust) throw new Error('Anúncio fora da loja selecionada.');
    const raw = item?.id === item_id ? await get(`/reputation/items/${item_id}/purchase_experience/integrators`).catch(() => null) : null;
    // Status/level is not a same-window count. Never convert it into occurrences.
    itens.push({ item_id, disponivel: raw !== null, reclamacoes: null, atrasos: null });
  }
  return { periodo: { inicio, fim }, itens, coberturaCompleta: false, consultadoEm: new Date().toISOString() };
}