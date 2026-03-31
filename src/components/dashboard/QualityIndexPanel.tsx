import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Camera, Type, Zap, Tag, TrendingUp, ShieldAlert } from "lucide-react";
import GaugeChart from "./GaugeChart";
import TooltipInfo from "./TooltipInfo";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SellerKPI } from "@/hooks/useSellerData";
import type { SellerCampaign } from "@/hooks/useMeliCampaigns";
import { getEffectivenessBadge } from "@/hooks/useMeliCampaigns";

interface QualityIndexPanelProps {
  kpis: SellerKPI[];
  campaign?: SellerCampaign | null;
  allKpis?: SellerKPI[]; // all sellers' kpis for top-20% calc
}

function computeQualityIndex(
  latest: SellerKPI,
  campaign?: SellerCampaign | null
): { score: number; pillars: { name: string; score: number; max: number; details: string }[] } {
  // Pilar Logística (25 pts)
  const potenciaFull = latest.tsi > 0 ? (latest.pctFull || 0) : 0;
  const logScore = potenciaFull >= 70 ? 25 : Math.round((potenciaFull / 70) * 25);

  // Pilar SEO & Catálogo (25 pts)
  // Note: PONTUACAO_LL_* fields have 0% coverage — only use if > 0
  let seoScore = 25;
  const seoIssues: string[] = [];
  const hasLlData = latest.llPicturesScore > 0 || latest.llTitleScore > 0 || latest.llTechSpecsScore > 0 || latest.llDescriptionScore > 0;
  if (!hasLlData) {
    // No LL data available — use score_photo and score_title as proxy
    if (latest.scorePhoto > 0 && latest.scorePhoto < 70) { seoScore -= 7; seoIssues.push("Fotos"); }
    if (latest.scoreTitle > 0 && latest.scoreTitle < 70) { seoScore -= 7; seoIssues.push("Título"); }
  } else {
    if (latest.llPicturesScore > 0 && latest.llPicturesScore < 70) { seoScore -= 5; seoIssues.push("Fotos"); }
    if (latest.llTitleScore > 0 && latest.llTitleScore < 70) { seoScore -= 5; seoIssues.push("Título"); }
    if (latest.llTechSpecsScore > 0 && latest.llTechSpecsScore < 70) { seoScore -= 5; seoIssues.push("Ficha Técnica"); }
    if (latest.llDescriptionScore > 0 && latest.llDescriptionScore < 70) { seoScore -= 5; seoIssues.push("Descrição"); }
  }
  if (latest.pontuacaoLlGtin === 0) { seoScore -= 5; seoIssues.push("EAN/GTIN"); }
  seoScore = Math.max(0, seoScore);

  // Pilar Conversão (25 pts)
  const sellerConv = latest.visits > 0 ? (latest.tsi / latest.visits) * 100 : 0;
  const verticalConv = campaign?.taxaConversaoVertical || 0;
  const convScore = verticalConv > 0
    ? (sellerConv >= verticalConv ? 25 : Math.round((sellerConv / verticalConv) * 25))
    : (sellerConv > 1 ? 25 : Math.round(sellerConv * 25));

  // Pilar Promoções (25 pts)
  const hasPromo = latest.scoreOferta > 0 && latest.scoreOferta >= 30;
  const promoScore = hasPromo ? 25 : (latest.scoreOferta > 0 ? Math.round((latest.scoreOferta / 30) * 25) : 0);

  const total = Math.min(100, logScore + seoScore + convScore + promoScore);

  return {
    score: total,
    pillars: [
      { name: "Logística", score: logScore, max: 25, details: `Potência Full: ${potenciaFull.toFixed(1)}%` },
      { name: "SEO & Catálogo", score: seoScore, max: 25, details: seoIssues.length ? `Pendências: ${seoIssues.join(", ")}` : "Todos os critérios OK" },
      { name: "Conversão", score: convScore, max: 25, details: `Seller: ${sellerConv.toFixed(2)}% ${verticalConv > 0 ? `vs Vertical: ${verticalConv.toFixed(2)}%` : ""}` },
      { name: "Promoções", score: promoScore, max: 25, details: hasPromo ? "Campanhas ativas" : "Baixa adesão a campanhas" },
    ],
  };
}

export default function QualityIndexPanel({ kpis, campaign, allKpis }: QualityIndexPanelProps) {
  const latest = useMemo(() => {
    if (!kpis.length) return null;
    return [...kpis].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [kpis]);

  const index = useMemo(() => {
    if (!latest) return null;
    return computeQualityIndex(latest, campaign);
  }, [latest, campaign]);

  // Death trigger: top 20% visits but low conversion
  const deathTrigger = useMemo(() => {
    if (!latest || !allKpis?.length) return false;
    const allVisits = allKpis.map((k) => k.visits).filter((v) => v > 0).sort((a, b) => b - a);
    const top20Idx = Math.max(1, Math.floor(allVisits.length * 0.2));
    const threshold = allVisits[top20Idx - 1] || 0;
    if (latest.visits < threshold) return false;
    const conv = latest.visits > 0 ? (latest.tsi / latest.visits) * 100 : 0;
    const verticalConv = campaign?.taxaConversaoVertical || 0;
    return verticalConv > 0 ? conv < verticalConv * 0.5 : conv < 0.5;
  }, [latest, allKpis, campaign]);

  // Checklist actions
  const actions = useMemo(() => {
    if (!latest) return [];
    const list: { icon: React.ReactNode; label: string; severity: "critical" | "warning" | "info" }[] = [];
    if (latest.llPicturesScore > 0 && latest.llPicturesScore < 70)
      list.push({ icon: <Camera className="w-4 h-4" />, label: "Melhorar Fotos (Saúde Baixa)", severity: "critical" });
    if (latest.llTitleScore > 0 && latest.llTitleScore < 70)
      list.push({ icon: <Type className="w-4 h-4" />, label: "Ajustar Título (Score baixo)", severity: "critical" });
    if (latest.pontuacaoLlGtin === 0)
      list.push({ icon: <Tag className="w-4 h-4" />, label: "Cadastrar EAN/GTIN nos anúncios", severity: "warning" });
    const adsRatio = latest.adsInvestment > 0 && latest.tgmv > 0 ? (latest.adsInvestment / latest.tgmv) * 100 : 0;
    if (adsRatio < 1.5 && latest.tgmv > 0)
      list.push({ icon: <TrendingUp className="w-4 h-4" />, label: "Subpenetração de Ads: Aumentar para meta 3%", severity: "warning" });
    if (latest.scoreOferta < 30 && latest.pctFull > 50)
      list.push({ icon: <Zap className="w-4 h-4" />, label: "Aderir à Central de Promoções", severity: "info" });
    return list;
  }, [latest]);

  // Subaproveitamento badge
  const subAprov = useMemo(() => {
    if (!latest || !campaign) return false;
    const adsRatio = latest.tgmv > 0 ? (latest.adsInvestment / latest.tgmv) * 100 : 0;
    return campaign.efectRtaVertical > 100 && adsRatio < 1.5;
  }, [latest, campaign]);

  if (!latest || !index) {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground text-sm">
        Sem dados suficientes para calcular o Quality Index.
      </div>
    );
  }

  const gaugeColor = index.score >= 80 ? "emerald" : "blue";
  const sellerConv = latest.visits > 0 ? (latest.tsi / latest.visits) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Death trigger banner */}
      {deathTrigger && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3"
        >
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">🚨 RISCO DE PENALIZAÇÃO</p>
            <p className="text-xs text-destructive/80 mt-1">
              Tráfego alto sem conversão detectado. O algoritmo irá derrubar seu ranking orgânico se os anúncios não forem otimizados agora.
            </p>
          </div>
        </motion.div>
      )}

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column A: Score Gauge */}
        <div className="glass-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Quality Index
          </h3>
          <GaugeChart value={index.score} label="Índice de Qualidade" color={gaugeColor} />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Sua publicação está <strong className="text-foreground">{index.score}%</strong> alinhada ao algoritmo atual
          </p>

          {/* Pillar breakdown */}
          <div className="w-full mt-4 space-y-2">
            {index.pillars.map((p) => {
              const pct = (p.score / p.max) * 100;
              const barColor = pct >= 80 ? "bg-emerald" : pct >= 50 ? "bg-warning" : "bg-destructive";
              return (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="font-mono font-semibold">{p.score}/{p.max}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column B: Indexation Summary */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Resumo de Indexação
          </h3>

          {/* Effectiveness badge */}
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">Efetividade da Vertical</span>
            {campaign ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs border ${getEffectivenessBadge(campaign.efectRtaVertical).className}`}>
                  {getEffectivenessBadge(campaign.efectRtaVertical).label}
                </Badge>
                <span className="text-xs font-mono">{campaign.efectRtaVertical.toFixed(0)}%</span>
                {subAprov && (
                  <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30 border">
                    ⚡ Subaproveitamento
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Dados de campanha não disponíveis</span>
            )}
          </div>

          {/* Conversion thermometer */}
          <div className="space-y-2">
            <span className="text-[11px] text-muted-foreground">Termômetro de Conversão</span>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span>Sua Conversão</span>
                <span className="font-mono font-bold">{sellerConv.toFixed(2)}%</span>
              </div>
              <Progress value={Math.min(sellerConv * 20, 100)} className="h-2" />
              {campaign && campaign.taxaConversaoVertical > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span>Média Vertical ({campaign.verticalPrincipal || "N/A"})</span>
                    <span className="font-mono font-bold">{campaign.taxaConversaoVertical.toFixed(2)}%</span>
                  </div>
                  <Progress value={Math.min(campaign.taxaConversaoVertical * 20, 100)} className="h-2" />
                  {sellerConv < campaign.taxaConversaoVertical && (
                    <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      Conversão abaixo da média da vertical
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Potência Full */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground">Potência no Full (Fulfillment)</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 bg-muted/40 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${latest.pctFull >= 70 ? "bg-emerald" : latest.pctFull >= 40 ? "bg-warning" : "bg-destructive"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(latest.pctFull, 100)}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <span className="text-xs font-mono font-bold">{latest.pctFull.toFixed(1)}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Full R$ {latest.tgmvFull.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} · Flex R$ {latest.tgmvFlex.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Column C: Correction Checklist */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ações Imediatas
          </h3>
          {actions.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald text-sm py-4">
              <CheckCircle className="w-5 h-5" />
              <span>Todos os critérios estão saudáveis!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((a, i) => {
                const severityStyle = a.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : a.severity === "warning"
                    ? "border-warning/30 bg-warning/5"
                    : "border-primary/30 bg-primary/5";
                const iconColor = a.severity === "critical"
                  ? "text-destructive"
                  : a.severity === "warning"
                    ? "text-warning"
                    : "text-primary";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${severityStyle}`}
                  >
                    <span className={iconColor}>{a.icon}</span>
                    <span className="text-xs font-medium">{a.label}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export { computeQualityIndex };
