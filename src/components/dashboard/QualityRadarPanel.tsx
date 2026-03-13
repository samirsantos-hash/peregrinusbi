import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend } from
"recharts";
import { Shield, Video, TrendingUp, Zap } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface KpiLike {
  date: string;
  scorePhoto: number;
  scoreTitle: number;
  scoreOferta: number;
  scoreCaracteristica: number;
  repCancellationsRate: number;
  scoreFull: number;
  scorePads: number;
  llPicturesScore: number;
  llTitleScore: number;
  llTechSpecsScore: number;
  llDescriptionScore: number;
  llPriceScore: number;
  llStockAvailabilityScore: number;
  llFreeShippingScore: number;
  llPromotionsScore: number;
  sellersClipsPubli: number;
  visitasClips: number;
  siClips: number;
  ordersClips: number;
  tgmvLcClips: number;
}

interface QualityRadarPanelProps {
  kpis: KpiLike[];
  sellerCustIdMap?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Safely coerce any falsy / NaN value to 0 */
function safe(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

/* Benchmarks for normalizing raw clip volumes → 0-100 */
const CLIPS_GOALS = {
  sellersClipsPubli: 20,
  visitasClips: 8000,
  siClips: 800,
  ordersClips: 40
};

/* Dimension definitions (9 spokes) */
const DIMENSIONS = [
// Técnico (3)
{ key: "pictures", label: "Fotos", group: "tecnico" },
{ key: "title", label: "Título", group: "tecnico" },
{ key: "description", label: "Descrição", group: "tecnico" },
// Comercial (3)
{ key: "price", label: "Preço", group: "comercial" },
{ key: "freeShipping", label: "Frete Grátis", group: "comercial" },
{ key: "promotions", label: "Promoções", group: "comercial" },
// Engajamento / Clips (3) — NEW HIGHLIGHT
{ key: "clipsPubli", label: "Clips Publicados", group: "engajamento" },
{ key: "clipsSI", label: "Vendas via Clip", group: "engajamento" },
{ key: "clipsOrders", label: "Pedidos Clips", group: "engajamento" }] as
const;

const GROUP_META = {
  tecnico: { label: "Técnico", color: "hsl(var(--neon-blue))" },
  comercial: { label: "Comercial", color: "hsl(var(--emerald))" },
  engajamento: { label: "Engajamento", color: "#00E676" }
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const QualityRadarPanel = ({ kpis }: QualityRadarPanelProps) => {
  const {
    radarData,
    avgScore,
    scoreLevel,
    rawClipsTgmv,
    hasClipsActive,
    rawSiClips,
    clipsConversionPct
  } = useMemo(() => {
    if (kpis.length === 0) {
      return {
        radarData: DIMENSIONS.map((d) => ({
          dimension: d.label,
          group: d.group,
          tecnico: 0,
          comercial: 0,
          engajamento: 0,
          _value: 0
        })),
        avgScore: 0,
        scoreLevel: { text: "Sem Dados", color: "hsl(var(--muted-foreground))" },
        rawClipsTgmv: 0,
        hasClipsActive: false,
        rawSiClips: 0,
        clipsConversionPct: 0
      };
    }

    const sorted = [...kpis].sort((a, b) => b.date.localeCompare(a.date));
    const lat = sorted[0];

    // Validate every value
    const v = {
      llPictures: safe(lat.llPicturesScore) || safe(lat.scorePhoto),
      llTitle: safe(lat.llTitleScore) || safe(lat.scoreTitle),
      llDescription: safe(lat.llDescriptionScore) || safe(lat.scoreQualidade),
      llPrice: safe(lat.llPriceScore) || safe(lat.scoreOferta),
      llFreeShipping: safe(lat.llFreeShippingScore),
      llPromotions: safe(lat.llPromotionsScore),
      sellersClipsPub: safe(lat.sellersClipsPubli),
      siClips: safe(lat.siClips),
      ordersClips: safe(lat.ordersClips),
      visitasClips: safe(lat.visitasClips),
      tgmvClips: safe(lat.tgmvLcClips)
    };

    const scores: Record<string, number> = {
      pictures: clamp(v.llPictures),
      title: clamp(v.llTitle),
      description: clamp(v.llDescription),
      price: clamp(v.llPrice),
      freeShipping: clamp(v.llFreeShipping),
      promotions: clamp(v.llPromotions),
      clipsPubli: clamp(v.sellersClipsPub / CLIPS_GOALS.sellersClipsPubli * 100),
      clipsSI: clamp(v.siClips / CLIPS_GOALS.siClips * 100),
      clipsOrders: clamp(v.ordersClips / CLIPS_GOALS.ordersClips * 100)
    };

    const data = DIMENSIONS.map((d) => {
      const val = scores[d.key] || 0;
      return {
        dimension: d.label,
        group: d.group,
        tecnico: d.group === "tecnico" ? val : 0,
        comercial: d.group === "comercial" ? val : 0,
        engajamento: d.group === "engajamento" ? val : 0,
        _value: val
      };
    });

    const allVals = data.map((d) => d._value);
    const avg = Math.round(allVals.reduce((s, vl) => s + vl, 0) / allVals.length);

    const level =
    avg >= 80 ?
    { text: "Excelente", color: "hsl(var(--emerald))" } :
    avg >= 60 ?
    { text: "Bom", color: "hsl(var(--neon-blue))" } :
    avg >= 40 ?
    { text: "Regular", color: "hsl(var(--warning))" } :
    { text: "Crítico", color: "hsl(var(--destructive))" };

    const convPct = v.visitasClips > 0 ? v.ordersClips / v.visitasClips * 100 : 0;

    return {
      radarData: data,
      avgScore: avg,
      scoreLevel: level,
      rawClipsTgmv: v.tgmvClips,
      hasClipsActive: v.sellersClipsPub > 0,
      rawSiClips: v.siClips,
      clipsConversionPct: Math.round(convPct * 100) / 100
    };
  }, [kpis]);

  const lowScores = radarData.filter((d) => d._value > 0 && d._value < 70);

  /* Engagement layer color changes to neon green when clips are active */
  const engajamentoColor = hasClipsActive ? "#00E676" : "hsl(var(--warning))";

  /* ---------- Custom Tooltip ---------- */
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;
    const val = item._value;
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-lg backdrop-blur-md">
        <p className="font-semibold text-foreground mb-1">{item.dimension}</p>
        <p className="text-muted-foreground">
          Score: <span className="font-mono font-bold text-foreground">{val}/100</span>
        </p>
        {item.group === "engajamento" &&
        <div className="mt-2 space-y-1 border-t border-border pt-2">
            <p className="text-muted-foreground">
              Itens vendidos via Clips:{" "}
              <span className="font-mono font-bold text-foreground">{rawSiClips.toLocaleString("pt-BR")}</span>
            </p>
            <p className="text-muted-foreground">
              Conversão Clips:{" "}
              <span className="font-mono font-bold" style={{ color: engajamentoColor }}>
                {clipsConversionPct}%
              </span>
            </p>
            <p className="text-muted-foreground">
              TGMV Clips:{" "}
              <span className="font-mono font-bold text-warning">
                R$ {rawClipsTgmv.toLocaleString("pt-BR")}
              </span>
            </p>
          </div>
        }
      </div>);

  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Main Card */}
      <div className="glass-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-neon-blue" />
            Índice de Qualidade — Radar Multidimensional
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono" style={{ color: scoreLevel.color }}>
                {avgScore}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ color: scoreLevel.color, borderColor: scoreLevel.color }}>
                
                {scoreLevel.text}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Radar */}
          <div className="w-full lg:w-2/3 h-[440px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <defs>
                  <linearGradient id="gradTecnico" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(199,100%,50%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(199,100%,50%)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradComercial" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160,84%,39%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(160,84%,39%)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradEngajamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={engajamentoColor} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={engajamentoColor} stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <PolarGrid stroke="hsl(215,25%,16%)" strokeOpacity={0.6} />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false} />
                
                <Radar
                  name="Técnico"
                  dataKey="tecnico"
                  stroke="hsl(var(--neon-blue))"
                  fill="url(#gradTecnico)"
                  fillOpacity={0.4}
                  strokeWidth={2} />
                
                <Radar
                  name="Comercial"
                  dataKey="comercial"
                  stroke="hsl(var(--emerald))"
                  fill="url(#gradComercial)"
                  fillOpacity={0.4}
                  strokeWidth={2} />
                
                <Radar
                  name="Engajamento"
                  dataKey="engajamento"
                  stroke={engajamentoColor}
                  fill="url(#gradEngajamento)"
                  fillOpacity={0.4}
                  strokeWidth={3} />
                
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }} />
                
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Sidebar: breakdown + badges */}
          <div className="w-full lg:w-1/3 space-y-5">
            {/* TGMV Clips Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl p-4 border"
              style={{
                borderColor: hasClipsActive ? "#00E67640" : "hsl(var(--border))",
                background: hasClipsActive ?
                "linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,230,118,0.02))" :
                "hsl(var(--card))"
              }}>
              
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4" style={{ color: engajamentoColor }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: engajamentoColor }}>
                  Faturamento via Clips
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-foreground">
                R$ {rawClipsTgmv.toLocaleString("pt-BR")}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-base">
                  <Zap className="w-3 h-3" /> {rawSiClips} vendas
                </span>
                <span className="flex items-center gap-1 text-base">
                  <TrendingUp className="w-3 h-3" /> {clipsConversionPct}% conversão
                </span>
              </div>
              {hasClipsActive &&
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "#00E67620", color: "#00E676" }}>
                  <Video className="w-3 h-3" /> Clips Ativo
                </div>
              }
            </motion.div>

            {/* Score breakdown by group */}
            {(["tecnico", "comercial", "engajamento"] as const).map((group) => {
              const meta = GROUP_META[group];
              const items = radarData.filter((d) => d.group === group);
              return (
                <div key={group}>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: group === "engajamento" ? engajamentoColor : meta.color }}>
                    
                    {meta.label}
                  </p>
                  <div className="space-y-2">
                    {items.map((d) => {
                      const pct = d._value;
                      const barColor =
                      pct >= 80 ?
                      "bg-emerald" :
                      pct >= 60 ?
                      "bg-neon-blue" :
                      pct >= 40 ?
                      "bg-warning" :
                      "bg-destructive";
                      return (
                        <div key={d.dimension} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground text-sm">{d.dimension}</span>
                            <span className="font-mono font-bold text-foreground">{pct}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${barColor}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }} />
                            
                          </div>
                        </div>);

                    })}
                  </div>
                </div>);

            })}
          </div>
        </div>
      </div>

      {/* Alerts for low scores */}
      {lowScores.length > 0 &&
      <div className="glass-card p-5">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-warning mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Dimensões que Precisam de Atenção (Score &lt; 70)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowScores.map((d) =>
          <div
            key={d.dimension}
            className="flex items-center gap-3 p-3 rounded-lg border border-warning/20 bg-warning/5">
            
                <span className="text-2xl font-bold font-mono text-warning">{d._value}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{d.dimension}</p>
                  <p className="text-xs text-muted-foreground">Abaixo do padrão recomendado</p>
                </div>
              </div>
          )}
          </div>
        </div>
      }
    </motion.div>);

};

export default QualityRadarPanel;