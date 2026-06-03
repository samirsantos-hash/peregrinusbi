import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { gerarInsights, type InsightPreco, type DadosMes } from "@/lib/queries/insightsPrecificacao";

const TIPO_CFG: Record<
  InsightPreco["tipo"],
  { cor: string; bg: string; borda: string; icone: string; label: string }
> = {
  alerta:       { cor: "#DC2626", bg: "rgba(220,38,38,0.06)",  borda: "rgba(220,38,38,0.35)",  icone: "🚨", label: "Alerta" },
  investigar:   { cor: "#D97706", bg: "rgba(217,119,6,0.06)",  borda: "rgba(217,119,6,0.35)",  icone: "🔍", label: "Investigar" },
  oportunidade: { cor: "#22D3EE", bg: "rgba(34,211,238,0.06)", borda: "rgba(34,211,238,0.35)", icone: "💡", label: "Oportunidade" },
  tendencia:    { cor: "#16A34A", bg: "rgba(22,163,74,0.06)",  borda: "rgba(22,163,74,0.35)",  icone: "📈", label: "Tendência" },
};

function InsightCard({ insight, defaultAberto = false }: { insight: InsightPreco; defaultAberto?: boolean }) {
  const [aberto, setAberto] = useState(defaultAberto);
  const cfg = TIPO_CFG[insight.tipo];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: cfg.borda, backgroundColor: cfg.bg }}
    >
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-2xl leading-none">{cfg.icone}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="status-badge text-[10px] uppercase tracking-wide"
              style={{ color: cfg.cor, borderColor: cfg.borda, backgroundColor: cfg.bg }}
            >
              {cfg.label}
            </span>
            {insight.periodo && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {new Date(insight.periodo + "T12:00").toLocaleDateString("pt-BR", {
                  month: "short",
                  year: "2-digit",
                })}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">{insight.titulo}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <p className="text-lg font-bold font-mono tabular-nums" style={{ color: cfg.cor }}>
            {insight.metrica}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {aberto ? "▲ fechar" : "▼ ver análise"}
          </span>
        </div>
      </button>

      {aberto && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t" style={{ borderColor: cfg.borda }}>
          <Section title="📊 O que foi identificado" text={insight.identificado} />
          <Section title="🤖 Por que isso importa para o algoritmo" text={insight.porque} />
          <Section title="🔍 O que investigar / hipótese de causa" text={insight.investigar} />
          <div
            className="rounded-lg p-3 border"
            style={{ borderColor: cfg.borda, backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: cfg.cor }}>
              💡 Sugestão de ação
            </p>
            <p className="text-xs text-foreground leading-relaxed">{insight.sugestao}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-foreground/90 leading-relaxed">{text}</p>
    </div>
  );
}

export interface InsightsPrecificacaoPanelProps {
  historico: DadosMes[];
  dadosAtual: DadosMes | null;
  priceScore?: number | null;
  temCDP?: boolean;
  pctOptinCDP?: number;
  isMercadoLider?: boolean;
}

export function InsightsPrecificacaoPanel({
  historico,
  dadosAtual,
  priceScore = null,
  temCDP = false,
  pctOptinCDP = 0,
  isMercadoLider = false,
}: InsightsPrecificacaoPanelProps) {
  const insights = useMemo(() => {
    if (!dadosAtual) return [];
    return gerarInsights(historico, dadosAtual, priceScore, temCDP, pctOptinCDP, isMercadoLider);
  }, [historico, dadosAtual, priceScore, temCDP, pctOptinCDP, isMercadoLider]);

  const nAlertas = insights.filter((i) => i.tipo === "alerta").length;
  const nInvestigar = insights.filter((i) => i.tipo === "investigar").length;
  const nOportunidades = insights.filter((i) => i.tipo === "oportunidade").length;
  const nTendencias = insights.filter((i) => i.tipo === "tendencia").length;

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Insights e Sugestões de Investigação
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Gerados automaticamente a partir da evolução histórica de competitividade de preço
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {nAlertas > 0 && (
            <span className="status-badge text-[11px]" style={{ color: TIPO_CFG.alerta.cor, borderColor: TIPO_CFG.alerta.borda, backgroundColor: TIPO_CFG.alerta.bg }}>
              🚨 {nAlertas} alerta{nAlertas > 1 ? "s" : ""}
            </span>
          )}
          {nInvestigar > 0 && (
            <span className="status-badge text-[11px]" style={{ color: TIPO_CFG.investigar.cor, borderColor: TIPO_CFG.investigar.borda, backgroundColor: TIPO_CFG.investigar.bg }}>
              🔍 {nInvestigar} a investigar
            </span>
          )}
          {nOportunidades > 0 && (
            <span className="status-badge text-[11px]" style={{ color: TIPO_CFG.oportunidade.cor, borderColor: TIPO_CFG.oportunidade.borda, backgroundColor: TIPO_CFG.oportunidade.bg }}>
              💡 {nOportunidades} oportunidade{nOportunidades > 1 ? "s" : ""}
            </span>
          )}
          {nTendencias > 0 && (
            <span className="status-badge text-[11px]" style={{ color: TIPO_CFG.tendencia.cor, borderColor: TIPO_CFG.tendencia.borda, backgroundColor: TIPO_CFG.tendencia.bg }}>
              📈 {nTendencias} tendência{nTendencias > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {(!dadosAtual || historico.length < 2) && (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
          <p className="text-sm text-foreground/80 mb-1">
            Histórico insuficiente para gerar insights.
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Requer pelo menos 2 meses de dados de competitividade de preço (visits_match,
            visits_cheaper e visits_expensive).
          </p>
        </div>
      )}

      {insights.length === 0 && dadosAtual && historico.length >= 2 && (
        <div className="rounded-xl border border-emerald/30 bg-emerald/5 p-6 text-center">
          <p className="text-sm font-medium text-emerald mb-1">
            ✅ Nenhum ponto crítico identificado na análise de preços.
          </p>
          <p className="text-[11px] text-muted-foreground">
            A competitividade está saudável e dentro dos limites algorítmicos do ML.
          </p>
        </div>
      )}

      {insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <InsightCard key={insight.id} insight={insight} defaultAberto={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

export default InsightsPrecificacaoPanel;