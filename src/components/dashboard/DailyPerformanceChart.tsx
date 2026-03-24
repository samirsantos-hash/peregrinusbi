import { useMemo, useState, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Brush
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
  granularity?: "consolidated" | "daily";
}

function parseFlexDate(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return fmtISO(fallback);
  return trimmed;
}

function parseNumericValue(val: any): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val.replace(",", ".")) || 0;
  return Number(val) || 0;
}

function parseLocal(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDailyData(kpis: DailyKpi[]) {
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
  const result: { date: string; label: string; tgmv: number; ads: number; tsi: number }[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const iso = fmtISO(cursor);
    const vals = byDate.get(iso) || { tgmv: 0, ads: 0, tsi: 0 };
    const dd = String(cursor.getDate()).padStart(2, "0");
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    result.push({ date: iso, label: `${dd}/${mm}`, ...vals });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function DailyTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const fullDate = (() => {
    const [y, m, d] = (row.date || "").split("-");
    return y && m && d ? `${d}/${m}/${y}` : row.label;
  })();

  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1.5 min-w-[220px]">
      <p className="font-mono text-muted-foreground font-semibold">📅 {fullDate}</p>
      <p className="text-neon-blue font-medium">💰 Faturamento: {fmtBRL(row.tgmv)}</p>
      <p className="text-warning font-medium">📣 Ads: {fmtBRL(row.ads)}</p>
      <p className="text-emerald-400 font-medium">📦 Unidades: {row.tsi.toLocaleString("pt-BR")}</p>
    </div>
  );
}

const DailyPerformanceChart = ({ kpis, granularity = "daily" }: DailyPerformanceChartProps) => {
  const chartData = useMemo(() => buildDailyData(kpis), [kpis]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

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

  const xInterval = useMemo(() => {
    if (chartData.length <= 7) return 0;
    if (chartData.length <= 15) return 1;
    if (chartData.length <= 30) return 2;
    return Math.floor(chartData.length / 12);
  }, [chartData.length]);

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
          <TooltipInfo text="Cada barra representa o faturamento de 1 dia. Linhas mostram Ads e Unidades. Clique na legenda para mostrar/ocultar séries." />
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted/20 border border-border/30 px-2 py-0.5 rounded">
          {chartData.length} dias
        </span>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradDaily" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.4} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />

          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={xInterval}
            angle={chartData.length > 15 ? -45 : 0}
            textAnchor={chartData.length > 15 ? "end" : "middle"}
            height={chartData.length > 15 ? 50 : 30}
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

          <Tooltip content={<DailyTooltip />} />

          {/* Faturamento bars */}
          {!hidden.has("tgmv") && (
            <Bar
              yAxisId="left"
              dataKey="tgmv"
              name="Faturamento (R$)"
              fill="url(#gradDaily)"
              radius={[4, 4, 0, 0]}
              maxBarSize={chartData.length > 60 ? 6 : chartData.length > 30 ? 10 : 20}
              animationDuration={800}
            />
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
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
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
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
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

          {chartData.length > 60 && (
            <Brush
              dataKey="label"
              height={20}
              stroke="hsl(var(--border))"
              fill="hsl(var(--muted) / 0.15)"
              travellerWidth={8}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyPerformanceChart;
