import type { ContribuicaoCrescimento } from "./decomposicao";
import { inclinacaoLog, type SerieMensal } from "./forecast";

export type ClassificacaoSust =
  | "Saudável"
  | "Eficiência operacional"
  | "Dependente de tráfego"
  | "Conversão em queda"
  | "Artificial / ads-driven"
  | "Risco de retração"
  | "Escalabilidade positiva";

export type SustResultado = {
  classificacao: ClassificacaoSust;
  cor: string;
  frase: string;
};

export type EntradaSust = {
  receita: SerieMensal;
  visitas: SerieMensal;
  cr: SerieMensal; // pp
  aov: SerieMensal;
  invAds: SerieMensal;
  decomp: ContribuicaoCrescimento;
};

function pctChange(s: SerieMensal, lastN = 3): number {
  const data = s.filter((p) => p.valor != null) as { mes: string; valor: number }[];
  if (data.length < lastN + 1) return 0;
  const cur = data[data.length - 1].valor;
  const prev = data[data.length - 1 - lastN].valor;
  if (prev === 0) return 0;
  return ((cur - prev) / prev) * 100;
}

function ppChange(s: SerieMensal, lastN = 3): number {
  const data = s.filter((p) => p.valor != null) as { mes: string; valor: number }[];
  if (data.length < lastN + 1) return 0;
  return data[data.length - 1].valor - data[data.length - 1 - lastN].valor;
}

const COR = {
  green: "hsl(142 70% 45%)",
  greenSoft: "hsl(142 55% 55%)",
  blue: "hsl(210 80% 55%)",
  amber: "hsl(28 90% 55%)",
  red: "hsl(0 75% 55%)",
  gray: "hsl(220 10% 60%)",
};

export function classificarCrescimento(e: EntradaSust): SustResultado {
  const dV = pctChange(e.visitas);
  const dCpp = ppChange(e.cr);
  const dA = pctChange(e.aov);
  const dR = pctChange(e.receita);
  const dAds = pctChange(e.invAds);
  const slope = inclinacaoLog(e.receita, 6);

  // Risco de retração — receita em queda forte ou tendência muito negativa
  if (dR <= -15 || slope <= -0.05) {
    return { classificacao: "Risco de retração", cor: COR.red, frase: `Receita ${dR.toFixed(0)}% em 3m e tendência 6m de ${(slope * 100).toFixed(1)}%/mês. Drivers em deterioração.` };
  }

  // Artificial / ads-driven
  if (dAds > 30 && dR <= dAds) {
    return { classificacao: "Artificial / ads-driven", cor: COR.red, frase: `Investimento em PADS cresceu ${dAds.toFixed(0)}% mas a receita só ${dR.toFixed(0)}%. Crescimento dependente de ads — alerta CAC/LTV.` };
  }

  // Conversão em queda
  if (dCpp <= -5) {
    return { classificacao: "Conversão em queda", cor: COR.amber, frase: `Conversão caiu ${Math.abs(dCpp).toFixed(1)}pp em 3 meses. Piora estrutural independente do tráfego.` };
  }

  // Dependente de tráfego
  if (dV > 10 && dCpp <= -2) {
    return { classificacao: "Dependente de tráfego", cor: COR.amber, frase: `Visitas +${dV.toFixed(0)}% mas conversão ${dCpp.toFixed(1)}pp. Crescimento só por mais audiência.` };
  }

  // Escalabilidade positiva
  const cacAtual = e.invAds[e.invAds.length - 1]?.valor ?? 0;
  const cacPrev = e.invAds[Math.max(0, e.invAds.length - 4)]?.valor ?? 0;
  if (dR > 25 && cacAtual > 0 && cacPrev > 0 && dAds < dR) {
    return { classificacao: "Escalabilidade positiva", cor: COR.green, frase: `Receita +${dR.toFixed(0)}% com custo de ads crescendo menos (+${dAds.toFixed(0)}%). Alavancagem operando.` };
  }

  // Eficiência operacional
  if (Math.abs(dV) < 5 && dCpp > 2) {
    return { classificacao: "Eficiência operacional", cor: COR.greenSoft, frase: `Conversão +${dCpp.toFixed(1)}pp sem precisar de mais tráfego. Otimização interna.` };
  }

  // Saudável
  if (dV > 0 && dCpp > 0 && dA >= 0) {
    return { classificacao: "Saudável", cor: COR.green, frase: `Visitas, conversão e ticket médio crescendo juntos. Trajetória equilibrada.` };
  }

  // Fallback: usa o sinal da receita para evitar "Saudável" indevido
  if (dR < -3) {
    return { classificacao: "Conversão em queda", cor: COR.amber, frase: `Receita ${dR.toFixed(1)}% em 3m. Drivers misturados — investigar visitas (${dV.toFixed(0)}%), CR (${dCpp.toFixed(1)}pp) e AOV (${dA.toFixed(1)}%).` };
  }
  return { classificacao: "Saudável", cor: COR.gray, frase: `Crescimento estável (${dR >= 0 ? "+" : ""}${dR.toFixed(1)}% em 3m) sem sinais fortes de alerta nos drivers.` };
}