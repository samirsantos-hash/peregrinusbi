// src/lib/verticalStatus.ts
// Delta-based status helpers for "Efetividade vs Categoria".
// delta = (seller / mediana - 1) * 100. 0% = exatamente na mediana.

export type Sentido = "maior_melhor" | "menor_melhor";

export type StatusDelta = {
  label: string;
  cor: string;
  bg: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  interpretacao: string;
  acaoSugerida: string;
};

function fmtDelta(delta: number): string {
  const abs = Math.abs(delta);
  if (abs < 1) return "exatamente na mediana";
  return delta > 0 ? `${abs.toFixed(0)}% acima da mediana` : `${abs.toFixed(0)}% abaixo da mediana`;
}

export function statusPorDelta(delta: number): StatusDelta {
  if (delta >= 50) return {
    label: "Líder de Categoria",
    cor: "#16A34A", bg: "#F0FDF4",
    borderClass: "border-emerald/30", textClass: "text-emerald", bgClass: "bg-emerald/5",
    interpretacao: `O seller está ${fmtDelta(delta)} — liderança consolidada na categoria.`,
    acaoSugerida: "Proteger a posição. Testar otimização de margem com cautela: subir preço 3–5% nos SKUs menos elásticos e monitorar conversão por 14 dias antes de escalar.",
  };
  if (delta >= 30) return {
    label: "Performance Excedente",
    cor: "#22C55E", bg: "#F0FDF4",
    borderClass: "border-emerald/30", textClass: "text-emerald", bgClass: "bg-emerald/5",
    interpretacao: `O seller está ${fmtDelta(delta)} — vantagem competitiva real na categoria.`,
    acaoSugerida: "Momento de escalar: aumentar verba de Ads nos SKUs campeões e ampliar catálogo. Não reduzir descontos ainda — a vantagem pode ser frágil.",
  };
  if (delta >= 10) return {
    label: "Acima da Média",
    cor: "#65A30D", bg: "#F7FEE7",
    borderClass: "border-lime-500/30", textClass: "text-lime-500", bgClass: "bg-lime-500/5",
    interpretacao: `O seller está ${fmtDelta(delta)} — levemente à frente, sem vantagem estrutural. Um único competidor melhorando pode reverter.`,
    acaoSugerida: "Consolidar: identificar qual dimensão está puxando o índice para baixo e reforçá-la. Não é momento de relaxar descontos ou reduzir CDP.",
  };
  if (delta >= -10) return {
    label: "Na Média da Categoria",
    cor: "#D97706", bg: "#FFFBEB",
    borderClass: "border-warning/30", textClass: "text-warning", bgClass: "bg-warning/5",
    interpretacao: `O seller está ${fmtDelta(delta)} — empate técnico com os pares diretos.`,
    acaoSugerida: "Identificar a dimensão mais fraca e focar nela. GMV médio com Full baixo? Migrar para Full antes de escalar Ads.",
  };
  if (delta >= -30) return {
    label: "Gap de Vendas",
    cor: "#EA580C", bg: "#FFF7ED",
    borderClass: "border-orange-500/30", textClass: "text-orange-500", bgClass: "bg-orange-500/5",
    interpretacao: `O seller está ${fmtDelta(delta)} — desvantagem em relação aos concorrentes diretos.`,
    acaoSugerida: "Diagnóstico urgente: verificar as 2 dimensões com maior gap negativo e atacá-las antes de qualquer outra ação.",
  };
  return {
    label: "Potencial de Recuperação",
    cor: "#DC2626", bg: "#FEF2F2",
    borderClass: "border-destructive/30", textClass: "text-destructive", bgClass: "bg-destructive/5",
    interpretacao: `O seller está ${fmtDelta(delta)} — desempenho significativamente abaixo da categoria.`,
    acaoSugerida: "Ação urgente: revisar reputação, Full%, IPI e CDP em sequência. Ads ineficientes até corrigir o orgânico.",
  };
}

export function corPorDelta(delta: number): string {
  if (delta >= 30)  return "#16A34A";
  if (delta >= 10)  return "#65A30D";
  if (delta >= -10) return "#D97706";
  if (delta >= -30) return "#EA580C";
  return "#DC2626";
}

export function labelPorDelta(delta: number): string {
  const abs = Math.abs(delta);
  if (abs < 2) return "≈ na mediana";
  return delta >= 0 ? `+${abs.toFixed(0)}% acima` : `−${abs.toFixed(0)}% abaixo`;
}

// Converte índice (seller/mediana*100) em delta normalizado pelo sentido.
// Para "menor_melhor", inverte o sinal — assim "menos é melhor" vira delta positivo.
export function indiceParaDelta(indice: number, sentido: Sentido): number {
  const raw = indice - 100;
  return sentido === "menor_melhor" ? -raw : raw;
}