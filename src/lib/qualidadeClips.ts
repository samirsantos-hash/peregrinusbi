/** Nullable evidence retained before legacy adapters turn missing values into zero. */
export function medido(v: unknown): number | null {
  if (v == null || v === '' || typeof v === 'boolean') return null;
  const n = typeof v === 'string' && v.includes(',') ? Number(v.replace(/\./g, '').replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function evidenciaQualidadeClips(row: Record<string, unknown>) {
  return {
    fotos: medido(row.ll_pictures_score), titulo: medido(row.ll_title_score),
    descricao: medido(row.ll_description_score), preco: medido(row.ll_price_score),
    frete: medido(row.ll_free_shipping_score), promocoes: medido(row.ll_promotions_score),
    visitas: medido(row.visitas_clips), pedidos: medido(row.orders_clips),
    unidades: medido(row.si_clips), faturamento: medido(row.tgmv_lc_clips),
  };
}
export type EvidenciaQualidadeClips = ReturnType<typeof evidenciaQualidadeClips>;

/** LL scores are documented percentage-point scores: do not turn 1 into 100. */
export function scoreMedido(v: number | null): number | null {
  return v != null && v <= 100 ? v : null;
}
/** Legacy imports fill all six quality columns with zero; their provenance is ambiguous. */
export function qualidadeConfirmavel(e: EvidenciaQualidadeClips | undefined) {
  const values = [e?.fotos, e?.titulo, e?.descricao, e?.preco, e?.frete, e?.promocoes];
  return !values.every(v => v == null || v === 0);
}
export function conversaoClips(visitas: number | null, pedidos: number | null) {
  return visitas != null && visitas > 0 && pedidos != null ? pedidos / visitas * 100 : null;
}