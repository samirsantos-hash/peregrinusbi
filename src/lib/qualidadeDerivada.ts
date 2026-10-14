import { LIMIARES } from "@/config/limiaresCarteira";

interface Mes {
  date?: string;
  scoreCaracteristica?: number; scoreQualidade?: number; scoreOferta?: number; pontuacaoLlGtin?: number;
  visitsExpensive?: number; visitsMatch?: number; visitsCheaper?: number;
  cdpTgmv?: number; gmv?: number; tgmvFull?: number;
}

const norm = (v: number) => (v > 0 && v <= 1 ? v * 100 : v);
const clamp = (v: number) => Math.round(Math.max(0, Math.min(100, v)));

/** Última nota real (>0) do histórico, do mês mais recente para trás. */
function ultimaNota(hist: Mes[], campos: (keyof Mes)[]): { valor: number; date?: string } | null {
  const ord = [...hist].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  for (const m of ord) for (const c of campos) {
    const v = Number(m[c]) || 0;
    if (v > 0) return { valor: clamp(norm(v)), date: m.date };
  }
  return null;
}

/**
 * Atratividade da oferta derivada dos dados correlacionados do mês:
 * preço competitivo (visitas sem preço alto), promoção (faturamento com desconto) e Full (entrega rápida/frete),
 * cada um contra sua meta; média com pesos 50/25/25.
 */
export function atratividadeDerivada(m: Mes): number | null {
  const vis = (Number(m.visitsExpensive) || 0) + (Number(m.visitsMatch) || 0) + (Number(m.visitsCheaper) || 0);
  const gmv = Number(m.gmv) || 0;
  const partes: [number, number][] = [];
  if (vis > 0) {
    const comp = ((Number(m.visitsMatch) || 0) + (Number(m.visitsCheaper) || 0)) / vis;
    partes.push([Math.min(1, comp / LIMIARES.competitividade.min), 0.5]);
  }
  if (gmv > 0) {
    partes.push([Math.min(1, (Number(m.cdpTgmv) || 0) / gmv / LIMIARES.promo.min), 0.25]);
    partes.push([Math.min(1, (Number(m.tgmvFull) || 0) / gmv / LIMIARES.full.min), 0.25]);
  }
  if (!partes.length) return null;
  const peso = partes.reduce((s, p) => s + p[1], 0);
  return clamp((partes.reduce((s, p) => s + p[0] * p[1], 0) / peso) * 100);
}

export function qualidadeDerivada(hist: Mes[]) {
  const ord = [...hist].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const atual = ord[0] ?? {};
  const ofertaPlanilha = clamp(norm(Number(atual.scoreOferta) || 0));
  return {
    atributos: ultimaNota(hist, ["scoreCaracteristica", "scoreQualidade"]),
    gtin: ultimaNota(hist, ["pontuacaoLlGtin"]),
    oferta: ofertaPlanilha > 0 ? ofertaPlanilha : atratividadeDerivada(atual),
  };
}
