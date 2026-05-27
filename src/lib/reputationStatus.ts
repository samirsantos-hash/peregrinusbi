export type MetricaReputacao = "reclamacoes" | "atrasos" | "cancelamentos";

export type StatusUrgencia = "ok" | "atencao" | "critico";

export type StatusReputacao = {
  cor: string; // hex (uso direto em SVG/recharts)
  bg: string;
  texto: string;
  urgencia: StatusUrgencia;
  atencao: number;
  critico: number;
};

const LIMITES: Record<MetricaReputacao, { atencao: number; critico: number }> = {
  reclamacoes: { atencao: 2, critico: 5 },
  atrasos: { atencao: 5, critico: 10 },
  cancelamentos: { atencao: 2, critico: 5 },
};

/**
 * Avalia o status de uma métrica de reputação (valor em %) considerando
 * a inclinação (slope) da série recente para definir tendência.
 */
export function statusReputacao(
  metrica: MetricaReputacao,
  valor: number,
  slope: number,
): StatusReputacao {
  const { atencao, critico } = LIMITES[metrica];
  const urgencia: StatusUrgencia =
    valor >= critico ? "critico" : valor >= atencao ? "atencao" : "ok";

  const tendencia =
    slope > 0.05
      ? " e piorando"
      : slope < -0.05
        ? " e melhorando"
        : " e estável";

  const configs: Record<StatusUrgencia, { cor: string; bg: string; texto: string }> = {
    ok: {
      cor: "#16A34A",
      bg: "rgba(22,163,74,0.08)",
      texto: `✓ Dentro do limite${tendencia}`,
    },
    atencao: {
      cor: "#D97706",
      bg: "rgba(217,119,6,0.10)",
      texto: `⚠ Atenção${tendencia} — meta máxima: ${atencao}%`,
    },
    critico: {
      cor: "#DC2626",
      bg: "rgba(220,38,38,0.10)",
      texto: `🚨 Crítico${tendencia} — risco de rebaixamento`,
    },
  };

  return { ...configs[urgencia], urgencia, atencao, critico };
}

/** Cor da linha do gráfico conforme tendência + sentido (menor é melhor). */
export function corLinhaTendencia(slope: number): string {
  if (slope > 0.05) return "#DC2626"; // piorando
  if (slope < -0.05) return "#16A34A"; // melhorando
  return "#F59E0B"; // estável
}

export function slopeUltimosN(serie: number[], n = 3): number {
  const arr = serie.slice(-n);
  if (arr.length < 2) return 0;
  const meanX = (arr.length - 1) / 2;
  const meanY = arr.reduce((a, b) => a + b, 0) / arr.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < arr.length; i++) {
    const dx = i - meanX;
    num += dx * (arr[i] - meanY);
    den += dx * dx;
  }
  return den === 0 ? 0 : num / den;
}