/** Zero só é um resultado medido quando há composição de preço positiva. */
export function percentualPreco(valor: number, totalComparacoes: number): number | null {
  if (!Number.isFinite(totalComparacoes) || totalComparacoes <= 0 || !Number.isFinite(valor)) return null;
  return (valor / totalComparacoes) * 100;
}

/** Índice calculado da composição importada, sem inferir unidade ou visitas. */
export function calcularBpc(maisBarato: number, igual: number, maisCaro: number): number | null {
  if ([maisBarato, igual, maisCaro].some(v => !Number.isFinite(v) || v < 0)) return null;
  const total = maisBarato + igual + maisCaro;
  return total > 0 ? (maisBarato + igual) / total : null;
}

/** Cobertura de registros importados, não de sellers ou de rivais. */
export function coberturaPreco(registros: readonly { visitsMatch: number; visitsCheaper: number; visitsExpensive: number }[]) {
  const comComparacao = registros.filter(r => {
    const total = r.visitsMatch + r.visitsCheaper + r.visitsExpensive;
    return Number.isFinite(total) && total > 0;
  }).length;
  return { comComparacao, total: registros.length, percentual: percentualPreco(comComparacao, registros.length) };
}