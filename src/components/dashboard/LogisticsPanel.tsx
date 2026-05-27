import { useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Package, Truck, Mail } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { AlgoTooltip } from "@/components/ui/AlgoTooltip";
import { fmtBRLCompact, formatChartDate } from "@/utils/formatters";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs">
      <p className="font-medium" style={{ color: payload[0].payload.fill }}>{payload[0].name}: {payload[0].value.toFixed(1)}%</p>
    </div>
  );
};

const EvolutionTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toFixed(1)}%
        </p>
      ))}
    </div>
  );
};

interface KpiLike {
  date: string;
  pctFull: number;
  pctFlex: number;
  pctPostagem: number;
  tgmvFull: number;
  tgmvFlex: number;
  tgmv: number;
  productId: string;
}

interface LogisticsPanelProps {
  kpis: KpiLike[];
  dataGranularity?: "consolidated" | "daily";
}

const COLORS = ["hsl(199, 100%, 50%)", "hsl(160, 84%, 39%)", "hsl(280, 80%, 60%)", "hsl(45, 80%, 55%)"];

const LogisticsPanel = ({ kpis, dataGranularity = "daily" }: LogisticsPanelProps) => {
  const latestByProduct = kpis.reduce<Record<string, KpiLike>>((acc, k) => {
    if (!acc[k.productId] || k.date > acc[k.productId].date) acc[k.productId] = k;
    return acc;
  }, {});

  const products = Object.values(latestByProduct);

  // GMV-based share calculation (correct source: CPP_MENSAL fields)
  const totalTgmvFull = products.reduce((s, p) => s + (p.tgmvFull || 0), 0);
  const totalTgmvFlex = products.reduce((s, p) => s + (p.tgmvFlex || 0), 0);
  const totalTgmv = products.reduce((s, p) => s + (p.tgmv || 0), 0);
  const totalTgmvAgencia = Math.max(0, totalTgmv - totalTgmvFull - totalTgmvFlex);

  const shareFullGmv = totalTgmv > 0 ? (totalTgmvFull / totalTgmv) * 100 : 0;
  const shareFlexGmv = totalTgmv > 0 ? (totalTgmvFlex / totalTgmv) * 100 : 0;
  const shareAgenciaGmv = totalTgmv > 0 ? (totalTgmvAgencia / totalTgmv) * 100 : 0;

  // Time series for evolution chart
  const evolutionData = useMemo(() => {
    const byDate: Record<string, { date: string; tgmvFull: number; tgmvFlex: number; tgmv: number }> = {};
    for (const k of kpis) {
      if (!byDate[k.date]) byDate[k.date] = { date: k.date, tgmvFull: 0, tgmvFlex: 0, tgmv: 0 };
      byDate[k.date].tgmvFull += k.tgmvFull || 0;
      byDate[k.date].tgmvFlex += k.tgmvFlex || 0;
      byDate[k.date].tgmv += k.tgmv || 0;
    }
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const total = d.tgmv || 1;
        const agencia = Math.max(0, d.tgmv - d.tgmvFull - d.tgmvFlex);
        return {
          date: formatChartDate(d.date, dataGranularity),
          "% Full": Math.round((d.tgmvFull / total) * 1000) / 10,
          "% Flex": Math.round((d.tgmvFlex / total) * 1000) / 10,
          "% Agência": Math.round((agencia / total) * 1000) / 10,
        };
      });
  }, [kpis, dataGranularity]);

  const donutData = [
    { name: "Mercado Envios Full", value: Math.round(shareFullGmv * 10) / 10 },
    { name: "Flex", value: Math.round(shareFlexGmv * 10) / 10 },
    { name: "Agência / Coletas", value: Math.round(shareAgenciaGmv * 10) / 10 },
  ];

  const logIcons = [
    {
      label: "Mercado Envios Full",
      value: `${shareFullGmv.toFixed(1)}%`,
      icon: Package,
      color: "neon-text",
      desc: `GMV: ${fmtBRLCompact(totalTgmvFull)}`,
      tooltip: "Share de GMV via Fulfillment (F_TGMV_LC_FULL). Fonte: CPP_MENSAL. Sellers com Full possuem maior conversão e relevância.",
      isEmpty: totalTgmvFull === 0,
    },
    {
      label: "Flex",
      value: `${shareFlexGmv.toFixed(1)}%`,
      icon: Truck,
      color: "emerald-text",
      desc: `GMV: ${fmtBRLCompact(totalTgmvFlex)}`,
      tooltip: "Share de GMV via Flex (F_TGMV_LC_FLEX). Fonte: CPP_MENSAL.",
      isEmpty: totalTgmvFlex === 0,
    },
    {
      label: "Agência / Coletas",
      value: `${shareAgenciaGmv.toFixed(1)}%`,
      icon: Mail,
      color: "text-purple-400",
      desc: `GMV: ${fmtBRLCompact(totalTgmvAgencia)}`,
      tooltip: "Share de GMV via Agência / Coletas (F_TGMV_LC_COLETAS). Menor priorização no algoritmo.",
      isEmpty: totalTgmvAgencia === 0,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {logIcons.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card p-4 text-center ${item.isEmpty ? "opacity-40" : ""}`}
          >
            <item.icon className={`w-6 h-6 mx-auto mb-2 ${item.color === "neon-text" ? "text-neon-blue" : item.color === "emerald-text" ? "text-emerald" : "text-purple-400"}`} />
            <p className={`metric-value ${item.color}`}>{item.value}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="metric-label">{item.label}</p>
              {item.label === "Full" ? (
                <AlgoTooltip tooltipKey="shareFullPct" />
              ) : item.label === "Flex" ? (
                <AlgoTooltip tooltipKey="shareFlexPct" />
              ) : (
                <TooltipInfo text={item.tooltip} />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Donut Chart — Summary */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Mix Logístico (Share GMV)
          </h3>
          <TooltipInfo text="Distribuição por GMV dos canais de fulfillment (Fonte: CPP_MENSAL). Maior proporção de Full melhora o desempenho no marketplace." />
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {donutData.map((_, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index]}
                  style={{ filter: `drop-shadow(0 0 8px ${COLORS[index]})` }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span style={{ color: "hsl(215, 20%, 70%)", fontSize: 12 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Evolution Chart — Time Series */}
      {evolutionData.length > 1 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Evolução do Mix Logístico
            </h3>
            <TooltipInfo text="Evolução temporal do share de GMV por canal logístico. Acompanhe a migração para Full ao longo do tempo." />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={evolutionData}>
              <defs>
                <linearGradient id="gradFullLog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFlexLog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAgLog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={false}
                interval="preserveStartEnd"
                angle={evolutionData.length > 8 ? -45 : 0}
                textAnchor={evolutionData.length > 8 ? "end" : "middle"}
                height={evolutionData.length > 8 ? 50 : 30}
              />
              <YAxis
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<EvolutionTooltip />} />
              <Area type="monotone" dataKey="% Full" stroke="hsl(199, 100%, 50%)" fill="url(#gradFullLog)" strokeWidth={2} />
              <Area type="monotone" dataKey="% Flex" stroke="hsl(160, 84%, 39%)" fill="url(#gradFlexLog)" strokeWidth={2} />
              <Area type="monotone" dataKey="% Agência" stroke="hsl(280, 80%, 60%)" fill="url(#gradAgLog)" strokeWidth={2} />
              <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

export default LogisticsPanel;
