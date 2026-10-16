import { LIMIARES } from "@/config/limiaresCarteira";

export interface DiaCdp { date: string; tgmv: number; cdpTgmv: number }
export interface PontoCdp {
  date: string;
  participacao: number | null;
  pontuacao: number | null;
  faturamento: number;
  cdp: number;
  dias: number;
  inconsistente: boolean;
}
export const JANELA_CDP = 30;
export const META_CDP = LIMIARES.promocao.min * 100;
const DIA = 86400000;

/** Participação financeira ponderada; score de atingimento, não nota oficial do ML. */
export function evolucaoCdp(rows: DiaCdp[], meta = META_CDP): PontoCdp[] {
  if (!Number.isFinite(meta) || meta <= 0) throw new Error("A meta deve ser maior que zero.");
  const mapa = new Map<string, { faturamento: number; cdp: number }>();
  for (const row of rows) {
    const date = row.date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`))) continue;
    if (!Number.isFinite(row.tgmv) || !Number.isFinite(row.cdpTgmv) || row.tgmv < 0 || row.cdpTgmv < 0) continue;
    const dia = mapa.get(date) ?? { faturamento: 0, cdp: 0 };
    dia.faturamento += row.tgmv;
    dia.cdp += row.cdpTgmv;
    mapa.set(date, dia);
  }
  const datas = [...mapa.keys()].sort();
  if (!datas.length) return [];
  const inicio = Date.parse(`${datas[0]}T00:00:00Z`);
  const fim = Date.parse(`${datas[datas.length - 1]}T00:00:00Z`);
  const pontos: PontoCdp[] = [];
  for (let t = inicio; t <= fim; t += DIA) {
    const date = new Date(t).toISOString().slice(0, 10);
    let faturamento = 0, cdp = 0, dias = 0;
    for (let offset = 0; offset < JANELA_CDP; offset++) {
      const d = mapa.get(new Date(t - offset * DIA).toISOString().slice(0, 10));
      if (d) { faturamento += d.faturamento; cdp += d.cdp; dias++; }
    }
    const inconsistente = cdp > faturamento;
    const participacao = mapa.has(date) && faturamento > 0 && !inconsistente ? cdp / faturamento * 100 : null;
    pontos.push({ date, faturamento, cdp, dias, inconsistente, participacao,
      pontuacao: participacao === null ? null : Math.min(100, participacao / meta * 100) });
  }
  return pontos;
}