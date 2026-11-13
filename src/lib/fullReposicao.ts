/** Demand-based stock coverage; not inbound appointments nor Markowitz allocation weights. */
export const ALVO_DIAS = 28, LIMITE_RUPTURA_DIAS = 15, Z_SERVICO = 1.65;
export function planejarReposicao(unidades: number | null, dias: number, estoque: number | null, diario: number[] = []) {
  if (unidades == null || !Number.isFinite(unidades) || unidades < 0 || !Number.isFinite(dias) || dias <= 0 || estoque == null || !Number.isFinite(estoque) || estoque < 0) return null;
  const diaria = unidades / dias;
  const cobertura = diaria > 0 ? estoque / diaria : null;
  // Daily paid-revenue volatility proxies demand oscillation (same series as the Markowitz balancing).
  const media = diario.length ? diario.reduce((a, b) => a + b, 0) / diario.length : 0;
  const cv = diario.length > 1 && media > 0 ? Math.sqrt(diario.reduce((a, b) => a + (b - media) ** 2, 0) / (diario.length - 1)) / media : 0;
  const seguranca = Math.ceil(Z_SERVICO * diaria * cv * Math.sqrt(ALVO_DIAS));
  const recomendado = Math.ceil(diaria * ALVO_DIAS) + seguranca;
  return { diaria, cobertura, seguranca, recomendado, envio: Math.max(0, recomendado - estoque), risco: cobertura != null && cobertura < LIMITE_RUPTURA_DIAS, cenarios: [7, 10, 15].map(d => ({ dias: d, unidades: Math.max(0, Math.ceil(diaria * d - estoque)) })) };
}
