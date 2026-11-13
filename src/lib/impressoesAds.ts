export function resumirImpressoesAds(dias: string[], linhas: { dia: string; prints: number | null }[]) {
  let total = 0, cobertura = 0;
  for (const dia of dias) {
    const rows = linhas.filter(r => r.dia === dia);
    if (!rows.length || rows.some(r => r.prints == null || !Number.isFinite(r.prints) || r.prints < 0)) continue;
    total += rows.reduce((s, r) => s + (r.prints ?? 0), 0); cobertura++;
  }
  return { total: cobertura ? total : null, cobertura, dias: dias.length };
}