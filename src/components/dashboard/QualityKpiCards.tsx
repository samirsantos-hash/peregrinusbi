import { motion } from "framer-motion";
import { Shield, Barcode, Sparkles, Package } from "lucide-react";
import GaugeChart from "./GaugeChart";
import { cn } from "@/lib/utils";

interface QualityKpiCardsProps {
  scoreCaracteristica: number;
  pontuacaoLlGtin: number;
  scoreOfertaFinal: number;
  totalLiveListings: number;
  scoreFull?: number;
  scorePads?: number;
  scoreCdp?: number;
  pontuacaoIpi?: number;
}

/* ── Benchmarks da carteira (mediana Mar/2026) ── */
const SCORE_REFS: Record<string, number> = {
  SCORE_FINAL_FULL: 20.7,
  SCORE_FINAL_CDP: 36.1,
  SCORE_FINAL_PADS: 45.3,
  PONTUACAO_IPI: 56.4,
};

const DISTRIBUTION: Record<string, { critico: number; dev: number; saudavel: number }> = {
  SCORE_FINAL_FULL: { critico: 68, dev: 22, saudavel: 10 },
  SCORE_FINAL_CDP: { critico: 41, dev: 45, saudavel: 14 },
  SCORE_FINAL_PADS: { critico: 35, dev: 30, saudavel: 34 },
};

/** Normaliza e arredonda o valor para 0-100 */
function normalizeScore(value: number): number {
  const num = Number(value) || 0;
  if (num > 0 && num <= 1) return Math.round(num * 100);
  return Math.min(100, Math.max(0, Math.round(num)));
}

/** Semaphore color and label */
function getSemaphore(score: number): { label: string; color: string; bgClass: string; textClass: string } {
  if (score <= 33) return { label: "Crítico", color: "#E24B4A", bgClass: "bg-[#E24B4A]", textClass: "text-[#E24B4A]" };
  if (score <= 66) return { label: "Em desenvolvimento", color: "#BA7517", bgClass: "bg-[#BA7517]", textClass: "text-[#BA7517]" };
  return { label: "Saudável", color: "#1D9E75", bgClass: "bg-[#1D9E75]", textClass: "text-[#1D9E75]" };
}

/** Correction badge vs reference */
function CorrectionBadge({ value, refKey }: { value: number; refKey: string }) {
  const ref = SCORE_REFS[refKey];
  if (ref === undefined || value === 0) return null;
  const delta = value - ref;
  if (delta > 5) {
    return <span className="text-[10px] font-semibold text-emerald-400 ml-1">▲ +{delta.toFixed(0)} pts</span>;
  }
  if (delta < -5) {
    return <span className="text-[10px] font-semibold text-destructive ml-1">▼ {delta.toFixed(0)} pts</span>;
  }
  return <span className="text-[10px] font-semibold text-muted-foreground ml-1">≈ média</span>;
}

/** Semaphore progress bar */
function SemaphoreBar({ score, refKey }: { score: number; refKey?: string }) {
  const sem = getSemaphore(score);
  const dist = refKey ? DISTRIBUTION[refKey] : null;
  return (
    <div className="w-full space-y-1">
      <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden relative">
        <motion.div
          className={`h-full rounded-full ${sem.bgClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-medium", sem.textClass)}>{sem.label}</span>
        {dist && (
          <span className="text-[9px] text-muted-foreground">
            {dist.critico}% crít. · {dist.dev}% dev · {dist.saudavel}% saud.
          </span>
        )}
      </div>
    </div>
  );
}

const QualityKpiCards = ({
  scoreCaracteristica,
  pontuacaoLlGtin,
  scoreOfertaFinal,
  totalLiveListings,
  scoreFull = 0,
  scorePads = 0,
  scoreCdp = 0,
  pontuacaoIpi = 0,
}: QualityKpiCardsProps) => {
  const normalizedCaracteristica = normalizeScore(scoreCaracteristica);
  const normalizedGtin = normalizeScore(pontuacaoLlGtin);
  const normalizedOferta = normalizeScore(scoreOfertaFinal);

  const scoreCards = [
    {
      label: "Score PADS",
      value: normalizeScore(scorePads),
      refKey: "SCORE_FINAL_PADS",
      icon: Shield,
    },
    {
      label: "Score Full",
      value: normalizeScore(scoreFull),
      refKey: "SCORE_FINAL_FULL",
      icon: Package,
    },
    {
      label: "Score CDP",
      value: normalizeScore(scoreCdp),
      refKey: "SCORE_FINAL_CDP",
      icon: Sparkles,
    },
    ...(pontuacaoIpi > 0 ? [{
      label: "Pontuação IPI",
      value: normalizeScore(pontuacaoIpi),
      refKey: "PONTUACAO_IPI",
      icon: Shield,
    }] : []),
  ];

  const mainCards = [
    {
      label: "Pontuação de Atributos",
      sublabel: "Ficha técnica, títulos e fotos",
      value: normalizedCaracteristica,
      icon: Shield,
      color: "blue" as const,
      isGauge: true,
    },
    {
      label: "Saúde do Código de Barras",
      sublabel: "Validação EAN/GTIN",
      value: normalizedGtin,
      icon: Barcode,
      color: "emerald" as const,
      isGauge: true,
      zeroWarning: normalizedGtin === 0,
    },
    {
      label: "Atratividade da Oferta",
      sublabel: "Preço + Frete Grátis + Promoções",
      value: normalizedOferta,
      icon: Sparkles,
      color: "blue" as const,
      isGauge: true,
    },
    {
      label: "Total de Anúncios Ativos",
      sublabel: "Itens disponíveis no catálogo",
      value: totalLiveListings,
      icon: Package,
      color: "emerald" as const,
      isGauge: false,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Score cards with semaphore bars and correction badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {scoreCards.map((card, i) => {
          const sem = getSemaphore(card.value);
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <card.icon className="w-3.5 h-3.5 text-neon-blue" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={cn("text-2xl font-bold font-mono", sem.textClass)}>{card.value}</span>
                <span className="text-xs text-muted-foreground">pts</span>
                <CorrectionBadge value={card.value} refKey={card.refKey} />
              </div>
              <SemaphoreBar score={card.value} refKey={card.refKey} />
            </motion.div>
          );
        })}
      </div>

      {/* Main gauge cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((card, i) => {
          const sem = card.isGauge ? getSemaphore(card.value) : null;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5 flex flex-col items-center text-center space-y-3"
            >
              <div className="flex items-center gap-2">
                <card.icon className="w-4 h-4 text-neon-blue" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {card.label}
                </h4>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-1">{card.sublabel}</p>

              {card.isGauge ? (
                <>
                  <GaugeChart value={card.value} label="" color={card.color} />
                  {sem && (
                    <div className="flex flex-col items-center gap-1">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sem.textClass,
                        sem.label === "Crítico" ? "bg-destructive/10" :
                        sem.label === "Em desenvolvimento" ? "bg-warning/10" : "bg-emerald/10"
                      )}>
                        {sem.label}
                      </span>
                      {(card as any).zeroWarning && (
                        <span className="text-[10px] text-muted-foreground italic">
                          Dado indisponível neste período
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center py-2">
                  <span className="text-4xl font-bold font-mono text-foreground">
                    {totalLiveListings.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">anúncios</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QualityKpiCards;
