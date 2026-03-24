import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import TooltipInfo from "./TooltipInfo";
import SalesRecordCard from "./SalesRecordCard";
import TrafficHeatmap from "./TrafficHeatmap";
import BestInvestmentPeriod from "./BestInvestmentPeriod";
import { fmtBRLCompact, fmtBRL, fmtNum, formatChartDate } from "@/utils/formatters";
import { type SellerCampaign, getEffectivenessBadge } from "@/hooks/useMeliCampaigns";
import { type VerticalBenchmark } from "@/hooks/useVerticalBenchmark";
import { Badge } from "@/components/ui/badge";

interface KpiLike {
  date: string;
  revenue: number;
  adsInvestment: number;
  gmv: number;
  tgmv: number;
  roas: number;
  acos: number;
  tacos: number;
  cpa: number;
  productName: string;
  productId: string;
  visits: number;
  tsi: number;
  visitsCheaper?: number;
}

interface EfficiencyPanelProps {
  kpis: KpiLike[];
  sellerCustIdMap?: Record<string, string>;
  dataGranularity?: "consolidated" | "daily";
  campaign?: SellerCampaign | null;
  benchmark?: VerticalBenchmark | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? `R$ ${p.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : p.value}
        </p>
      ))}
    </div>
  );
};

const RatioTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => {
        const isPercent = p.name?.includes("ACOS") || p.name?.includes("TACOS") || p.name?.includes("%");
        const formatted = isPercent
          ? `${p.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
          : fmtNum(p.value, 2);
        return (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {formatted}
          </p>
        );
      })}
    </div>
  );
};

const BenchmarkBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono font-semibold text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number"
            ? label === "Investimento Mensal"
              ? fmtBRLCompact(p.value)
              : label === "ROAS (x)"
                ? `${p.value.toFixed(2)}x`
                : `${p.value.toFixed(2)}%`
            : p.value}
        </p>
      ))}
    </div>
  );
};

const EfficiencyPanel = ({ kpis, sellerCustIdMap, dataGranularity = "daily", campaign, benchmark }: EfficiencyPanelProps) => {

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

  const allDates = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  const adsData = useMemo(() => {
    return allDates.map((d) => ({
      date: formatChartDate(d.date, dataGranularity),
      "Faturamento Bruto": Math.round(d.gmv),
      "Investimento em Marketing": Math.round(d.adsInvestment),
    }));
  }, [allDates, dataGranularity]);

  const roasData = useMemo(() => {
    return allDates.map((d) => ({
      date: formatChartDate(d.date, dataGranularity),
      ROAS: Math.round((d.roas / d.count) * 100) / 100,
      ACOS: Math.round((d.acos / d.count) * 100) / 100,
      TACOS: Math.round((d.tacos / d.count) * 100) / 100,
    }));
  }, [allDates]);

  const totalGmv = kpis.reduce((s, k) => s + k.revenue, 0);
  const totalAds = kpis.reduce((s, k) => s + k.adsInvestment, 0);
  const totalTgmvPads = kpis.reduce((s, k) => s + (k.tgmv || 0), 0);
  const avgRoas = kpis.length > 0 ? kpis.reduce((s, k) => s + k.roas, 0) / kpis.length : 0;
  const avgAcos = kpis.length > 0 ? kpis.reduce((s, k) => s + k.acos, 0) / kpis.length : 0;
  const avgTacos = kpis.length > 0 ? kpis.reduce((s, k) => s + k.tacos, 0) / kpis.length : 0;
  const avgCpa = kpis.length > 0 ? kpis.reduce((s, k) => s + k.cpa, 0) / kpis.length : 0;

  const roi = totalAds > 0 ? ((totalTgmvPads - totalAds) / totalAds) * 100 : 0;
  const totalVisits = kpis.reduce((s, k) => s + (k.visits || 0), 0);
  const cpcProxy = totalVisits > 0 ? totalAds / totalVisits : 0;

  // Campaign benchmarking alerts
  const campaignAlerts = useMemo(() => {
    const alerts: { icon: string; text: string; severity: "success" | "warning" | "critical" }[] = [];
    if (!campaign) return alerts;

    // ACOS vs vertical benchmark
    if (benchmark && benchmark.avgAcos > 0 && avgAcos > 0) {
      if (avgAcos < benchmark.avgAcos) {
        alerts.push({
          icon: "🟢",
          text: `Escala Segura: Seu ACOS (${avgAcos.toFixed(1)}%) está abaixo do mercado (${benchmark.avgAcos.toFixed(1)}%). Pode aumentar o investimento em 20% para ganhar share.`,
          severity: "success",
        });
      }
    }

    if (avgTacos > 10) {
      alerts.push({
        icon: "🔴",
        text: `Alerta de Margem: TACOS ${avgTacos.toFixed(1)}% está consumindo muito do faturamento total. Revisar negativação de palavras e campanhas.`,
        severity: "critical",
      });
    }

    const totalCheaper = kpis.reduce((s, k) => s + ((k as any).visitsCheaper || 0), 0);
    if (totalVisits > 0 && totalCheaper / totalVisits > 0.5 && campaign.efectRtaVertical < 70) {
      alerts.push({
        icon: "⚠️",
        text: `Erro de Algoritmo: Preço baixo (${((totalCheaper / totalVisits) * 100).toFixed(0)}% cheaper) não está gerando ranking. Efetividade ${campaign.efectRtaVertical.toFixed(0)}%. Problema provável de SEO ou Logística.`,
        severity: "warning",
      });
    }

    if (campaign.efectRtaVertical > 100 && totalGmv > 0 && (totalAds / totalGmv) * 100 < 1.5) {
      alerts.push({
        icon: "📈",
        text: `Subaproveitamento de Escala: Efetividade ${campaign.efectRtaVertical.toFixed(0)}% mas Ads é apenas ${((totalAds / totalGmv) * 100).toFixed(1)}% do faturamento. Aumente para sufocar concorrência.`,
        severity: "success",
      });
    }

    return alerts;
  }, [campaign, benchmark, avgAcos, avgTacos, totalGmv, totalAds, totalVisits, kpis]);

  // Benchmark comparison — separate charts for different scales
  const benchmarkInvestmentData = useMemo(() => {
    if (!benchmark) return [];
    return [
      { name: "Seu Investimento", value: Math.round(totalAds) },
      { name: "Média da Categoria", value: Math.round(benchmark.avgInvestment) },
    ];
  }, [benchmark, totalAds]);

  const benchmarkRatioData = useMemo(() => {
    if (!benchmark) return [];
    return [
      {
        metric: "ROAS (x)",
        "Seu Desempenho": Math.round(avgRoas * 100) / 100,
        "Média da Categoria": Math.round(benchmark.avgRoas * 100) / 100,
      },
      {
        metric: "ACOS (%)",
        "Seu Desempenho": Math.round(avgAcos * 100) / 100,
        "Média da Categoria": Math.round(benchmark.avgAcos * 100) / 100,
      },
      {
        metric: "TACOS (%)",
        "Seu Desempenho": Math.round(avgTacos * 100) / 100,
        "Média da Categoria": Math.round(benchmark.avgTacos * 100) / 100,
      },
    ];
  }, [benchmark, avgRoas, avgAcos, avgTacos]);

  const verticalName = campaign?.verticalPrincipal || "—";

  // Build metrics with benchmark sub-text
  const metrics = [
    {
      label: "Faturamento Bruto (GMV)",
      value: fmtBRLCompact(totalGmv),
      color: "neon-text",
      tooltip: "Valor total das vendas brutas no período selecionado.",
      benchmarkText: null,
    },
    {
      label: "ROAS Médio",
      value: fmtNum(avgRoas, 2),
      color: avgRoas >= 2 ? "emerald-text" : "critical-text",
      tooltip: "TGMV_LC_PADS / INV_PADS. Acima de 2x é saudável.",
      benchmarkText: benchmark ? `Mercado (${verticalName}): ${benchmark.avgRoas.toFixed(2)}x` : null,
    },
    {
      label: "ACOS Médio",
      value: `${avgAcos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
      color: avgAcos <= 15 ? "emerald-text" : "critical-text",
      tooltip: "(INV_PADS / TGMV_LC_PADS) × 100. Quanto menor, mais eficiente.",
      benchmarkText: benchmark ? `Mercado (${verticalName}): ${benchmark.avgAcos.toFixed(2)}%` : null,
    },
    {
      label: "TACOS Médio",
      value: `${avgTacos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
      color: avgTacos <= 10 ? "emerald-text" : "critical-text",
      tooltip: "(INV_PADS / TGMV_LC) × 100. Termômetro real da saúde do negócio.",
      benchmarkText: benchmark ? `Mercado (${verticalName}): ${benchmark.avgTacos.toFixed(2)}%` : null,
    },
    {
      label: "CPA Médio",
      value: fmtBRL(avgCpa),
      color: "neon-text",
      tooltip: "Custo por aquisição. INV_PADS / TSI_PADS.",
      benchmarkText: null,
    },
    {
      label: "ROI",
      value: `${roi.toFixed(1)}%`,
      color: roi > 0 ? "emerald-text" : "critical-text",
      tooltip: "(TGMV_LC_PADS − INV_PADS) / INV_PADS × 100.",
      benchmarkText: null,
    },
    {
      label: "CPC Proxy",
      value: fmtBRL(cpcProxy),
      color: "text-muted-foreground",
      tooltip: "INV_PADS / VISITAS. Proxy do custo por clique.",
      benchmarkText: null,
    },
    {
      label: "Investimento em Marketing",
      value: fmtBRLCompact(totalAds),
      color: "text-muted-foreground",
      tooltip: "Total investido em campanhas de Product Ads no período.",
      benchmarkText: benchmark ? `Média da categoria: ${fmtBRLCompact(benchmark.avgInvestment)}` : null,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Campaign Intelligence Alerts */}
      {campaignAlerts.length > 0 && (
        <div className="space-y-2">
          {campaignAlerts.map((alert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-4 border-l-4 ${
                alert.severity === "critical" ? "border-l-destructive bg-destructive/5" :
                alert.severity === "success" ? "border-l-emerald bg-emerald/5" :
                "border-l-warning bg-warning/5"
              }`}
            >
              <p className="text-sm">
                <span className="mr-2">{alert.icon}</span>
                {alert.text}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Vertical Benchmark Card */}
      {campaign && (
        <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Média da sua Categoria</span>
            {campaign.verticalPrincipal && (
              <Badge variant="outline" className="text-xs">{campaign.verticalPrincipal}</Badge>
            )}
            {benchmark && (
              <span className="text-[10px] text-muted-foreground">({benchmark.sellersCount} sellers na vertical)</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Efetividade: </span>
              <span className={`font-bold ${campaign.efectRtaVertical >= 100 ? "text-emerald" : campaign.efectRtaVertical >= 70 ? "text-neon-blue" : "text-destructive"}`}>
                {campaign.efectRtaVertical.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Conv. Vertical: </span>
              <span className="font-bold">{campaign.taxaConversaoVertical.toFixed(2)}%</span>
            </div>
            <Badge className={getEffectivenessBadge(campaign.efectRtaVertical).className}>
              {getEffectivenessBadge(campaign.efectRtaVertical).label}
            </Badge>
          </div>
        </div>
      )}

      {/* KPI Cards with benchmark sub-text */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-1">
              <p className="metric-label">{m.label}</p>
              <TooltipInfo text={m.tooltip} />
            </div>
            <p className={`metric-value mt-1 ${m.color}`}>{m.value}</p>
            {m.benchmarkText && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{m.benchmarkText}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Sales Record + Best Investment Period */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SalesRecordCard kpis={kpis} />
        <BestInvestmentPeriod kpis={kpis} />
      </div>

      {/* Benchmark: Investimento (escala monetária) + Ratios (escala %) */}
      {benchmark && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Investment comparison */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Investimento vs. Mercado
              </h3>
              <Badge variant="outline" className="text-[10px]">{verticalName}</Badge>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={benchmarkInvestmentData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} />
                <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => fmtBRLCompact(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {benchmarkInvestmentData.map((_, i) => (
                    <rect key={i} fill={i === 0 ? "hsl(199, 100%, 50%)" : "hsl(174, 60%, 50%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ROAS / ACOS / TACOS comparison */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Desempenho vs. Média de Mercado
              </h3>
              <TooltipInfo text={`Comparativo com ${benchmark.sellersCount} sellers da vertical ${verticalName}.`} />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={benchmarkRatioData} barGap={4} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
                <XAxis dataKey="metric" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
                <Tooltip content={<BenchmarkBarTooltip />} />
                <Bar dataKey="Seu Desempenho" fill="hsl(199, 100%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="Média da Categoria" fill="hsl(174, 60%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Area Chart — Faturamento vs Ads */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Faturamento Bruto vs Investimento em Marketing
            </h3>
            <TooltipInfo text="Comparativo entre o GMV gerado e o valor investido em Ads ao longo do tempo." />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={adsData}>
            <defs>
              <linearGradient id="gradBlueEff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEmeraldEff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              interval="preserveStartEnd"
              angle={allDates.length > 6 ? -45 : 0}
              textAnchor={allDates.length > 6 ? "end" : "middle"}
              height={allDates.length > 6 ? 50 : 30}
            />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Faturamento Bruto" stroke="hsl(199, 100%, 50%)" fill="url(#gradBlueEff)" strokeWidth={2} animationDuration={800} animationEasing="ease-in-out" />
            <Area type="monotone" dataKey="Investimento em Marketing" stroke="hsl(160, 84%, 39%)" fill="url(#gradEmeraldEff)" strokeWidth={2} animationDuration={800} animationEasing="ease-in-out" />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart — ROAS / ACOS / TACOS */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              ROAS · ACOS · TACOS
            </h3>
            <TooltipInfo text="ROAS: retorno sobre Ads (decimal). ACOS: custo de Ads sobre vendas de Ads (%). TACOS: custo de Ads sobre vendas totais (%)." />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={roasData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              interval="preserveStartEnd"
              angle={allDates.length > 6 ? -45 : 0}
              textAnchor={allDates.length > 6 ? "end" : "middle"}
              height={allDates.length > 6 ? 50 : 30}
            />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
            <Tooltip content={<RatioTooltip />} />
            <Line type="monotone" dataKey="ROAS" stroke="hsl(199, 100%, 50%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={800} animationEasing="ease-in-out" />
            <Line type="monotone" dataKey="ACOS" stroke="hsl(280, 80%, 60%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={800} animationEasing="ease-in-out" />
            <Line type="monotone" dataKey="TACOS" stroke="hsl(40, 95%, 55%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} animationDuration={800} animationEasing="ease-in-out" />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <TrafficHeatmap kpis={kpis} />
    </motion.div>
  );
};

export default EfficiencyPanel;
