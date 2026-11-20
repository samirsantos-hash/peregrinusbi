export type ParticipacaoPromo = { promotion_id: string; item_id: string; status: string };
export type ResumoPromo = { promotion_id: string; itens_completo: boolean; participando: number | null };

const ADERIDA = new Set(['started', 'active', 'pending', 'programmed']);

/** Current opt-ins are not historical sales attribution. Partial reads never become zero. */
export function participacoesConfirmadas<T extends ResumoPromo>(promocoes: T[], itens: ParticipacaoPromo[]) {
  return promocoes.flatMap(p => {
    const participantes = new Set(itens.filter(i => i.promotion_id === p.promotion_id && ADERIDA.has(i.status)).map(i => i.item_id));
    const observados = participantes.size;
    const oficial = p.participando != null && Number.isFinite(p.participando) && p.participando >= 0 ? p.participando : null;
    if (observados === 0 && (oficial == null || oficial === 0)) return [];
    return [{ ...p, observados, quantidade: p.itens_completo ? observados : null, roas: null, roi: null }];
  });
}