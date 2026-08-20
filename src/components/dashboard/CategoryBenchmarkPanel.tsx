import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import TooltipInfo from "./TooltipInfo";
import { fmtBRLCompact, fmtNum } from "@/utils/formatters";
import { type PortfolioBenchmark, type VerticalStats } from "@/hooks/usePortfolioBenchmark";
import { type SellerCampaign } from "@/hooks/useMeliCampaigns";
import { type VerticalBenchmark } from "@/hooks/useVerticalBenchmark";
import { type ClusterBenchmarkResult, getPercentileBadge } from "@/hooks/useClusterBenchmark";
import { Loader2, TrendingUp, Users, Target, BarChart3, Award } from "lucide-react";
import { CONVERSION_MARKET_BAND } from "@/lib/marketBands";
import { percentilDoValor, reconciliarAcos } from "@/lib/ratioStats";

interface Props {
  portfolioBenchmark: PortfolioBenchmark | null;
  loading: boolean;
  campaign: SellerCampaign | null;
  sellerBenchmark: VerticalBenchmark | null;
  sellerMetrics: {
    totalGmv: number;
    totalAds: number;
    avgRoas: number;
    avgAcos: number;
    avgTacos: number;
  };
  clusterBenchmark?: ClusterBenchmarkResult | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono font-semibold text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number"
            ? p.dataKey?.includes("Inv") || p.dataKey?.includes("GMV") || p.dataKey?.includes("Faturamento")
              ? fmtBRLCompact(p.value)
              : p.dataKey?.includes("ROAS") || p.dataKey?.includes("roas")
                ? `${p.value.toFixed(2)}x`
                : `${p.value.toFixed(2)}%`
            : p.value}
        </p>
      ))}
    </div>
  );
};

const CategoryBenchmarkPanel = ({ portfolioBenchmark, loading, campaign, sellerBenchmark, sellerMetrics, clusterBenchmark }: Props) => {
  const verticals = portfolioBenchmark?.verticals || [];
  const portfolio = portfolioBenchmark?.portfolio || { totalSellers: 0, avgInv: 0, avgRoas: 0, avgAcos: 0, avgTacos: 0 };
  const stats = portfolioBenchmark?.stats || null;
  // Agregados da carteira = razão dos totais (nunca média de razões).
  const cartRoas = stats?.roasAgregado ?? 0;
  const cartAcos = stats?.acosAgregado ?? 0;
  const cartTacos = stats?.tacosAgregado ?? 0;
  const sellerVertical = campaign?.verticalPrincipal || null;
  const cb = clusterBenchmark;

  // Find the seller's own vertical stats
  const myVertical = useMemo(() => {
    if (!sellerVertical) return null;
    return verticals.find((v) => v.vertical === sellerVertical) || null;
  }, [verticals, sellerVertical]);

  // Radar chart: seller vs their vertical vs portfolio
  const radarData = useMemo(() => {
    if (!sellerVertical || !sellerBenchmark || !myVertical) return [];

    const maxRoas = Math.max(sellerMetrics.avgRoas, myVertical.avgRoas, portfolio.avgRoas, 1);
    const maxAcos = Math.max(sellerMetrics.avgAcos, myVertical.avgAcos, portfolio.avgAcos, 1);
    const maxTacos = Math.max(sellerMetrics.avgTacos, myVertical.avgTacos, portfolio.avgTacos, 1);
    const maxInv = Math.max(sellerMetrics.totalAds, myVertical.avgInv, portfolio.avgInv, 1);

    return [
      {
        metric: "ROAS",
        Seller: (sellerMetrics.avgRoas / maxRoas) * 100,
        [`Vertical (${sellerVertical})`]: (myVertical.avgRoas / maxRoas) * 100,
        Carteira: (portfolio.avgRoas / maxRoas) * 100,
      },
      {
        metric: "Eficiência (1/ACOS)",
        Seller: maxAcos > 0 ? ((maxAcos - sellerMetrics.avgAcos) / maxAcos) * 100 : 0,
        [`Vertical (${sellerVertical})`]: maxAcos > 0 ? ((maxAcos - myVertical.avgAcos) / maxAcos) * 100 : 0,
        Carteira: maxAcos > 0 ? ((maxAcos - portfolio.avgAcos) / maxAcos) * 100 : 0,
      },
      {
        metric: "Saúde (1/TACOS)",
        Seller: maxTacos > 0 ? ((maxTacos - sellerMetrics.avgTacos) / maxTacos) * 100 : 0,
        [`Vertical (${sellerVertical})`]: maxTacos > 0 ? ((maxTacos - myVertical.avgTacos) / maxTacos) * 100 : 0,
        Carteira: maxTacos > 0 ? ((maxTacos - portfolio.avgTacos) / maxTacos) * 100 : 0,
      },
      {
        metric: "Investimento",
        Seller: (sellerMetrics.totalAds / maxInv) * 100,
        [`Vertical (${sellerVertical})`]: (myVertical.avgInv / maxInv) * 100,
        Carteira: (portfolio.avgInv / maxInv) * 100,
      },
    ];
  }, [sellerVertical, sellerBenchmark, sellerMetrics, myVertical, portfolio]);

  const verticalKey = sellerVertical ? `Vertical (${sellerVertical})` : "Vertical";

  // Comparison bar data: Seller vs Vertical Median vs Portfolio Median (4 KPIs)
  const comparisonData = useMemo(() => {
    if (!myVertical) return [];
    return [
      {
        kpi: "Faturamento",
        Seller: sellerMetrics.totalGmv,
        [verticalKey]: myVertical.totalTgmv / myVertical.sellersCount,
        Carteira: portfolio.avgInv > 0 ? 0 : 0, // not meaningful for GMV
        format: "brl",
      },
      {
        kpi: "ROAS",
        Seller: sellerMetrics.avgRoas,
        [verticalKey]: myVertical.avgRoas,
        Carteira: portfolio.avgRoas,
        format: "x",
      },
      {
        kpi: "ACOS",
        Seller: sellerMetrics.avgAcos,
        [verticalKey]: myVertical.avgAcos,
        Carteira: portfolio.avgAcos,
        format: "%",
      },
      {
        kpi: "TACOS",
        Seller: sellerMetrics.avgTacos,
        [verticalKey]: myVertical.avgTacos,
        Carteira: portfolio.avgTacos,
        format: "%",
      },
    ];
  }, [myVertical, sellerMetrics, portfolio, verticalKey]);

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando benchmark da carteira…</span>
      </div>
    );
  }

  if (verticals.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground text-sm">
        Nenhum dado de vertical disponível. Faça upload do CSV de Campanhas no Admin.
      </div>
    );
  }

  // Helper to format delta
  const fmtDelta = (seller: number, bench: number, format: string) => {
    if (bench === 0) return { text: "—", positive: true };
    const delta = ((seller - bench) / bench) * 100;
    // For ACOS/TACOS, lower is better
    const isInverse = format === "%" ;
    const positive = isInverse ? delta <= 0 : delta >= 0;
    return {
      text: `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%`,
      positive,
    };
  };

  const fmtValue = (v: number, format: string) => {
    if (format === "brl") return fmtBRLCompact(v);
    if (format === "x") return `${fmtNum(v, 2)}x`;
    return `${fmtNum(v, 2)}%`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Cluster Benchmark — Percentile Display */}
      {cb?.cluster && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Posicionamento no Cluster — {cb.cluster.cluster}
            </h2>
            <TooltipInfo text="Percentil calculado comparando com a mediana dos sellers do mesmo cluster. Nunca mistura clusters diferentes." />
            <Badge variant="outline" className="text-[10px]">
              {cb.cluster.peerCount} peers
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "GMV", pct: cb.cluster.percentileGmv, seller: fmtBRLCompact(cb.cluster.sellerGmv), median: fmtBRLCompact(cb.cluster.medianGmv) },
              { label: "ROAS", pct: cb.cluster.percentileRoas, seller: `${cb.cluster.sellerRoas.toFixed(1)}x`, median: `${cb.cluster.medianRoas.toFixed(1)}x` },
              { label: "Conversão", pct: cb.cluster.percentileConv, seller: `${cb.cluster.sellerConv.toFixed(1)}%`, median: `${cb.cluster.medianConv.toFixed(1)}%`, tooltip: CONVERSION_MARKET_BAND },
            ].map((m) => {
              const badge = getPercentileBadge(m.pct);
              return (
                <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border/50 bg-card/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium inline-flex items-center gap-1">
                      {m.label}
                      {(m as any).tooltip && <TooltipInfo text={(m as any).tooltip} />}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold border ${badge.className}`}>
                      {m.pct >= 80 ? `Top ${100 - m.pct}%` : badge.label}
                    </span>
                  </div>
                  <p className="text-lg font-bold font-mono text-foreground">{m.seller}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Mediana {cb!.cluster!.cluster}: {m.median}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {cb.category && (
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <Target className="w-3.5 h-3.5" />
              <span>
                <span className="font-semibold text-foreground">{cb.category.position}º</span> de {cb.category.totalPeers} sellers em <span className="font-medium text-foreground">{cb.category.category}</span>
              </span>
              <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${getPercentileBadge(cb.category.percentileGmv).className}`}>
                {getPercentileBadge(cb.category.percentileGmv).label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-neon-blue" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Benchmark por Vertical — {sellerVertical || "Carteira"}
          </h2>
          <TooltipInfo text="Compara o seller apenas contra outros sellers da mesma vertical. Cada vertical tem seu próprio benchmark independente." />
        </div>
        {myVertical && (
          <Badge className="bg-neon-blue/20 text-neon-blue border-neon-blue/30 text-xs">
            {myVertical.sellersCount} sellers em {sellerVertical}
          </Badge>
        )}
      </div>

      {/* Seller vs Vertical vs Portfolio — KPI Cards */}
      {myVertical && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {comparisonData.map((item, i) => {
            const sellerVal = item.Seller;
            const vertVal = item[verticalKey] as number;
            const delta = fmtDelta(sellerVal, vertVal, item.format);
            return (
              <motion.div
                key={item.kpi}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card p-4 space-y-2"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{item.kpi}</p>
                <p className="text-lg font-bold font-mono text-foreground">{fmtValue(sellerVal, item.format)}</p>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">
                    Mediana {sellerVertical}: {fmtValue(vertVal, item.format)}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold ${delta.positive ? "text-emerald" : "text-destructive"}`}>
                  {delta.text}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {!myVertical && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "ROAS Mediano Carteira", value: `${fmtNum(portfolio.avgRoas, 2)}x`, icon: TrendingUp, color: "text-neon-blue" },
            { label: "ACOS Médio Carteira", value: `${fmtNum(portfolio.avgAcos, 2)}%`, icon: Target, color: portfolio.avgAcos <= 15 ? "text-emerald" : "text-destructive" },
            { label: "TACOS Médio Carteira", value: `${fmtNum(portfolio.avgTacos, 2)}%`, icon: Target, color: portfolio.avgTacos <= 10 ? "text-emerald" : "text-destructive" },
            { label: "Sellers na Carteira", value: String(portfolio.totalSellers), icon: Users, color: "text-muted-foreground" },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2">
                <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="metric-label">{m.label}</p>
              </div>
              <p className={`metric-value mt-1 ${m.color}`}>{m.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Radar + Seller vs Vertical bar comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Radar Chart: Seller vs Vertical vs Portfolio */}
        {radarData.length > 0 && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Posicionamento Competitivo
              </h3>
              <TooltipInfo text="Comparativo normalizado: Seller vs Mediana da sua Vertical vs Média da Carteira." />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(215, 25%, 20%)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar name="Seller" dataKey="Seller" stroke="hsl(199, 100%, 50%)" fill="hsl(199, 100%, 50%)" fillOpacity={0.25} strokeWidth={2} />
                <Radar name={verticalKey} dataKey={verticalKey} stroke="hsl(160, 84%, 39%)" fill="hsl(160, 84%, 39%)" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Carteira" dataKey="Carteira" stroke="hsl(40, 95%, 55%)" fill="hsl(40, 95%, 55%)" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
                <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Seller vs Vertical — Bar comparison for ROAS, ACOS, TACOS */}
        {myVertical && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Seller vs Vertical — KPIs
              </h3>
              <TooltipInfo text="Comparação direta entre o seller e a mediana dos peers da mesma vertical." />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  { kpi: "ROAS", Seller: sellerMetrics.avgRoas, [verticalKey]: myVertical.avgRoas, Carteira: portfolio.avgRoas },
                  { kpi: "ACOS (%)", Seller: sellerMetrics.avgAcos, [verticalKey]: myVertical.avgAcos, Carteira: portfolio.avgAcos },
                  { kpi: "TACOS (%)", Seller: sellerMetrics.avgTacos, [verticalKey]: myVertical.avgTacos, Carteira: portfolio.avgTacos },
                ]}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
                <XAxis dataKey="kpi" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 11 }} />
                <Bar dataKey="Seller" fill="hsl(199, 100%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey={verticalKey} fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Carteira" fill="hsl(40, 95%, 55%)" radius={[4, 4, 0, 0]} maxBarSize={40} fillOpacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Vertical detail table — only seller's vertical + portfolio */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
          Detalhamento — {sellerVertical || "Todas as Verticais"}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Referência</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Sellers</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Investimento Med.</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">ROAS</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">ACOS</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">TACOS</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Faturamento Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Seller row */}
              <tr className="border-b border-border/10 bg-neon-blue/10">
                <td className="py-2.5 px-3 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[hsl(199,100%,50%)]" />
                    <span className="text-neon-blue font-semibold">Este Seller</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-muted-foreground">1</td>
                <td className="py-2.5 px-3 text-right font-mono">{fmtBRLCompact(sellerMetrics.totalAds)}</td>
                <td className={`py-2.5 px-3 text-right font-mono font-semibold ${sellerMetrics.avgRoas >= 2 ? "text-emerald" : "text-destructive"}`}>
                  {fmtNum(sellerMetrics.avgRoas, 2)}x
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${sellerMetrics.avgAcos <= 15 ? "text-emerald" : "text-destructive"}`}>
                  {fmtNum(sellerMetrics.avgAcos, 2)}%
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${sellerMetrics.avgTacos <= 10 ? "text-emerald" : "text-destructive"}`}>
                  {fmtNum(sellerMetrics.avgTacos, 2)}%
                </td>
                <td className="py-2.5 px-3 text-right font-mono">{fmtBRLCompact(sellerMetrics.totalGmv)}</td>
              </tr>

              {/* Seller's vertical row */}
              {myVertical && (
                <tr className="border-b border-border/10">
                  <td className="py-2.5 px-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[hsl(160,84%,39%)]" />
                      <span className="text-foreground">{myVertical.vertical}</span>
                      <Badge variant="outline" className="text-[9px]">Mediana</Badge>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">{myVertical.sellersCount}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{fmtBRLCompact(myVertical.avgInv)}</td>
                  <td className={`py-2.5 px-3 text-right font-mono font-semibold ${myVertical.avgRoas >= 2 ? "text-emerald" : "text-destructive"}`}>
                    {fmtNum(myVertical.avgRoas, 2)}x
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${myVertical.avgAcos <= 15 ? "text-emerald" : "text-destructive"}`}>
                    {fmtNum(myVertical.avgAcos, 2)}%
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${myVertical.avgTacos <= 10 ? "text-emerald" : "text-destructive"}`}>
                    {fmtNum(myVertical.avgTacos, 2)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{fmtBRLCompact(myVertical.totalTgmv)}</td>
                </tr>
              )}

              {/* Portfolio total row */}
              <tr className="border-t-2 border-border/30 bg-card/30">
                <td className="py-2.5 px-3 font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[hsl(40,95%,55%)]" />
                    Carteira Total
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right font-semibold">{portfolio.totalSellers}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">{fmtBRLCompact(portfolio.avgInv)}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-neon-blue">{fmtNum(portfolio.avgRoas, 2)}x</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">{fmtNum(portfolio.avgAcos, 2)}%</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">{fmtNum(portfolio.avgTacos, 2)}%</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default CategoryBenchmarkPanel;
