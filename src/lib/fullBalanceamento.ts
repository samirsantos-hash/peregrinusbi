import { solveQP } from 'quadprog';
import { LIMITES } from '../../supabase/functions/_shared/mlMelhorias';
export type FullProduto = { id: string; titulo: string; sku: string | null; link: string; foto: string | null; estoque: number | null; status: string; saude: number | null; qualidade: { score: number | null; pendencias: { titulo: string }[] } | null; fotos: { largura: number | null; altura: number | null }[]; unidades: number; faturamento: number; diario: { data: string; faturamento: number }[] };
export function alertasFull(p: FullProduto) {
  const alertas: string[] = [];
  if (p.status !== 'active') alertas.push('Anúncio não está ativo');
  if (p.estoque === 0) alertas.push('Sem estoque disponível');
  if (p.saude != null && p.saude < .7) alertas.push('Saúde do anúncio abaixo de 70/100');
  for (const pendencia of p.qualidade?.pendencias ?? []) alertas.push(pendencia.titulo);
  if (!p.fotos.length) alertas.push('Anúncio sem fotos');
  const baixa = p.fotos.filter(f => f.largura != null && f.altura != null && Math.min(f.largura, f.altura) < LIMITES.fotoMinima).length;
  const melhorar = p.fotos.filter(f => f.largura != null && f.altura != null && Math.min(f.largura, f.altura) >= LIMITES.fotoMinima && Math.min(f.largura, f.altura) < LIMITES.fotoRecomendada).length;
  if (baixa) alertas.push(`${baixa} foto(s) abaixo de ${LIMITES.fotoMinima} px no menor lado`);
  if (melhorar) alertas.push(`${melhorar} foto(s) abaixo dos ${LIMITES.fotoRecomendada} px recomendados`);
  return alertas;
}
/** Mean-variance adaptation to revenue demand (not profit or investment returns). */
export function balancearFull(produtos: FullProduto[], aversao = 5) {
  const validos = produtos.filter(p => p.status === 'active' && p.estoque != null && p.estoque > 0 && p.faturamento > 0 && p.diario.length === 30 && p.diario.every(d => Number.isFinite(d.faturamento) && d.faturamento >= 0));
  const datas = validos[0]?.diario.map(d => d.data) ?? [];
  if (validos.length < 2 || validos.some(p => p.diario.some((d, i) => d.data !== datas[i]))) return null;
  const scale = Math.max(...validos.map(p => p.faturamento / 30));
  const series = validos.map(p => p.diario.map(d => d.faturamento / scale));
  const mu = series.map(s => s.reduce((a, b) => a + b, 0) / 30), n = validos.length;
  const covariance = series.map((a, i) => series.map((b, j) => a.reduce((s, v, t) => s + (v - mu[i]) * (b[t] - mu[j]), 0) / 29));
  const cap = Math.max(.4, 1 / n);
  const D: number[][] = [[]], A: number[][] = [[]], v = [0], b = [0, 1];
  for (let j = 0; j < n; j++) b.push(0);
  for (let j = 0; j < n; j++) b.push(-cap);
  for (let i = 0; i < n; i++) {
    D.push([0, ...covariance[i].map((c, j) => 2 * Math.max(1, Math.min(10, aversao)) * (c + (i === j ? 1e-6 : 0)))]);
    v.push(mu[i]);
    A.push([0, 1, ...validos.map((_, j) => i === j ? 1 : 0), ...validos.map((_, j) => i === j ? -1 : 0)]);
  }
  try {
    const r = solveQP(D, v, A, b, 1);
    if (r.message || !r.solution) return null;
    const pesos = r.solution.slice(1);
    if (pesos.length !== n || pesos.some(w => !Number.isFinite(w) || w < -1e-6 || w > cap + 1e-6) || Math.abs(pesos.reduce((s, w) => s + w, 0) - 1) > 1e-5) return null;
    return validos.map((p, i) => ({ ...p, peso: Math.max(0, pesos[i]), volatilidade: Math.sqrt(covariance[i][i]) * scale, demandaDia: p.unidades / 30, cobertura: p.unidades > 0 ? (p.estoque ?? 0) / (p.unidades / 30) : null, alertas: alertasFull(p) })).sort((a, b) => b.peso - a.peso);
  } catch { return null; }
}