/** Zero só é um resultado medido quando há composição de preço positiva. */
export function percentualPreco(valor: number, totalComparacoes: number): number | null {
  if (!Number.isFinite(totalComparacoes) || totalComparacoes <= 0 || !Number.isFinite(valor)) return null;
  return (valor / totalComparacoes) * 100;
}