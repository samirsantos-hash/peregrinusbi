import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import TooltipInfo from "./TooltipInfo";

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
      "Preço Mais Alto": d.expensive,
      "Preço Equivalente": d.match,
      "Preço Mais Baixo": d.cheaper,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Visitas", value: totalVisits.toLocaleString(), icon: TrendingUp, color: "neon-text", tooltip: "Total de visitas nos anúncios do seller no período." },
          { label: "Visitas c/ Preço Alto", value: totalExpensive.toLocaleString(), icon: AlertTriangle, color: "text-destructive", tooltip: "Visitas onde seu preço era maior que o concorrente mais barato." },
          { label: "% Preço Não Competitivo", value: `${pctExpensive.toFixed(1)}%`, icon: TrendingDown, color: pctExpensive > 30 ? "text-warning" : "emerald-text", tooltip: "Proporção de visitas onde seu preço era mais caro. Acima de 30% é crítico." },
          { label: "Preço Rival Mínimo", value: `R$ ${(products[0]?.minPriceRival || 0).toFixed(2)}`, icon: TrendingDown, color: "neon-text", tooltip: "Menor preço encontrado entre seus concorrentes diretos." },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="metric-label">{m.label}</p>
              <TooltipInfo text={m.tooltip} />
            </div>
            <p className={`metric-value ${m.color}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Pricing table */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Diagnóstico de Preço por Seller
          </h3>
          <TooltipInfo text="Análise comparativa usando MIN_PRICE_RIVAL e a distribuição de visitas por faixa de preço." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Usuário / Loja</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Visitas</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Preço Alto</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Equiv.</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Mais Barato</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Rival Min</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const pctExp = p.visits > 0 ? (p.visitsExpensive / p.visits) * 100 : 0;
                return (
                  <motion.tr
                    key={p.productId + idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium">{p.productName}</td>
                    <td className="text-right py-2.5 px-3 font-mono">{p.visits.toLocaleString()}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-destructive">{p.visitsExpensive.toLocaleString()}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-neon-blue">{p.visitsMatch.toLocaleString()}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-emerald">{p.visitsCheaper.toLocaleString()}</td>
                    <td className="text-right py-2.5 px-3 font-mono">R$ {p.minPriceRival.toFixed(2)}</td>
                    <td className="text-center py-2.5 px-3">
                      <span className={`status-badge text-[11px] ${
                        pctExp > 30 ? "bg-destructive/10 text-destructive border-destructive/20" :
                        pctExp > 15 ? "bg-warning/10 text-warning border-warning/20" :
                        "bg-emerald/10 text-emerald border-emerald/20"
                      }`}>
                        {pctExp > 30 ? "⚠ Caro" : pctExp > 15 ? "Atenção" : "✓ OK"}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Distribuição de Visitas por Competitividade de Preço
          </h3>
          <TooltipInfo text="Visitas agrupadas pela posição de preço em relação aos concorrentes ao longo do tempo." />
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Preço Mais Alto" stackId="a" fill="hsl(0, 84%, 60%)" />
            <Bar dataKey="Preço Equivalente" stackId="a" fill="hsl(199, 100%, 50%)" />
            <Bar dataKey="Preço Mais Baixo" stackId="a" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default CompetitivenessPanel;
