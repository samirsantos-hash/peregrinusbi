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
  Legend,
} from "recharts";
import { Shield, Star } from "lucide-react";

interface KpiLike {
  date: string;
  // Legacy aggregate scores (fallback)
  scorePhoto: number;
  scoreTitle: number;
  scoreOferta: number;
  scoreCaracteristica: number;
  scoreQualidade: number;
  scoreFull: number;
  scorePads: number;
  // LL Granular – Técnico
  llPicturesScore: number;
  llTitleScore: number;
  llTechSpecsScore: number;
  llDescriptionScore: number;
  // LL Granular – Oferta
  llPriceScore: number;
  llStockAvailabilityScore: number;
  llFreeShippingScore: number;
  llPromotionsScore: number;
  // Clips / Conteúdo
  sellersClipsPubli: number;
  visitasClips: number;
  siClips: number;
  ordersClips: number;
  tgmvLcClips: number;
}

interface QualityRadarPanelProps {
  kpis: KpiLike[];
}

// Category-level goals for normalizing raw clip numbers to 0-100
// Benchmarks based on Mercado Livre operational standards for active sellers
const CLIPS_GOALS = {
  sellersClipsPubli: 20,      // Meta: 20 clips publicados/mês (ativo)
  visitasClips: 8000,         // Meta: 8K visitas totais (~400 por clip)
  siClips: 800,               // Meta: 800 sessões iniciadas (10% CTR)
  ordersClips: 40,            // Meta: 40 pedidos (~0.5% conversão)
};

const DIMENSIONS = [
  // Técnico (index 0-3)
  { key: "pictures", label: "Fotos", group: "tecnico" },
  { key: "title", label: "Título", group: "tecnico" },
  { key: "techSpecs", label: "Ficha Técnica", group: "tecnico" },
  { key: "description", label: "Descrição", group: "tecnico" },
  // Oferta (index 4-7)
  { key: "price", label: "Preço", group: "oferta" },
  { key: "stock", label: "Estoque", group: "oferta" },
  { key: "freeShipping", label: "Frete Grátis", group: "oferta" },
  { key: "promotions", label: "Promoções", group: "oferta" },
  // Conteúdo (index 8-11)
  { key: "clipsPubli", label: "Clips Publicados", group: "conteudo" },
  { key: "clipsVisitas", label: "Visitas Clips", group: "conteudo" },
  { key: "clipsSI", label: "SI Clips", group: "conteudo" },
  { key: "clipsOrders", label: "Pedidos Clips", group: "conteudo" },
] as const;

const LAYER_COLORS = {
  tecnico: "hsl(var(--neon-blue))",
  oferta: "hsl(var(--emerald))",
  conteudo: "hsl(var(--warning))",
};

function clamp(v: number) {
  return Math.min(100, Math.max(0, Math.round(v)));
}

const QualityRadarPanel = ({ kpis }: QualityRadarPanelProps) => {
  const { radarData, avgScore, scoreLevel, rawClipsTgmv } = useMemo(() => {
    if (kpis.length === 0) {
      return {
        radarData: DIMENSIONS.map((d) => ({
          dimension: d.label,
          group: d.group,
          tecnico: 0,
          oferta: 0,
          conteudo: 0,
          _value: 0,
        })),
        avgScore: 0,
        scoreLevel: { text: "Sem Dados", color: "hsl(var(--muted-foreground))" },
        rawClipsTgmv: 0,
      };
    }

    const sorted = [...kpis].sort((a, b) => b.date.localeCompare(a.date));
    const lat = sorted[0];

    // Build per-dimension scores
    const scores: Record<string, number> = {
      // Técnico – use granular LL if available, fall back to legacy
      pictures: lat.llPicturesScore || lat.scorePhoto || 0,
      title: lat.llTitleScore || lat.scoreTitle || 0,
      techSpecs: lat.llTechSpecsScore || lat.scoreCaracteristica || 0,
      description: lat.llDescriptionScore || lat.scoreQualidade || 0,
      // Oferta
      price: lat.llPriceScore || lat.scoreOferta || 0,
      stock: lat.llStockAvailabilityScore || 0,
      freeShipping: lat.llFreeShippingScore || 0,
      promotions: lat.llPromotionsScore || 0,
      // Conteúdo – normalize raw numbers
      clipsPubli: clamp((lat.sellersClipsPubli / CLIPS_GOALS.sellersClipsPubli) * 100),
      clipsVisitas: clamp((lat.visitasClips / CLIPS_GOALS.visitasClips) * 100),
      clipsSI: clamp((lat.siClips / CLIPS_GOALS.siClips) * 100),
      clipsOrders: clamp((lat.ordersClips / CLIPS_GOALS.ordersClips) * 100),
    };

    const data = DIMENSIONS.map((d) => {
      const val = clamp(scores[d.key] || 0);
      return {
        dimension: d.label,
        group: d.group,
        tecnico: d.group === "tecnico" ? val : 0,
        oferta: d.group === "oferta" ? val : 0,
        conteudo: d.group === "conteudo" ? val : 0,
        _value: val,
      };
    });

    const allVals = data.map((d) => d._value);
    const avg = Math.round(allVals.reduce((s, v) => s + v, 0) / allVals.length);

    const level =
      avg >= 80
        ? { text: "Excelente", color: "hsl(var(--emerald))" }
        : avg >= 60
        ? { text: "Bom", color: "hsl(var(--neon-blue))" }
        : avg >= 40
        ? { text: "Regular", color: "hsl(var(--warning))" }
        : { text: "Crítico", color: "hsl(var(--destructive))" };

    return { radarData: data, avgScore: avg, scoreLevel: level, rawClipsTgmv: lat.tgmvLcClips || 0 };
  }, [kpis]);

  const lowScores = radarData.filter((d) => d._value > 0 && d._value < 70);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;
    const val = item._value;
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-lg">
        <p className="font-semibold text-foreground mb-1">{item.dimension}</p>
        <p className="text-muted-foreground">
          Score: <span className="font-mono font-bold text-foreground">{val}/100</span>
        </p>
        {item.group === "conteudo" && (
          <p className="text-muted-foreground mt-1">
            TGMV Clips: <span className="font-mono font-bold text-warning">R$ {rawClipsTgmv.toLocaleString("pt-BR")}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Radar Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-neon-blue" />
            Índice de Qualidade — Radar Multidimensional
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono" style={{ color: scoreLevel.color }}>
              {avgScore}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{ color: scoreLevel.color, borderColor: scoreLevel.color }}
            >
              {scoreLevel.text}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="w-full lg:w-2/3 h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="Técnico"
                  dataKey="tecnico"
                  stroke={LAYER_COLORS.tecnico}
                  fill={LAYER_COLORS.tecnico}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Radar
                  name="Oferta"
                  dataKey="oferta"
                  stroke={LAYER_COLORS.oferta}
                  fill={LAYER_COLORS.oferta}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Radar
                  name="Conteúdo"
                  dataKey="conteudo"
                  stroke={LAYER_COLORS.conteudo}
                  fill={LAYER_COLORS.conteudo}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Score breakdown by group */}
          <div className="w-full lg:w-1/3 space-y-4">
            {(["tecnico", "oferta", "conteudo"] as const).map((group) => {
              const groupLabel = group === "tecnico" ? "Técnico" : group === "oferta" ? "Oferta" : "Conteúdo";
              const items = radarData.filter((d) => d.group === group);
              return (
                <div key={group}>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: LAYER_COLORS[group] }}
                  >
                    {groupLabel}
                  </p>
                  <div className="space-y-2">
                    {items.map((d) => {
                      const pct = d._value;
                      const barColor =
                        pct >= 80
                          ? "bg-emerald"
                          : pct >= 60
                          ? "bg-neon-blue"
                          : pct >= 40
                          ? "bg-warning"
                          : "bg-destructive";
                      return (
                        <div key={d.dimension} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{d.dimension}</span>
                            <span className="font-mono font-bold text-foreground">{pct}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${barColor}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts for low scores */}
      {lowScores.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-warning mb-3 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Dimensões que Precisam de Atenção (Score &lt; 70)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowScores.map((d) => (
              <div
                key={d.dimension}
                className="flex items-center gap-3 p-3 rounded-lg border border-warning/20 bg-warning/5"
              >
                <span className="text-2xl font-bold font-mono text-warning">{d._value}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{d.dimension}</p>
                  <p className="text-xs text-muted-foreground">Abaixo do padrão recomendado</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default QualityRadarPanel;
