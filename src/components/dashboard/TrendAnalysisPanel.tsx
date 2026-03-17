import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend } from
"recharts";
import { TrendingUp, TrendingDown, Zap, BarChart3, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TooltipInfo from "./TooltipInfo";
import PeriodSelector from "./PeriodSelector";
import { startOfWeek, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fmtBRL, fmtBRLCompact, fmtNum } from "@/utils/formatters";

interface KpiLike {
  date: string;
  gmv: number;
  tgmv: number;
  adsInvestment: number;
  roas: number;
  tsi: number;
}

interface TrendAnalysisPanelProps {
  kpis: KpiLike[];
  dataGranularity?: "consolidated" | "daily";
}

type Granularity = "day" | "week";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const gmv = payload.find((p: any) => p.dataKey === "gmv")?.value ?? 0;
  const ads = payload.find((p: any) => p.dataKey === "ads")?.value ?? 0;
  const roas = payload.find((p: any) => p.dataKey === "roas")?.value ?? 0;
  const tgmvAds = payload.find((p: any) => p.dataKey === "tgmvAds")?.value;

  return (
    <div className="glass-card p-4 !bg-card/95 text-xs space-y-2 min-w-[200px]">
      <p className="font-mono text-muted-foreground text-[11px] border-b border-border/50 pb-1.5">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Faturamento Bruto</span>
           <span className="font-mono font-semibold" style={{ color: "hsl(199, 100%, 50%)" }}>
             {fmtBRL(gmv)}
           </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Investimento Ads</span>
           <span className="font-mono font-semibold" style={{ color: "hsl(40, 95%, 55%)" }}>
             {fmtBRL(ads)}
           </span>
        </div>
        {tgmvAds !== undefined &&
        <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Vendas via Ads</span>
             <span className="font-mono font-semibold" style={{ color: "hsl(160, 84%, 39%)" }}>
               {fmtBRL(tgmvAds)}
             </span>
          </div>
        }
        <div className="flex justify-between items-center border-t border-border/50 pt-1.5">
          <span className="text-muted-foreground font-medium">ROI (ROAS)</span>
           <span className={`font-mono font-bold ${roas >= 2 ? "text-emerald" : "text-destructive"}`}>
             {fmtNum(roas)}x
           </span>
        </div>
      </div>
    </div>);

};

function computeCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0,denX = 0,denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

const TrendAnalysisPanel = ({ kpis, dataGranularity = "daily" }: TrendAnalysisPanelProps) => {
  const [period, setPeriod] = useState("30");
  const [granularity, setGranularity] = useState<Granularity>("day");

  const axisLabel = dataGranularity === "consolidated" ? "Meses" : "Dias";

  // Aggregate by date
  const byDate = useMemo(() => {
    const map: Record<string, {date: string;gmv: number;ads: number;tgmvAds: number;roas: number;tsi: number;count: number;}> = {};
    for (const k of kpis) {
      if (!map[k.date]) map[k.date] = { date: k.date, gmv: 0, ads: 0, tgmvAds: 0, roas: 0, tsi: 0, count: 0 };
      map[k.date].gmv += k.gmv;
      map[k.date].ads += k.adsInvestment;
      map[k.date].tgmvAds += k.tgmv; // tgmv as proxy for ads-driven revenue
      map[k.date].roas += k.roas;
      map[k.date].tsi += k.tsi;
      map[k.date].count++;
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [kpis]);

  // Filter by period — relative to the latest date in the dataset (not today)
  const filteredData = useMemo(() => {
    if (period === "all" || isNaN(parseInt(period)) || byDate.length === 0) {
      return byDate;
    }
    const days = parseInt(period);
    const latestDateStr = byDate[byDate.length - 1].date; // already sorted asc
    const [ly, lm, ld] = latestDateStr.split("-").map(Number);
    const latestDate = new Date(ly, lm - 1, ld);
    const cutoffDate = new Date(ly, lm - 1, ld - days);
    const cutoffStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}-${String(cutoffDate.getDate()).padStart(2, "0")}`;
    return byDate.filter((d) => d.date >= cutoffStr);
  }, [byDate, period]);

  // Group by granularity
  const chartData = useMemo(() => {
    if (granularity === "day") {
      return filteredData.map((d) => {
        const [, m, day] = d.date.split("-");
        return {
          label: `${day}/${m}`,
          gmv: Math.round(d.gmv),
          ads: Math.round(d.ads),
          tgmvAds: Math.round(d.tgmvAds),
          roas: d.count > 0 ? Math.round(d.roas / d.count * 100) / 100 : 0
        };
      });
    }

    // Week grouping
    const weeks: Record<string, {label: string;gmv: number;ads: number;tgmvAds: number;roas: number;count: number;}> = {};
    for (const d of filteredData) {
      const parsed = parseISO(d.date);
      const weekStart = startOfWeek(parsed, { locale: ptBR });
      const key = format(weekStart, "yyyy-MM-dd");
      const weekLabel = `Sem ${format(weekStart, "dd/MM")}`;
      if (!weeks[key]) weeks[key] = { label: weekLabel, gmv: 0, ads: 0, tgmvAds: 0, roas: 0, count: 0 };
      weeks[key].gmv += d.gmv;
      weeks[key].ads += d.ads;
      weeks[key].tgmvAds += d.tgmvAds;
      weeks[key].roas += d.roas;
      weeks[key].count += d.count;
    }
    return Object.entries(weeks).
    sort(([a], [b]) => a.localeCompare(b)).
    map(([, w]) => ({
      label: w.label,
      gmv: Math.round(w.gmv),
      ads: Math.round(w.ads),
      tgmvAds: Math.round(w.tgmvAds),
      roas: w.count > 0 ? Math.round(w.roas / w.count * 100) / 100 : 0
    }));
  }, [filteredData, granularity]);

  // Insights calculations
  const insights = useMemo(() => {
    if (filteredData.length < 2) {
      return {
        efficiency: null,
        correlation: null,
        correlationLabel: "Dados insuficientes",
        correlationColor: "text-muted-foreground",
        totalGmv: filteredData.reduce((s, d) => s + d.gmv, 0),
        totalAds: filteredData.reduce((s, d) => s + d.ads, 0),
        avgRoas: filteredData.length > 0 ?
        filteredData.reduce((s, d) => s + d.roas / d.count, 0) / filteredData.length :
        0
      };
    }

    const gmvs = filteredData.map((d) => d.gmv);
    const adss = filteredData.map((d) => d.ads);
    const totalGmv = gmvs.reduce((a, b) => a + b, 0);
    const totalAds = adss.reduce((a, b) => a + b, 0);
    const avgRoas = filteredData.reduce((s, d) => s + d.roas / d.count, 0) / filteredData.length;

    // Efficiency of scale: marginal GMV per marginal Ads R$
    const gmvDelta = gmvs[gmvs.length - 1] - gmvs[0];
    const adsDelta = adss[adss.length - 1] - adss[0];
    const efficiency = adsDelta !== 0 ? gmvDelta / adsDelta : null;

    // Correlation
    const corr = computeCorrelation(adss, gmvs);
    let correlationLabel = "Dados insuficientes";
    let correlationColor = "text-muted-foreground";
    if (Math.abs(corr) >= 0.7) {
      correlationLabel = "Correlação Alta";
      correlationColor = "emerald-text";
    } else if (Math.abs(corr) >= 0.4) {
      correlationLabel = "Correlação Moderada";
      correlationColor = "warning-text";
    } else {
      correlationLabel = "Investimento Ineficiente";
      correlationColor = "critical-text";
    }

    return { efficiency, correlation: corr, correlationLabel, correlationColor, totalGmv, totalAds, avgRoas };
  }, [filteredData]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Evolução Temporal e Correlação de Performance
          </h3>
          <TooltipInfo text="Análise cruzada entre Faturamento Bruto, Investimento em Ads e ROAS ao longo do tempo. Identifique padrões de eficiência e oportunidades de otimização." />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Composed Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                GMV × Ads × ROAS
              </p>
              <Badge variant="outline" className="text-[10px] px-2 py-0 font-mono border-primary/30 text-primary">
                {axisLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Granularity toggle */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                <button
                  onClick={() => setGranularity("day")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  granularity === "day" ?
                  "bg-primary/15 text-primary" :
                  "text-muted-foreground hover:text-foreground"}`
                  }>
                  
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Dia
                </button>
                <button
                  onClick={() => setGranularity("week")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  granularity === "week" ?
                  "bg-primary/15 text-primary" :
                  "text-muted-foreground hover:text-foreground"}`
                  }>
                  
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Semana
                </button>
              </div>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>
          </div>

          {chartData.length === 0 ?
          <div className="flex items-center justify-center h-[340px] text-muted-foreground text-sm">
              Sem dados disponíveis para o período selecionado
            </div> :

          <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} key={`${period}-${granularity}`}>
                <defs>
                  <linearGradient id="gradGmvBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(199, 100%, 55%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(199, 100%, 35%)" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" vertical={false} />
                <XAxis
                dataKey="label"
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                angle={chartData.length > 8 ? -45 : 0}
                textAnchor={chartData.length > 8 ? "end" : "middle"}
                height={chartData.length > 8 ? 50 : 30}
                label={{ value: `Eixo X: ${axisLabel}`, position: "insideBottomRight", offset: 0, fill: "hsl(215, 20%, 55%)", fontSize: 10 }} />
              
                <YAxis
                yAxisId="left"
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                width={55} />
              
                <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "hsl(40, 95%, 55%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                width={55} />
              
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(215, 25%, 14%, 0.3)" }} />
                <Legend
                wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8} />
              
                <Bar
                yAxisId="left"
                dataKey="gmv"
                name="Faturamento Bruto"
                fill="url(#gradGmvBar)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                animationDuration={800}
                animationEasing="ease-in-out" />
              
                <Line
                yAxisId="right"
                type="monotone"
                dataKey="ads"
                name="Investimento Ads"
                stroke="hsl(40, 95%, 55%)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(40, 95%, 55%)", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(40, 95%, 65%)" }}
                animationDuration={800}
                animationEasing="ease-in-out" />
              
                <Line
                yAxisId="left"
                type="monotone"
                dataKey="roas"
                name="ROAS"
                stroke="hsl(280, 80%, 60%)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: "hsl(280, 80%, 60%)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                animationDuration={800}
                animationEasing="ease-in-out" />
              
              </ComposedChart>
            </ResponsiveContainer>
          }
        </div>

        {/* Insights Panel */}
        <div className="space-y-3">
          {/* ROAS Overview */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card-highlight p-4">
            
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <p className="metric-label text-secondary">Insights Rápidos</p>
              <TooltipInfo text="Análise inteligente da relação entre investimento em Ads e retorno de faturamento." />
            </div>

            <div className="space-y-4">
              {/* ROAS médio */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">ROAS Médio do Período</p>
                 <p className={`text-2xl font-mono font-bold ${insights.avgRoas >= 2 ? "emerald-text" : "critical-text"}`}>
                   {fmtNum(insights.avgRoas)}x
                 </p>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Faturamento Total</p>
                   <p className="text-sm font-mono font-semibold neon-text">
                     {fmtBRLCompact(insights.totalGmv)}
                   </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Total Investido</p>
                   <p className="text-sm font-mono font-semibold" style={{ color: "hsl(40, 95%, 55%)" }}>
                     {fmtBRLCompact(insights.totalAds)}
                   </p>
                </div>
              </div>

              {/* Investimento Ideal 3% */}
              <div className="border-t border-border/50 pt-3 space-y-2">
                <p className="text-[11px] text-muted-foreground mb-1">Investimento Ideal (3% do Faturamento)</p>
                <div className="flex items-center justify-between">
                   <p className="text-lg font-mono font-bold text-primary">
                     {fmtBRLCompact(insights.totalGmv * 0.03)}
                   </p>
                  {insights.totalGmv > 0 &&
                  <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                  insights.totalAds <= insights.totalGmv * 0.03 ?
                  "bg-emerald/10 emerald-text" :
                  "bg-destructive/10 critical-text"}`
                  }>
                      {insights.totalAds <= insights.totalGmv * 0.03 ?
                    `${(insights.totalAds / (insights.totalGmv * 0.03) * 100).toFixed(0)}% utilizado` :
                    `${((insights.totalAds - insights.totalGmv * 0.03) / (insights.totalGmv * 0.03) * 100).toFixed(0)}% acima`
                    }
                    </span>
                  }
                </div>
                <div className="w-full bg-muted/50 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                    insights.totalAds <= insights.totalGmv * 0.03 ? "bg-emerald" : "bg-destructive"}`
                    }
                    style={{ width: `${Math.min(insights.totalGmv > 0 ? insights.totalAds / (insights.totalGmv * 0.03) * 100 : 0, 100)}%` }} />
                  
                </div>
              </div>
            </div>
          </motion.div>

          {/* Efficiency of Scale */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4">
            
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald" />
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                Eficiência de Escala
              </p>
            </div>
            {insights.efficiency !== null ?
            <div className="space-y-2">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Para cada <span className="font-mono font-semibold neon-text">R$ 1,00</span> investido a mais em Ads, o Faturamento Bruto
                  {insights.efficiency >= 0 ? " cresceu " : " caiu "}
                  <span className={`font-mono font-bold ${insights.efficiency >= 1 ? "emerald-text" : "critical-text"}`}>
                    {Math.abs(insights.efficiency).toFixed(1)}x
                  </span>
                </p>
                <div className="flex items-center gap-1.5">
                  {insights.efficiency >= 1 ?
                <TrendingUp className="w-3.5 h-3.5 text-emerald" /> :

                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                }
                  <span className={`text-[11px] font-medium ${
                insights.efficiency >= 1 ? "emerald-text" : "critical-text"}`
                }>
                    {insights.efficiency >= 2 ? "Escala Excelente" : insights.efficiency >= 1 ? "Escala Positiva" : "Retorno Negativo"}
                  </span>
                </div>
              </div> :

            <p className="text-xs text-muted-foreground">
                Dados insuficientes para calcular eficiência de escala. São necessários ao menos 2 períodos.
              </p>
            }
          </motion.div>

          {/* Correlation */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4">
            
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                Correlação GMV × Ads
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-lg font-mono font-bold ${insights.correlationColor}`}>
                  {insights.correlationLabel}
                </p>
                {insights.correlation !== null &&
                <p className="text-[11px] text-muted-foreground mt-0.5">
                    Coeficiente: <span className="font-mono">{insights.correlation.toFixed(3)}</span>
                  </p>
                }
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              insights.correlation !== null && insights.correlation >= 0.7 ?
              "bg-emerald/10" :
              insights.correlation !== null && insights.correlation >= 0.4 ?
              "bg-warning/10" :
              "bg-destructive/10"}`
              }>
                {insights.correlation !== null && insights.correlation >= 0.7 ?
                <TrendingUp className="w-5 h-5 text-emerald" /> :
                insights.correlation !== null && insights.correlation >= 0.4 ?
                <TrendingUp className="w-5 h-5 text-warning" /> :

                <TrendingDown className="w-5 h-5 text-destructive" />
                }
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>);

};

export default TrendAnalysisPanel;