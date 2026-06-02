// src/lib/verticalStatus.ts
// Calibrated thresholds + colors for "Efetividade vs Categoria".
// Used by GrowthPotentialPanel — never label a seller as "Overflow" again.

export type StatusIndex = {
  label: string;
  cor: string;
  bg: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  interpretacao: string;
  acaoSugerida: string;
};

export function statusIndexGeral(indice: number): StatusIndex {
  // ≥ 150%: liderança consolidada — único momento em que faz sentido testar margem
  if (indice >= 150) return {
    label: "Líder de Categoria",
    cor: "#16A34A",
    bg: "#F0FDF4",
    borderClass: "border-emerald/30",
    textClass: "text-emerald",
    bgClass: "bg-emerald/5",
    interpretacao: `O seller opera ${indice.toFixed(0)}% da mediana — liderança consolidada na categoria.`,
    acaoSugerida: "Proteger a posição. Testar otimização de margem com cautela: subir preço 3–5% nos SKUs menos elásticos e monitorar conversão por 14 dias antes de escalar.",
  };

  // 130–149%: vantagem real — escalar, mas não relaxar desconto
  if (indice >= 130) return {
    label: "Performance Excedente",
    cor: "#22C55E",
    bg: "#F0FDF4",
    borderClass: "border-emerald/30",
    textClass: "text-emerald",
    bgClass: "bg-emerald/5",
    interpretacao: `O seller opera ${indice.toFixed(0)}% da mediana — vantagem competitiva real na categoria.`,
    acaoSugerida: "Momento de escalar: aumentar verba de Ads nos SKUs campeões e ampliar catálogo. Não reduzir descontos ainda — a vantagem pode ser frágil.",
  };

  // 110–129%: levemente à frente — NÃO é motivo de comemoração
  if (indice >= 110) return {
    label: "Acima da Média",
    cor: "#65A30D",
    bg: "#F7FEE7",
    borderClass: "border-lime-500/30",
    textClass: "text-lime-500",
    bgClass: "bg-lime-500/5",
    interpretacao: `O seller opera ${indice.toFixed(0)}% da mediana — levemente acima, mas sem vantagem estrutural. Um único competidor melhorando pode reverter.`,
    acaoSugerida: "Consolidar: identificar qual dimensão está puxando o índice para baixo e reforçá-la. Não é momento de relaxar descontos ou reduzir CDP.",
  };

  // 90–109%: na média — sem vantagem nem desvantagem
  if (indice >= 90) return {
    label: "Na Média da Categoria",
    cor: "#D97706",
    bg: "#FFFBEB",
    borderClass: "border-warning/30",
    textClass: "text-warning",
    bgClass: "bg-warning/5",
    interpretacao: `O seller opera ${indice.toFixed(0)}% da mediana — alinhado com os pares diretos, sem diferencial.`,
    acaoSugerida: "Identificar a dimensão mais fraca e focar nela. GMV médio com Full baixo? Migrar para Full antes de escalar Ads.",
  };

  // 70–89%: abaixo dos pares
  if (indice >= 70) return {
    label: "Gap de Vendas",
    cor: "#EA580C",
    bg: "#FFF7ED",
    borderClass: "border-orange-500/30",
    textClass: "text-orange-500",
    bgClass: "bg-orange-500/5",
    interpretacao: `O seller opera ${indice.toFixed(0)}% da mediana — abaixo dos concorrentes diretos na categoria.`,
    acaoSugerida: "Diagnóstico urgente: verificar as 2 dimensões abaixo de 80% e atacá-las antes de qualquer outra ação.",
  };

  // < 70%: crítico
  return {
    label: "Potencial de Recuperação",
    cor: "#DC2626",
    bg: "#FEF2F2",
    borderClass: "border-destructive/30",
    textClass: "text-destructive",
    bgClass: "bg-destructive/5",
    interpretacao: `O seller opera ${indice.toFixed(0)}% da mediana — desempenho significativamente abaixo da categoria.`,
    acaoSugerida: "Ação urgente: revisar reputação, Full%, IPI e CDP em sequência. Ads ineficientes até corrigir o orgânico.",
  };
}

export type Sentido = "maior_melhor" | "menor_melhor";

function normalizar(indice: number, sentido: Sentido): number {
  return sentido === "menor_melhor" ? (indice <= 0 ? 0 : 200 - indice) : indice;
}

export function corDimensao(indice: number, sentido: Sentido): string {
  const idx = normalizar(indice, sentido);
  if (idx >= 130) return "#16A34A";
  if (idx >= 110) return "#65A30D";
  if (idx >=  90) return "#D97706";
  if (idx >=  70) return "#EA580C";
  return "#DC2626";
}

export function labelDimensao(indice: number, sentido: Sentido): string {
  const idx = normalizar(indice, sentido);
  if (idx >= 130) return "↑ acima";
  if (idx >= 110) return "→ levemente acima";
  if (idx >=  90) return "= na mediana";
  if (idx >=  70) return "↓ abaixo";
  return "↓↓ gap crítico";
}

// Para sort: quanto menor, mais fraca a dimensão (já normalizada).
export function forcaDimensao(indice: number, sentido: Sentido): number {
  return normalizar(indice, sentido);
}