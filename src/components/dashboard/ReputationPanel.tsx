import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, ShieldCheck } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { formatChartDate } from "@/utils/formatters";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { AlgoTooltip } from "@/components/ui/AlgoTooltip";
import {
  statusReputacao,
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

const ROTULO_SEV: Record<Severity, string> = { green: "Saudável", yellow: "Atenção", red: "Crítico" };
const COR_SEV: Record<Severity, string> = { green: "hsl(var(--emerald))", yellow: "hsl(var(--warning))", red: "hsl(var(--destructive))" };

function StatusPill({ sev }: { sev: Severity }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ color: COR_SEV[sev], borderColor: COR_SEV[sev].replace(")", " / 0.4)"), background: COR_SEV[sev].replace(")", " / 0.1)") }}>
      <span className="w-2 h-2 rounded-full" style={{ background: COR_SEV[sev], boxShadow: `0 0 8px ${COR_SEV[sev]}` }} />
      {ROTULO_SEV[sev]}
    </span>
  );
}

function nivelLegivel(n?: string) {
  if (!n) return "Sem dado";
  const cor: Record<string, string> = { green: "Verde", light_green: "Verde-claro", yellow: "Amarelo", orange: "Laranja", red: "Vermelho" };
  const m = n.toLowerCase().match(/^(.*?)(?:_(platinum|gold|silver|leader))?$/);
  const base = m?.[1] ?? n; const medalha = m?.[2];
  return [cor[base] ?? base, medalha ? `MercadoLíder ${medalha[0].toUpperCase()}${medalha.slice(1)}` : ""].filter(Boolean).join(" · ");
}

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
        formatted: `${(lat.repClaimsRate * 100).toFixed(2).replace(".", ",")}%`,
        severity: claimsSev,
        description: "Percentual de vendas com reclamações abertas",
        thresholds: "≤2%|≤5%|>5%",
        serie: claimsSerie,
        metrica: "reclamacoes",
        tooltipKey: "taxaReclamacoes",
      },
      {
        label: "Taxa de Atrasos",
        value: lat.repDelayedRate * 100,
        formatted: `${(lat.repDelayedRate * 100).toFixed(2).replace(".", ",")}%`,
        severity: delaySev,
        description: "Percentual de envios atrasados (handling time)",
        thresholds: "≤5%|≤10%|>10%",
        serie: delaysSerie,
        metrica: "atrasos",
        tooltipKey: "taxaAtrasos",
      },
      {
        label: "Taxa de Cancelamento",
        value: cancRate,
        formatted: `${cancRate.toFixed(2).replace(".", ",")}%`,
        severity: cancSev,
        description: "Percentual de vendas canceladas",
        thresholds: "≤2%|≤5%|>5%",
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
                Nível atual: <span className="font-semibold text-foreground">{nivelLegivel(latest.repLevel)}</span>
              </p>
            </div>
          </div>
          <StatusPill sev={overallSeverity} />
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
              className={`glass-card p-5 border ${cfg.border} flex flex-col gap-3 h-full`}
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{light.label}</span>
                  <AlgoTooltip tooltipKey={light.tooltipKey} />
                </h4>
                <StatusPill sev={light.severity} />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-3xl font-bold tabular-nums leading-none ${cfg.text}`}>{light.formatted}</span>
                <TrendBadge serie={light.serie} sentido="menor_melhor" formato="pp" casas={2} />
              </div>
              <p className="text-xs text-muted-foreground leading-snug min-h-[2.5rem]">{light.description}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                {light.thresholds.split("|").map((t, i) => {
                  const c = [COR_SEV.green, COR_SEV.yellow, COR_SEV.red][i];
                  return (
                    <span key={t} className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />{t}
                    </span>
                  );
                })}
              </div>
              <p
                className="text-[11px] mt-auto px-2.5 py-1.5 rounded-md font-medium"
                style={{ color: st.cor, background: st.bg }}
              >
                {st.texto}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Evolução única: uma linha suave por indicador, cada uma com cor própria */}
      {trendData.length >= 1 && (() => {
        const CORES: Record<string, string> = {
          claims: "hsl(var(--brand-blue))",
          delays: "hsl(var(--ec-laranja, 25 75% 44%))",
          cancels: "hsl(var(--media))",
        };
        const statusCor = (v: number, a: number, c: number) =>
          v >= c ? "hsl(var(--crit))" : v >= a ? "hsl(var(--attention-text))" : "hsl(var(--ok))";
        return (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-neon-blue" />
                Evolução da reputação (%)
              </h4>
              <span className="text-[10px] text-muted-foreground">Menor é melhor · passe o mouse nas linhas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {mini.map((m) => {
                const tend = m.slope > 0.05 ? "↑ Piorando" : m.slope < -0.05 ? "↓ Melhorando" : "→ Estável";
                const corTend = m.slope > 0.05 ? "hsl(var(--crit))" : m.slope < -0.05 ? "hsl(var(--ok))" : "hsl(var(--muted-foreground))";
                return (
                  <div key={m.key} className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: CORES[m.key] }} />
                      {m.label}
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xl font-bold tabular-nums" style={{ color: statusCor(m.valor, m.atencao, m.critico) }}>
                        {m.valor.toFixed(2).replace(".", ",")}%
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: corTend }}>{tend}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      meta &lt; {m.atencao}% · crítico ≥ {m.critico}%
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="h-[220px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--grid))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--axis))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                    tickFormatter={(v) => formatChartDate(v, dataGranularity)}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--axis))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, (dataMax: number) => Math.max(dataMax + 0.5, 3)]}
                    tickFormatter={(v) => `${Number(v).toFixed(1).replace(".", ",")}%`}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    labelFormatter={(l) => formatChartDate(String(l), dataGranularity)}
                    formatter={(value: number, name: string) => [
                      `${Number(value).toFixed(2).replace(".", ",")}%`,
                      mini.find((m) => m.key === name)?.label ?? name,
                    ]}
                  />
                  <ReferenceLine
                    y={2}
                    stroke="hsl(var(--attention-text))"
                    strokeDasharray="4 3"
                    label={{ value: "meta 2%", position: "right", fill: "hsl(var(--attention-text))", fontSize: 9 }}
                  />
                  {mini.map((m) => (
                    <Line
                      key={m.key}
                      type="monotone"
                      dataKey={m.key}
                      stroke={CORES[m.key]}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};

export default ReputationPanel;
