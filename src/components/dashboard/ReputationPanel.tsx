import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, ShieldCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fmtPct } from "@/utils/formatters";

interface KpiLike {
  date: string;
  repLevel: string;
  repClaimsRate: number;
  repDelayedRate: number;
  scoreQualidade: number;
}

interface ReputationPanelProps {
  kpis: KpiLike[];
}

type Severity = "green" | "yellow" | "red";

interface TrafficLight {
  label: string;
  value: number;
  formatted: string;
  severity: Severity;
  description: string;
  thresholds: string;
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

const ReputationPanel = ({ kpis }: ReputationPanelProps) => {
  const { lights, latest, trendData, overallSeverity } = useMemo(() => {
    if (kpis.length === 0) {
      return {
        lights: [] as TrafficLight[],
        latest: null,
        trendData: [],
        overallSeverity: "yellow" as Severity,
      };
    }

    const sorted = [...kpis].sort((a, b) => a.date.localeCompare(b.date));
    const lat = sorted[sorted.length - 1];

    const claimsSev = getSeverity(lat.repClaimsRate * 100, 2, 5);
    const delaySev = getSeverity(lat.repDelayedRate * 100, 5, 10);
    const qualSev: Severity = lat.scoreQualidade >= 70 ? "green" : lat.scoreQualidade >= 50 ? "yellow" : "red";

    const lightsArr: TrafficLight[] = [
      {
        label: "Taxa de Reclamações",
        value: lat.repClaimsRate * 100,
        formatted: `${(lat.repClaimsRate * 100).toFixed(2)}%`,
        severity: claimsSev,
        description: "Percentual de vendas com reclamações abertas",
        thresholds: "🟢 ≤2% · 🟡 ≤5% · 🔴 >5%",
      },
      {
        label: "Taxa de Atrasos",
        value: lat.repDelayedRate * 100,
        formatted: `${(lat.repDelayedRate * 100).toFixed(2)}%`,
        severity: delaySev,
        description: "Percentual de envios atrasados (handling time)",
        thresholds: "🟢 ≤5% · 🟡 ≤10% · 🔴 >10%",
      },
      {
        label: "Score de Qualidade",
        value: lat.scoreQualidade,
        formatted: `${lat.scoreQualidade.toFixed(0)}/100`,
        severity: qualSev,
        description: "Pontuação geral de qualidade dos anúncios",
        thresholds: "🟢 ≥70 · 🟡 ≥50 · 🔴 <50",
      },
    ];

    const trend = sorted.map((k) => ({
      date: k.date,
      claims: +(k.repClaimsRate * 100).toFixed(2),
      delays: +(k.repDelayedRate * 100).toFixed(2),
    }));

    const worst = [claimsSev, delaySev, qualSev];
    const overall: Severity = worst.includes("red") ? "red" : worst.includes("yellow") ? "yellow" : "green";

    return { lights: lightsArr, latest: lat, trendData: trend, overallSeverity: overall };
  }, [kpis]);

  if (!latest) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        Sem dados de reputação disponíveis.
      </div>
    );
  }

  const overallCfg = SEVERITY_CONFIG[overallSeverity];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Overall Status */}
      <div className={`glass-card p-6 border ${overallCfg.border} ${overallCfg.glow}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className={`w-6 h-6 ${overallCfg.text}`} />
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Saúde Operacional
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
              <h4 className="text-sm font-semibold text-foreground mb-1">{light.label}</h4>
              <p className="text-xs text-muted-foreground mb-2">{light.description}</p>
              <p className="text-[10px] text-muted-foreground/70 font-mono">{light.thresholds}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-blue" />
            Evolução — Reclamações e Atrasos
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="claimsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="delaysGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(40, 95%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(40, 95%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`]}
                />
                <Area
                  type="monotone"
                  dataKey="claims"
                  name="Reclamações"
                  stroke="hsl(0, 84%, 60%)"
                  fill="url(#claimsGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="delays"
                  name="Atrasos"
                  stroke="hsl(40, 95%, 55%)"
                  fill="url(#delaysGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReputationPanel;
