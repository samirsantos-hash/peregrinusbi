import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Eye, Video, TrendingUp, Flame, AlertTriangle,
  Play, ShoppingCart, ExternalLink,
} from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import type { SellerKPI } from "@/hooks/useSellerData";
import type { EligibilityItem } from "@/hooks/useEligibility";

interface ClipsAudiencePanelProps {
  kpis: SellerKPI[];
  eligibilityItems: EligibilityItem[];
}

/* ── Helpers ── */
const fmt = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000 ? `${(v / 1_000).toFixed(1)}K`
    : v.toLocaleString("pt-BR");

const fmtBRL = (v: number) => `R$ ${fmt(v)}`;

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

/* ── Metric Card ── */
const MetricCard = ({
  icon: Icon, label, value, sub, alert, tooltip, accentClass = "text-neon-blue",
}: {
  icon: any; label: string; value: string; sub?: string;
  alert?: string | null; tooltip: string; accentClass?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="glass-card p-5 flex flex-col gap-2"
  >
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      <TooltipInfo text={tooltip} />
    </div>
    <span className={`font-mono text-2xl font-bold ${accentClass}`}>{value}</span>
    {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    {alert && (
      <span className="mt-1 text-xs text-warning flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5" /> {alert}
      </span>
    )}
  </motion.div>
);

/* ── Custom Tooltip for Combo Chart ── */
const ComboTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1 min-w-[180px]">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-muted-foreground">
          {p.name}: <span className="text-foreground font-mono">
            {p.dataKey === "tgmvClips" ? fmtBRL(p.value) : fmt(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
};

const ClipsAudiencePanel = ({ kpis, eligibilityItems }: ClipsAudiencePanelProps) => {
  /* ── 1. Aggregate KPI totals ── */
  const totals = useMemo(() => {
    const t = { visits: 0, visitasClips: 0, tgmvClips: 0, ordersClips: 0, siClips: 0, clipsPubli: 0 };
    for (const k of kpis) {
      t.visits += k.visits;
      t.visitasClips += k.visitasClips;
      t.tgmvClips += k.tgmvLcClips;
      t.ordersClips += k.ordersClips;
      t.siClips += k.siClips;
      // clipsPubli é um valor acumulado do seller, não deve somar - pega o máximo/more recente
      t.clipsPubli = Math.max(t.clipsPubli, k.sellersClipsPubli);
    }
    return t;
  }, [kpis]);

  const videoPct = pct(totals.visitasClips, totals.visits);
  const lowExposure = videoPct < 5 && totals.visits > 0;

  /* ── 2. Temporal data for combo chart ── */
  const chartData = useMemo(() =>
    kpis.map((k) => ({
      date: k.date.slice(0, 7),
      visitasClips: k.visitasClips,
      tgmvClips: k.tgmvLcClips,
    }))
  , [kpis]);

  /* ── 3. Top 5 items by SI_CLIPS (from eligibility cross-reference) ── */
  const topContentItems = useMemo(() => {
    // Use KPI-level clips data since it's per-seller temporal
    // For item-level, we'd need seller_listings_quality; use eligibility items with orders as proxy
    const withClips = eligibilityItems
      .filter((e) => e.pedidos7d > 0)
      .sort((a, b) => b.pedidos7d - a.pedidos7d)
      .slice(0, 5);
    return withClips;
  }, [eligibilityItems]);

  /* ── 4. Repressed potential: high sales but no clips ── */
  const repressedItems = useMemo(() =>
    eligibilityItems.filter((e) => e.pedidos7d > 10)
    // We check against KPI-level sellersClipsPubli since item-level clips not in eligibility
  , [eligibilityItems]);

  const hasRepressedPotential = repressedItems.length > 0 && totals.clipsPubli === 0;

  /* ── 5. Conversion rate ── */
  const conversionRate = pct(totals.ordersClips, totals.visitasClips);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* ── Row 1: Metric cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Eye}
          label="Audiência Total"
          value={fmt(totals.visits)}
          sub={`Participação Vídeo: ${videoPct.toFixed(1)}%`}
          alert={lowExposure ? "⚠️ Baixa exposição de Clips: Oportunidade de aumentar alcance visual" : null}
          tooltip="Soma de visitas totais do seller no período selecionado."
        />
        <MetricCard
          icon={Play}
          label="Visitas via Clips"
          value={fmt(totals.visitasClips)}
          sub={`${totals.clipsPubli} clips publicados`}
          tooltip="Total de visitas geradas por vídeos curtos (Clips) do seller."
          accentClass="text-emerald"
        />
        <MetricCard
          icon={TrendingUp}
          label="Faturamento Clips"
          value={fmtBRL(totals.tgmvClips)}
          sub={`${totals.siClips} itens vendidos via clip`}
          tooltip="Receita gerada diretamente por vídeos curtos publicados."
          accentClass="text-warning"
        />
        <MetricCard
          icon={ShoppingCart}
          label="Conversão Clips"
          value={`${conversionRate.toFixed(2)}%`}
          sub={`${totals.ordersClips} pedidos via clips`}
          tooltip="Taxa de conversão: (Pedidos via Clips / Visitas via Clips) × 100."
          accentClass={conversionRate > 1 ? "text-emerald" : "text-neon-blue"}
        />
      </div>

      {/* ── Row 2: Combo chart ── */}
      {chartData.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-4 h-4 text-neon-blue" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Faturamento vs. Audiência de Clips
            </h3>
            <TooltipInfo text="Barras: visitas geradas por Clips. Linha: faturamento via Clips. Avalie se o aumento de visualizações se converte em receita." />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
                tickFormatter={(v) => fmt(v)}
                label={{ value: "Visitas Clips", angle: -90, position: "insideLeft", fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
                tickFormatter={(v) => fmt(v)}
                label={{ value: "Faturamento (R$)", angle: 90, position: "insideRight", fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
              />
              <Tooltip content={<ComboTooltipContent />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "hsl(215, 20%, 55%)" }}
              />
              <Bar
                yAxisId="left"
                dataKey="visitasClips"
                name="Visitas Clips"
                fill="hsl(var(--neon-blue))"
                fillOpacity={0.7}
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tgmvClips"
                name="Faturamento Clips"
                stroke="hsl(var(--warning))"
                strokeWidth={2.5}
                dot={{ fill: "hsl(var(--warning))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row 3: Content Efficiency Table ── */}
      {topContentItems.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Eficiência de Conteúdo — Top Itens
            </h3>
            <TooltipInfo text="Top 5 itens com maior volume de vendas. Avalie a tração desses produtos para priorizar criação de Clips." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Produto</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Pedidos 7D</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Estoque 7D</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Desconto</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {topContentItems.map((item, idx) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <a
                        href={item.mlbLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neon-blue hover:underline flex items-center gap-1.5 max-w-[300px] truncate"
                      >
                        {item.itemName || item.itemId}
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                      </a>
                    </td>
                    <td className="text-center py-2.5 px-3 font-mono font-bold text-foreground">
                      {item.pedidos7d}
                    </td>
                    <td className="text-center py-2.5 px-3 font-mono">
                      <span className={item.estoqueMedio7d < 5 ? "text-destructive font-bold" : "text-foreground"}>
                        {item.estoqueMedio7d}
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-3 font-mono text-foreground">
                      {item.discountBest > 0 ? `${(item.discountBest * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {item.pedidos7d > 10 && totals.clipsPubli === 0 ? (
                        <span className="inline-flex items-center gap-1 text-warning text-xs">
                          <Flame className="w-3.5 h-3.5" /> Sem Vídeo
                        </span>
                      ) : item.flagBestPromo ? (
                        <span className="status-badge bg-emerald/10 text-emerald border-emerald/20 text-[11px]">
                          Best Promo
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Row 4: Repressed Potential Alert ── */}
      {hasRepressedPotential && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-5 border-l-4 border-l-warning"
        >
          <div className="flex items-center gap-3 mb-3">
            <Flame className="w-5 h-5 text-warning" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-warning">
              Potencial de Audiência Reprimida
            </h3>
            <TooltipInfo text="Itens com alta demanda (>10 pedidos/7d) mas seller sem nenhum clip publicado. Priorize gravação de vídeos para estes produtos." />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            🔥 <strong className="text-foreground">{repressedItems.length} Itens Quentes sem Vídeo</strong> — Prioridade de Gravação
          </p>
          <div className="flex flex-wrap gap-2">
            {repressedItems.slice(0, 8).map((item) => (
              <a
                key={item.id}
                href={item.mlbLink}
                target="_blank"
                rel="noopener noreferrer"
                className="status-badge bg-warning/10 text-warning border-warning/20 text-[11px] hover:bg-warning/20 transition-colors cursor-pointer flex items-center gap-1"
              >
                {item.itemName?.slice(0, 40) || item.itemId}
                <span className="text-[10px] opacity-70">({item.pedidos7d}v)</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
            {repressedItems.length > 8 && (
              <span className="text-[11px] text-muted-foreground self-center">
                +{repressedItems.length - 8} itens
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Summary KPIs row ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Resumo de Performance de Clips
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Clips Publicados", value: totals.clipsPubli, color: "text-neon-blue" },
            { label: "Itens Vendidos via Clip", value: totals.siClips, color: "text-emerald" },
            { label: "Pedidos via Clip", value: totals.ordersClips, color: "text-warning" },
            {
              label: "ROI de Audiência",
              value: totals.visitasClips > 0
                ? `R$ ${(totals.tgmvClips / totals.visitasClips).toFixed(2)}/visita`
                : "—",
              color: "text-foreground",
              isText: true,
            },
          ].map((m, i) => (
            <div key={m.label} className="text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
              <p className={`font-mono text-lg font-bold ${m.color}`}>
                {(m as any).isText ? m.value : fmt(m.value as number)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ClipsAudiencePanel;
