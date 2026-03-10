import { useMemo } from "react";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Shield, Star } from "lucide-react";

interface KpiLike {
  date: string;
  scorePhoto: number;
  scoreTitle: number;
  scoreOferta: number;
  scoreCaracteristica: number;
  scoreQualidade: number;
  scoreFull: number;
  scorePads: number;
}

interface QualityRadarPanelProps {
  kpis: KpiLike[];
}

const DIMENSIONS = [
  { key: "scorePhoto", label: "Fotos", fullLabel: "Qualidade de Fotos" },
  { key: "scoreTitle", label: "Título", fullLabel: "Qualidade de Título / SEO" },
  { key: "scoreOferta", label: "Oferta", fullLabel: "Score de Oferta" },
  { key: "scoreCaracteristica", label: "Atributos", fullLabel: "Score de Características" },
  { key: "scoreQualidade", label: "Qualidade", fullLabel: "Score Geral de Qualidade" },
  { key: "scoreFull", label: "Full", fullLabel: "Score Final Full" },
] as const;

const QualityRadarPanel = ({ kpis }: QualityRadarPanelProps) => {
  const { radarData, avgScore, scoreLevel } = useMemo(() => {
    if (kpis.length === 0) {
      return {
        radarData: DIMENSIONS.map((d) => ({ dimension: d.label, fullLabel: d.fullLabel, value: 0 })),
        avgScore: 0,
        scoreLevel: { text: "Sem Dados", color: "hsl(var(--muted-foreground))" },
      };
    }

    // Use latest KPI record
    const sorted = [...kpis].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];

    const data = DIMENSIONS.map((d) => ({
      dimension: d.label,
      fullLabel: d.fullLabel,
      value: Math.round((latest[d.key] as number) || 0),
    }));

    const avg = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length);

    const level =
      avg >= 80
        ? { text: "Excelente", color: "hsl(var(--emerald))" }
        : avg >= 60
        ? { text: "Bom", color: "hsl(var(--neon-blue))" }
        : avg >= 40
        ? { text: "Regular", color: "hsl(var(--warning))" }
        : { text: "Crítico", color: "hsl(var(--destructive))" };

    return { radarData: data, avgScore: avg, scoreLevel: level };
  }, [kpis]);

  const lowScores = radarData.filter((d) => d.value > 0 && d.value < 70);

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
            <span className="text-xs px-2 py-0.5 rounded-full border" style={{ color: scoreLevel.color, borderColor: scoreLevel.color }}>
              {scoreLevel.text}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="w-full lg:w-2/3 h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="hsl(var(--neon-blue))"
                  fill="hsl(var(--neon-blue))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}/100`,
                    props.payload.fullLabel,
                  ]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Score breakdown */}
          <div className="w-full lg:w-1/3 space-y-3">
            {radarData.map((d) => {
              const pct = d.value;
              const barColor =
                pct >= 80 ? "bg-emerald" : pct >= 60 ? "bg-neon-blue" : pct >= 40 ? "bg-warning" : "bg-destructive";
              return (
                <div key={d.dimension} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{d.fullLabel}</span>
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
              <div key={d.dimension} className="flex items-center gap-3 p-3 rounded-lg border border-warning/20 bg-warning/5">
                <span className="text-2xl font-bold font-mono text-warning">{d.value}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{d.fullLabel}</p>
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
