/**
 * Guardas de porcentagem.
 *
 * Existem para evitar regressões do tipo "5.694,9%": campos como
 * VISITS_EXPENSIVE podem vir maiores que a base (contagem por anúncio),
 * e taxas REP_*_RATE ora chegam em 0–1, ora já em 0–100.
 */

export interface ShareOptions {
  /** Teto do share (padrão 1 = 100%). */
  cap?: number;
}

/**
 * Razão numerador/denominador protegida: retorna null quando não há base
 * válida e nunca ultrapassa o teto (padrão 100%). Negativos viram 0.
 */
export function safeShare(
  numerador: number | null | undefined,
  denominador: number | null | undefined,
  { cap = 1 }: ShareOptions = {},
): number | null {
  const n = Number(numerador);
  const d = Number(denominador);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null;
  const bruto = n / d;
  if (!Number.isFinite(bruto)) return null;
  return Math.min(Math.max(bruto, 0), cap);
}

/** Igual a safeShare, mas já em pontos percentuais (0–100 por padrão). */
export function safePct(
  numerador: number | null | undefined,
  denominador: number | null | undefined,
  opts?: ShareOptions,
): number | null {
  const s = safeShare(numerador, denominador, opts);
  return s == null ? null : s * 100;
}

/**
 * Share de visitas "caras" (preço acima do concorrente).
 * O valor diário é limitado à própria base antes de somar, porque a fonte
 * conta visitas por anúncio e pode superar as visitas do dia.
 */
export function shareVisitasCaras(
  linhas: { visits?: number | null; visitsExpensive?: number | null }[],
): number | null {
  let base = 0;
  let caras = 0;
  for (const l of linhas || []) {
    const v = Number(l?.visits) || 0;
    if (v <= 0) continue;
    const c = Number(l?.visitsExpensive) || 0;
    base += v;
    caras += Math.min(Math.max(c, 0), v);
  }
  return safeShare(caras, base);
}

/**
 * Normaliza uma taxa que pode vir em 0–1 ou já em 0–100 para pontos
 * percentuais, sem multiplicar duas vezes. Valores > 1 são tratados como
 * já percentuais; o resultado é limitado a 0–100.
 */
export function normalizeRateToPct(valor: number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "" as unknown as number) return null;
  const v = Number(valor);
  if (!Number.isFinite(v)) return null;
  const pct = Math.abs(v) <= 1 ? v * 100 : v;
  return Math.min(Math.max(pct, 0), 100);
}
