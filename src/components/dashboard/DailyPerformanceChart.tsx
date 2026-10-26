import { useMemo, useState, useId } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush
} from "recharts";
import { calcularTendencia } from "@/lib/tendencia";
import TendenciaChip from "@/components/charts/TendenciaChip";
import { fmtBRL, fmtNumCompact } from "@/utils/formatters";
import TooltipInfo from "./TooltipInfo";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

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

  const raw: { date: string; label: string; tgmv: number; ads: number; tsi: number; ma7tgmv?: number; ma7ads?: number; ma7tsi?: number }[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const iso = fmtISO(cursor);
    const vals = byDate.get(iso) || { tgmv: 0, ads: 0, tsi: 0 };
    const dd = String(cursor.getDate()).padStart(2, "0");
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    raw.push({ date: iso, label: `${dd}/${mm}`, ...vals });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Compute 7-day moving averages
  for (let i = 0; i < raw.length; i++) {
    if (i < 6) continue;
    let sumT = 0, sumA = 0, sumS = 0;
    for (let j = i - 6; j <= i; j++) {
      sumT += raw[j].tgmv;
      sumA += raw[j].ads;
      sumS += raw[j].tsi;
    }
    raw[i].ma7tgmv = Math.round(sumT / 7);
    raw[i].ma7ads = Math.round(sumA / 7 * 100) / 100;
    raw[i].ma7tsi = Math.round(sumS / 7 * 10) / 10;
  }

  return raw;
}

type MetricKey = "tgmv" | "ads" | "tsi";

const METRICS = {
  tgmv: { label: "Faturamento", unit: "R$", average: "ma7tgmv" },
  ads: { label: "Investimento Ads", unit: "R$", average: "ma7ads" },
  tsi: { label: "Unidades vendidas", unit: "unidades", average: "ma7tsi" },
} as const;

function ChartTooltipContent({ active, payload, metric, showAverage }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const [y, m, d] = (row.date || "").split("-");
  const key = metric as MetricKey;
  const config = METRICS[key];
  const formatValue = (value: number) => key === "tsi" ? fmtNumCompact(value) : fmtBRL(value);

  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3 text-xs space-y-3 min-w-[200px] max-w-[280px]">
      <p className="text-muted-foreground font-medium tabular-nums">{d}/{m}/{y}</p>
      <div className="flex justify-between items-center gap-5">
        <span>{config.label}</span>
        <span className="font-semibold tabular-nums">{formatValue(row[key])}</span>
      </div>
      {showAverage && row[config.average] != null && (
        <div className="flex justify-between items-center gap-5 border-t border-border pt-2 text-muted-foreground">
          <span>Média móvel · 7 dias</span>
          <span className="tabular-nums">{formatValue(row[config.average])}</span>
        </div>
      )}
    </div>
  );
}

const DailyPerformanceChart = ({ kpis }: DailyPerformanceChartProps) => {
  const chartData = useMemo(() => fillGaps(kpis), [kpis]);
  const tend = useMemo(() => calcularTendencia(chartData.map((d) => d.tgmv)), [chartData]);
  const [metric, setMetric] = useState<MetricKey>("tgmv");
  const [showAverage, setShowAverage] = useState(false);
  const gradientId = useId().replace(/:/g, "");
  const config = METRICS[metric];
  const isSinglePoint = chartData.length === 1;
  const mean = useMemo(() => chartData.length
    ? chartData.reduce((sum, row) => sum + row[metric], 0) / chartData.length : 0,
  [chartData, metric]);
  const yDomain = useMemo(() => {
    const max = Math.max(0, ...chartData.map((row) => row[metric]));
    return [0, Math.ceil(max * 1.12) || 1];
  }, [chartData, metric]);

  if (chartData.length === 0) return null;

  return (
    <div className="glass-card min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-foreground tracking-normal">Desempenho diário</h3>
          <TooltipInfo text="Fechamento diário do período selecionado. Média móvel calculada sobre sete dias consecutivos. Dias sem vendas permanecem com valor zero." />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {metric === "tgmv" && <TendenciaChip t={tend} />}
          <span className="text-xs tabular-nums text-muted-foreground">{chartData.length} dias</span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <ToggleGroup type="single" value={metric} onValueChange={(value) => {
          if (value === "tgmv" || value === "ads" || value === "tsi") setMetric(value);
        }} aria-label="Métrica do gráfico" className="justify-start flex-wrap gap-1 rounded-lg bg-muted/30 p-1">
          {Object.entries(METRICS).map(([key, item]) => (
            <ToggleGroupItem key={key} value={key} size="sm"
              className="rounded-md text-xs tracking-normal text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="ghost" size="sm" aria-pressed={showAverage}
          onClick={() => setShowAverage((value) => !value)}
          className="text-xs tracking-normal text-muted-foreground hover:text-foreground hover:bg-muted/40 aria-pressed:bg-muted/50 aria-pressed:text-foreground">
          <Activity className="size-3.5" /> Média móvel · 7 dias
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 mb-2 text-xs text-muted-foreground">
        <span>{config.unit}</span>
        <span className="tabular-nums">Média diária: {metric === "tsi" ? fmtNumCompact(mean) : fmtBRL(mean)}</span>
      </div>
      <div className="h-[280px] sm:h-[340px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--ec-verde))" stopOpacity={0.12} />
                <stop offset="100%" stopColor="hsl(var(--ec-verde))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--grid))" strokeOpacity={0.35} strokeDasharray="3 5" />
            <XAxis dataKey="label" tick={{ fill: "hsl(var(--axis))", fontSize: 11 }}
              axisLine={false} tickLine={false} interval="equidistantPreserveStart" minTickGap={40}
              tickMargin={12} height={36} padding={isSinglePoint ? { left: 50, right: 50 } : { left: 8, right: 8 }} />
            <YAxis domain={yDomain} tick={{ fill: "hsl(var(--axis))", fontSize: 11 }}
              axisLine={false} tickLine={false} tickCount={4} tickMargin={8}
              tickFormatter={fmtNumCompact} width={68} allowDecimals={metric !== "tsi"} />
            <Tooltip content={<ChartTooltipContent metric={metric} showAverage={showAverage} />}
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.3, strokeDasharray: "3 4" }} />
            <Area key={metric} type="monotone" dataKey={metric} name={config.label}
              stroke="hsl(var(--ec-verde))" strokeWidth={2.5} fill={`url(#${gradientId})`}
              dot={isSinglePoint ? { r: 5, fill: "hsl(var(--ec-verde))" } : false}
              activeDot={{ r: 5, fill: "hsl(var(--ec-verde))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              isAnimationActive={false} />
            {showAverage && <Line key={config.average} type="monotone" dataKey={config.average}
              name="Média móvel · 7 dias" stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5} strokeDasharray="5 5" dot={false} activeDot={false} isAnimationActive={false} />}
            {chartData.length > 60 && <Brush dataKey="label" height={20}
              stroke="hsl(var(--border))" fill="hsl(var(--muted) / 0.15)" travellerWidth={8} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center flex-wrap gap-x-5 gap-y-2 mt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><span className="w-5 border-t-2 border-primary" />{config.label}</span>
        {showAverage && <span className="inline-flex items-center gap-2"><span className="w-5 border-t border-dashed border-muted-foreground" />Média móvel · 7 dias</span>}
      </div>
    </div>
  );
};

export default DailyPerformanceChart;
