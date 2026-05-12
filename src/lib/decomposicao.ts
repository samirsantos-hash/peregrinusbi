// Log-additive decomposition: Receita = Visitas × CR × AOV
// Δlog(Receita) ≈ Δlog(Visitas) + Δlog(CR) + Δlog(AOV)

export type Periodo = { receita: number; visitas: number; cr: number; aov: number };

export type ContribuicaoCrescimento = {
  total_pct: number;
  visitas_pct: number;
  cr_pct: number;
  aov_pct: number;
  interacao_pct: number;
};

function safeLog(x: number) { return x > 0 ? Math.log(x) : 0; }

export function decompor(atual: Periodo, anterior: Periodo): ContribuicaoCrescimento {
  if (anterior.receita <= 0 || atual.receita <= 0) {
    return { total_pct: 0, visitas_pct: 0, cr_pct: 0, aov_pct: 0, interacao_pct: 0 };
  }
  const totalGrowth = (atual.receita - anterior.receita) / anterior.receita;
  const dLogTotal = safeLog(atual.receita) - safeLog(anterior.receita);
  const dV = safeLog(atual.visitas) - safeLog(anterior.visitas);
  const dC = safeLog(atual.cr) - safeLog(anterior.cr);
  const dA = safeLog(atual.aov) - safeLog(anterior.aov);
  const sum = dV + dC + dA;
  const interacao = dLogTotal - sum;
  // express each driver as pp of the total growth
  const scale = totalGrowth === 0 ? 1 : totalGrowth / (dLogTotal || 1);
  return {
    total_pct: totalGrowth * 100,
    visitas_pct: dV * scale * 100,
    cr_pct: dC * scale * 100,
    aov_pct: dA * scale * 100,
    interacao_pct: interacao * scale * 100,
  };
}