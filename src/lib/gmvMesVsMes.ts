/**
 * Lógica pura do gráfico "GMV mês vs mês".
 *
 * Regras importantes (cobertas por testes):
 * - Meses parciais só desenham entre o primeiro e o último dia com dado.
 *   Sem isso, o acumulado vira "linha reta" no zero (ex.: mês que começa no dia 20)
 *   ou uma reta horizontal depois do último dia importado.
 * - A variação usa a MESMA janela de dias nos dois meses quando o mês base é parcial.
 */

export interface PontoDiario {
  /** YYYY-MM-DD */
  date: string;
  gmv: number;
}

export type ModoComparacao = "diario" | "acumulado" | "indice";

export interface LinhaSerie {
  dia: string;
  base: number | null;
  comp: number | null;
  accA: number | null;
  accB: number | null;
}

export type MapaMeses = Map<string, Map<number, number>>;

export function agruparPorMes(pontos: PontoDiario[]): MapaMeses {
  const m: MapaMeses = new Map();
  for (const p of pontos || []) {
    if (!p?.date || p.date.length < 10) continue;
    const chave = p.date.slice(0, 7);
    const dia = Number(p.date.slice(8, 10));
    if (!Number.isFinite(dia) || dia < 1 || dia > 31) continue;
    if (!m.has(chave)) m.set(chave, new Map());
    const dd = m.get(chave)!;
    dd.set(dia, (dd.get(dia) || 0) + (Number(p.gmv) || 0));
  }
  return m;
}

/** Primeiro e último dia com valor diferente de zero. 0 quando não há dado. */
export function limitesMes(mes?: Map<number, number>): { primeiro: number; ultimo: number } {
  const dias = Array.from(mes?.entries() || [])
    .filter(([, v]) => Number.isFinite(v) && v !== 0)
    .map(([d]) => d);
  if (!dias.length) return { primeiro: 0, ultimo: 0 };
  return { primeiro: Math.min(...dias), ultimo: Math.max(...dias) };
}

/** Dias do mês a partir da chave YYYY-MM. */
export function diasNoMes(chave: string): number {
  const [a, m] = String(chave).split("-").map(Number);
  if (!a || !m) return 31;
  return new Date(a, m, 0).getDate();
}

export function construirSerie(
  porMes: MapaMeses,
  mesA: string,
  mesB: string,
  modo: ModoComparacao,
): LinhaSerie[] {
  const a = porMes.get(mesA);
  const b = porMes.get(mesB);
  if (!a && !b) return [];
  const la = limitesMes(a);
  const lb = limitesMes(b);
  const maxDia = Math.max(la.ultimo, lb.ultimo);
  if (maxDia < 1) return [];

  let accA = 0;
  let accB = 0;
  return Array.from({ length: maxDia }, (_, i) => {
    const dia = i + 1;
    const va = a?.get(dia) ?? null;
    const vb = b?.get(dia) ?? null;
    accA += va ?? 0;
    accB += vb ?? 0;
    // Só existe curva dentro da janela real de cada mês.
    const vivoA = la.primeiro > 0 && dia >= la.primeiro && dia <= la.ultimo;
    const vivoB = lb.primeiro > 0 && dia >= lb.primeiro && dia <= lb.ultimo;
    const dd = String(dia).padStart(2, "0");
    if (modo === "indice") {
      return {
        dia: dd,
        base: vivoA && vivoB && accB > 0 ? (accA / accB) * 100 : null,
        comp: vivoB && accB > 0 ? 100 : null,
        accA: vivoA ? accA : null,
        accB: vivoB ? accB : null,
      };
    }
    return {
      dia: dd,
      base: modo === "acumulado" ? (vivoA && accA > 0 ? accA : null) : va,
      comp: modo === "acumulado" ? (vivoB && accB > 0 ? accB : null) : vb,
      accA: vivoA ? accA : null,
      accB: vivoB ? accB : null,
    };
  });
}

export interface ResumoComparacao {
  totalA: number;
  totalB: number;
  /** Total do mês comparado limitado à janela de dias do mês base. */
  totalBJanela: number;
  primeiroDiaA: number;
  ultimoDiaA: number;
  primeiroDiaB: number;
  ultimoDiaB: number;
  parcial: boolean;
  variacao: number;
}

export function resumirComparacao(porMes: MapaMeses, mesA: string, mesB: string): ResumoComparacao {
  const a = porMes.get(mesA);
  const b = porMes.get(mesB);
  const soma = (m?: Map<number, number>) =>
    Array.from(m?.values() || []).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalA = soma(a);
  const totalB = soma(b);
  const la = limitesMes(a);
  const lb = limitesMes(b);
  // Mês base só é parcial se ainda não chegou ao fim do próprio mês.
  const parcial =
    la.ultimo > 0 && lb.ultimo > 0 && la.ultimo < diasNoMes(mesA) && la.ultimo < lb.ultimo;

  let totalBJanela = totalB;
  if (parcial && b) {
    let s = 0;
    for (const [d, v] of b.entries()) if (d >= la.primeiro && d <= la.ultimo) s += Number(v) || 0;
    totalBJanela = s;
  }
  const base = parcial ? totalBJanela : totalB;
  const variacao = base ? (totalA - base) / Math.abs(base) : NaN;

  return {
    totalA,
    totalB,
    totalBJanela,
    primeiroDiaA: la.primeiro,
    ultimoDiaA: la.ultimo,
    primeiroDiaB: lb.primeiro,
    ultimoDiaB: lb.ultimo,
    parcial,
    variacao,
  };
}
