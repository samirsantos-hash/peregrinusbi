import type { RespostaMl } from './mlHttp.ts';

/** Partial rows are useful, but only confirmed pagination can close a daily marker. */
export async function paginarAds(url: string, ler: (url: string) => Promise<RespostaMl>, semTempo: () => boolean) {
  const items: Record<string, unknown>[] = [];
  for (let offset = 0; offset < 10_000; offset += 50) {
    if (semTempo()) return { ok: false as const, erro: 'Limite de tempo; segue na próxima execução.', items };
    const r = await ler(`${url}${url.includes('?') ? '&' : '?'}limit=50&offset=${offset}`);
    if (r.ok === false) return { ok: false as const, erro: r.erro, items };
    const corpo = r.json as { results?: unknown; paging?: { total?: number } } | null;
    if (!corpo || !Array.isArray(corpo.results)) return { ok: false as const, erro: 'Resposta de paginação incompleta.', items };
    const lista = corpo.results as Record<string, unknown>[];
    items.push(...lista);
    const total = corpo.paging?.total;
    if (typeof total === 'number' && Number.isFinite(total) && total >= 0) {
      if (offset + lista.length >= total) return { ok: true as const, items };
      if (lista.length < 50) return { ok: false as const, erro: 'Paginação interrompida antes do total.', items };
    } else if (lista.length < 50) return { ok: true as const, items };
  }
  return { ok: false as const, erro: 'Limite de paginação; cobertura incompleta.', items };
}

export async function confirmarDiaAds(completo: boolean, gravar: () => Promise<boolean>, marcar: () => Promise<boolean>) {
  const salvo = await gravar();
  return salvo && completo ? marcar() : false;
}