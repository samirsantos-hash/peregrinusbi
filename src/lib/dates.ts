/** Retorna a chave "AAAA-MM" para uma data ISO ou objeto Date,
 *  sempre em UTC — imune a timezone do navegador. */
export function monthKey(input: string | Date): string {
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}`;
    const d = new Date(input);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return `${input.getUTCFullYear()}-${String(input.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Converte TIM_MONTH_ID (ex.: 202601) em chave "2026-01". */
export function monthKeyFromTimMonthId(tim: number | string): string {
  const s = String(tim).padStart(6, '0');
  return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
}

/** Converte chave "2026-01" para Date às 12:00 UTC (meio-dia evita qualquer
 *  problema de DST em qualquer fuso). Use isso só para PLOTAR no eixo X. */
export function monthKeyToDate(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
}

/** Label pt-BR para chave "2026-01" -> "Jan/2026". */
const FMT = new Intl.DateTimeFormat('pt-BR', {
  month: 'short', year: 'numeric', timeZone: 'UTC',
});
export function monthLabel(key: string): string {
  return FMT.format(monthKeyToDate(key)).replace('.', '');
}

/** Gera lista contígua de chaves "AAAA-MM" entre start e end (inclusive). */
export function monthRange(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  const [ys, ms] = startKey.split('-').map(Number);
  const [ye, me] = endKey.split('-').map(Number);
  let y = ys, m = ms;
  while (y < ye || (y === ye && m <= me)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}