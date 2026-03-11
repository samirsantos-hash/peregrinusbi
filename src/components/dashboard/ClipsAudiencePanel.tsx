import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  Eye, Video, TrendingUp, Flame, AlertTriangle,
  Play, ShoppingCart, ExternalLink, ChevronDown, ChevronUp,
  FileVideo, Clapperboard, Target, Monitor, CheckCircle2, Circle,
  Ban, Filter, PieChart as PieChartIcon,
} from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SellerKPI } from "@/hooks/useSellerData";
import type { EligibilityItem } from "@/hooks/useEligibility";
import type { ListingQuality } from "@/hooks/useListingsQuality";

interface ClipsAudiencePanelProps {
  kpis: SellerKPI[];
  eligibilityItems: EligibilityItem[];
  listingsQuality?: ListingQuality[];
  sellerCustIdMap?: Record<string, string>;
  selectedSeller?: string;
}

/* ── Helpers ── */
const fmt = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000 ? `${(v / 1_000).toFixed(1)}K`
    : v.toLocaleString("pt-BR");

const fmtBRL = (v: number) => `R$ ${fmt(v)}`;

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

/** Normalize discount value for display. DB stores values like 350 = 35.0%. */
const fmtDiscount = (v: number): string => {
  if (v <= 0) return "—";
  // Values stored as percentage * 10 in DB (e.g. 350 = 35%, 85 = 8.5%)
  if (v > 1) return `${(v / 10).toFixed(1)}%`;
  // Decimal form (e.g. 0.35 = 35%)
  return `${(v * 100).toFixed(1)}%`;
};

/**
 * Binary clip detection: an item HAS a clip if any performance metric > 0.
 * VIDEOS_PUBLI alone is not reliable — a video may exist but not be indexed as a Clip.
 */
function hasClipData(visitasClips: number, siClips: number, ordersClips: number): boolean {
  return visitasClips > 0 || siClips > 0 || ordersClips > 0;
}

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

/* ── Audit Checklist ── */
const AUDIT_CHECKLIST = [
  { icon: Clapperboard, label: "Script/Roteiro", question: "O vídeo responde às principais dúvidas técnicas do campo de perguntas?" },
  { icon: Target, label: "Edição/Gancho", question: "Os primeiros 3 segundos prendem a atenção do comprador?" },
  { icon: ShoppingCart, label: "CTA (Chamada para Ação)", question: "Existe uma instrução clara para o cliente comprar agora?" },
  { icon: Monitor, label: "Demonstração de Uso", question: "O produto é mostrado sendo utilizado na prática (Contexto Real)?" },
];

/* ── Video Status Logic ── */
type VideoStatus = "no-video" | "low-conversion" | "no-reach" | "champion";

function getVideoStatus(
  hasClip: boolean,
  ordersClips: number,
  visitasClips: number,
  siClips: number,
  avgOrdersClips: number,
): { status: VideoStatus; label: string; badgeClass: string } {
  if (!hasClip) {
    return { status: "no-video", label: "Analisar", badgeClass: "bg-destructive/15 text-destructive border-destructive/20" };
  }
  if (visitasClips === 0 && siClips === 0) {
    return { status: "no-reach", label: "Sem Alcance", badgeClass: "bg-destructive/15 text-destructive border-destructive/20" };
  }
  if (ordersClips < avgOrdersClips || ordersClips < 3) {
    return { status: "low-conversion", label: "Otimizar Roteiro", badgeClass: "bg-neon-blue/15 text-neon-blue border-neon-blue/20" };
  }
  return { status: "champion", label: "Vídeo Campeão", badgeClass: "bg-emerald/10 text-emerald border-emerald/20" };
}

/* ── Hot Item Card ── */
interface HotItemCardProps {
  item: EligibilityItem;
  videoStatus: { status: VideoStatus; label: string; badgeClass: string };
  clipsLink: string | null;
  idx: number;
}

const HotItemCard = ({ item, videoStatus, clipsLink, idx }: HotItemCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [checks, setChecks] = useState<boolean[]>(new Array(AUDIT_CHECKLIST.length).fill(false));

  const toggleCheck = (i: number) => {
    const next = [...checks];
    next[i] = !next[i];
    setChecks(next);
  };

  const discountDisplay = fmtDiscount(item.discountBest);

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="glass-card overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <Flame className="w-4 h-4 text-warning shrink-0" />
        <div className="flex-1 min-w-0">
          <a
            href={item.mlbLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-neon-blue hover:underline flex items-center gap-1.5 truncate max-w-[300px]"
          >
            {item.itemName || item.itemId}
            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
          </a>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {Math.round(item.pedidos7d)} ped/7d · Est: {Math.round(item.estoqueMedio7d)} · Desc: {discountDisplay}
          </p>
        </div>
        <Badge className={`shrink-0 text-[11px] ${videoStatus.badgeClass}`}>
          {videoStatus.status === "no-video" && <FileVideo className="w-3 h-3 mr-1" />}
          {videoStatus.status === "low-conversion" && <AlertTriangle className="w-3 h-3 mr-1" />}
          {videoStatus.status === "no-reach" && <Ban className="w-3 h-3 mr-1" />}
          {videoStatus.status === "champion" && <CheckCircle2 className="w-3 h-3 mr-1" />}
          {videoStatus.label}
        </Badge>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Diagnóstico de Produção
            </p>
            {videoStatus.status === "no-video" ? (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <FileVideo className="w-3.5 h-3.5" />
                🎥 Gravação Urgente — Sem Clip Ativo
              </p>
            ) : videoStatus.status === "no-reach" ? (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" />
                🚫 Vídeo sem Alcance (Verificar Indexação ou Qualidade)
              </p>
            ) : (
              <div className="space-y-2">
                {videoStatus.status === "low-conversion" && (
                  <p className="text-xs font-medium" style={{ color: "hsl(50 100% 50%)" }}>
                    ⚠️ Refazer Roteiro/Edição (Baixa Conversão)
                  </p>
                )}
                {AUDIT_CHECKLIST.map((c, i) => (
                  <button
                    key={c.label}
                    onClick={() => toggleCheck(i)}
                    className="flex items-start gap-2.5 w-full text-left group"
                  >
                    {checks[i] ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-neon-blue transition-colors" />
                    )}
                    <div>
                      <p className={`text-xs font-medium ${checks[i] ? "text-emerald line-through opacity-70" : "text-foreground"}`}>
                        {c.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{c.question}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-border/30">
              <span className="text-xs text-warning font-medium flex items-center gap-1">
                <Clapperboard className="w-3.5 h-3.5" />
                {videoStatus.status === "no-video"
                  ? "Gravação Urgente — Sem Clip Ativo"
                  : "Revisar Roteiro e Edição (Foco em Conversão)"}
              </span>
              {clipsLink && (
                <a
                  href={clipsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-neon-blue hover:underline flex items-center gap-1"
                >
                  Ver Clips do Seller <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

/* ── Donut Chart Label ── */
const DonutLabel = ({ viewBox, total, withClip }: any) => {
  const { cx, cy } = viewBox;
  const coveragePct = total > 0 ? ((withClip / total) * 100).toFixed(0) : "0";
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-8" className="fill-foreground font-bold text-xl">{coveragePct}%</tspan>
      <tspan x={cx} dy="20" className="fill-muted-foreground text-[10px]">cobertura</tspan>
    </text>
  );
};

/* ── Main Panel ── */
const ClipsAudiencePanel = ({ kpis, eligibilityItems, listingsQuality, sellerCustIdMap, selectedSeller }: ClipsAudiencePanelProps) => {
  const [filterNoClips, setFilterNoClips] = useState(false);

  /* ── 1. Aggregate KPI totals ── */
  const totals = useMemo(() => {
    const t = { visits: 0, visitasClips: 0, tgmvClips: 0, ordersClips: 0, siClips: 0, clipsPubli: 0 };
    for (const k of kpis) {
      t.visits += k.visits;
      t.visitasClips += k.visitasClips;
      t.tgmvClips += k.tgmvLcClips;
      t.ordersClips += k.ordersClips;
      t.siClips += k.siClips;
      const clipsVal = k.sellersClipsPubli;
      if (clipsVal > 0 && clipsVal < 100_000) {
        t.clipsPubli = Math.max(t.clipsPubli, clipsVal);
      }
    }
    return t;
  }, [kpis]);

  const videoPct = pct(totals.visitasClips, totals.visits);
  const lowExposure = videoPct < 5 && totals.visits > 0;

  /* ── 2. Per-item clip data map from listings quality ── */
  const itemClipMap = useMemo(() => {
    const map = new Map<string, { visitasClips: number; siClips: number; ordersClips: number; hasClip: boolean }>();
    if (!listingsQuality) return map;
    for (const lq of listingsQuality) {
      const hc = hasClipData(lq.visitasClips, lq.siClips, lq.ordersClips);
      map.set(lq.itemId, {
        visitasClips: lq.visitasClips,
        siClips: lq.siClips,
        ordersClips: lq.ordersClips,
        hasClip: hc,
      });
    }
    return map;
  }, [listingsQuality]);

  /* ── 3. Clip coverage: count unique items with/without clip data ── */
  const clipCoverage = useMemo(() => {
    const allItems = new Map<string, boolean>();
    // From listings quality
    if (listingsQuality) {
      for (const lq of listingsQuality) {
        allItems.set(lq.itemId, hasClipData(lq.visitasClips, lq.siClips, lq.ordersClips));
      }
    }
    // From eligibility (items not in quality data count as no clip)
    for (const ei of eligibilityItems) {
      if (!allItems.has(ei.itemId)) {
        allItems.set(ei.itemId, false);
      }
    }
    let withClip = 0, withoutClip = 0;
    allItems.forEach((hc) => { if (hc) withClip++; else withoutClip++; });
    return { withClip, withoutClip, total: withClip + withoutClip };
  }, [listingsQuality, eligibilityItems]);

  /* ── 4. Average orders for threshold ── */
  const avgOrdersClips = useMemo(() => {
    if (kpis.length === 0) return 0;
    return kpis.reduce((s, k) => s + k.ordersClips, 0) / kpis.length;
  }, [kpis]);

  /* ── 5. Temporal data for combo chart ── */
  const chartData = useMemo(() =>
    kpis.map((k) => ({
      date: k.date.slice(0, 7),
      visitasClips: k.visitasClips,
      tgmvClips: k.tgmvLcClips,
    }))
  , [kpis]);

  /* ── 6. Top 5 items by pedidos — deduplicated ── */
  const topContentItems = useMemo(() => {
    const seen = new Set<string>();
    const items = eligibilityItems
      .filter((e) => {
        if (e.pedidos7d <= 0 || seen.has(e.itemId)) return false;
        seen.add(e.itemId);
        return true;
      })
      .sort((a, b) => b.pedidos7d - a.pedidos7d);

    if (filterNoClips) {
      return items.filter((e) => {
        const clip = itemClipMap.get(e.itemId);
        return !clip || !clip.hasClip;
      }).slice(0, 10);
    }
    return items.slice(0, 5);
  }, [eligibilityItems, filterNoClips, itemClipMap]);

  /* ── 7. Hot items: high pedidos, deduplicated ── */
  const hotItems = useMemo(() => {
    const seen = new Set<string>();
    return eligibilityItems
      .filter((e) => {
        if (e.pedidos7d <= 5 || seen.has(e.itemId)) return false;
        seen.add(e.itemId);
        return true;
      })
      .sort((a, b) => b.pedidos7d - a.pedidos7d)
      .slice(0, 8);
  }, [eligibilityItems]);

  /* ── 8. Conversion rate ── */
  const conversionRate = pct(totals.ordersClips, totals.visitasClips);

  /* ── Clips link for seller ── */
  const sellerCustId = selectedSeller && sellerCustIdMap ? sellerCustIdMap[selectedSeller] : null;
  const clipsLink = sellerCustId ? `https://lista.mercadolivre.com.br/_CustId_${sellerCustId}` : null;

  /* ── Get video status for an item (using performance-based detection) ── */
  const getItemVideoStatus = (item: EligibilityItem) => {
    const clip = itemClipMap.get(item.itemId);
    const hasClip = clip ? clip.hasClip : false;
    const ordersC = clip ? clip.ordersClips : 0;
    const visitasC = clip ? clip.visitasClips : 0;
    const siC = clip ? clip.siClips : 0;
    return getVideoStatus(hasClip, ordersC, visitasC, siC, avgOrdersClips);
  };

  /* ── Get clip status badge for an item ── */
  const getClipStatusBadge = (itemId: string) => {
    const clip = itemClipMap.get(itemId);
    const hc = clip ? clip.hasClip : false;
    if (hc) {
      return <Badge className="text-[11px] bg-emerald/10 text-emerald border-emerald/20">✅ Ativo no Clips</Badge>;
    }
    return <Badge className="text-[11px] bg-destructive/15 text-destructive border-destructive/20">❌ Analisar</Badge>;
  };

  /* ── Summary using performance-based detection ── */
  const videoIssuesSummary = useMemo(() => {
    let noReach = 0, lowConversion = 0, champion = 0, noClip = 0;
    const seen = new Set<string>();

    if (listingsQuality) {
      for (const lq of listingsQuality) {
        if (seen.has(lq.itemId)) continue;
        seen.add(lq.itemId);
        const hc = hasClipData(lq.visitasClips, lq.siClips, lq.ordersClips);
        if (!hc) { noClip++; continue; }
        if (lq.visitasClips === 0 && lq.siClips === 0) { noReach++; continue; }
        if (lq.ordersClips < avgOrdersClips || lq.ordersClips < 3) { lowConversion++; continue; }
        champion++;
      }
    }

    for (const ei of eligibilityItems) {
      if (seen.has(ei.itemId) || ei.pedidos7d <= 0) continue;
      seen.add(ei.itemId);
      noClip++;
    }

    return { noReach, lowConversion, champion, noClip };
  }, [listingsQuality, eligibilityItems, avgOrdersClips]);

  /* ── Donut data ── */
  const donutData = useMemo(() => [
    { name: "Anúncios com Clip", value: clipCoverage.withClip },
    { name: "Anúncios sem Clip", value: clipCoverage.withoutClip },
  ], [clipCoverage]);

  const DONUT_COLORS = ["hsl(var(--emerald))", "hsl(var(--muted))"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* ── Row 0: Clip Coverage Donut ── */}
      {clipCoverage.total > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-emerald" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Cobertura de Clips no Catálogo
            </h3>
            <TooltipInfo text="Proporção de anúncios únicos (MLBs) que possuem dados de performance de Clips ativos (visitas, impressões ou pedidos via clip) vs. anúncios sem nenhum dado de clips." />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-[200px] h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((_, idx) => (
                      <Cell key={idx} fill={DONUT_COLORS[idx]} />
                    ))}
                  </Pie>
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" className="fill-foreground font-bold text-xl">
                    {clipCoverage.total > 0 ? `${((clipCoverage.withClip / clipCoverage.total) * 100).toFixed(0)}%` : "0%"}
                  </text>
                  <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[10px]">
                    cobertura
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-foreground">
                <span className="font-bold text-emerald">{clipCoverage.withClip}</span>
                <span className="text-muted-foreground"> de </span>
                <span className="font-bold">{clipCoverage.total}</span>
                <span className="text-muted-foreground"> anúncios possuem Clips ativos</span>
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald" />
                  <span className="text-xs text-muted-foreground">Anúncios com Clip ({clipCoverage.withClip})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-muted" />
                  <span className="text-xs text-muted-foreground">Anúncios sem Clip ({clipCoverage.withoutClip})</span>
                </div>
              </div>
              {clipCoverage.withoutClip > 0 && (
                <p className="text-xs text-warning flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {clipCoverage.withoutClip} anúncios sem Clip representam oportunidades perdidas de conversão
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
              <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={{ stroke: "hsl(215, 20%, 25%)" }} />
              <YAxis yAxisId="left" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={{ stroke: "hsl(215, 20%, 25%)" }} tickFormatter={(v) => fmt(v)} label={{ value: "Visitas Clips", angle: -90, position: "insideLeft", fill: "hsl(215, 20%, 55%)", fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={{ stroke: "hsl(215, 20%, 25%)" }} tickFormatter={(v) => fmt(v)} label={{ value: "Faturamento (R$)", angle: 90, position: "insideRight", fill: "hsl(215, 20%, 55%)", fontSize: 10 }} />
              <Tooltip content={<ComboTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "hsl(215, 20%, 55%)" }} />
              <Bar yAxisId="left" dataKey="visitasClips" name="Visitas Clips" fill="hsl(var(--neon-blue))" fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={32} />
              <Line yAxisId="right" type="monotone" dataKey="tgmvClips" name="Faturamento Clips" stroke="hsl(var(--warning))" strokeWidth={2.5} dot={{ fill: "hsl(var(--warning))", r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row 3: Content Efficiency Table with Status Clips column & filter ── */}
      {(topContentItems.length > 0 || filterNoClips) && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                {filterNoClips ? "Oportunidade: Anúncios sem Clips" : "Eficiência de Conteúdo — Top Itens"}
              </h3>
              <TooltipInfo text={filterNoClips ? "Itens com alto volume de vendas que ainda não possuem Clips ativos — oportunidade perdida de conversão." : "Top itens com maior volume de vendas. Avalie a tração desses produtos para priorizar criação de Clips."} />
            </div>
            <Button
              variant={filterNoClips ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterNoClips(!filterNoClips)}
              className="gap-1.5 text-xs"
            >
              <Filter className="w-3.5 h-3.5" />
              {filterNoClips ? "Mostrar Todos" : "Ver anúncios sem Clips"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Produto</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Pedidos 7D</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Estoque</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Desconto %</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status Clips</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status do Vídeo</th>
                </tr>
              </thead>
              <tbody>
                {topContentItems.length === 0 && filterNoClips && (
                  <tr><td colSpan={6} className="text-center py-6 text-muted-foreground text-sm">Nenhum anúncio sem Clip encontrado com vendas relevantes.</td></tr>
                )}
                {topContentItems.map((item, idx) => {
                  const vs = getItemVideoStatus(item);
                  const discountVal = fmtDiscount(item.discountBest);

                  return (
                    <motion.tr
                      key={`${item.itemId}-${idx}`}
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
                        {Math.round(item.pedidos7d)}
                      </td>
                      <td className="text-center py-2.5 px-3 font-mono">
                        <span className={item.estoqueMedio7d < 5 ? "text-destructive font-bold" : "text-foreground"}>
                          {Math.round(item.estoqueMedio7d)}
                        </span>
                      </td>
                      <td className="text-center py-2.5 px-3 font-mono text-foreground">
                        {discountVal}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        {getClipStatusBadge(item.itemId)}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <Badge className={`text-[11px] ${vs.badgeClass}`}>
                          {vs.label}
                        </Badge>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Row 4: 🔥 Alerta de Conversão ── */}
      {hotItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-warning" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-warning">
              🔥 Alerta de Conversão: Otimização de Vídeo e Script
            </h3>
            <TooltipInfo text="Itens com alto volume de vendas que precisam de otimização de vídeo. Expanda cada card para acessar o checklist de diagnóstico de produção." />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {hotItems.map((item, idx) => (
              <HotItemCard
                key={`${item.itemId}-${idx}`}
                item={item}
                videoStatus={getItemVideoStatus(item)}
                clipsLink={clipsLink}
                idx={idx}
              />
            ))}
          </div>
        </div>
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
            { label: "Anúncios com Clip", value: clipCoverage.withClip, color: "text-emerald" },
            { label: "Vídeo Campeão", value: videoIssuesSummary.champion, color: "text-emerald" },
            { label: "Baixa Conversão", value: videoIssuesSummary.lowConversion, color: "text-warning" },
            { label: "Sem Alcance / Sem Clip", value: videoIssuesSummary.noReach + videoIssuesSummary.noClip, color: "text-destructive" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
              <p className={`font-mono text-lg font-bold ${m.color}`}>
                {fmt(m.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ClipsAudiencePanel;
