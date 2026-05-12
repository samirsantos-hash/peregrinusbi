import { useMemo, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { fmtBRL, fmtNumCompact } from "@/utils/formatters";
import TooltipInfo from "./TooltipInfo";

import { monthKey as getMonthKey } from "@/lib/dates";
import { detectPartialMonths } from "@/utils/partialPeriodGuard";

interface QuarterlyKpi {
  date: string;
  tgmv: number;
  gmv?: number;
  adsInvestment: number;
  tsi: number;
}

interface QuarterlyPerformanceChartProps {
  kpis: QuarterlyKpi[];
}

const PERIOD_OPTIONS = [
  { key: "all", label: "Todo Período" },
  { key: "q1", label: "Q1" },
  { key: "q2", label: "Q2" },
  { key: "q3", label: "Q3" },
  { key: "q4", label: "Q4" },
];

function aggregateByMonth(kpis: QuarterlyKpi[]) {
  const buckets = new Map<string, { gmv: number; tgmv: number; count: number }>();

  for (const k of kpis) {
    const date = k.date || "";
    if (!date) continue;
    const monthKey = getMonthKey(date);

    const prev = buckets.get(monthKey) || { gmv: 0, tgmv: 0, count: 0 };
    const gmv = typeof k.gmv === "number" ? k.gmv : (typeof k.tgmv === "number" ? k.tgmv : 0);
    const tgmv = typeof k.tgmv === "number" ? k.tgmv : 0;

    buckets.set(monthKey, {
      gmv: prev.gmv + gmv,
      tgmv: prev.tgmv + tgmv,
      count: prev.count + 1,
    });
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => {
      const [y, m] = key.split("-");
      return {
        key,
        date: key,
        label: `01/${m}`,
        gmv: vals.gmv,
        tgmv: vals.tgmv,
        days: vals.count,
      };
    });
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1.5 min-w-[220px]">
      <p className="font-mono text-muted-foreground font-semibold">📅 {row.key}</p>
      <p className="text-[10px] text-muted-foreground">{row.days} registros</p>
      <p className="text-neon-blue font-medium">💰 Faturamento Bruto: {fmtBRL(row.gmv)}</p>
      <p className="text-emerald font-medium">✅ Faturamento Realizado: {fmtBRL(row.tgmv)}</p>
    </div>
  );
}

const QuarterlyPerformanceChart = ({ kpis }: QuarterlyPerformanceChartProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hidePartial, setHidePartial] = useState(true);

  const filteredKpis = useMemo(() => {
    if (selectedPeriod === "all") return kpis;
    const qNum = parseInt(selectedPeriod.replace("q", ""), 10);
    const startMonth = (qNum - 1) * 3 + 1;
    const endMonth = qNum * 3;
    return kpis.filter((k) => {
      if (!k.date) return false;
      const m = parseInt(k.date.split("-")[1], 10);
      return m >= startMonth && m <= endMonth;
    });
  }, [kpis, selectedPeriod]);

  const aggregated = useMemo(() => aggregateByMonth(filteredKpis), [filteredKpis]);

  const partialInfo = useMemo(
    () => detectPartialMonths(aggregated, { gmvField: "gmv", thresholdPct: 0.3 }),
    [aggregated],
  );

  const taggedData = useMemo(
    () =>
      aggregated.map((r) => {
        const info = partialInfo.get(r.key);
        return { ...r, partial: info?.isPartial ?? false, share: info?.gmvShare ?? 1 };
      }),
    [aggregated, partialInfo],
  );

  const partialCount = taggedData.filter((d) => d.partial).length;
  const chartData = useMemo(
    () => (hidePartial ? taggedData.filter((d) => !d.partial) : taggedData),
    [taggedData, hidePartial],
  );

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    let maxVal = 0;
    for (const d of chartData) {
      if (!hidden.has("gmv") && d.gmv > maxVal) maxVal = d.gmv;
      if (!hidden.has("tgmv") && d.tgmv > maxVal) maxVal = d.tgmv;
    }
    return [0, Math.ceil(maxVal * 1.15) || 100];
  }, [chartData, hidden]);

  const handleLegendClick = useCallback((entry: any) => {
    const key = entry.dataKey as string;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  if (chartData.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Evolução de Faturamento
          </h3>
          <TooltipInfo text="Evolução mensal do faturamento bruto (GMV) e realizado (TGMV). Clique na legenda para mostrar/ocultar séries." />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/50">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSelectedPeriod(opt.key)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  selectedPeriod === opt.key
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {partialCount > 0 && (
            <button
              onClick={() => setHidePartial((v) => !v)}
              title={
                hidePartial
                  ? `Mostrar ${partialCount} mês(es) com dados parciais`
                  : `Ocultar ${partialCount} mês(es) com dados parciais (<30% da mediana)`
              }
              className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-all ${
                hidePartial
                  ? "bg-warning/10 text-warning border-warning/30"
                  : "bg-muted/30 text-muted-foreground border-border/50 hover:text-foreground"
              }`}
            >
              {hidePartial ? `Ocultando ${partialCount} parcial${partialCount > 1 ? "is" : ""}` : `Incluindo parciais`}
            </button>
          )}
          <span className="text-[10px] text-muted-foreground bg-muted/20 border border-border/30 px-2 py-0.5 rounded">
            {chartData.length} meses
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradGmv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradTgmv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />

          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            domain={yDomain}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmtNumCompact(v)}
            width={55}
          />

          <Tooltip content={<ChartTooltip />} />

          <Area
            type="monotone"
            dataKey="gmv"
            name="Faturamento Bruto"
            stroke="hsl(199, 100%, 50%)"
            strokeWidth={2.5}
            fill="url(#gradGmv)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
            animationDuration={800}
            hide={hidden.has("gmv")}
          />

          <Area
            type="monotone"
            dataKey="tgmv"
            name="Faturamento Realizado"
            stroke="hsl(160, 84%, 39%)"
            strokeWidth={2.5}
            fill="url(#gradTgmv)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
            animationDuration={800}
            hide={hidden.has("tgmv")}
          />

          <Legend
            wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
            onClick={handleLegendClick}
            formatter={(value: string, entry: any) => (
              <span
                className="text-xs"
                style={{
                  color: hidden.has(entry.dataKey) ? "hsl(var(--muted-foreground) / 0.4)" : "hsl(var(--muted-foreground))",
                  textDecoration: hidden.has(entry.dataKey) ? "line-through" : "none",
                }}
              >
                {value}
              </span>
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default QuarterlyPerformanceChart;
