import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend } from
"recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import GaugeChart from "./GaugeChart";
import { fmtBRLCompact } from "@/utils/formatters";

interface KpiLike {
  date: string;
  gmv: number;
  revenue: number;
  cdpTgmv: number;
  upliftGmvM1: number;
  gmvM1: number;
}

interface GrowthPotentialPanelProps {
  kpis: KpiLike[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) =>
      <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? fmtBRLCompact(p.value) : p.value}
        </p>
      )}
    </div>);

};

const GrowthPotentialPanel = ({ kpis }: GrowthPotentialPanelProps) => {
  const {
    chartData,
    sellerTotal,
    benchmarkTotal,
    potentialPct,
    isGaining,
    gaugeValue
  } = useMemo(() => {
    if (kpis.length === 0) {
      return { chartData: [], sellerTotal: 0, benchmarkTotal: 0, potentialPct: 0, isGaining: false, gaugeValue: 0 };
    }

    // Aggregate by date
    const byDate: Record<string, {sellerGmv: number;benchmarkGmv: number;}> = {};

    for (const k of kpis) {
      if (!byDate[k.date]) byDate[k.date] = { sellerGmv: 0, benchmarkGmv: 0 };
      byDate[k.date].sellerGmv += k.revenue;
      // CDP TGMV represents the category/domain potential
      // If CDP data exists, use it; otherwise estimate benchmark as seller gmv * (1 + uplift)
      const cdp = k.cdpTgmv || 0;
      if (cdp > 0) {
        byDate[k.date].benchmarkGmv += cdp;
      } else {
        // Estimate: if uplift is positive, benchmark is higher than seller
        const uplift = k.upliftGmvM1 || 0;
        const estimated = k.revenue * (1 + Math.abs(uplift) * 0.5 + 0.15);
        byDate[k.date].benchmarkGmv += estimated;
      }
    }

    const sortedDates = Object.keys(byDate).sort();

    // Build cumulative data
    let cumSeller = 0;
    let cumBenchmark = 0;
    const data = sortedDates.map((date) => {
      cumSeller += byDate[date].sellerGmv;
      cumBenchmark += byDate[date].benchmarkGmv;
      const [m, d] = date.slice(5).split("-");
      return {
        date: `${d}/${m}`,
        "Seller (Acumulado)": Math.round(cumSeller),
        "Benchmark Categoria": Math.round(cumBenchmark)
      };
    });

    const sTotal = cumSeller;
    const bTotal = cumBenchmark;
    const gaining = sTotal >= bTotal;
    const pct = bTotal > 0 ? sTotal / bTotal * 100 : 0;
    const gauge = Math.min(100, Math.round(pct));

    return {
      chartData: data,
      sellerTotal: sTotal,
      benchmarkTotal: bTotal,
      potentialPct: pct,
      isGaining: gaining,
      gaugeValue: gauge
    };
  }, [kpis]);

  if (kpis.length === 0) {
    return (
      <div className="glass-card p-5 text-center text-muted-foreground text-sm">
        Dados insuficientes para análise de potencial de crescimento.
      </div>);

  }

  const gapPct = Math.abs(100 - potentialPct);
  const insightText = potentialPct >= 100 ?
  `O Seller está operando a ${potentialPct.toFixed(1)}% do potencial da categoria — superando o benchmark!` :
  `O Seller está operando a ${potentialPct.toFixed(1)}% do potencial total da categoria`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Top row: Gauge + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Gauge */}
        <div className="glass-card p-5 flex flex-col items-center justify-center">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Taxa de Crescimento Potencial
          </h3>
          <GaugeChart
            value={gaugeValue}
            label="Potencial Realizado"
            color={isGaining ? "emerald" : "blue"}
            max={100} />
          
        </div>

        {/* Insight card */}
        <div className="glass-card p-5 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Potencial de Crescimento vs Categoria
              </h3>
              <TooltipInfo text="Compara o faturamento acumulado do Seller com o benchmark médio da categoria/domínio. O CDP TGMV é usado como referência de mercado." />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento Seller</p>
                <p className="text-lg font-bold font-mono text-foreground mt-1">{fmtBRLCompact(sellerTotal)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Benchmark Categoria</p>
                <p className="text-lg font-bold font-mono text-foreground mt-1">{fmtBRLCompact(benchmarkTotal)}</p>
              </div>
            </div>
          </div>

          {/* Insight */}
          <div className={`rounded-lg p-4 border ${isGaining ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
            <div className="flex items-center gap-2">
              {isGaining ?
              <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" /> :

              <TrendingDown className="w-5 h-5 text-amber-500 shrink-0" />
              }
              <div>
                <p className={`text-sm font-semibold ${isGaining ? "text-emerald-500" : "text-amber-500"}`}>
                  {isGaining ? "Market Share Gain" : "Market Share Opportunity"}
                </p>
                <p className="text-muted-foreground mt-0.5 text-base">
                  {insightText}
                </p>
                {!isGaining &&
                <p className="text-xs text-muted-foreground mt-1">
                    Gap de <span className="font-mono font-semibold text-amber-500">{gapPct.toFixed(1)}%</span> para atingir o benchmark da categoria.
                  </p>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cumulative growth chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Curva de Crescimento Acumulado: Seller vs Categoria
          </h3>
          <TooltipInfo text="Eixo 1: faturamento acumulado do Seller. Eixo 2: benchmark de mercado da categoria. A área entre as curvas representa o gap ou ganho de market share." />
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradSellerGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isGaining ? "hsl(160, 84%, 39%)" : "hsl(199, 100%, 50%)"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isGaining ? "hsl(160, 84%, 39%)" : "hsl(199, 100%, 50%)"} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(40, 95%, 55%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(40, 95%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              interval="preserveStartEnd"
              angle={chartData.length > 8 ? -45 : 0}
              textAnchor={chartData.length > 8 ? "end" : "middle"}
              height={chartData.length > 8 ? 50 : 30} />
            
            <YAxis
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
            
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="Benchmark Categoria"
              stroke="hsl(40, 95%, 55%)"
              fill="url(#gradBenchmark)"
              strokeWidth={2}
              strokeDasharray="6 3"
              animationDuration={800}
              animationEasing="ease-in-out" />
            
            <Area
              type="monotone"
              dataKey="Seller (Acumulado)"
              stroke={isGaining ? "hsl(160, 84%, 39%)" : "hsl(199, 100%, 50%)"}
              fill="url(#gradSellerGrowth)"
              strokeWidth={2.5}
              animationDuration={800}
              animationEasing="ease-in-out" />
            
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>);

};

export default GrowthPotentialPanel;