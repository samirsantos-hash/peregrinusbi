import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { pct } from "@/lib/format";
import { fmtBRL, fmtBRLCompact } from "@/utils/formatters";

interface Props {
  kpis: {date: string;revenue: number;adsInvestment: number;cpa: number;}[];
}

const BestInvestmentPeriod = ({ kpis }: Props) => {
  const best = useMemo(() => {
    if (kpis.length < 2) return null;

    // Group by month (YYYY-MM)
    const byMonth: Record<string, {revenue: number;ads: number;cpa: number;count: number;dates: string[];}> = {};

    for (const k of kpis) {
      const month = k.date.slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { revenue: 0, ads: 0, cpa: 0, count: 0, dates: [] };
      byMonth[month].revenue += k.revenue;
      byMonth[month].ads += k.adsInvestment;
      byMonth[month].cpa += k.cpa;
      byMonth[month].count++;
      byMonth[month].dates.push(k.date);
    }

    const months = Object.entries(byMonth).
    filter(([, v]) => v.ads > 0 && v.revenue > 0).
    map(([month, v]) => ({
      month,
      avgCpa: v.cpa / v.count,
      revenue: v.revenue,
      ads: v.ads,
      tacos: v.ads / v.revenue * 100
    })).
    sort((a, b) => a.avgCpa - b.avgCpa);

    if (months.length === 0) return null;

    const best = months[0];
    const [y, m] = best.month.split("-");
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const label = `${monthNames[parseInt(m) - 1]} ${y}`;

    return { ...best, label };
  }, [kpis]);

  if (!best) return null;

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Melhor Período de Investimento
        </h3>
        <TooltipInfo text="Mês com o menor CPA (custo por aquisição) em relação ao faturamento obtido. Indica o período mais eficiente para investir em Ads." />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row lg:items-center gap-4">
<div className="flex items-center gap-4 lg:w-[40%] shrink-0">
        <div className="w-12 h-12 rounded-xl bg-ec-verde/10 border border-ec-verde/20 flex items-center justify-center shrink-0">
          <TrendingDown className="w-6 h-6 text-ok text-destructive-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-foreground">
            {best.label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Menor CPA do período analisado
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-muted/30 rounded-lg p-3">
          
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CPA Médio</p>
          <p className="text-sm font-bold font-mono text-ok mt-1">{fmtBRL(best.avgCpa)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-muted/30 rounded-lg p-3">
          
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento</p>
          <p className="text-sm font-bold font-mono text-foreground mt-1">{fmtBRLCompact(best.revenue)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-muted/30 rounded-lg p-3">
          
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">TACOS</p>
          <p className="text-sm font-bold font-mono text-foreground mt-1">{pct(best.tacos, 2)}</p>
        </motion.div>
      </div>
      </div>
    </div>);

};

export default BestInvestmentPeriod;