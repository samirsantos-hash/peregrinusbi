/**
 * Referência da vertical = mediana dos índices de crescimento dos pares
 * (mesma vertical, exceto o próprio seller). Índice do par no mês =
 * faturamento ÷ média dos 3 primeiros meses da janela × 100.
 */
export interface LinhaPar {
  seller_id: string;
  /** YYYY-MM */
  mes: string;
  tgmv: number;
}

export interface PontoReferencia {
  mes: string;
  mediana: number | null;
  p25: number | null;
  p75: number | null;
  n: number;
}

export const MIN_PARES = 5;

export function percentil(ordenado: number[], p: number): number | null {
  if (!ordenado.length) return null;
  const pos = (ordenado.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return ordenado[lo] + (ordenado[hi] - ordenado[lo]) * (pos - lo);
}

export function calcularReferenciaVertical(
  sellerId: string,
  meses: string[],
  linhas: LinhaPar[],
): { pontos: PontoReferencia[]; nPares: number } {
  const janela = [...meses].sort();
  const base3 = janela.slice(0, Math.min(3, janela.length));
  const porPar = new Map<string, Map<string, number>>();
  for (const l of linhas) {
    if (l.seller_id === sellerId) continue; // nunca compara o seller com ele mesmo
    const m = porPar.get(l.seller_id) ?? new Map<string, number>();
    m.set(l.mes, (m.get(l.mes) ?? 0) + (Number(l.tgmv) || 0));
    porPar.set(l.seller_id, m);
  }

  const indices = new Map<string, Map<string, number>>();
  for (const [id, m] of porPar) {
    const base = base3.reduce((s, mes) => s + (m.get(mes) ?? 0), 0) / Math.max(1, base3.length);
    if (!(base > 0) || !Number.isFinite(base)) continue; // descarta par com base 0
    const idx = new Map<string, number>();
    for (const mes of janela) if (m.has(mes)) idx.set(mes, ((m.get(mes) as number) / base) * 100);
    indices.set(id, idx);
  }

  const pontos = janela.map((mes) => {
    const v = [...indices.values()]
      .map((m) => m.get(mes))
      .filter((x): x is number => x !== undefined && Number.isFinite(x))
      .sort((a, b) => a - b);
    return { mes, mediana: percentil(v, 0.5), p25: percentil(v, 0.25), p75: percentil(v, 0.75), n: v.length };
  });
  return { pontos, nPares: indices.size };
}
