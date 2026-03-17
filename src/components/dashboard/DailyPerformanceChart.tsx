import { useMemo } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
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
/*  Gap-fill: ensure every calendar day in range has a data point      */
/* ------------------------------------------------------------------ */
function fillGaps(kpis: DailyKpi[]) {
  if (kpis.length === 0) return [];

  // Aggregate by date first (in case of duplicates)
  const byDate = new Map<string, { tgmv: number; ads: number; tsi: number }>();
  for (const k of kpis) {
    const prev = byDate.get(k.date) || { tgmv: 0, ads: 0, tsi: 0 };
    byDate.set(k.date, {
      tgmv: prev.tgmv + k.tgmv,
      ads: prev.ads + k.adsInvestment,
      tsi: prev.tsi + k.tsi,
    });
  }

  const sortedDates = [...byDate.keys()].sort();
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

function parseLocal(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Custom tooltip */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1.5 min-w-[200px]">
      <p className="font-mono text-muted-foreground font-semibold">📅 Data: {row.label}</p>
      <p className="text-neon-blue font-medium">Faturamento: {fmtBRL(row.tgmv)}</p>
      <p className="text-warning font-medium">Ads: {fmtBRL(row.ads)}</p>
      <p className="text-muted-foreground">Itens Vendidos: {row.tsi.toLocaleString("pt-BR")}</p>
    </div>
  );
};

const DailyPerformanceChart = ({ kpis }: DailyPerformanceChartProps) => {
  const chartData = useMemo(() => fillGaps(kpis), [kpis]);

  if (chartData.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Desempenho Diário (Ciclo 24h)
          </h3>
          <TooltipInfo text="Cada ponto representa o fechamento de 1 dia. Dias sem vendas aparecem com valor zero. Eixo esquerdo: Faturamento (R$). Eixo direito: Investimento em Ads (R$)." />
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted/20 border border-border/30 px-2 py-0.5 rounded">
          {chartData.length} dias
        </span>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradDailyTgmv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>

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

          {/* Left Y-axis: Faturamento */}
          <YAxis
            yAxisId="left"
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
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmtNumCompact(v)}
            width={55}
          />

          <Tooltip content={<ChartTooltip />} />

          {/* Faturamento line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="tgmv"
            name="Faturamento (R$)"
            stroke="hsl(199, 100%, 50%)"
            strokeWidth={2.5}
            dot={chartData.length <= 31 ? { r: 3, fill: "hsl(199, 100%, 50%)" } : false}
            activeDot={{ r: 5, strokeWidth: 2 }}
            animationDuration={800}
          />

          {/* Ads line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ads"
            name="Investimento Ads (R$)"
            stroke="hsl(var(--warning))"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
            animationDuration={800}
          />

          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => (
              <span className="text-muted-foreground text-xs">{value}</span>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyPerformanceChart;
