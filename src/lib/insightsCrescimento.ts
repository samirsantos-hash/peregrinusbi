import type { SerieMensal } from "./forecast";
import type { ContribuicaoCrescimento } from "./decomposicao";
import type { SustResultado } from "./sustentabilidade";

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const fmtPp = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}pp`;

function pctChange(s: SerieMensal, lastN: number) {
  const data = s.filter((p) => p.valor != null) as { mes: string; valor: number }[];
  if (data.length < lastN + 1) return null;
  const cur = data[data.length - 1].valor;
  const prev = data[data.length - 1 - lastN].valor;
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

export function insightCrescimento(receita: SerieMensal, decomp: ContribuicaoCrescimento): string {
  const d = pctChange(receita, 3);
  if (d == null) return "Histórico curto demais para tendência confiável.";
  return `Nos últimos 3 meses a receita variou ${fmtPct(d)}, sendo ${fmtPp(decomp.visitas_pct)} de visitas, ${fmtPp(decomp.cr_pct)} de conversão e ${fmtPp(decomp.aov_pct)} de ticket médio.`;
}

export function insightConversao(cr: SerieMensal): string {
  const d6 = (() => {
    const a = cr.filter((p) => p.valor != null) as { mes: string; valor: number }[];
    if (a.length < 7) return null;
    return a[a.length - 1].valor - a[a.length - 7].valor;
  })();
  if (d6 == null) return "Conversão estável (sem janela suficiente para 6m).";
  if (Math.abs(d6) < 0.2) return `Conversão estável em ~${cr[cr.length - 1]?.valor?.toFixed(2)}% nos últimos 6 meses.`;
  return `Conversão variou ${fmtPp(d6)} em 6 meses (atual: ${cr[cr.length - 1]?.valor?.toFixed(2)}%).`;
}

export function insightSazonalidade(receita: SerieMensal): string {
  const months = receita.filter((p) => p.valor != null);
  if (months.length < 24) return "Sazonalidade ficará disponível quando tivermos 24+ meses de histórico.";
  return "Padrão sazonal calculado — veja heatmap mês × ano.";
}

export function insightSustentabilidade(s: SustResultado, decomp: ContribuicaoCrescimento): string {
  return `${s.classificacao}. ${s.frase}`;
}