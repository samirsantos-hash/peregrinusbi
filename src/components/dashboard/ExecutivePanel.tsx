import { useState, useMemo } from "react";
import { subDays } from "date-fns";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Activity, Clock } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import PeriodSelector from "./PeriodSelector";

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
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("pt-BR") : p.value}
        </p>
      ))}
    </div>
  );
};

const formatDateLabel = (dateStr: string, totalDays: number) => {
  const [m, d] = dateStr.split("-");
  if (totalDays <= 7) return `${d}/${m}`;
  if (totalDays <= 15) return `${d}/${m}`;
  return `${d}/${m}`;
};

const ExecutivePanel = ({ kpis }: ExecutivePanelProps) => {

  const totalGmv = kpis.reduce((s, k) => s + k.gmv, 0);
  const totalTgmv = kpis.reduce((s, k) => s + k.tgmv, 0);
  const totalTsi = kpis.reduce((s, k) => s + k.tsi, 0);
  const totalAds = kpis.reduce((s, k) => s + k.adsInvestment, 0);
  const avgRoas = kpis.length > 0 ? kpis.reduce((s, k) => s + k.roas, 0) / kpis.length : 0;

  const validUplifts = kpis.filter((k) => k.upliftGmvM1 !== 0);
  const avgUplift = validUplifts.length > 0
    ? validUplifts.reduce((s, k) => s + k.upliftGmvM1, 0) / validUplifts.length
    : 0;

  const validScores = kpis.filter((k) => k.scoreFull > 0);
  const avgSaude = validScores.length > 0
    ? validScores.reduce((s, k) => s + k.scoreFull, 0) / validScores.length
    : 0;

  const validDelayed = kpis.filter((k) => k.repDelayedRate > 0);
  const avgDelayed = validDelayed.length > 0
    ? validDelayed.reduce((s, k) => s + k.repDelayedRate, 0) / validDelayed.length
    : 0;

  const metrics = [
    { label: "Faturamento Bruto (GMV)", value: `R$ ${(totalGmv / 1000).toFixed(0)}K`, icon: DollarSign, color: "neon-text", tooltip: "Valor total das vendas brutas no período selecionado (GMV = Gross Merchandise Value)." },
    { label: "Faturamento Realizado", value: `R$ ${(totalTgmv / 1000).toFixed(0)}K`, icon: TrendingUp, color: "emerald-text", tooltip: "Valor de vendas confirmadas e faturadas, descontando cancelamentos e devoluções." },
    { label: "Volume de Itens Vendidos", value: totalTsi.toLocaleString("pt-BR"), icon: ShoppingCart, color: "neon-text", tooltip: "Quantidade total de itens vendidos (TSI = Total Sold Items) no período." },
    { label: "Investimento em Marketing", value: `R$ ${(totalAds / 1000).toFixed(0)}K`, icon: Activity, color: "text-muted-foreground", tooltip: "Total investido em campanhas de Ads (Product Ads) no Mercado Livre." },
    { label: "Potencial de Crescimento", value: `${avgUplift >= 0 ? "+" : ""}${(avgUplift * 100).toFixed(1)}%`, icon: avgUplift >= 0 ? TrendingUp : TrendingDown, color: avgUplift >= 0 ? "emerald-text" : "critical-text", tooltip: "Calculado comparando sua performance real com a média esperada da sua Vertical e Domínio." },
    { label: "Nota de Saúde da Operação", value: avgSaude > 0 ? avgSaude.toFixed(0) : "—", icon: Activity, color: avgSaude >= 70 ? "emerald-text" : avgSaude >= 50 ? "warning-text" : "critical-text", tooltip: "Média ponderada de preço, qualidade de fotos, descrições e logística." },
    { label: "ROAS Médio", value: avgRoas.toFixed(2), icon: DollarSign, color: avgRoas >= 2 ? "emerald-text" : "critical-text", tooltip: "Retorno sobre investimento em Ads. Acima de 2x é considerado saudável." },
    { label: "Índice de Atrasos no Envio", value: avgDelayed > 0 ? `${(avgDelayed * 100).toFixed(1)}%` : "—", icon: Clock, color: avgDelayed <= 0.05 ? "emerald-text" : "critical-text", tooltip: "Percentual de envios atrasados. Abaixo de 5% é considerado saudável para manter reputação." },
  ];

  // Aggregate by date
  const byDate = kpis.reduce<Record<string, { date: string; gmv: number; tgmv: number }>>((acc, k) => {
    if (!acc[k.date]) acc[k.date] = { date: k.date, gmv: 0, tgmv: 0 };
    acc[k.date].gmv += k.gmv;
    acc[k.date].tgmv += k.tgmv;
    return acc;
  }, {});

  const allDates = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  const chartData = useMemo(() => {
    return allDates.map((d) => {
      const [m, day] = d.date.slice(5).split("-");
      return {
        date: `${day}/${m}`,
        "Faturamento Bruto": Math.round(d.gmv),
        "Faturamento Realizado": Math.round(d.tgmv),
      };
    });
  }, [allDates]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* KPI Cards */}
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

      {/* Line chart */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Evolução de Faturamento
            </h3>
            <TooltipInfo text="Comparativo entre faturamento bruto (GMV) e faturamento realizado ao longo do tempo." />
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} key={period}>
            <defs>
              <linearGradient id="gradBlueExec" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEmeraldExec" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              interval="preserveStartEnd"
              angle={days >= 30 ? -45 : 0}
              textAnchor={days >= 30 ? "end" : "middle"}
              height={days >= 30 ? 50 : 30}
            />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Faturamento Bruto" stroke="hsl(199, 100%, 50%)" fill="url(#gradBlueExec)" strokeWidth={2} animationDuration={800} animationEasing="ease-in-out" />
            <Area type="monotone" dataKey="Faturamento Realizado" stroke="hsl(160, 84%, 39%)" fill="url(#gradEmeraldExec)" strokeWidth={2} animationDuration={800} animationEasing="ease-in-out" />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default ExecutivePanel;
