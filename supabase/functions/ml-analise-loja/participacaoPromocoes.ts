import { lerCatalogoAbc } from './abcPedidos.ts';
import { lerPromoDoItem, participa } from '../_shared/mlPromocoes.ts';

/** Read each own-store item's complete current promotion response; no saved-sync inference. */
export async function lerParticipacaoPromocoes(get: (path: string) => Promise<any>, cust: string) {
  const ids = await lerCatalogoAbc(get, cust);
  const itens: { item_id: string; titulo: string; status: string; promocoes: { id: string; nome: string; status: string; inicio: string | null; fim: string | null }[] }[] = [];
  const falhas: string[] = [];
  for (let off = 0; off < ids.length; off += 20) {
    const lote = await get(`/items?ids=${ids.slice(off, off + 20).join(',')}&attributes=id,seller_id,title,status`);
    if (!Array.isArray(lote)) throw new Error('Catálogo não confirmado.');
    const detalhes = new Map(lote.filter(e => e.code === 200).map(e => [e.body.id, e.body]));
    for (let i = off; i < Math.min(ids.length, off + 20); i += 3) {
      await Promise.all(ids.slice(i, Math.min(i + 3, off + 20)).map(async id => {
        const d = detalhes.get(id);
        if (!d || String(d.seller_id) !== cust || !['active', 'paused'].includes(d.status)) { falhas.push(id); return; }
        try {
          const bruto = await get(`/seller-promotions/items/${id}?app_version=v2`);
          if (!Array.isArray(bruto)) throw new Error('Participação não confirmada.');
          const parsed = bruto.map(lerPromoDoItem);
          if (parsed.some(p => p === null)) throw new Error('Participação não confirmada.');
          const promos = new Map<string, { id: string; nome: string; status: string; inicio: string | null; fim: string | null }>();
          for (const p of parsed) {
            if (!p || !participa(p.status)) continue;
            const chave = `${p.tipo}:${p.promotion_id ?? p.offer_id ?? p.tipo}`;
            promos.set(chave, { id: chave, nome: p.nome ?? (p.tipo === 'PRICE_DISCOUNT' ? 'Desconto individual' : p.tipo), status: p.status, inicio: p.inicio, fim: p.fim });
          }
          itens.push({ item_id: id, titulo: d.title ?? id, status: d.status, promocoes: [...promos.values()] });
        } catch { falhas.push(id); }
      }));
    }
  }
  return { itens: itens.sort((a, b) => a.item_id.localeCompare(b.item_id)), universo: ids.length, medidos: itens.length, indisponiveis: falhas.length, coberturaCompleta: falhas.length === 0, consultadoEm: new Date().toISOString() };
}