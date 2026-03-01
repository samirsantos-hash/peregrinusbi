import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

interface KpiLike {
  date: string;
  visits: number;
  visitsExpensive: number;
  visitsMatch: number;
  visitsCheaper: number;
  minPriceRival: number;
  productName: string;
  productId: string;
}

interface CompetitivenessPanelProps {
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

const CompetitivenessPanel = ({ kpis }: CompetitivenessPanelProps) => {
  // Get latest per seller/product
  const latestByProduct = kpis.reduce<Record<string, KpiLike>>((acc, k) => {
    if (!acc[k.productId] || k.date > acc[k.productId].date) acc[k.productId] = k;
    return acc;
  }, {});

  const products = Object.values(latestByProduct);

  const totalVisits = products.reduce((s, p) => s + p.visits, 0);
  const totalExpensive = products.reduce((s, p) => s + p.visitsExpensive, 0);
  const totalMatch = products.reduce((s, p) => s + p.visitsMatch, 0);
  const totalCheaper = products.reduce((s, p) => s + p.visitsCheaper, 0);
  const pctExpensive = totalVisits > 0 ? (totalExpensive / totalVisits) * 100 : 0;

  // Build chart data by date
  const byDate = kpis.reduce<Record<string, { date: string; visits: number; expensive: number; match: number; cheaper: number }>>((acc, k) => {
    if (!acc[k.date]) acc[k.date] = { date: k.date, visits: 0, expensive: 0, match: 0, cheaper: 0 };
    acc[k.date].visits += k.visits;
    acc[k.date].expensive += k.visitsExpensive;
    acc[k.date].match += k.visitsMatch;
    acc[k.date].cheaper += k.visitsCheaper;
    return acc;
  }, {});

  const chartData = Object.values(byDate)
    .map((d) => ({
      date: d.date.slice(5),
      "Visitas Caras": d.expensive,
      "Visitas Match": d.match,
      "Visitas Baratas": d.cheaper,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Visitas", value: totalVisits.toLocaleString(), icon: TrendingUp, color: "neon-text" },
          { label: "Visitas Caras", value: totalExpensive.toLocaleString(), icon: AlertTriangle, color: "text-destructive" },
          { label: "% Caras", value: `${pctExpensive.toFixed(1)}%`, icon: TrendingDown, color: pctExpensive > 30 ? "text-warning" : "emerald-text" },
          { label: "Preço Rival Min", value: `R$ ${(products[0]?.minPriceRival || 0).toFixed(2)}`, icon: TrendingDown, color: "neon-text" },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="metric-label">{m.label}</p>
            </div>
            <p className={`metric-value ${m.color}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Bar chart - visits breakdown */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground">
          Distribuição de Visitas por Competitividade
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Visitas Caras" stackId="a" fill="hsl(0, 84%, 60%)" />
            <Bar dataKey="Visitas Match" stackId="a" fill="hsl(199, 100%, 50%)" />
            <Bar dataKey="Visitas Baratas" stackId="a" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default CompetitivenessPanel;
