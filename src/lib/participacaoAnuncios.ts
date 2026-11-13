export type AnuncioParticipacao = { item_id: string; titulo: string; status: string; promocoes: { id: string; nome: string; status: string; inicio: string | null; fim: string | null }[] };
export function filtrarParticipacao(itens: AnuncioParticipacao[], filtro: string, completa: boolean, diasVencimento = 0, agora = Date.now()) {
  if (!completa && filtro === 'fora') return [];
  return itens.filter(i => ['active', 'paused'].includes(i.status)).filter(i => {
    const n = new Set(i.promocoes.map(p => p.id)).size;
    const quantidade = filtro === 'fora' ? n === 0 : filtro === 'multiplas' ? n >= 2 : filtro === 'com' ? n >= 1 : ['1', '2', '3'].includes(filtro) ? n === Number(filtro) : true;
    const vencimento = diasVencimento <= 0 || i.promocoes.some(p => {
      if (!p.fim || !['active', 'started', 'pending', 'programmed'].includes(p.status)) return false;
      const fim = Date.parse(p.fim);
      return Number.isFinite(fim) && fim >= agora && fim <= agora + diasVencimento * 86400000;
    });
    return quantidade && vencimento;
  });
}