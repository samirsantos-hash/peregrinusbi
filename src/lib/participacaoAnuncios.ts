export type AnuncioParticipacao = { item_id: string; titulo: string; status: string; promocoes: { id: string; nome: string; status: string; inicio: string | null; fim: string | null }[] };
export function filtrarParticipacao(itens: AnuncioParticipacao[], filtro: string, completa: boolean) {
  if (!completa && filtro === 'fora') return [];
  return itens.filter(i => ['active', 'paused'].includes(i.status)).filter(i => {
    const n = new Set(i.promocoes.map(p => p.id)).size;
    return filtro === 'fora' ? n === 0 : filtro === 'multiplas' ? n >= 2 : true;
  });
}