import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, ShieldCheck } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { fmtPct, formatChartDate } from "@/utils/formatters";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { AlgoTooltip } from "@/components/ui/AlgoTooltip";
import {
  statusReputacao,
  corLinhaTendencia,
  slopeUltimosN,
  type MetricaReputacao,
} from "@/lib/reputationStatus";

interface KpiLike {
  date: string;
  repLevel: string;
  repClaimsRate: number;
  repDelayedRate: number;
  repCancellationsRate: number;
}

interface ReputationPanelProps {
  kpis: KpiLike[];
  dataGranularity?: "consolidated" | "daily";
}

type Severity = "green" | "yellow" | "red";

interface TrafficLight {
  label: string;
  value: number;
  formatted: string;
  severity: Severity;
  description: string;
  thresholds: string;
  serie: number[];
  metrica: MetricaReputacao;
  tooltipKey: "taxaReclamacoes" | "taxaAtrasos" | "taxaCancelamentos";
}

function getSeverity(value: number, greenMax: number, yellowMax: number): Severity {
  if (value <= greenMax) return "green";
  if (value <= yellowMax) return "yellow";
  return "red";
}

const SEVERITY_CONFIG: Record<Severity, { emoji: string; bg: string; border: string; text: string; glow: string }> = {
  green: {
    emoji: "🟢",
    bg: "bg-emerald/10",
    border: "border-emerald/30",
    text: "text-emerald",
    glow: "shadow-[0_0_12px_hsl(160,84%,39%,0.3)]",
  },
  yellow: {
    emoji: "🟡",
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    glow: "shadow-[0_0_12px_hsl(40,95%,55%,0.3)]",
  },
  red: {
    emoji: "🔴",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    text: "text-destructive",
    glow: "shadow-[0_0_12px_hsl(0,84%,60%,0.3)]",
  },
};

const ReputationPanel = ({ kpis, dataGranularity = "daily" }: ReputationPanelProps) => {
  const { lights, latest, trendData, overallSeverity, slopes } = useMemo(() => {
    if (kpis.length === 0) {
      return {
        lights: [] as TrafficLight[],
        latest: null,
        trendData: [],
        overallSeverity: "yellow" as Severity,
        slopes: { claims: 0, delays: 0, cancels: 0 },
      };
    }

    const sorted = [...kpis].sort((a, b) => a.date.localeCompare(b.date));
    const lat = sorted[sorted.length - 1];

    const claimsSev = getSeverity(lat.repClaimsRate * 100, 2, 5);
    const delaySev = getSeverity(lat.repDelayedRate * 100, 5, 10);
    const cancRate = (lat.repCancellationsRate || 0) * 100;
    const cancSev = getSeverity(cancRate, 2, 5);

    const claimsSerie = sorted.map((k) => +(k.repClaimsRate * 100).toFixed(3));
    const delaysSerie = sorted.map((k) => +(k.repDelayedRate * 100).toFixed(3));
    const cancelsSerie = sorted.map((k) => +((k.repCancellationsRate || 0) * 100).toFixed(3));

    const lightsArr: TrafficLight[] = [
      {
        label: "Taxa de Reclamações",
        value: lat.repClaimsRate * 100,
        formatted: `${(lat.repClaimsRate * 100).toFixed(2)}%`,
        severity: claimsSev,
        description: "Percentual de vendas com reclamações abertas",
        thresholds: "🟢 ≤2% · 🟡 ≤5% · 🔴 >5%",
        serie: claimsSerie,
        metrica: "reclamacoes",
        tooltipKey: "taxaReclamacoes",
      },
      {
        label: "Taxa de Atrasos",
        value: lat.repDelayedRate * 100,
        formatted: `${(lat.repDelayedRate * 100).toFixed(2)}%`,
        severity: delaySev,
        description: "Percentual de envios atrasados (handling time)",
        thresholds: "🟢 ≤5% · 🟡 ≤10% · 🔴 >10%",
        serie: delaysSerie,
        metrica: "atrasos",
        tooltipKey: "taxaAtrasos",
      },
      {
        label: "Taxa de Cancelamento",
        value: cancRate,
        formatted: `${cancRate.toFixed(1)}%`,
        severity: cancSev,
        description: "Percentual de vendas canceladas",
        thresholds: "🟢 ≤2% · 🟡 ≤5% · 🔴 >5%",
        serie: cancelsSerie,
        metrica: "cancelamentos",
        tooltipKey: "taxaCancelamentos",
      },
    ];

    const trend = sorted.map((k) => ({
      date: k.date,
      claims: +(k.repClaimsRate * 100).toFixed(2),
      delays: +(k.repDelayedRate * 100).toFixed(2),
      cancels: +((k.repCancellationsRate || 0) * 100).toFixed(2),
    }));

    const worst = [claimsSev, delaySev, cancSev];
    const overall: Severity = worst.includes("red") ? "red" : worst.includes("yellow") ? "yellow" : "green";

    return {
      lights: lightsArr,
      latest: lat,
      trendData: trend,
      overallSeverity: overall,
      slopes: {
        claims: slopeUltimosN(claimsSerie, 3),
        delays: slopeUltimosN(delaysSerie, 3),
        cancels: slopeUltimosN(cancelsSerie, 3),
      },
    };
  }, [kpis]);

  if (!latest) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        Sem dados de reputação disponíveis.
      </div>
    );
  }

  const overallCfg = SEVERITY_CONFIG[overallSeverity];

  // Métricas individuais para os mini-charts
  const mini = [
    {
      key: "claims" as const,
      label: "Reclamações",
      metrica: "reclamacoes" as MetricaReputacao,
      slope: slopes.claims,
      valor: latest.repClaimsRate * 100,
      atencao: 2,
      critico: 5,
    },
    {
      key: "delays" as const,
      label: "Atrasos",
      metrica: "atrasos" as MetricaReputacao,
      slope: slopes.delays,
      valor: latest.repDelayedRate * 100,
      atencao: 5,
      critico: 10,
    },
    {
      key: "cancels" as const,
      label: "Cancelamentos",
      metrica: "cancelamentos" as MetricaReputacao,
      slope: slopes.cancels,
      valor: (latest.repCancellationsRate || 0) * 100,
      atencao: 2,
      critico: 5,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Overall Status */}
      <div className={`glass-card p-6 border ${overallCfg.border} ${overallCfg.glow}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className={`w-6 h-6 ${overallCfg.text}`} />
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                Saúde Operacional
                <AlgoTooltip tooltipKey="nivelReputacao" />
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nível atual: <span className="font-bold text-foreground">{latest.repLevel || "N/A"}</span>
              </p>
            </div>
          </div>
          <span className="text-3xl">{overallCfg.emoji}</span>
        </div>
      </div>

      {/* Traffic Lights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {lights.map((light, idx) => {
          const cfg = SEVERITY_CONFIG[light.severity];
          const slope =
            light.metrica === "reclamacoes"
              ? slopes.claims
              : light.metrica === "atrasos"
                ? slopes.delays
                : slopes.cancels;
          const st = statusReputacao(light.metrica, light.value, slope);
          return (
            <motion.div
              key={light.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`glass-card p-5 border ${cfg.border} ${cfg.glow}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{cfg.emoji}</span>
                <span className={`text-2xl font-bold font-mono ${cfg.text}`}>
                  {light.formatted}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                {light.label}
                <AlgoTooltip tooltipKey={light.tooltipKey} />
              </h4>
              <p className="text-xs text-muted-foreground mb-2">{light.description}</p>
              <p className="text-[10px] text-muted-foreground/70 font-mono mb-2">{light.thresholds}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <TrendBadge serie={light.serie} sentido="menor_melhor" formato="pp" casas={2} />
              </div>
              <p
                className="text-[10px] mt-2 px-2 py-1 rounded font-medium"
                style={{ color: st.cor, background: st.bg }}
              >
                {st.texto}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Mini-charts individuais por métrica — eixo Y dinâmico + zonas de risco */}
      {trendData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {mini.map((m) => {
            const cor = corLinhaTendencia(m.slope);
            return (
              <div key={m.key} className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-neon-blue" />
                    {m.label}
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    meta &lt; {m.atencao}%
                  </span>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                        tickFormatter={(v) => formatChartDate(v, dataGranularity)}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                        domain={[
                          (dataMin: number) => Math.max(0, dataMin - 0.5),
                          (dataMax: number) => Math.max(dataMax + 0.5, m.atencao + 1),
                        ]}
                        tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                        width={48}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)}%`, m.label]}
                      />
                      {/* Zonas de risco */}
                      <ReferenceArea
                        y1={m.atencao}
                        y2={m.critico}
                        fill="#FEF08A"
                        fillOpacity={0.18}
                        ifOverflow="extendDomain"
                      />
                      <ReferenceArea
                        y1={m.critico}
                        y2={1e6}
                        fill="#FCA5A5"
                        fillOpacity={0.18}
                        ifOverflow="extendDomain"
                      />
                      <ReferenceLine
                        y={m.atencao}
                        stroke="#D97706"
                        strokeDasharray="4 3"
                        label={{ value: `${m.atencao}%`, position: "right", fill: "#D97706", fontSize: 9 }}
                      />
                      <ReferenceLine
                        y={m.critico}
                        stroke="#DC2626"
                        strokeDasharray="4 3"
                        label={{ value: `${m.critico}%`, position: "right", fill: "#DC2626", fontSize: 9 }}
                      />
                      <Line
                        type="monotone"
                        dataKey={m.key}
                        stroke={cor}
                        strokeWidth={2.5}
                        dot={{ r: 2, fill: cor }}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default ReputationPanel;
