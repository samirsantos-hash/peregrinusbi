/** Meta de investimento em publicidade: 3% do faturamento bruto dos últimos 30 dias. */
export const META_INVEST_ADS = 0.03;

interface Dia { date?: string; gmv?: number; adsInvestment?: number; tgmvFull?: number }

/** Soma os últimos 30 dias (a partir da data mais recente da base). */
export function scoresServicos30d(dias: Dia[]) {
  const datas = dias.map((d) => String(d.date ?? "").slice(0, 10)).filter(Boolean).sort();
  if (!datas.length) return null;
  const fim = new Date(datas[datas.length - 1] + "T00:00:00");
  const ini = new Date(fim); ini.setDate(ini.getDate() - 29);
  const iniStr = ini.toISOString().slice(0, 10);
  let gmv = 0, inv = 0, full = 0;
  for (const d of dias) {
    const dt = String(d.date ?? "").slice(0, 10);
    if (!dt || dt < iniStr) continue;
    gmv += Number(d.gmv) || 0; inv += Number(d.adsInvestment) || 0; full += Number(d.tgmvFull) || 0;
  }
  if (gmv <= 0) return null;
  const pctInvest = inv / gmv;
  const pctFull = full / gmv;
  return {
    gmv, inv, pctInvest, pctFull,
    /** 100 pts quando o investimento atinge 3% do faturamento */
    scorePads: Math.round(Math.min(100, (pctInvest / META_INVEST_ADS) * 100)),
  };
}
