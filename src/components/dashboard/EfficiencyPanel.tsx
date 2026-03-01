import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

interface KpiLike {
  date: string;
  revenue: number;
  adsInvestment: number;
  roas: number;
  acos: number;
  tacos: number;
  cpa: number;
}

interface EfficiencyPanelProps {
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

const EfficiencyPanel = ({ kpis }: EfficiencyPanelProps) => {
  // Aggregate by date
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

  const chartData = Object.values(byDate)
    .map((d) => ({
      date: d.date.slice(5),
      "Faturamento": Math.round(d.gmv),
      "Investimento Ads": Math.round(d.adsInvestment),
      ROAS: Math.round((d.roas / d.count) * 100) / 100,
      ACOS: Math.round((d.acos / d.count) * 100) / 100,
      TACOS: Math.round((d.tacos / d.count) * 100) / 100,
      CPA: Math.round((d.cpa / d.count) * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalGmv = kpis.reduce((s, k) => s + k.revenue, 0);
  const totalAds = kpis.reduce((s, k) => s + k.adsInvestment, 0);
  const avgRoas = kpis.length > 0 ? kpis.reduce((s, k) => s + k.roas, 0) / kpis.length : 0;
  const avgCpa = kpis.length > 0 ? kpis.reduce((s, k) => s + k.cpa, 0) / kpis.length : 0;

  const metrics = [
    { label: "GMV Total", value: `R$ ${(totalGmv / 1000).toFixed(0)}K`, color: "neon-text" },
    { label: "ROAS Médio", value: avgRoas.toFixed(2), color: avgRoas >= 2 ? "emerald-text" : "text-destructive" },
    { label: "CPA Médio", value: `R$ ${avgCpa.toFixed(2)}`, color: "neon-text" },
    { label: "Investimento", value: `R$ ${(totalAds / 1000).toFixed(0)}K`, color: "text-muted-foreground" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-4"
          >
            <p className="metric-label">{m.label}</p>
            <p className={`metric-value mt-1 ${m.color}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Area chart - Revenue vs Ads */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground">
          Faturamento vs Investimento em Ads
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Faturamento" stroke="hsl(199, 100%, 50%)" fill="url(#gradBlue)" strokeWidth={2} />
            <Area type="monotone" dataKey="Investimento Ads" stroke="hsl(160, 84%, 39%)" fill="url(#gradEmerald)" strokeWidth={2} />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart - ROAS/ACOS/TACOS */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground">
          ROAS · ACOS · TACOS
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData.slice(-15)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="ROAS" fill="hsl(199, 100%, 50%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ACOS" fill="hsl(280, 80%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="TACOS" fill="hsl(40, 95%, 55%)" radius={[4, 4, 0, 0]} />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default EfficiencyPanel;
