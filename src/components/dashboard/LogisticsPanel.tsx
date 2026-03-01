import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { type SellerKPI } from "@/data/mockData";
import { Package, Truck, Mail } from "lucide-react";

interface LogisticsPanelProps {
  kpis: SellerKPI[];
}

const COLORS = ["hsl(199, 100%, 50%)", "hsl(160, 84%, 39%)", "hsl(280, 80%, 60%)"];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs">
      <p className="font-medium" style={{ color: payload[0].payload.fill }}>{payload[0].name}: {payload[0].value.toFixed(1)}%</p>
    </div>
  );
};

const LogisticsPanel = ({ kpis }: LogisticsPanelProps) => {
  const latestByProduct = kpis.reduce<Record<string, SellerKPI>>((acc, k) => {
    if (!acc[k.productId] || k.date > acc[k.productId].date) acc[k.productId] = k;
    return acc;
  }, {});

  const products = Object.values(latestByProduct);
  const avgFull = products.reduce((s, p) => s + p.pctFull, 0) / products.length;
  const avgFlex = products.reduce((s, p) => s + p.pctFlex, 0) / products.length;
  const avgPostagem = products.reduce((s, p) => s + p.pctPostagem, 0) / products.length;

  const donutData = [
    { name: "Full", value: Math.round(avgFull * 10) / 10 },
    { name: "Flex", value: Math.round(avgFlex * 10) / 10 },
    { name: "Postagem", value: Math.round(avgPostagem * 10) / 10 },
  ];

  const logIcons = [
    { label: "Full", value: `${avgFull.toFixed(1)}%`, icon: Package, color: "neon-text", desc: "Mercado Envios Full" },
    { label: "Flex", value: `${avgFlex.toFixed(1)}%`, icon: Truck, color: "emerald-text", desc: "Mercado Envios Flex" },
    { label: "Postagem", value: `${avgPostagem.toFixed(1)}%`, icon: Mail, color: "text-purple-400", desc: "Correios / Postagem" },
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
            className="glass-card p-4 text-center"
          >
            <item.icon className={`w-6 h-6 mx-auto mb-2 ${item.color === "neon-text" ? "text-neon-blue" : item.color === "emerald-text" ? "text-emerald" : "text-purple-400"}`} />
            <p className={`metric-value ${item.color}`}>{item.value}</p>
            <p className="metric-label mt-1">{item.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-foreground text-center">
          Mix de Envio
        </h3>
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
    </motion.div>
  );
};

export default LogisticsPanel;
