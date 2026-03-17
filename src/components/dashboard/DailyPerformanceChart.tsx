import { useMemo, useState, useCallback } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { fmtBRL, fmtNumCompact } from "@/utils/formatters";
import TooltipInfo from "./TooltipInfo";

interface DailyKpi {
  date: string;
  tgmv: number;
  adsInvestment: number;
  tsi: number;
}

interface DailyPerformanceChartProps {
  kpis: DailyKpi[];
}

/* ------------------------------------------------------------------ */
/*  Robust date parsing: handles YYYY-MM-DD and DD/MM/YYYY             */
/* ------------------------------------------------------------------ */
function parseFlexDate(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Fallback: try native parse
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return fmtISO(fallback);

  return trimmed; // return as-is if unparseable
}

/** Parse numeric value that may use comma as decimal separator */
function parseNumericValue(val: any): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val.replace(",", ".")) || 0;
  return Number(val) || 0;
}

/* ------------------------------------------------------------------ */
/*  Gap-fill: ensure every calendar day in range has a data point      */
/* ------------------------------------------------------------------ */
function fillGaps(kpis: DailyKpi[]) {
  if (kpis.length === 0) return [];

  const byDate = new Map<string, { tgmv: number; ads: number; tsi: number }>();
  for (const k of kpis) {
    const iso = parseFlexDate(k.date);
    if (!iso) continue;
    const prev = byDate.get(iso) || { tgmv: 0, ads: 0, tsi: 0 };
    byDate.set(iso, {
      tgmv: prev.tgmv + parseNumericValue(k.tgmv),
      ads: prev.ads + parseNumericValue(k.adsInvestment),
      tsi: prev.tsi + parseNumericValue(k.tsi),
    });
  }

  const sortedDates = [...byDate.keys()].sort();
  if (sortedDates.length === 0) return [];

  const start = parseLocal(sortedDates[0]);
  const end = parseLocal(sortedDates[sortedDates.length - 1]);

  const result: { date: string; label: string; tgmv: number; ads: number; tsi: number; tgmvLog: number; adsLog: number; tsiLog: number }[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const iso = fmtISO(cursor);
    const vals = byDate.get(iso) || { tgmv: 0, ads: 0, tsi: 0 };
    const dd = String(cursor.getDate()).padStart(2, "0");
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    result.push({
      date: iso,
      label: `${dd}/${mm}`,
      ...vals,
      tgmvLog: vals.tgmv > 0 ? vals.tgmv : 1,
      adsLog: vals.ads > 0 ? vals.ads : 1,
      tsiLog: vals.tsi > 0 ? vals.tsi : 1,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function parseLocal(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Custom tooltip — full date + R$ formatting */
function ChartTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  // Build full date display: DD/MM/YYYY from ISO date
  const fullDate = (() => {
    const [y, m, d] = (row.date || "").split("-");
    return y && m && d ? `${d}/${m}/${y}` : row.label;
  })();

  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1.5 min-w-[220px]">
      <p className="font-mono text-muted-foreground font-semibold">📅 {fullDate}</p>
      <p className="text-neon-blue font-medium">💰 Faturamento: {fmtBRL(row.tgmv)}</p>
      <p className="text-warning font-medium">📣 Ads: {fmtBRL(row.ads)}</p>
      <p className="text-emerald-400 font-medium">📦 Unidades Vendidas: {row.tsi.toLocaleString("pt-BR")}</p>
    </div>
  );
}

const SERIES_KEYS = ["tgmvLog", "adsLog", "tsiLog"] as const;

const DailyPerformanceChart = ({ kpis }: DailyPerformanceChartProps) => {
  const chartData = useMemo(() => fillGaps(kpis), [kpis]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Desempenho Diário (Ciclo 24h)
          </h3>
          <TooltipInfo text="Cada ponto representa o fechamento de 1 dia. Dias sem vendas aparecem com valor zero. Clique na legenda para mostrar/ocultar linhas." />
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted/20 border border-border/30 px-2 py-0.5 rounded">
          {chartData.length} dias
        </span>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="hsl(var(--border) / 0.3)"
          />

          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={chartData.length > 30 ? Math.floor(chartData.length / 15) : 0}
            angle={chartData.length > 15 ? -45 : 0}
            textAnchor={chartData.length > 15 ? "end" : "middle"}
            height={chartData.length > 15 ? 50 : 30}
          />

          {/* Left Y-axis: Faturamento + TSI */}
          <YAxis
            yAxisId="left"
            scale="log"
            domain={["auto", "auto"]}
            allowDataOverflow
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmtNumCompact(v)}
            width={55}
          />

          {/* Right Y-axis: Ads */}
          <YAxis
            yAxisId="right"
            orientation="right"
            scale="log"
            domain={["auto", "auto"]}
            allowDataOverflow
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmtNumCompact(v)}
            width={55}
          />

          <Tooltip content={<ChartTooltipContent />} />

          {/* Faturamento line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="tgmvLog"
            name="Faturamento (R$)"
            stroke="hsl(199, 100%, 50%)"
            strokeWidth={2.5}
            dot={chartData.length <= 31 ? { r: 3, fill: "hsl(199, 100%, 50%)" } : false}
            activeDot={{ r: 5, strokeWidth: 2 }}
            animationDuration={800}
            hide={hidden.has("tgmvLog")}
          />

          {/* Ads line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="adsLog"
            name="Investimento Ads (R$)"
            stroke="hsl(var(--warning))"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
            animationDuration={800}
            hide={hidden.has("adsLog")}
          />

          {/* TSI line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="tsiLog"
            name="Unidades Vendidas"
            stroke="hsl(160, 84%, 39%)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
            animationDuration={800}
            hide={hidden.has("tsiLog")}
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

export default DailyPerformanceChart;
