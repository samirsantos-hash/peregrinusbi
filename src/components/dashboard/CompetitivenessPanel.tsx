import { motion } from "framer-motion";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis } from "recharts";
import { type SellerKPI } from "@/data/mockData";
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

interface CompetitivenessPanelProps {
  kpis: SellerKPI[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-medium text-foreground">{data.name}</p>
      <p className="text-muted-foreground font-mono">{data.id}</p>
      <p className="neon-text">Seu Preço: R$ {data.sellerPrice.toFixed(2)}</p>
      <p className="emerald-text">Rival Min: R$ {data.rivalPrice.toFixed(2)}</p>
      <p className={data.gap > 5 ? "text-destructive" : "text-emerald"}>
        Gap: {data.gap > 0 ? "+" : ""}{data.gap.toFixed(1)}%
      </p>
      <p className="text-warning">Visitas Caras: {data.visitsExpensive}</p>
    </div>
  );
};

const CompetitivenessPanel = ({ kpis }: CompetitivenessPanelProps) => {
  const latestByProduct = kpis.reduce<Record<string, SellerKPI>>((acc, k) => {
    if (!acc[k.productId] || k.date > acc[k.productId].date) acc[k.productId] = k;
    return acc;
  }, {});

  const scatterData = Object.values(latestByProduct).map((p) => ({
    sellerPrice: p.sellerPrice,
    rivalPrice: p.minPriceRival,
    gap: ((p.sellerPrice - p.minPriceRival) / p.minPriceRival) * 100,
    visitsExpensive: p.visitsExpensive,
    name: p.productName,
    id: p.productId,
  }));

  const competitive = scatterData.filter((d) => d.gap <= 5).length;
  const expensive = scatterData.filter((d) => d.gap > 5).length;
  const avgGap = scatterData.reduce((s, d) => s + d.gap, 0) / scatterData.length;
  const totalExpVisits = scatterData.reduce((s, d) => s + d.visitsExpensive, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Competitivos", value: competitive.toString(), icon: TrendingUp, color: "emerald-text" },
          { label: "Fora de Preço", value: expensive.toString(), icon: AlertTriangle, color: "text-destructive" },
          { label: "Gap Médio", value: `${avgGap > 0 ? "+" : ""}${avgGap.toFixed(1)}%`, icon: TrendingDown, color: avgGap > 5 ? "text-warning" : "neon-text" },
          { label: "Visitas Caras", value: totalExpVisits.toLocaleString(), icon: AlertTriangle, color: "text-warning" },
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

      {/* Scatter chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground">
          Preço Seller vs Preço Mínimo Rival
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              type="number"
              dataKey="rivalPrice"
              name="Preço Rival"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              label={{ value: "Preço Mín. Rival (R$)", position: "bottom", fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="sellerPrice"
              name="Seu Preço"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              label={{ value: "Seu Preço (R$)", angle: -90, position: "insideLeft", fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="visitsExpensive" range={[50, 400]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 300, y: 300 }]}
              stroke="hsl(215, 25%, 25%)"
              strokeDasharray="5 5"
              label={{ value: "Preço Igual", fill: "hsl(215, 20%, 40%)", fontSize: 10 }}
            />
            <Scatter
              data={scatterData.filter((d) => d.gap <= 5)}
              fill="hsl(160, 84%, 39%)"
              name="Competitivo"
            />
            <Scatter
              data={scatterData.filter((d) => d.gap > 5)}
              fill="hsl(0, 84%, 60%)"
              name="Acima do Mercado"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default CompetitivenessPanel;
