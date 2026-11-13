/** Demand scenarios are not inbound appointments or Markowitz allocation weights. */
export function planejarReposicao(unidades: number | null, dias: number, estoque: number | null, prazo: number) {
  if (unidades == null || !Number.isFinite(unidades) || unidades < 0 || !Number.isFinite(dias) || dias <= 0 || estoque == null || !Number.isFinite(estoque) || estoque < 0 || !Number.isFinite(prazo) || prazo < 0) return null;
  const diaria = unidades / dias;
  const cobertura = diaria > 0 ? estoque / diaria : null;
  const iniciarEm = cobertura == null ? null : Math.max(0, Math.floor(cobertura - prazo));
  return { diaria, cobertura, iniciarEm, envio: Math.max(0, Math.ceil(diaria * (28 + prazo) - estoque)), cenarios: [7, 10, 15].map(d => ({ dias: d, unidades: Math.max(0, Math.ceil(diaria * d - estoque)) })) };
}