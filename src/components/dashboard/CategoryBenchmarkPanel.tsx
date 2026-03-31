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

const COLORS = [
  "hsl(199, 100%, 50%)", // neon blue
  "hsl(160, 84%, 39%)",  // emerald
  "hsl(280, 80%, 60%)",  // purple
  "hsl(40, 95%, 55%)",   // amber
  "hsl(340, 82%, 52%)",  // rose
  "hsl(174, 60%, 50%)",  // teal
  "hsl(220, 70%, 55%)",  // blue
  "hsl(30, 90%, 55%)",   // orange
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono font-semibold text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number"
            ? p.dataKey?.includes("Inv") || p.dataKey?.includes("GMV")
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
  const sellerVertical = campaign?.verticalPrincipal || null;
  const cb = clusterBenchmark;
  const sellerVertical = campaign?.verticalPrincipal || null;

  // Radar chart: seller vs their vertical vs portfolio
  const radarData = useMemo(() => {
    if (!sellerVertical || !sellerBenchmark) return [];
    const sv = verticals.find((v) => v.vertical === sellerVertical);
    if (!sv) return [];

    // Normalize all metrics to 0-100 scale for radar
    const maxRoas = Math.max(sellerMetrics.avgRoas, sv.avgRoas, portfolio.avgRoas, 1);
    const maxAcos = Math.max(sellerMetrics.avgAcos, sv.avgAcos, portfolio.avgAcos, 1);
    const maxTacos = Math.max(sellerMetrics.avgTacos, sv.avgTacos, portfolio.avgTacos, 1);
    const maxInv = Math.max(sellerMetrics.totalAds, sv.avgInv, portfolio.avgInv, 1);

    return [
      {
        metric: "ROAS",
        Seller: (sellerMetrics.avgRoas / maxRoas) * 100,
        Vertical: (sv.avgRoas / maxRoas) * 100,
        Carteira: (portfolio.avgRoas / maxRoas) * 100,
      },
      {
        metric: "Eficiência (1/ACOS)",
        Seller: maxAcos > 0 ? ((maxAcos - sellerMetrics.avgAcos) / maxAcos) * 100 : 0,
        Vertical: maxAcos > 0 ? ((maxAcos - sv.avgAcos) / maxAcos) * 100 : 0,
        Carteira: maxAcos > 0 ? ((maxAcos - portfolio.avgAcos) / maxAcos) * 100 : 0,
      },
      {
        metric: "Saúde (1/TACOS)",
        Seller: maxTacos > 0 ? ((maxTacos - sellerMetrics.avgTacos) / maxTacos) * 100 : 0,
        Vertical: maxTacos > 0 ? ((maxTacos - sv.avgTacos) / maxTacos) * 100 : 0,
        Carteira: maxTacos > 0 ? ((maxTacos - portfolio.avgTacos) / maxTacos) * 100 : 0,
      },
      {
        metric: "Investimento",
        Seller: (sellerMetrics.totalAds / maxInv) * 100,
        Vertical: (sv.avgInv / maxInv) * 100,
        Carteira: (portfolio.avgInv / maxInv) * 100,
      },
    ];
  }, [sellerVertical, sellerBenchmark, sellerMetrics, verticals, portfolio]);

  // Horizontal bar: all verticals ROAS
  const verticalRoasData = useMemo(() => {
    return verticals.map((v) => ({
      vertical: v.vertical.length > 18 ? v.vertical.slice(0, 16) + "…" : v.vertical,
      fullName: v.vertical,
      ROAS: Math.round(v.avgRoas * 100) / 100,
      sellers: v.sellersCount,
      isCurrentSeller: v.vertical === sellerVertical,
    }));
  }, [verticals, sellerVertical]);

  // Horizontal bar: all verticals ACOS
  const verticalAcosData = useMemo(() => {
    return verticals.map((v) => ({
      vertical: v.vertical.length > 18 ? v.vertical.slice(0, 16) + "…" : v.vertical,
      fullName: v.vertical,
      "ACOS (%)": Math.round(v.avgAcos * 100) / 100,
      sellers: v.sellersCount,
      isCurrentSeller: v.vertical === sellerVertical,
    }));
  }, [verticals, sellerVertical]);

  // GMV by vertical
  const verticalGmvData = useMemo(() => {
    return verticals.map((v) => ({
      vertical: v.vertical.length > 18 ? v.vertical.slice(0, 16) + "…" : v.vertical,
      fullName: v.vertical,
      "Faturamento Total": Math.round(v.totalTgmv),
      sellers: v.sellersCount,
      isCurrentSeller: v.vertical === sellerVertical,
    }));
  }, [verticals, sellerVertical]);

  // TACOS by vertical
  const verticalTacosData = useMemo(() => {
    return verticals.map((v) => ({
      vertical: v.vertical.length > 18 ? v.vertical.slice(0, 16) + "…" : v.vertical,
      fullName: v.vertical,
      "TACOS (%)": Math.round(v.avgTacos * 100) / 100,
      sellers: v.sellersCount,
      isCurrentSeller: v.vertical === sellerVertical,
    }));
  }, [verticals, sellerVertical]);

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-neon-blue" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Benchmark por Categoria — Carteira Completa
          </h2>
          <Badge variant="outline" className="text-[10px]">
            {portfolio.totalSellers} sellers · {verticals.length} verticais
          </Badge>
        </div>
        {sellerVertical && (
          <Badge className="bg-neon-blue/20 text-neon-blue border-neon-blue/30 text-xs">
            Seller atual: {sellerVertical}
          </Badge>
        )}
      </div>

      {/* Summary cards — Portfolio totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "ROAS Médio Carteira", value: `${fmtNum(portfolio.avgRoas, 2)}x`, icon: TrendingUp, color: "text-neon-blue" },
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

      {/* Radar + GMV + TACOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Radar Chart: Seller vs Vertical vs Portfolio */}
        {radarData.length > 0 && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Posicionamento Competitivo
              </h3>
              <TooltipInfo text="Comparativo normalizado: Seller vs Média da Vertical vs Média da Carteira. Quanto mais próximo da borda, melhor o desempenho relativo." />
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
                <Radar name="Vertical" dataKey="Vertical" stroke="hsl(160, 84%, 39%)" fill="hsl(160, 84%, 39%)" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Carteira" dataKey="Carteira" stroke="hsl(40, 95%, 55%)" fill="hsl(40, 95%, 55%)" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
                <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* GMV by Vertical */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Faturamento por Vertical
            </h3>
            <TooltipInfo text="Faturamento total (TGMV_LC) acumulado por categoria." />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={verticalGmvData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
              <XAxis dataKey="vertical" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} interval={0} angle={verticals.length > 4 ? -25 : 0} textAnchor={verticals.length > 4 ? "end" : "middle"} height={verticals.length > 4 ? 60 : 30} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} tickFormatter={(v) => fmtBRLCompact(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Faturamento Total" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {verticalGmvData.map((entry, i) => (
                  <Cell key={i} fill={entry.isCurrentSeller ? "hsl(199, 100%, 50%)" : COLORS[i % COLORS.length]} fillOpacity={entry.isCurrentSeller ? 1 : 0.7} stroke={entry.isCurrentSeller ? "hsl(199, 100%, 70%)" : "none"} strokeWidth={entry.isCurrentSeller ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TACOS by Vertical */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              TACOS por Vertical
            </h3>
            <TooltipInfo text="INV_PADS / TGMV_LC × 100. Acima de 10% é crítico." />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={verticalTacosData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
              <XAxis dataKey="vertical" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} interval={0} angle={verticals.length > 4 ? -25 : 0} textAnchor={verticals.length > 4 ? "end" : "middle"} height={verticals.length > 4 ? 60 : 30} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="TACOS (%)" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {verticalTacosData.map((entry, i) => (
                  <Cell key={i} fill={entry.isCurrentSeller ? "hsl(199, 100%, 50%)" : (entry["TACOS (%)"] > 10 ? "hsl(0, 84%, 60%)" : "hsl(160, 84%, 39%)")} fillOpacity={entry.isCurrentSeller ? 1 : 0.7} stroke={entry.isCurrentSeller ? "hsl(199, 100%, 70%)" : "none"} strokeWidth={entry.isCurrentSeller ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROAS + ACOS by Vertical */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ROAS by Vertical */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              ROAS por Vertical
            </h3>
            <TooltipInfo text="Retorno sobre investimento em Ads por categoria." />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={verticalRoasData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
              <XAxis dataKey="vertical" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} interval={0} angle={verticals.length > 4 ? -25 : 0} textAnchor={verticals.length > 4 ? "end" : "middle"} height={verticals.length > 4 ? 60 : 30} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ROAS" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {verticalRoasData.map((entry, i) => (
                  <Cell key={i} fill={entry.isCurrentSeller ? "hsl(199, 100%, 50%)" : "hsl(160, 84%, 39%)"} fillOpacity={entry.isCurrentSeller ? 1 : 0.6} stroke={entry.isCurrentSeller ? "hsl(199, 100%, 70%)" : "none"} strokeWidth={entry.isCurrentSeller ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ACOS by Vertical */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              ACOS por Vertical
            </h3>
            <TooltipInfo text="Custo de Ads como % do faturamento de Ads. Quanto menor, mais eficiente." />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={verticalAcosData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
              <XAxis dataKey="vertical" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} interval={0} angle={verticals.length > 4 ? -25 : 0} textAnchor={verticals.length > 4 ? "end" : "middle"} height={verticals.length > 4 ? 60 : 30} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ACOS (%)" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {verticalAcosData.map((entry, i) => (
                  <Cell key={i} fill={entry.isCurrentSeller ? "hsl(280, 80%, 60%)" : "hsl(40, 95%, 55%)"} fillOpacity={entry.isCurrentSeller ? 1 : 0.6} stroke={entry.isCurrentSeller ? "hsl(280, 80%, 70%)" : "none"} strokeWidth={entry.isCurrentSeller ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vertical detail table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
          Detalhamento por Vertical
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Vertical</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Sellers</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Investimento Total</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">ROAS</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">ACOS</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">TACOS</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {verticals.map((v, i) => {
                const isCurrent = v.vertical === sellerVertical;
                return (
                  <tr
                    key={v.vertical}
                    className={`border-b border-border/10 transition-colors ${isCurrent ? "bg-neon-blue/10" : "hover:bg-card/40"}`}
                  >
                    <td className="py-2.5 px-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className={isCurrent ? "text-neon-blue font-semibold" : "text-foreground"}>
                          {v.vertical}
                        </span>
                        {isCurrent && <Badge className="text-[9px] bg-neon-blue/20 text-neon-blue border-neon-blue/30">Atual</Badge>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{v.sellersCount}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{fmtBRLCompact(v.totalInv)}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-semibold ${v.avgRoas >= 2 ? "text-emerald" : "text-destructive"}`}>
                      {fmtNum(v.avgRoas, 2)}x
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono ${v.avgAcos <= 15 ? "text-emerald" : "text-destructive"}`}>
                      {fmtNum(v.avgAcos, 2)}%
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono ${v.avgTacos <= 10 ? "text-emerald" : "text-destructive"}`}>
                      {fmtNum(v.avgTacos, 2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{fmtBRLCompact(v.totalTgmv)}</td>
                  </tr>
                );
              })}
              {/* Portfolio total row */}
              <tr className="border-t-2 border-border/30 bg-card/30">
                <td className="py-2.5 px-3 font-semibold text-foreground">Carteira Total</td>
                <td className="py-2.5 px-3 text-right font-semibold">{portfolio.totalSellers}</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">{fmtBRLCompact(portfolio.avgInv * portfolio.totalSellers)}</td>
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
