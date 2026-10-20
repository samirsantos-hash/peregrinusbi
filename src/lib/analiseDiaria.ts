export interface DiaAnalise {
  date: string;
  revenue: number;
  adsInvestment?: number;
  visits?: number;
  tsi?: number;
}
const DIA = 86400000;
const valor = (n: number | undefined) => Number.isFinite(n) ? Number(n) : 0;
function timestamp(date: string) {
  const d = date.slice(0, 10);
  const t = Date.parse(`${d}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d ? t : null;
}

/** Somente linhas diárias. Zero observado é venda zero; data ausente continua null. */
export function analiseDiaria(rows: DiaAnalise[], from?: string, to?: string) {
  const mapa = new Map<string, Required<DiaAnalise>>();
  for (const r of rows) {
    if (timestamp(r.date) === null) continue;
    const date = r.date.slice(0, 10);
    const d = mapa.get(date) ?? { date, revenue: 0, adsInvestment: 0, visits: 0, tsi: 0 };
    d.revenue += valor(r.revenue); d.adsInvestment += valor(r.adsInvestment);
    d.visits += valor(r.visits); d.tsi += valor(r.tsi);
    mapa.set(date, d);
  }
  const dates = [...mapa.keys()].sort();
  const inicio = timestamp(from ?? dates[0] ?? "");
  const fim = timestamp(to ?? dates[dates.length - 1] ?? "");
  if (inicio === null || fim === null || fim < inicio || fim - inicio > DIA * 36600) return null;
  const serie: { date: string; revenue: number | null; adsInvestment: number | null }[] = [];
  const semana = Array.from({ length: 7 }, (_, dia) => ({ dia, ocorrencias: 0, visitas: 0, unidades: 0, faturamento: 0 }));
  const observados: Required<DiaAnalise>[] = [];
  for (let t = inicio; t <= fim; t += DIA) {
    const date = new Date(t).toISOString().slice(0, 10);
    const d = mapa.get(date);
    serie.push({ date, revenue: d?.revenue ?? null, adsInvestment: d?.adsInvestment ?? null });
    if (!d) continue;
    observados.push(d);
    const s = semana[new Date(t).getUTCDay()];
    s.ocorrencias++; s.visitas += d.visits; s.unidades += d.tsi; s.faturamento += d.revenue;
  }
  const total = observados.reduce((s, d) => s + d.revenue, 0);
  const sorted = observados.map((d) => d.revenue).sort((a, b) => a - b);
  const meio = Math.floor(sorted.length / 2);
  const mediana = sorted.length ? sorted.length % 2 ? sorted[meio] : (sorted[meio - 1] + sorted[meio]) / 2 : null;
  const recorde = observados.reduce<Required<DiaAnalise> | null>((best, d) => !best || d.revenue > best.revenue ? d : best, null);
  return {
    serie, dias: serie.length, diasComDado: observados.length, total,
    media: observados.length ? total / serie.length : null, mediana, recorde,
    visitas: observados.reduce((s, d) => s + d.visits, 0),
    unidades: observados.reduce((s, d) => s + d.tsi, 0),
    leituraSemanal: semana.every((s) => s.ocorrencias >= 4),
    semana: semana.map((s) => ({ ...s,
      visitasMedia: s.ocorrencias ? s.visitas / s.ocorrencias : null,
      unidadesMedia: s.ocorrencias ? s.unidades / s.ocorrencias : null,
      conversao: s.visitas > 0 ? s.unidades / s.visitas * 100 : null,
    })),
  };
}

/** Apenas o requisito de investimento; não atribui o tier completo do seller. */
export function faixaInvestimento(share: number | null) {
  if (share === null || !Number.isFinite(share) || share < 0) return null;
  const tier = share >= 2.5 ? 1 : share >= 1.25 ? 2 : share >= 0.5 ? 3 : null;
  const proximo = share < 0.5 ? 0.5 : share < 1.25 ? 1.25 : share < 2.5 ? 2.5 : share < 3 ? 3 : null;
  return { tier, alerta: share < 0.5, metaPeregrinus: share >= 3, proximo, distancia: proximo === null ? 0 : proximo - share };
}

export function investimento30d(rows: DiaAnalise[]) {
  const datas = rows.filter((r) => timestamp(r.date) !== null).map((r) => r.date.slice(0, 10)).sort();
  const fim = timestamp(datas[datas.length - 1] ?? "");
  if (fim === null) return null;
  const from = new Date(fim - 29 * DIA).toISOString().slice(0, 10);
  const a = analiseDiaria(rows, from, new Date(fim).toISOString().slice(0, 10));
  if (!a || a.total <= 0) return null;
  const investimento = a.serie.reduce((s, d) => s + (d.adsInvestment ?? 0), 0);
  return { faturamento: a.total, investimento, share: investimento / a.total * 100, diasComDado: a.diasComDado, from, to: datas[datas.length - 1] };
}