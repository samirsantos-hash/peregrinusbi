/** Period totals only: unavailable or zero comparison bases do not imply growth. */
export function variacaoIndicador(atual: number | null, anterior: number | null) {
  if (atual == null || anterior == null || !Number.isFinite(atual) || !Number.isFinite(anterior) || anterior === 0) return null;
  return (atual / anterior - 1) * 100;
}