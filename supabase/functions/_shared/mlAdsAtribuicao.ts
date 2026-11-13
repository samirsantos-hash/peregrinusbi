/** Official organic metrics only; never derive organic sales by subtraction. */
export function somarAtribuicaoAds(fontes: unknown[]) {
  const numero = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
  const soma = (campo: string) => {
    const valores = fontes.map(f => numero(f && typeof f === 'object' ? (f as Record<string, unknown>)[campo] : null));
    return valores.length && valores.every(v => v != null) ? valores.reduce<number>((s, v) => s + (v ?? 0), 0) : null;
  };
  return { receitaAds: soma('total_amount'), receitaOrganica: soma('organic_units_amount') };
}