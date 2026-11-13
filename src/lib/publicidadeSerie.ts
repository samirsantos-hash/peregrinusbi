import type { PontoPublicidade } from './sinergiaPublicidade';

/** Aggregate measured dates only; missing observations invalidate their group, never become zeros. */
export function agruparPublicidade(pontos: PontoPublicidade[], semanal: boolean) {
  const grupos = new Map<string, PontoPublicidade[]>();
  for (const p of pontos) {
    const dia = new Date(`${p.data}T12:00:00Z`);
    if (semanal) dia.setUTCDate(dia.getUTCDate() - (dia.getUTCDay() + 6) % 7);
    const data = semanal ? dia.toISOString().slice(0, 10) : p.data;
    grupos.set(data, [...(grupos.get(data) ?? []), p]);
  }
  return [...grupos].sort(([a], [b]) => a.localeCompare(b)).map(([data, ps]) => {
    const soma = (campo: 'faturamento' | 'investimento' | 'receitaAds') => ps.every(p => p[campo] != null && Number.isFinite(p[campo]) && (p[campo] ?? -1) >= 0)
      ? ps.reduce((s, p) => s + (p[campo] ?? 0), 0) : null;
    const faturamento = soma('faturamento'), investimento = soma('investimento'), receitaAds = soma('receitaAds');
    return { data, faturamento, investimento, receitaAds,
      roas: investimento != null && investimento > 0 && receitaAds != null ? receitaAds / investimento : null,
      acos: investimento != null && receitaAds != null && receitaAds > 0 ? investimento / receitaAds : null,
      tacos: investimento != null && faturamento != null && faturamento > 0 ? investimento / faturamento : null };
  });
}