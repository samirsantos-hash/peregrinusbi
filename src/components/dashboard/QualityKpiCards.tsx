import { motion } from "framer-motion";
import { Shield, Barcode, Sparkles, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlgoTooltip } from "@/components/ui/AlgoTooltip";
import type { TOOLTIPS } from "@/lib/algoTooltips";
import { scoresServicos30d } from "@/lib/scoresServicos30d";
import { LIMIARES } from "@/config/limiaresCarteira";

interface QualityKpiCardsProps {
  scoreCaracteristica: number;
  pontuacaoLlGtin: number;
  scoreOfertaFinal: number;
  totalLiveListings: number;
  scoreFull?: number;
  scorePads?: number;
  scoreCdp?: number;
  pontuacaoIpi?: number;
  diasRecentes?: any[];
  pctFullPeriodo?: number;
  semDado?: { atributos?: boolean; gtin?: boolean; oferta?: boolean };
}

/* ── Benchmarks da carteira (mediana Mar/2026) ── */
/* ERRO 3: SCORE_FINAL_FULL benchmark uses only sellers WITH full active (46.8) */
const SCORE_REFS: Record<string, number> = {
  SCORE_FINAL_FULL: 46.8,  // Mediana dos 136 sellers com Full ativo (não 20.7 que inclui zeros)
  SCORE_FINAL_CDP: 36.1,
  SCORE_FINAL_PADS: 45.3,
  PONTUACAO_IPI: 56.4,
};

const DISTRIBUTION: Record<string, { critico: number; dev: number; saudavel: number }> = {
  SCORE_FINAL_FULL: { critico: 25, dev: 40, saudavel: 35 },  // Distribution only among sellers WITH full
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
  if (score <= 33) return { label: "Crítico", color: "hsl(var(--crit))", bgClass: "bg-[hsl(var(--crit))]", textClass: "text-[hsl(var(--crit))]" };
  if (score <= 66) return { label: "Em desenvolvimento", color: "hsl(var(--attention-text))", bgClass: "bg-[hsl(var(--attention-text))]", textClass: "text-[hsl(var(--attention-text))]" };
  return { label: "Saudável", color: "hsl(var(--emerald))", bgClass: "bg-[hsl(var(--emerald))]", textClass: "text-[hsl(var(--emerald))]" };
}

/** Correction badge vs reference */
function CorrectionBadge({ value, refKey }: { value: number; refKey: string }) {
  const ref = SCORE_REFS[refKey];
  if (ref === undefined || value === 0) return null;
  const delta = value - ref;
  if (delta > 5) {
    return <span className="text-[10px] font-semibold text-ok ml-1">▲ +{delta.toFixed(0)} pts</span>;
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
  diasRecentes = [],
  pctFullPeriodo = 0,
  semDado = {},
}: QualityKpiCardsProps) => {
  const normalizedCaracteristica = normalizeScore(scoreCaracteristica);
  const normalizedGtin = normalizeScore(pontuacaoLlGtin);
  const normalizedOferta = normalizeScore(scoreOfertaFinal);

  // Últimos 30 dias: investimento em publicidade vs meta de 3% e vendas pelo Full
  const s30 = scoresServicos30d(diasRecentes);
  const padsFinal = s30 ? s30.scorePads : normalizeScore(scorePads);
  // Vendas pelo Full (30d; senão, % do período). Score = participação vs meta.
  const pctFull = s30 && s30.pctFull > 0 ? s30.pctFull * 100 : pctFullPeriodo;
  const scoreFullDerivado = pctFull > 0
    ? Math.round(Math.min(100, (pctFull / (LIMIARES.full.min * 100)) * 100))
    : 0;
  const hasFullActive = scoreFull > 0 || pctFull > 0;
  const normalizedFull = scoreFull > 0 ? normalizeScore(scoreFull) : scoreFullDerivado;

  const scoreCards = [
    {
      label: "Score PADS",
      value: padsFinal,
      refKey: "SCORE_FINAL_PADS",
      icon: Shield,
      noFullMessage: null as string | null,
      algoKey: "scorePads" as keyof typeof TOOLTIPS,
    },
    {
      label: "Score Full",
      value: hasFullActive ? normalizedFull : 0,
      refKey: "SCORE_FINAL_FULL",
      icon: Package,
      noFullMessage: !hasFullActive ? "Seller sem vendas pelo Full" : null,
      algoKey: "shareFullPct" as keyof typeof TOOLTIPS,
    },
    {
      label: "Score CDP",
      value: normalizeScore(scoreCdp),
      refKey: "SCORE_FINAL_CDP",
      icon: Sparkles,
      noFullMessage: null as string | null,
      algoKey: "scoreCdp" as keyof typeof TOOLTIPS,
    },
    ...(pontuacaoIpi > 0 ? [{
      label: "Pontuação IPI",
      value: normalizeScore(pontuacaoIpi),
      refKey: "PONTUACAO_IPI",
      icon: Shield,
      noFullMessage: null as string | null,
      algoKey: "ipi" as keyof typeof TOOLTIPS,
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
      semDado: semDado.atributos,
      algoKey: "pontuacaoAtributos" as keyof typeof TOOLTIPS | undefined,
    },
    {
      label: "Saúde do Código de Barras",
      sublabel: "Validação EAN/GTIN",
      value: normalizedGtin,
      icon: Barcode,
      color: "emerald" as const,
      isGauge: true,
      semDado: semDado.gtin,
      algoKey: "saudeCodigoBarras" as keyof typeof TOOLTIPS | undefined,
    },
    {
      label: "Atratividade da Oferta",
      sublabel: "Preço + Frete Grátis + Promoções",
      value: normalizedOferta,
      icon: Sparkles,
      color: "blue" as const,
      isGauge: true,
      semDado: semDado.oferta,
      algoKey: "atratividadeOferta" as keyof typeof TOOLTIPS | undefined,
    },
    {
      label: "Total de Anúncios Ativos",
      sublabel: "Itens disponíveis no catálogo",
      value: totalLiveListings,
      icon: Package,
      color: "emerald" as const,
      isGauge: false,
      algoKey: undefined,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Score cards with semaphore bars and correction badges */}
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", scoreCards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
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
                {card.algoKey && <AlgoTooltip tooltipKey={card.algoKey} />}
              </div>
              {card.noFullMessage ? (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground italic">{card.noFullMessage}</span>
                  <p className="text-[10px] text-ec-ambar">Ação: ativar itens no Mercado Envios Full</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <span className={cn("text-2xl font-bold font-mono", sem.textClass)}>{card.value}</span>
                    <span className="text-xs text-muted-foreground">pts</span>
                    <CorrectionBadge value={card.value} refKey={card.refKey} />
                  </div>
                  <SemaphoreBar score={card.value} refKey={card.refKey} />
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Main cards — mesma proporção dos cards de serviço */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {mainCards.map((card, i) => {
          const sem = card.isGauge ? getSemaphore(card.value) : null;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-4 flex flex-col gap-2 h-full"
            >
              <div className="flex items-center gap-2">
                <card.icon className="w-3.5 h-3.5 text-neon-blue" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{card.label}</span>
                {card.algoKey && <AlgoTooltip tooltipKey={card.algoKey} />}
              </div>
              <p className="text-[10px] text-muted-foreground -mt-1">{card.sublabel}</p>
              <div className="mt-auto space-y-2">
                {card.isGauge && (card as any).semDado ? (
                  <div className="space-y-1">
                    <span className="text-2xl font-bold text-muted-foreground">—</span>
                    <p className="text-[10px] text-muted-foreground italic">Sem dado enviado para esta loja</p>
                  </div>
                ) : card.isGauge && sem ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-2xl font-bold tabular-nums", sem.textClass)}>{card.value}</span>
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                    <SemaphoreBar score={card.value} />
                  </>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {totalLiveListings.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-xs text-muted-foreground">anúncios</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QualityKpiCards;
