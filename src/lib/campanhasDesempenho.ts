import type { EligibilityItem } from "@/hooks/useEligibility";
import { rotuloCampanha } from "@/lib/queries/campanhasCofinanciadas";

/** Queda mínima (média diária de unidades, última leitura vs anterior) para alertar. */
export const QUEDA_MINIMA = 0.2;
const ESCALA = 10; // descontos da planilha vêm ×10

export type CampanhaDesempenho = { tipo: string; rotulo: string; anuncios: number; unidadesDia: number; participacao: number };
export type AnuncioAlerta = {
  itemId: string; nome: string; link: string; campanha: string;
  atual: number; anterior: number | null; variacao: number | null;
  descontoAtual: number; descontoMelhor: number;
};

function porData(items: EligibilityItem[]) {
  const datas = [...new Set(items.map((i) => String(i.data || "").slice(0, 10)).filter(Boolean))].sort();
  return { ultima: datas[datas.length - 1], anterior: datas[datas.length - 2] };
}

function ultimoPorItem(items: EligibilityItem[], data?: string) {
  const m = new Map<string, EligibilityItem>();
  for (const it of items) {
    if (data && String(it.data || "").slice(0, 10) !== data) continue;
    const k = String(it.itemId);
    const p = m.get(k);
    if (!p || (it.discountTotal || 0) > (p.discountTotal || 0)) m.set(k, it);
  }
  return m;
}

const emCampanha = (i: EligibilityItem) => Boolean(i.campaignType) && !i.flagItemSOptin;

export function analisarCampanhas(items: EligibilityItem[]) {
  const { ultima, anterior } = porData(items);
  const atual = ultimoPorItem(items, ultima);
  const antes = anterior ? ultimoPorItem(items, anterior) : new Map<string, EligibilityItem>();

  const grupos = new Map<string, { anuncios: number; unidadesDia: number }>();
  let total = 0;
  for (const it of atual.values()) {
    const tipo = emCampanha(it) ? it.campaignType.toUpperCase() : "SEM_CAMPANHA";
    const g = grupos.get(tipo) ?? { anuncios: 0, unidadesDia: 0 };
    g.anuncios++; g.unidadesDia += it.mediaTsiDiario7d || 0; total += it.mediaTsiDiario7d || 0;
    grupos.set(tipo, g);
  }
  const campanhas: CampanhaDesempenho[] = [...grupos.entries()]
    .map(([tipo, g]) => ({ tipo, rotulo: tipo === "SEM_CAMPANHA" ? "Sem campanha" : rotuloCampanha(tipo), ...g, participacao: total > 0 ? g.unidadesDia / total : 0 }))
    .sort((a, b) => b.unidadesDia - a.unidadesDia);

  const alerta = (it: EligibilityItem): AnuncioAlerta => {
    const ant = antes.get(String(it.itemId));
    const a = it.mediaTsiDiario7d || 0;
    const b = ant ? ant.mediaTsiDiario7d || 0 : null;
    return {
      itemId: String(it.itemId), nome: it.itemName, link: it.mlbLink,
      campanha: emCampanha(it) ? rotuloCampanha(it.campaignType.toUpperCase()) : "Sem campanha",
      atual: a, anterior: b, variacao: b && b > 0 ? (a - b) / b : null,
      descontoAtual: (it.discountTotal || 0) / ESCALA, descontoMelhor: (it.discountBest || 0) / ESCALA,
    };
  };

  const quedaSemCampanha = [...atual.values()].filter((i) => !emCampanha(i)).map(alerta)
    .filter((x) => x.variacao != null && x.variacao <= -QUEDA_MINIMA)
    .sort((x, y) => (x.atual - (x.anterior ?? 0)) - (y.atual - (y.anterior ?? 0)));

  const baixaCompetitividade = [...atual.values()]
    .filter((i) => emCampanha(i) && ((i.discountBest || 0) - (i.discountTotal || 0)) / ESCALA > 0.5)
    .map(alerta)
    .sort((x, y) => (y.descontoMelhor - y.descontoAtual) - (x.descontoMelhor - x.descontoAtual));

  return { ultima, anterior, campanhas, quedaSemCampanha, baixaCompetitividade };
}
