export type PontoPublicidade = { data: string; investimento: number | null; faturamento: number | null; receitaAds: number | null; visitas?: number | null; cancelamentos?: number | null };

/** Fills days the read left empty. A series of only zeros counts as unmeasured. A real visit above zero is kept, and a missing synced day stays empty. */
export function completarVisitasPiloto<T extends { data: string; visitas?: number | null }>(pontos: T[], serie: { data?: unknown; visitas?: unknown }[] | null | undefined, ativo: boolean) {
  if (!ativo) return { pontos, dias: 0 };
  const map = new Map<string, number>();
  for (const r of serie ?? []) {
    const data = String(r.data ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || typeof r.visitas !== "number" || !Number.isFinite(r.visitas) || r.visitas < 0) continue;
    map.set(data, r.visitas);
  }
  const semMedicao = pontos.every(p => p.visitas == null || p.visitas === 0);
  let dias = 0;
  const out = pontos.map(p => {
    const vazio = p.visitas == null || (semMedicao && p.visitas === 0);
    if (!vazio || !map.has(p.data)) return p;
    dias++;
    return { ...p, visitas: map.get(p.data)! };
  });
  return { pontos: out, dias };
}
export type ResultadoSinergia = ReturnType<typeof calcularSinergiaPublicidade>;

const valido = (v: number | null): v is number => v != null && Number.isFinite(v) && v >= 0;
const razao = (a: number | null, b: number | null) => valido(a) && valido(b) && b > 0 ? a / b : null;

export function pearsonPareado(pares: [number | null | undefined, number | null | undefined][]) {
  const ps = pares.filter((p): p is [number, number] => p[0] != null && p[1] != null && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (ps.length < 7) return null;
  const mx = ps.reduce((s, p) => s + p[0], 0) / ps.length;
  const my = ps.reduce((s, p) => s + p[1], 0) / ps.length;
  let xy = 0, xx = 0, yy = 0;
  for (const [a, b] of ps) { const x = a - mx, y = b - my; xy += x * y; xx += x * x; yy += y * y; }
  return xx > 0 && yy > 0 ? Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))) : null;
}

/** Same-date observations only. Attribution is exposure, never incremental or causal sales. */
export function calcularSinergiaPublicidade(pontos: PontoPublicidade[]) {
  const pares = pontos.filter(p => valido(p.investimento) && valido(p.faturamento));
  const soma = (campo: "investimento" | "faturamento" | "receitaAds") =>
    pontos.length && pontos.every(p => valido(p[campo])) ? pontos.reduce((s, p) => s + (p[campo] ?? 0), 0) : null;
  const investimento = soma("investimento"), faturamento = soma("faturamento"), receitaAds = soma("receitaAds");
  const participacaoBruta = razao(receitaAds, faturamento);
  // Different attribution windows can exceed total paid sales: don't fabricate an organic complement.
  const participacao = participacaoBruta != null && participacaoBruta <= 1 ? participacaoBruta : null;
  let correlacao: number | null = null;
  if (pares.length >= 7) {
    const mx = pares.reduce((s, p) => s + (p.investimento ?? 0), 0) / pares.length;
    const my = pares.reduce((s, p) => s + (p.faturamento ?? 0), 0) / pares.length;
    let xy = 0, xx = 0, yy = 0;
    for (const p of pares) {
      const x = (p.investimento ?? 0) - mx, y = (p.faturamento ?? 0) - my;
      xy += x * y; xx += x * x; yy += y * y;
    }
    if (xx > 0 && yy > 0) correlacao = Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy)));
  }
  return { investimento, faturamento, receitaAds, participacao, tacos: razao(investimento, faturamento), correlacao, observacoes: pares.length,
    atribuicaoIncompativel: participacaoBruta != null && participacaoBruta > 1 };
}