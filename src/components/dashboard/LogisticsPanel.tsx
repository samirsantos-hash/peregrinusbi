import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Package, Truck, Mail } from "lucide-react";
import TooltipInfo from "./TooltipInfo";

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
}

const COLORS = ["hsl(199, 100%, 50%)", "hsl(160, 84%, 39%)", "hsl(280, 80%, 60%)", "hsl(45, 80%, 55%)"];

const LogisticsPanel = ({ kpis }: LogisticsPanelProps) => {
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

  // TSI-based (unit share) for reference
  const avgFull = products.length > 0 ? products.reduce((s, p) => s + p.pctFull, 0) / products.length : 0;
  const avgFlex = products.length > 0 ? products.reduce((s, p) => s + p.pctFlex, 0) / products.length : 0;
  const avgPostagem = products.length > 0 ? products.reduce((s, p) => s + p.pctPostagem, 0) / products.length : 0;

  const fmtGmv = (v: number) => {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
    return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
  };

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
      desc: `GMV: ${fmtGmv(totalTgmvFull)}`,
      tooltip: "Share de GMV via Fulfillment (F_TGMV_LC_FULL). Fonte: CPP_MENSAL. Sellers com Full possuem maior conversão e relevância.",
      isEmpty: totalTgmvFull === 0,
    },
    {
      label: "Flex",
      value: `${shareFlexGmv.toFixed(1)}%`,
      icon: Truck,
      color: "emerald-text",
      desc: `GMV: ${fmtGmv(totalTgmvFlex)}`,
      tooltip: "Share de GMV via Flex (F_TGMV_LC_FLEX). Fonte: CPP_MENSAL.",
      isEmpty: totalTgmvFlex === 0,
    },
    {
      label: "Agência / Coletas",
      value: `${shareAgenciaGmv.toFixed(1)}%`,
      icon: Mail,
      color: "text-purple-400",
      desc: `GMV: ${fmtGmv(totalTgmvAgencia)}`,
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
              <TooltipInfo text={item.tooltip} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
          </motion.div>
        ))}
      </div>

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
    </motion.div>
  );
};

export default LogisticsPanel;
