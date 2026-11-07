// Read-only item metadata, no orders and no buyer data.
type Objeto = Record<string, any>;
export interface ConstrucaoAnuncio {
  item_id: string;
  preco: number | null;
  moeda: string | null;
  tipo: string | null;
  envio: { free_shipping: boolean; logistic_type: string | null } | null;
  fotos: { id: string; max_size: string }[] | null;
  atributos: { id: string; name: string; value_name: string | null }[] | null;
  categoria: { id: string; name: string; tags: { required: boolean; catalog_required: boolean } }[] | null;
}
const categorias = new Map<string, { expira: number; dados: ConstrucaoAnuncio['categoria'] }>();
const texto = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim() : null;

export function projetarConstrucao(item: Objeto, categoria: ConstrucaoAnuncio['categoria']): ConstrucaoAnuncio {
  return {
    item_id: item.id,
    preco: typeof item.price === 'number' && Number.isFinite(item.price) && item.price > 0 ? item.price : null,
    moeda: texto(item.currency_id), tipo: texto(item.listing_type_id),
    envio: item.shipping && typeof item.shipping.free_shipping === 'boolean' ? { free_shipping: item.shipping.free_shipping, logistic_type: texto(item.shipping.logistic_type) } : null,
    fotos: Array.isArray(item.pictures) ? item.pictures.map((p: Objeto) => ({ id: texto(p.id) ?? '', max_size: texto(p.max_size) ?? '' })) : null,
    atributos: Array.isArray(item.attributes) ? item.attributes.flatMap((a: Objeto) => {
      const id = texto(a.id);
      if (!id) return [];
      const valores = Array.isArray(a.values) ? a.values.map((v: Objeto) => texto(v.name)).filter(Boolean).join(', ') : '';
      return [{ id, name: texto(a.name) ?? id, value_name: texto(a.value_name) ?? (valores || null) }];
    }) : null,
    categoria,
  };
}

export async function lerConstrucaoAnuncios(get: (path: string) => Promise<any>, cust: string, ids: string[]) {
  if (!ids.length || ids.length > 20 || new Set(ids).size !== ids.length || ids.some(id => !/^MLB\d+$/.test(id))) throw new Error('Informe de 1 a 20 anúncios distintos.');
  const lidos = new Map<string, Objeto>();
  const indisponiveis: string[] = [];
  let lote: any;
  try { lote = await get(`/items?ids=${ids.join(',')}&include_attributes=all`); } catch { lote = null; }
  for (const id of ids) {
    let item = Array.isArray(lote) ? lote.find(e => e.code === 200 && e.body?.id === id)?.body : null;
    if (!item) { try { item = await get(`/items/${id}?include_attributes=all`); } catch { item = null; } }
    if (!item || item.id !== id) { indisponiveis.push(id); continue; }
    if (String(item.seller_id) !== cust) throw new Error('Anúncio fora da loja selecionada.');
    lidos.set(id, item);
  }
  const porCategoria = new Map<string, ConstrucaoAnuncio['categoria']>();
  for (const item of lidos.values()) {
    const id = texto(item.category_id);
    if (!id || !/^MLB\d+$/.test(id) || porCategoria.has(id)) continue;
    const cache = categorias.get(id);
    if (cache && cache.expira > Date.now()) { porCategoria.set(id, cache.dados); continue; }
    let dados: ConstrucaoAnuncio['categoria'] = null;
    try {
      const raw = await get(`/categories/${id}/attributes`);
      if (Array.isArray(raw) && raw.length && raw.every(a => typeof a?.id === 'string')) {
        dados = raw.map(a => ({ id: a.id, name: texto(a.name) ?? a.id, tags: { required: a.tags?.required === true, catalog_required: a.tags?.catalog_required === true } }));
        if (categorias.size >= 500) categorias.clear();
        categorias.set(id, { expira: Date.now() + 864e5, dados });
      }
    } catch { /* Category unavailable is not a zero score. */ }
    porCategoria.set(id, dados);
  }
  return { itens: [...lidos.values()].map(item => projetarConstrucao(item, porCategoria.get(item.category_id) ?? null)), indisponiveis, coberturaCompleta: indisponiveis.length === 0, consultadoEm: new Date().toISOString() };
}