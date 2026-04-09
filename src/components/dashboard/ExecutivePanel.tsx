import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Activity, Clock, Crown, Target, BarChart3 } from "lucide-react";
import { fmtBRL, fmtBRLCompact } from "@/utils/formatters";
import TooltipInfo from "./TooltipInfo";
import DailyPerformanceChart from "./DailyPerformanceChart";
import QuarterlyPerformanceChart from "./QuarterlyPerformanceChart";

interface KpiLike {
  date: string;
  gmv: number;
  revenue: number;
  tsi: number;
  tgmv: number;
  adsInvestment: number;
  roas: number;
  upliftGmvM1: number;
  scoreFull: number;
  repDelayedRate: number;
}

interface ExecutivePanelProps {
  kpis: KpiLike[];
  allKpis?: KpiLike[];
  dataGranularity?: "consolidated" | "daily";
}


/* ------------------------------------------------------------------ */
/*  Strategic uplift label                                             */
/* ------------------------------------------------------------------ */
function getUpliftDisplay(uplift: number): { label: string; color: string; icon: typeof TrendingUp } {
  const pct = uplift * 100;
  if (pct >= 50) return { label: "Líder de Categoria", color: "emerald-text", icon: Crown };
  if (pct >= 20) return { label: "Performance Excedente", color: "emerald-text", icon: TrendingUp };
  if (pct >= 0) return { label: "Otimização de Margem", color: "emerald-text", icon: Target };
  if (pct >= -15) return { label: "Gap de Vendas", color: "warning-text", icon: BarChart3 };
  return { label: "Potencial de Recuperação", color: "critical-text", icon: TrendingDown };
}

const ExecutivePanel = ({ kpis, allKpis, dataGranularity = "consolidated" }: ExecutivePanelProps) => {
  const totalGmv = kpis.reduce((s, k) => s + k.gmv, 0);
  const totalTgmv = kpis.reduce((s, k) => s + k.tgmv, 0);
  const totalTsi = kpis.reduce((s, k) => s + k.tsi, 0);
  const totalAds = kpis.reduce((s, k) => s + k.adsInvestment, 0);
  const avgRoas = kpis.length > 0 ? kpis.reduce((s, k) => s + k.roas, 0) / kpis.length : 0;

  const validUplifts = kpis.filter((k) => k.upliftGmvM1 !== 0);
  const avgUplift = validUplifts.length > 0
    ? validUplifts.reduce((s, k) => s + k.upliftGmvM1, 0) / validUplifts.length
    : 0;

  const upliftDisplay = getUpliftDisplay(avgUplift);
  const UpliftIcon = upliftDisplay.icon;

  const validScores = kpis.filter((k) => k.scoreFull > 0);
  const avgSaude = validScores.length > 0
    ? validScores.reduce((s, k) => s + k.scoreFull, 0) / validScores.length
    : 0;

  const validDelayed = kpis.filter((k) => k.repDelayedRate > 0);
  const avgDelayed = validDelayed.length > 0
    ? validDelayed.reduce((s, k) => s + k.repDelayedRate, 0) / validDelayed.length
    : 0;

  const periodLabel = useMemo(() => {
    if (dataGranularity === "daily") {
      const uniqueDays = new Set(kpis.map((k) => k.date));
      return `${uniqueDays.size} ${uniqueDays.size === 1 ? "dia" : "dias"}`;
    }
    const uniqueMonths = new Set(kpis.map((k) => k.date.slice(0, 7)));
    return `${uniqueMonths.size} ${uniqueMonths.size === 1 ? "mês" : "meses"}`;
  }, [kpis, dataGranularity]);

  // Using shared formatters from utils/formatters.ts

  // Uplift value: always show absolute value with strategic label
  const upliftPctAbs = Math.abs(avgUplift * 100);
  const upliftValueStr = `${avgUplift >= 0 ? "+" : ""}${(avgUplift * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  const metrics = [
    { label: "Faturamento Bruto (GMV)", value: fmtBRLCompact(totalGmv), icon: DollarSign, color: "neon-text", tooltip: "Valor total das vendas brutas no período selecionado (GMV = Gross Merchandise Value)." },
    { label: "Faturamento Realizado", value: fmtBRLCompact(totalTgmv), icon: TrendingUp, color: "emerald-text", tooltip: "Valor de vendas confirmadas e faturadas, descontando cancelamentos e devoluções." },
    { label: "Volume de Itens Vendidos", value: totalTsi.toLocaleString("pt-BR"), icon: ShoppingCart, color: "neon-text", tooltip: "Quantidade total de itens vendidos (TSI = Total Sold Items) no período." },
    { label: "Investimento em Marketing", value: fmtBRLCompact(totalAds), icon: Activity, color: "text-muted-foreground", tooltip: "Total investido em campanhas de Ads (Product Ads) no Mercado Livre." },
    {
      label: upliftDisplay.label,
      value: upliftValueStr,
      icon: UpliftIcon,
      color: upliftDisplay.color,
      tooltip: avgUplift >= 0
        ? "O seller está acima do potencial esperado para sua categoria/domínio. Considere otimizar margens ou expandir mix."
        : "Existe um gap entre a performance atual e o potencial da categoria. Invista em visibilidade e competitividade.",
    },
    { label: "Nota de Saúde da Operação", value: avgSaude > 0 ? avgSaude.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—", icon: Activity, color: avgSaude >= 70 ? "emerald-text" : avgSaude >= 50 ? "warning-text" : "critical-text", tooltip: "Média ponderada de preço, qualidade de fotos, descrições e logística." },
    { label: "ROAS Médio", value: avgRoas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: DollarSign, color: avgRoas >= 2 ? "emerald-text" : "critical-text", tooltip: "Retorno sobre investimento em Ads. Acima de 2x é considerado saudável." },
    { label: "Índice de Atrasos no Envio", value: avgDelayed > 0 ? `${(avgDelayed * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "—", icon: Clock, color: avgDelayed <= 0.05 ? "emerald-text" : "critical-text", tooltip: "Percentual de envios atrasados. Abaixo de 5% é considerado saudável para manter reputação." },
  ];


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* KPI Cards */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground font-medium">
          Período analisado: <span className="font-mono font-semibold text-foreground">{periodLabel}</span> de dados
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="metric-label">{m.label}</p>
              <TooltipInfo text={m.tooltip} />
            </div>
            <p className={`metric-value mt-1 ${m.color}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Daily chart for 7D/15D/30D, Quarterly bar chart for consolidated */}
      {dataGranularity === "daily" ? (
        <DailyPerformanceChart kpis={kpis} granularity="daily" />
      ) : (
        <QuarterlyPerformanceChart kpis={allKpis || kpis} />
      )}
    </motion.div>
  );
};

export default ExecutivePanel;
