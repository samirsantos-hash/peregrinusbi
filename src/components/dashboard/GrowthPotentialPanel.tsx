import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Crown, Target, BarChart3, Rocket } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import GaugeChart from "./GaugeChart";
import { Badge } from "@/components/ui/badge";
import { fmtBRLCompact, formatChartDate } from "@/utils/formatters";
import type { SellerCampaign } from "@/hooks/useMeliCampaigns";
import type { VerticalBenchmark } from "@/hooks/useVerticalBenchmark";
import { AlgoTooltip } from "@/components/ui/AlgoTooltip";

interface KpiLike {
  date: string;
  gmv: number;
  revenue: number;
  cdpTgmv: number;
  upliftGmvM1: number;
  gmvM1: number;
  // optional fields used by the 6-dimension matrix
  roas?: number;
  acos?: number;
  tsi?: number;
  visits?: number;
  pctFull?: number;
  repClaimsRate?: number;
  repDelayedRate?: number;
  adsInvestment?: number;
  tgmvPads?: number;
}

interface GrowthPotentialPanelProps {
  kpis: KpiLike[];
  dataGranularity?: "consolidated" | "daily";
  campaign?: SellerCampaign | null;
  benchmark?: VerticalBenchmark | null;
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

function getStrategicInsight(potentialPct: number): StrategicInsight {
  if (potentialPct >= 150) {
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
    return {
      label: "Performance Excedente",
      sublabel: "🚀 Seller acima da meta! Oportunidade para otimizar margem (testar aumento de preço ou redução de descontos) em vez de focar apenas em volume.",
      icon: Rocket,
      color: "text-emerald",
      bgColor: "bg-emerald/5",
      borderColor: "border-emerald/20",
    };
  }
  if (potentialPct >= 70) {
    return {
      label: "Gap de Vendas",
      sublabel: "O seller está próximo ao potencial. Ajustes em Ads, preço ou logística podem fechar esse gap.",
      icon: BarChart3,
      color: "text-amber-500",
      bgColor: "bg-amber-500/5",
      borderColor: "border-amber-500/20",
    };
  }
  return {
    label: "Potencial de Recuperação",
    sublabel: "Existe um potencial significativo de crescimento para este seller. Invista em visibilidade e competitividade.",
    icon: TrendingDown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/5",
    borderColor: "border-amber-500/20",
  };
}

const GrowthPotentialPanel = ({ kpis, dataGranularity = "daily", campaign, benchmark }: GrowthPotentialPanelProps) => {
  // Primary source: Efect Rta Vertical from meli_campaigns
  const hasCampaignData = !!campaign && campaign.efectRtaVertical > 0;

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

    // If we have campaign data, use efectRtaVertical as the potentialPct directly
    const efectPct = hasCampaignData ? campaign!.efectRtaVertical : 0;

    const byDate: Record<string, { sellerGmv: number; benchmarkGmv: number }> = {};

    for (const k of kpis) {
      if (!byDate[k.date]) byDate[k.date] = { sellerGmv: 0, benchmarkGmv: 0 };
      byDate[k.date].sellerGmv += k.revenue;

      if (hasCampaignData) {
        // Benchmark = seller revenue / (efectRtaVertical / 100) — reverse-engineer category potential
        const benchmarkRevenue = efectPct > 0 ? k.revenue / (efectPct / 100) : k.revenue;
        byDate[k.date].benchmarkGmv += benchmarkRevenue;
      } else {
        const cdp = k.cdpTgmv || 0;
        if (cdp > 0) {
          byDate[k.date].benchmarkGmv += cdp;
        } else {
          const uplift = k.upliftGmvM1 || 0;
          const estimated = k.revenue * (1 + Math.abs(uplift) * 0.5 + 0.15);
          byDate[k.date].benchmarkGmv += estimated;
        }
      }
    }

    const sortedDates = Object.keys(byDate).sort();

    let cumSeller = 0;
    let cumBenchmark = 0;
    const data = sortedDates.map((date) => {
      cumSeller += byDate[date].sellerGmv;
      cumBenchmark += byDate[date].benchmarkGmv;
      const label = formatChartDate(date, dataGranularity);
      return {
        date: label,
        "Seller (Acumulado)": Math.round(cumSeller),
        "Benchmark Vertical": Math.round(cumBenchmark),
      };
    });

    const sTotal = cumSeller;
    const bTotal = cumBenchmark;

    // Use efectRtaVertical directly if available, otherwise compute from totals
    const pct = hasCampaignData ? efectPct : (bTotal > 0 ? (sTotal / bTotal) * 100 : 0);
    const gaining = pct >= 100;
    const gauge = Math.min(100, Math.round(pct));

    return {
      chartData: data,
      sellerTotal: sTotal,
      benchmarkTotal: bTotal,
      potentialPct: pct,
      isGaining: gaining,
      gaugeValue: gauge,
    };
  }, [kpis, hasCampaignData, campaign]);

  if (kpis.length === 0) {
    return (
      <div className="glass-card p-5 text-center text-muted-foreground text-sm">
        Dados insuficientes para análise de potencial de crescimento.
      </div>
    );
  }

  const insight = getStrategicInsight(potentialPct);
  const InsightIcon = insight.icon;

  const gapPct = Math.abs(100 - potentialPct);
  const isExceedent = potentialPct > 100;
  const overflowPct = isExceedent ? potentialPct - 100 : 0;

  const insightText = isExceedent
    ? `O Seller está operando a ${potentialPct.toFixed(1)}% do potencial da categoria — superando o benchmark!`
    : `O Seller está operando a ${potentialPct.toFixed(1)}% do potencial total da categoria`;

  // ---------------------------------------------------------------
  // 6-Dimension matrix vs vertical (junior-friendly)
  // ---------------------------------------------------------------
  const matriz = useMemo(() => {
    if (!kpis.length) return [];
    const totalGmv = kpis.reduce((s, k) => s + (k.gmv || 0), 0);
    const totalAds = kpis.reduce((s, k) => s + (k.adsInvestment || 0), 0);
    const totalTgmvPads = kpis.reduce((s, k) => s + (k.tgmvPads || 0), 0);
    const totalTsi = kpis.reduce((s, k) => s + (k.tsi || 0), 0);
    const totalVisits = kpis.reduce((s, k) => s + (k.visits || 0), 0);

    const sellerRoas = totalAds > 0 ? totalTgmvPads / totalAds : 0;
    const sellerAcos = totalTgmvPads > 0 ? (totalAds / totalTgmvPads) * 100 : 0;
    const sellerConv = totalVisits > 0 ? (totalTsi / totalVisits) * 100 : 0;
    const sellerFull = kpis.reduce((s, k) => s + (k.pctFull || 0), 0) / kpis.length;
    const sellerRep =
      kpis.reduce((s, k) => s + (k.repClaimsRate || 0) + (k.repDelayedRate || 0), 0) /
      Math.max(1, kpis.length);

    type Row = {
      label: string;
      sellerLabel: string;
      benchLabel: string;
      ratio: number; // 0..1.5 (1 = at benchmark)
      status: "ok" | "warn" | "crit";
      tooltipKey?: string;
    };
    const statusFromRatio = (r: number, higherBetter = true): Row["status"] => {
      const norm = higherBetter ? r : r === 0 ? 0 : 1 / r;
      if (norm >= 0.95) return "ok";
      if (norm >= 0.7) return "warn";
      return "crit";
    };

    const rows: Row[] = [];

    // 1. GMV vs benchmark da vertical (efectRtaVertical fornece a relação direta)
    if (campaign?.efectRtaVertical && campaign.efectRtaVertical > 0) {
      const r = campaign.efectRtaVertical / 100;
      rows.push({
        label: "GMV vs Vertical",
        sellerLabel: fmtBRLCompact(totalGmv),
        benchLabel: `${campaign.efectRtaVertical.toFixed(0)}% do potencial`,
        ratio: Math.min(1.5, r),
        status: statusFromRatio(r),
      });
    }

    // 2. ROAS vs avgRoas
    if (benchmark?.avgRoas) {
      const r = sellerRoas / benchmark.avgRoas;
      rows.push({
        label: "ROAS vs Vertical",
        sellerLabel: `${sellerRoas.toFixed(2)}x`,
        benchLabel: `${benchmark.avgRoas.toFixed(2)}x`,
        ratio: Math.min(1.5, r),
        status: statusFromRatio(r),
        tooltipKey: "roas",
      });
    }

    // 3. ACOS vs avgAcos (menor é melhor)
    if (benchmark?.avgAcos && sellerAcos > 0) {
      const r = benchmark.avgAcos / sellerAcos; // invertido: benchmark/seller
      rows.push({
        label: "ACOS vs Vertical",
        sellerLabel: `${sellerAcos.toFixed(1)}%`,
        benchLabel: `${benchmark.avgAcos.toFixed(1)}%`,
        ratio: Math.min(1.5, r),
        status: statusFromRatio(r),
        tooltipKey: "acos",
      });
    }

    // 4. Share Full vs 60% (algoritmo MELI prioriza Full)
    rows.push({
      label: "Share Full",
      sellerLabel: `${sellerFull.toFixed(1)}%`,
      benchLabel: "≥ 60%",
      ratio: Math.min(1.5, sellerFull / 60),
      status: statusFromRatio(sellerFull / 60),
      tooltipKey: "shareFullPct",
    });

    // 5. Conversão (TSI/Visits) vs 5% referência
    rows.push({
      label: "Conversão (TSI/Visits)",
      sellerLabel: `${sellerConv.toFixed(2)}%`,
      benchLabel: "≥ 5%",
      ratio: Math.min(1.5, sellerConv / 5),
      status: statusFromRatio(sellerConv / 5),
    });

    // 6. Reputação (claims+delayed combinado, menor é melhor — referência 5%)
    if (sellerRep > 0) {
      const r = 5 / Math.max(0.1, sellerRep);
      rows.push({
        label: "Reputação (Claims+Atrasos)",
        sellerLabel: `${sellerRep.toFixed(2)}%`,
        benchLabel: "≤ 5%",
        ratio: Math.min(1.5, r),
        status: statusFromRatio(r),
      });
    }

    return rows;
  }, [kpis, campaign, benchmark]);

  const statusColor = (s: "ok" | "warn" | "crit") =>
    s === "ok"
      ? "bg-emerald"
      : s === "warn"
      ? "bg-warning"
      : "bg-destructive";
  const statusText = (s: "ok" | "warn" | "crit") =>
    s === "ok"
      ? "Saudável"
      : s === "warn"
      ? "Atenção"
      : "Crítico";
  const statusTextColor = (s: "ok" | "warn" | "crit") =>
    s === "ok"
      ? "text-emerald"
      : s === "warn"
      ? "text-warning"
      : "text-destructive";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Top row: Gauge + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Gauge */}
        <div className="glass-card p-5 flex flex-col items-center justify-center">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Efetividade da Vertical
          </h3>
          <GaugeChart
            value={gaugeValue}
            label="Potencial Realizado"
            color={isGaining ? "emerald" : "blue"}
            max={100}
          />
          {/* Overflow indicator */}
          {isExceedent && (
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-emerald/20 text-emerald border-emerald/30 border text-xs font-mono">
                +{overflowPct.toFixed(1)}% acima
              </Badge>
            </div>
          )}
          {/* Vertical name */}
          {campaign?.verticalPrincipal && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Vertical: <span className="font-semibold text-foreground">{campaign.verticalPrincipal}</span>
            </p>
          )}
          {/* Data source badge */}
          <Badge variant="outline" className="mt-2 text-[9px] border-border">
            {hasCampaignData ? "Fonte: Efect Rta Vertical" : "Fonte: CDP estimado"}
          </Badge>
        </div>

        {/* Insight card */}
        <div className="glass-card p-5 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Potencial de Crescimento vs Vertical
              </h3>
              <TooltipInfo text="Compara a efetividade real do Seller com o benchmark da vertical principal (Efect Rta Vertical). Valores acima de 100% indicam que o seller supera o mercado." />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento Seller</p>
                <p className="text-lg font-bold font-mono text-foreground mt-1">{fmtBRLCompact(sellerTotal)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {hasCampaignData ? "Benchmark Vertical" : "Benchmark Categoria"}
                </p>
                <p className="text-lg font-bold font-mono text-foreground mt-1">{fmtBRLCompact(benchmarkTotal)}</p>
                {campaign?.verticalPrincipal && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{campaign.verticalPrincipal}</p>
                )}
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
                  {isExceedent && (
                    <span className="ml-2 font-mono text-xs">({potentialPct.toFixed(1)}%)</span>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5 text-base">
                  {insightText}
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {insight.sublabel}
                </p>
                {!isGaining && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Gap de <span className={`font-mono font-semibold ${insight.color}`}>{gapPct.toFixed(1)}%</span> para atingir o benchmark da vertical.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar with overflow */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Efetividade vs Vertical</span>
          <span className="text-xs font-mono font-bold">{potentialPct.toFixed(1)}%</span>
        </div>
        <div className="relative w-full h-3 bg-muted/40 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isExceedent ? "bg-emerald" : potentialPct >= 70 ? "bg-warning" : "bg-destructive"}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(potentialPct, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        {isExceedent && (
          <div className="flex items-center justify-end mt-1 gap-1">
            <Badge className="bg-emerald/10 text-emerald border-emerald/20 border text-[10px]">
              🏆 Overflow: +{overflowPct.toFixed(1)}% acima do benchmark
            </Badge>
          </div>
        )}
      </div>

      {/* Cumulative growth chart */}
      <div className="glass-card p-5">
        {/* 6-Dimension Matrix vs Vertical */}
      </div>

      {matriz.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Matriz de 6 Dimensões vs Vertical
            </h3>
            <TooltipInfo text="Leitura junior: cada dimensão mostra o desempenho do seller comparado à referência da vertical (mediana ou threshold do algoritmo MELI). Verde = saudável, Amarelo = atenção, Vermelho = crítico." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matriz.map((row) => (
              <div
                key={row.label}
                className="bg-muted/20 rounded-lg p-3 border border-border/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{row.label}</span>
                    {row.tooltipKey && <AlgoTooltip tooltipKey={row.tooltipKey as any} />}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] border ${statusTextColor(row.status)} bg-transparent`}
                  >
                    {statusText(row.status)}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between text-[11px] mb-1.5">
                  <span className="font-mono font-bold text-foreground">{row.sellerLabel}</span>
                  <span className="text-muted-foreground">ref: {row.benchLabel}</span>
                </div>
                <div className="relative w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${statusColor(row.status)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, row.ratio * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cumulative growth chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Curva de Crescimento Acumulado: Seller vs Vertical
          </h3>
          <TooltipInfo text="Eixo 1: faturamento acumulado do Seller. Eixo 2: benchmark da vertical. A área entre as curvas representa o gap ou ganho de market share." />
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
              dataKey="Benchmark Vertical"
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
