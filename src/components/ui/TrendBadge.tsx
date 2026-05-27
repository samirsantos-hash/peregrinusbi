import { cn } from "@/lib/utils";

type TrendBadgeProps = {
  /** Série temporal — ordem cronológica (mais antigo → mais recente). */
  serie: number[];
  /** Define o que "subindo" significa em termos de negócio. */
  sentido: "maior_melhor" | "menor_melhor";
  /** pct = variação % período-a-período; pp = pontos percentuais; abs = delta absoluto. */
  formato?: "pct" | "abs" | "pp";
  casas?: number;
  className?: string;
};

/** Inclinação por regressão linear simples sobre o eixo de índices. */
function calcularSlope(serie: number[]): number {
  const n = serie.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = serie.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    num += dx * (serie[i] - meanY);
    den += dx * dx;
  }
  return den === 0 ? 0 : num / den;
}

const NEUTRO_THRESHOLD = 0.05; // variação < 5% relativa = neutra

export function TrendBadge({
  serie,
  sentido,
  formato = "pct",
  casas = 1,
  className,
}: TrendBadgeProps) {
  if (!serie || serie.length < 2) return null;

  const slope = calcularSlope(serie);
  const ultimo = serie[serie.length - 1];
  const penultimo = serie[serie.length - 2];
  const delta =
    penultimo !== 0 ? ((ultimo - penultimo) / Math.abs(penultimo)) * 100 : 0;

  const relChange = Math.abs(delta) / 100;
  let direcao: "subindo" | "neutro" | "caindo" = "neutro";
  if (relChange >= NEUTRO_THRESHOLD) {
    direcao = slope > 0 ? "subindo" : "caindo";
  }

  const positivo =
    (direcao === "subindo" && sentido === "maior_melhor") ||
    (direcao === "caindo" && sentido === "menor_melhor");
  const negativo =
    (direcao === "caindo" && sentido === "maior_melhor") ||
    (direcao === "subindo" && sentido === "menor_melhor");

  const tone = positivo
    ? "text-emerald bg-emerald/10 border-emerald/30"
    : negativo
      ? "text-destructive bg-destructive/10 border-destructive/30"
      : "text-warning bg-warning/10 border-warning/30";

  const icone = positivo ? "↑" : negativo ? "↓" : "→";
  const label = positivo ? "Melhora" : negativo ? "Piora" : "Estável";

  let valorDelta: string;
  if (formato === "abs") {
    const diff = ultimo - penultimo;
    valorDelta = `${diff > 0 ? "+" : ""}${diff.toFixed(casas)}`;
  } else if (formato === "pp") {
    const diff = ultimo - penultimo;
    valorDelta = `${diff > 0 ? "+" : ""}${diff.toFixed(casas)}pp`;
  } else {
    valorDelta = `${delta > 0 ? "+" : ""}${delta.toFixed(casas)}%`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        tone,
        className,
      )}
      title={`${label} · ${valorDelta} (slope ${slope >= 0 ? "+" : ""}${slope.toFixed(2)})`}
    >
      <span aria-hidden>{icone}</span>
      <span>{label}</span>
      <span className="font-mono">{valorDelta}</span>
    </span>
  );
}

export default TrendBadge;