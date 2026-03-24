import { useMemo, useState, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from "recharts";
import { fmtBRL, fmtNumCompact } from "@/utils/formatters";
import TooltipInfo from "./TooltipInfo";

interface QuarterlyKpi {
  date: string;
  tgmv: number;
  adsInvestment: number;
  tsi: number;
}

interface QuarterlyPerformanceChartProps {
  kpis: QuarterlyKpi[];
}

const QUARTER_COLORS = [
  "hsl(199, 100%, 50%)",   // Q1 blue
  "hsl(160, 84%, 39%)",    // Q2 green
  "hsl(35, 92%, 55%)",     // Q3 amber
  "hsl(340, 82%, 52%)",    // Q4 rose
];

function getQuarterLabel(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-").map(Number);
  const q = Math.ceil(m / 3);
  return `Q${q} ${y}`;
}

function aggregateByQuarter(kpis: QuarterlyKpi[]) {
  const buckets = new Map<string, { tgmv: number; ads: number; tsi: number; count: number }>();

  for (const k of kpis) {
    const date = k.date || "";
    if (!date) continue;
    const [y, m] = date.split("-").map(Number);
    const q = Math.ceil(m / 3);
    const key = `${y}-Q${q}`;

    const prev = buckets.get(key) || { tgmv: 0, ads: 0, tsi: 0, count: 0 };
    const tgmv = typeof k.tgmv === "number" ? k.tgmv : Number(String(k.tgmv).replace(",", ".")) || 0;
    const ads = typeof k.adsInvestment === "number" ? k.adsInvestment : Number(String(k.adsInvestment).replace(",", ".")) || 0;
    const tsi = typeof k.tsi === "number" ? k.tsi : Number(String(k.tsi).replace(",", ".")) || 0;

    buckets.set(key, {
      tgmv: prev.tgmv + tgmv,
      ads: prev.ads + ads,
      tsi: prev.tsi + tsi,
      count: prev.count + 1,
    });
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals], idx) => ({
      key,
      label: key.replace("-", " "),
      tgmv: vals.tgmv,
      ads: vals.ads,
      tsi: vals.tsi,
      days: vals.count,
      colorIdx: idx % 4,
    }));
}

function QuarterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1.5 min-w-[220px]">
      <p className="font-mono text-muted-foreground font-semibold">📅 {row.label}</p>
      <p className="text-[10px] text-muted-foreground">{row.days} dias de dados</p>
      <p className="text-neon-blue font-medium">💰 Faturamento: {fmtBRL(row.tgmv)}</p>
      <p className="text-warning font-medium">📣 Ads: {fmtBRL(row.ads)}</p>
      <p className="text-emerald-400 font-medium">📦 Unidades: {row.tsi.toLocaleString("pt-BR")}</p>
    </div>
  );
}

const PERIOD_OPTIONS = [
  { key: "all", label: "Todo Período" },
  { key: "q1", label: "Q1" },
  { key: "q2", label: "Q2" },
  { key: "q3", label: "Q3" },
  { key: "q4", label: "Q4" },
];

const QuarterlyPerformanceChart = ({ kpis }: QuarterlyPerformanceChartProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

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

  const chartData = useMemo(() => aggregateByQuarter(filteredKpis), [filteredKpis]);

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    let maxVal = 0;
    for (const d of chartData) {
      if (!hidden.has("tgmv") && d.tgmv > maxVal) maxVal = d.tgmv;
    }
    return [0, Math.ceil(maxVal * 1.15) || 100];
  }, [chartData, hidden]);

  const yDomainRight = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    let maxAds = 0, maxTsi = 0;
    for (const d of chartData) {
      if (!hidden.has("ads") && d.ads > maxAds) maxAds = d.ads;
      if (!hidden.has("tsi") && d.tsi > maxTsi) maxTsi = d.tsi;
    }
    const max = Math.max(maxAds, maxTsi);
    return [0, Math.ceil(max * 1.15) || 100];
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
          <TooltipInfo text="Dados agrupados por trimestre (Q1-Q4). Barras = Faturamento, Linha = Ads e Unidades. Clique na legenda para mostrar/ocultar séries." />
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
          <span className="text-[10px] text-muted-foreground bg-muted/20 border border-border/30 px-2 py-0.5 rounded">
            {chartData.length} trimestres
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradQ1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="gradQ2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="gradQ3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(35, 92%, 55%)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(35, 92%, 55%)" stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="gradQ4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(340, 82%, 52%)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(340, 82%, 52%)" stopOpacity={0.5} />
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
            yAxisId="left"
            domain={yDomain}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmtNumCompact(v)}
            width={60}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            domain={yDomainRight}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmtNumCompact(v)}
            width={55}
          />

          <Tooltip content={<QuarterTooltip />} />

          {/* Faturamento bars with per-quarter color */}
          {!hidden.has("tgmv") && (
            <Bar
              yAxisId="left"
              dataKey="tgmv"
              name="Faturamento (R$)"
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
              animationDuration={800}
            >
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={`url(#gradQ${(entry.colorIdx % 4) + 1})`} />
              ))}
            </Bar>
          )}

          {/* Ads line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ads"
            name="Investimento Ads (R$)"
            stroke="hsl(var(--warning))"
            strokeWidth={2.5}
            strokeDasharray="5 3"
            dot={{ r: 4, fill: "hsl(var(--warning))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            animationDuration={800}
            hide={hidden.has("ads")}
          />

          {/* TSI line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tsi"
            name="Unidades Vendidas"
            stroke="hsl(160, 84%, 39%)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "hsl(160, 84%, 39%)", strokeWidth: 2, stroke: "hsl(var(--background))" }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            animationDuration={800}
            hide={hidden.has("tsi")}
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
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default QuarterlyPerformanceChart;
