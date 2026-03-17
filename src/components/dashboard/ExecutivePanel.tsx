import { useMemo } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Activity, Clock, Crown, Target, BarChart3 } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import DailyPerformanceChart from "./DailyPerformanceChart";

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
  dataGranularity?: "consolidated" | "daily";
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

const ExecutivePanel = ({ kpis, dataGranularity = "consolidated" }: ExecutivePanelProps) => {
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

  const fmtBRL = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtBRLCompact = (value: number) => {
    if (value >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
    }
    if (value >= 1_000) {
      return `R$ ${(value / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
    }
    return fmtBRL(value);
  };

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

      {/* Line chart */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Evolução de Faturamento
            </h3>
            <TooltipInfo text="Comparativo entre faturamento bruto (GMV) e faturamento realizado ao longo do tempo." />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
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
              angle={allDates.length > 6 ? -45 : 0}
              textAnchor={allDates.length > 6 ? "end" : "middle"}
              height={allDates.length > 6 ? 50 : 30}
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
