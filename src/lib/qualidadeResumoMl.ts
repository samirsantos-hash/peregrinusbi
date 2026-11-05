export function resumirQualidadeMl(ativos: string[], avaliacoes: { item_id: string; qualidade_score: number | null }[]) {
  const ids = new Set(ativos);
  const scores = new Map<string, number>();
  for (const a of avaliacoes) {
    if (ids.has(a.item_id) && typeof a.qualidade_score === 'number' && Number.isFinite(a.qualidade_score) && a.qualidade_score >= 0 && a.qualidade_score <= 100) scores.set(a.item_id, a.qualidade_score);
  }
  const valores = [...scores.values()];
  return { media: valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null, avaliados: valores.length, ativos: ids.size, semAvaliacao: ids.size - valores.length };
}