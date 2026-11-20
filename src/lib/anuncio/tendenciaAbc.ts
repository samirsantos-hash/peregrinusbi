export type Tendencia = 'subindo' | 'estavel' | 'caindo' | 'parando' | 'novo';
/** Compara a mesma base (faturamento ou unidades) entre janelas iguais e consecutivas. */
export function tendenciaVendas(atual: number, anterior: number | null | undefined): { tendencia: Tendencia; variacao: number | null } | null {
  if (anterior == null || !Number.isFinite(anterior) || !Number.isFinite(atual)) return null;
  if (anterior === 0) return atual > 0 ? { tendencia: 'novo', variacao: null } : null;
  const variacao = (atual - anterior) / anterior;
  const tendencia: Tendencia = variacao <= -0.7 ? 'parando' : variacao <= -0.1 ? 'caindo' : variacao >= 0.1 ? 'subindo' : 'estavel';
  return { tendencia, variacao };
}
