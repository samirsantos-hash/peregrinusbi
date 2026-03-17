import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import TooltipInfo from "./TooltipInfo";
import SalesRecordCard from "./SalesRecordCard";
import TrafficHeatmap from "./TrafficHeatmap";
import BestInvestmentPeriod from "./BestInvestmentPeriod";
import { fmtBRLCompact, fmtBRL, fmtNum, formatChartDate } from "@/utils/formatters";

interface KpiLike {
  date: string;
  revenue: number;
  adsInvestment: number;
  gmv: number;
  tgmv: number;
  roas: number;
  acos: number;
  tacos: number;
  cpa: number;
  productName: string;
  productId: string;
  visits: number;
  tsi: number;
}

interface EfficiencyPanelProps {
  kpis: KpiLike[];
  sellerCustIdMap?: Record<string, string>;
  dataGranularity?: "consolidated" | "daily";
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? `R$ ${p.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : p.value}
        </p>
      ))}
    </div>
  );
};

const RatioTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => {
        const isPercent = p.name === "ACOS" || p.name === "TACOS";
        const formatted = isPercent
          ? `${p.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
          : fmtNum(p.value, 2);
        return (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {formatted}
          </p>
        );
      })}
    </div>
  );
};

const EfficiencyPanel = ({ kpis }: EfficiencyPanelProps) => {

  const byDate = kpis.reduce<Record<string, { date: string; gmv: number; adsInvestment: number; roas: number; acos: number; tacos: number; cpa: number; count: number }>>((acc, k) => {
    if (!acc[k.date]) acc[k.date] = { date: k.date, gmv: 0, adsInvestment: 0, roas: 0, acos: 0, tacos: 0, cpa: 0, count: 0 };
    acc[k.date].gmv += k.revenue;
    acc[k.date].adsInvestment += k.adsInvestment;
    acc[k.date].roas += k.roas;
    acc[k.date].acos += k.acos;
    acc[k.date].tacos += k.tacos;
    acc[k.date].cpa += k.cpa;
    acc[k.date].count++;
    return acc;
  }, {});

  const allDates = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  const formatDate = (dateStr: string) => {
    const [m, d] = dateStr.slice(5).split("-");
    return `${d}/${m}`;
  };

  const adsData = useMemo(() => {
    return allDates.map((d) => ({
      date: formatDate(d.date),
      "Faturamento Bruto": Math.round(d.gmv),
      "Investimento em Marketing": Math.round(d.adsInvestment),
    }));
  }, [allDates]);

  const roasData = useMemo(() => {
    return allDates.map((d) => ({
      date: formatDate(d.date),
      ROAS: Math.round((d.roas / d.count) * 100) / 100,
      ACOS: Math.round((d.acos / d.count) * 100) / 100,
      TACOS: Math.round((d.tacos / d.count) * 100) / 100,
    }));
  }, [allDates]);

  const totalGmv = kpis.reduce((s, k) => s + k.revenue, 0);
  const totalAds = kpis.reduce((s, k) => s + k.adsInvestment, 0);
  const avgRoas = kpis.length > 0 ? kpis.reduce((s, k) => s + k.roas, 0) / kpis.length : 0;
  const avgAcos = kpis.length > 0 ? kpis.reduce((s, k) => s + k.acos, 0) / kpis.length : 0;
  const avgTacos = kpis.length > 0 ? kpis.reduce((s, k) => s + k.tacos, 0) / kpis.length : 0;
  const avgCpa = kpis.length > 0 ? kpis.reduce((s, k) => s + k.cpa, 0) / kpis.length : 0;

  const metrics = [
    { label: "Faturamento Bruto (GMV)", value: fmtBRLCompact(totalGmv), color: "neon-text", tooltip: "Valor total das vendas brutas no período selecionado." },
    { label: "ROAS Médio", value: fmtNum(avgRoas, 2), color: avgRoas >= 2 ? "emerald-text" : "critical-text", tooltip: "Retorno sobre investimento em Ads. Acima de 2x é saudável." },
    { label: "ACOS Médio", value: `${avgAcos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, color: avgAcos <= 15 ? "emerald-text" : "critical-text", tooltip: "Custo de Ads sobre vendas de Ads. Quanto menor, mais eficiente." },
    { label: "TACOS Médio", value: `${avgTacos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, color: avgTacos <= 10 ? "emerald-text" : "text-muted-foreground", tooltip: "Custo de Ads sobre vendas totais. Quanto menor, melhor." },
    { label: "CPA Médio", value: fmtBRL(avgCpa), color: "neon-text", tooltip: "Custo por aquisição. Quanto menor, mais eficiente a campanha." },
    { label: "Investimento em Marketing", value: fmtBRLCompact(totalAds), color: "text-muted-foreground", tooltip: "Total investido em campanhas de Product Ads no período." },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-1">
              <p className="metric-label">{m.label}</p>
              <TooltipInfo text={m.tooltip} />
            </div>
            <p className={`metric-value mt-1 ${m.color}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Sales Record + Best Investment Period */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SalesRecordCard kpis={kpis} />
        <BestInvestmentPeriod kpis={kpis} />
      </div>

      {/* Area Chart — Faturamento vs Ads */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Faturamento Bruto vs Investimento em Marketing
            </h3>
            <TooltipInfo text="Comparativo entre o GMV gerado e o valor investido em Ads ao longo do tempo." />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={adsData}>
            <defs>
              <linearGradient id="gradBlueEff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEmeraldEff" x1="0" y1="0" x2="0" y2="1">
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
              angle={allDates.length > 6 ? -45 : 0}
              textAnchor={allDates.length > 6 ? "end" : "middle"}
              height={allDates.length > 6 ? 50 : 30}
            />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Faturamento Bruto" stroke="hsl(199, 100%, 50%)" fill="url(#gradBlueEff)" strokeWidth={2} animationDuration={800} animationEasing="ease-in-out" />
            <Area type="monotone" dataKey="Investimento em Marketing" stroke="hsl(160, 84%, 39%)" fill="url(#gradEmeraldEff)" strokeWidth={2} animationDuration={800} animationEasing="ease-in-out" />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart — ROAS / ACOS / TACOS */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              ROAS · ACOS · TACOS
            </h3>
            <TooltipInfo text="ROAS: retorno sobre Ads (decimal). ACOS: custo de Ads sobre vendas de Ads (%). TACOS: custo de Ads sobre vendas totais (%)." />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={roasData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              interval="preserveStartEnd"
              angle={allDates.length > 6 ? -45 : 0}
              textAnchor={allDates.length > 6 ? "end" : "middle"}
              height={allDates.length > 6 ? 50 : 30}
            />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
            <Tooltip content={<RatioTooltip />} />
            <Line type="monotone" dataKey="ROAS" stroke="hsl(199, 100%, 50%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={800} animationEasing="ease-in-out" />
            <Line type="monotone" dataKey="ACOS" stroke="hsl(280, 80%, 60%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={800} animationEasing="ease-in-out" />
            <Line type="monotone" dataKey="TACOS" stroke="hsl(40, 95%, 55%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={800} animationEasing="ease-in-out" />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <TrafficHeatmap kpis={kpis} />
    </motion.div>
  );
};

export default EfficiencyPanel;
