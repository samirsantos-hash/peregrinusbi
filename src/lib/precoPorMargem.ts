/** Net margin over selling price; caller supplies all costs and percentage charges. */
export function precoPorMargem(custo: number, fixos: number, taxas: number, margem: number): number | null {
  if (![custo, fixos, taxas, margem].every(Number.isFinite) || custo <= 0 || fixos < 0 || taxas < 0 || margem < 0 || taxas + margem >= 100) return null;
  const preco = (custo + fixos) / (1 - (taxas + margem) / 100);
  return Number.isFinite(preco) ? Math.ceil((preco - 1e-9) * 100) / 100 : null;
}