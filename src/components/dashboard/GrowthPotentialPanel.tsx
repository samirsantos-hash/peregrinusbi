import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Crown, Target, BarChart3 } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import GaugeChart from "./GaugeChart";
import { fmtBRLCompact, formatChartDate } from "@/utils/formatters";

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
  dataGranularity?: "consolidated" | "daily";
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
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Strategic label logic                                              */
/* ------------------------------------------------------------------ */
interface StrategicInsight {
  label: string;
  sublabel: string;
  icon: typeof TrendingUp;
  color: string;
  bgColor: string;
  borderColor: string;
}

function getStrategicInsight(potentialPct: number, isGaining: boolean): StrategicInsight {
  if (potentialPct >= 150) {
    // Seller massively above benchmark
    return {
      label: "Líder de Categoria",
      sublabel: "Este seller domina o nicho. Para crescer mais, considere expandir o mix de produtos.",
      icon: Crown,
      color: "text-emerald",
      bgColor: "bg-emerald/5",
      borderColor: "border-emerald/20",
    };
  }
  if (potentialPct >= 120) {
    // Well above benchmark
    return {
      label: "Teto de Mercado Ativado",
      sublabel: "O seller já domina o nicho atual. Para crescer, considere novos produtos (mix) ou otimize margem.",
      icon: Target,
      color: "text-neon-blue",
      bgColor: "bg-neon-blue/5",
      borderColor: "border-neon-blue/20",
    };
  }
  if (potentialPct >= 100) {
    // Above benchmark — performance excedente
    return {
      label: "Performance Excedente",
      sublabel: "Seller acima da meta! Oportunidade para otimizar margem (testar aumento de preço) em vez de volume.",
      icon: TrendingUp,
      color: "text-emerald",
      bgColor: "bg-emerald/5",
      borderColor: "border-emerald/20",
    };
  }
  if (potentialPct >= 70) {
    // Close to benchmark — gap de vendas
    return {
      label: "Gap de Vendas",
      sublabel: "O seller está próximo ao potencial. Ajustes em Ads, preço ou logística podem fechar esse gap.",
      icon: BarChart3,
      color: "text-amber-500",
      bgColor: "bg-amber-500/5",
      borderColor: "border-amber-500/20",
    };
  }
  // Well below benchmark
  return {
    label: "Potencial de Recuperação",
    sublabel: "Existe um potencial significativo de crescimento para este seller. Invista em visibilidade e competitividade.",
    icon: TrendingDown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/5",
    borderColor: "border-amber-500/20",
  };
}

const GrowthPotentialPanel = ({ kpis }: GrowthPotentialPanelProps) => {
  const {
    chartData,
    sellerTotal,
    benchmarkTotal,
    potentialPct,
    isGaining,
    gaugeValue,
  } = useMemo(() => {
    if (kpis.length === 0) {
      return { chartData: [], sellerTotal: 0, benchmarkTotal: 0, potentialPct: 0, isGaining: false, gaugeValue: 0 };
    }

    const byDate: Record<string, { sellerGmv: number; benchmarkGmv: number }> = {};

    for (const k of kpis) {
      if (!byDate[k.date]) byDate[k.date] = { sellerGmv: 0, benchmarkGmv: 0 };
      byDate[k.date].sellerGmv += k.revenue;
      const cdp = k.cdpTgmv || 0;
      if (cdp > 0) {
        byDate[k.date].benchmarkGmv += cdp;
      } else {
        const uplift = k.upliftGmvM1 || 0;
        const estimated = k.revenue * (1 + Math.abs(uplift) * 0.5 + 0.15);
        byDate[k.date].benchmarkGmv += estimated;
      }
    }

    const sortedDates = Object.keys(byDate).sort();

    let cumSeller = 0;
    let cumBenchmark = 0;
    const data = sortedDates.map((date) => {
      cumSeller += byDate[date].sellerGmv;
      cumBenchmark += byDate[date].benchmarkGmv;
      const [m, d] = date.slice(5).split("-");
      return {
        date: `${d}/${m}`,
        "Seller (Acumulado)": Math.round(cumSeller),
        "Benchmark Categoria": Math.round(cumBenchmark),
      };
    });

    const sTotal = cumSeller;
    const bTotal = cumBenchmark;
    const gaining = sTotal >= bTotal;
    const pct = bTotal > 0 ? (sTotal / bTotal) * 100 : 0;
    const gauge = Math.min(100, Math.round(pct));

    return {
      chartData: data,
      sellerTotal: sTotal,
      benchmarkTotal: bTotal,
      potentialPct: pct,
      isGaining: gaining,
      gaugeValue: gauge,
    };
  }, [kpis]);

  if (kpis.length === 0) {
    return (
      <div className="glass-card p-5 text-center text-muted-foreground text-sm">
        Dados insuficientes para análise de potencial de crescimento.
      </div>
    );
  }

  const insight = getStrategicInsight(potentialPct, isGaining);
  const InsightIcon = insight.icon;

  const gapPct = Math.abs(100 - potentialPct);
  const insightText =
    potentialPct >= 100
      ? `O Seller está operando a ${potentialPct.toFixed(1)}% do potencial da categoria — superando o benchmark!`
      : `O Seller está operando a ${potentialPct.toFixed(1)}% do potencial total da categoria`;

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
            max={100}
          />
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

          {/* Strategic Insight */}
          <div className={`rounded-lg p-4 border ${insight.bgColor} ${insight.borderColor}`}>
            <div className="flex items-center gap-2">
              <InsightIcon className={`w-5 h-5 ${insight.color} shrink-0`} />
              <div>
                <p className={`text-sm font-semibold ${insight.color}`}>
                  {insight.label}
                </p>
                <p className="text-muted-foreground mt-0.5 text-base">
                  {insightText}
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {insight.sublabel}
                </p>
                {!isGaining && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Gap de <span className={`font-mono font-semibold ${insight.color}`}>{gapPct.toFixed(1)}%</span> para atingir o benchmark da categoria.
                  </p>
                )}
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
              height={chartData.length > 8 ? 50 : 30}
            />
            <YAxis
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `${(v / 1e6).toFixed(1)}M`
                  : v >= 1000
                  ? `${(v / 1000).toFixed(0)}K`
                  : String(v)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="Benchmark Categoria"
              stroke="hsl(40, 95%, 55%)"
              fill="url(#gradBenchmark)"
              strokeWidth={2}
              strokeDasharray="6 3"
              animationDuration={800}
              animationEasing="ease-in-out"
            />
            <Area
              type="monotone"
              dataKey="Seller (Acumulado)"
              stroke={isGaining ? "hsl(160, 84%, 39%)" : "hsl(199, 100%, 50%)"}
              fill="url(#gradSellerGrowth)"
              strokeWidth={2.5}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default GrowthPotentialPanel;
