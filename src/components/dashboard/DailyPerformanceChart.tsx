import { useMemo, useState, useCallback } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Brush, ReferenceLine
} from "recharts";
import { calcularTendencia } from "@/lib/tendencia";
import TendenciaChip from "@/components/charts/TendenciaChip";
import { fmtBRL, fmtNumCompact } from "@/utils/formatters";
import { cn } from "@/lib/utils";
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

/** Vistas: no máximo 2–4 séries visíveis por padrão para evitar spaghetti. */
type Vista = "essencial" | "suavizado" | "unidades" | "completo";

const VISTAS: { id: Vista; rotulo: string; dica: string }[] = [
  { id: "essencial", rotulo: "Essencial", dica: "Faturamento + Ads + média" },
  { id: "suavizado", rotulo: "Suavizado", dica: "Essencial + médias móveis 7d" },
  { id: "unidades", rotulo: "Unidades", dica: "Unidades na escala correta" },
  { id: "completo", rotulo: "Completo", dica: "Todas as séries (análise avançada)" },
];

/** Séries ativas por vista. Unidades ficam fora do Completo misto — escala R$ esmagava TSI. */
const SERIES_VISTA: Record<Vista, ReadonlySet<string>> = {
  essencial: new Set(["tgmv", "ads"]),
  suavizado: new Set(["tgmv", "ads", "ma7tgmv", "ma7ads"]),
  unidades: new Set(["tsi", "ma7tsi"]),
  completo: new Set(["tgmv", "ads", "ma7tgmv", "ma7ads", "tendTgmv"]),
};

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

function ChartTooltipContent({ active, payload, vista }: { active?: boolean; payload?: any[]; vista: Vista }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const show = SERIES_VISTA[vista];

  const fullDate = (() => {
    const [y, m, d] = (row.date || "").split("-");
    return y && m && d ? `${d}/${m}/${y}` : row.label;
  })();

  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1.5 min-w-[200px]">
      <p className="font-mono text-muted-foreground font-semibold">{fullDate}</p>
      {show.has("tgmv") && <p className="font-medium tabular-nums" style={{ color: "hsl(var(--series-1))" }}>Faturamento: {fmtBRL(row.tgmv)}</p>}
      {show.has("ads") && <p className="font-medium tabular-nums text-warning">Ads: {fmtBRL(row.ads)}</p>}
      {show.has("tsi") && <p className="font-medium tabular-nums" style={{ color: "hsl(var(--ok))" }}>Unidades: {row.tsi.toLocaleString("pt-BR")}</p>}
      {(show.has("ma7tgmv") || show.has("ma7ads") || show.has("ma7tsi")) && row.ma7tgmv != null && (
        <div className="border-t border-border/30 pt-1.5 mt-1.5 space-y-1 text-muted-foreground">
          {show.has("ma7tgmv") && <p className="tabular-nums">MM7 Fat.: {fmtBRL(row.ma7tgmv)}</p>}
          {show.has("ma7ads") && <p className="tabular-nums">MM7 Ads: {fmtBRL(row.ma7ads)}</p>}
          {show.has("ma7tsi") && <p className="tabular-nums">MM7 Unid.: {(row.ma7tsi ?? 0).toLocaleString("pt-BR")}</p>}
        </div>
      )}
    </div>
  );
}

const DailyPerformanceChart = ({ kpis }: DailyPerformanceChartProps) => {
  const baseData = useMemo(() => fillGaps(kpis), [kpis]);
  const tend = useMemo(() => calcularTendencia(baseData.map((d) => d.tgmv)), [baseData]);
  const chartData = useMemo(
    () => baseData.map((d, i) => ({ ...d, tendTgmv: tend ? Math.round(tend.reta(i)) : undefined })),
    [baseData, tend],
  );
  const [vista, setVista] = useState<Vista>("essencial");
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const isSinglePoint = chartData.length === 1;
  const ativas = SERIES_VISTA[vista];
  const modoUnidades = vista === "unidades";

  const visivel = useCallback(
    (key: string) => ativas.has(key) && !ocultas.has(key),
    [ativas, ocultas],
  );

  const yDomainLeft = useMemo(() => {
    if (chartData.length === 0) return [0, 100] as [number, number];
    let maxVal = 0;
    for (const d of chartData) {
      if (modoUnidades) {
        if (visivel("tsi") && d.tsi > maxVal) maxVal = d.tsi;
        if (visivel("ma7tsi") && (d.ma7tsi ?? 0) > maxVal) maxVal = d.ma7tsi ?? 0;
      } else {
        if (visivel("tgmv") && d.tgmv > maxVal) maxVal = d.tgmv;
        if (visivel("ma7tgmv") && (d.ma7tgmv ?? 0) > maxVal) maxVal = d.ma7tgmv ?? 0;
        if (visivel("tendTgmv") && (d.tendTgmv ?? 0) > maxVal) maxVal = d.tendTgmv ?? 0;
      }
    }
    return [0, Math.ceil(maxVal * 1.12) || 100] as [number, number];
  }, [chartData, modoUnidades, visivel]);

  const yDomainRight = useMemo(() => {
    if (chartData.length === 0 || modoUnidades) return [0, 100] as [number, number];
    let maxVal = 0;
    for (const d of chartData) {
      if (visivel("ads") && d.ads > maxVal) maxVal = d.ads;
      if (visivel("ma7ads") && (d.ma7ads ?? 0) > maxVal) maxVal = d.ma7ads ?? 0;
    }
    return [0, Math.ceil(maxVal * 1.12) || 100] as [number, number];
  }, [chartData, modoUnidades, visivel]);

  const xInterval = useMemo(() => {
    if (isSinglePoint) return 0;
    if (chartData.length <= 15) return 0;
    if (chartData.length <= 60) return Math.floor(chartData.length / 15);
    return Math.floor(chartData.length / 12);
  }, [chartData.length, isSinglePoint]);

  const handleLegendClick = useCallback((entry: any) => {
    const key = entry.dataKey as string;
    if (!SERIES_VISTA[vista].has(key)) return;
    setOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, [vista]);

  const trocarVista = useCallback((v: Vista) => {
    setVista(v);
    setOcultas(new Set());
  }, []);

  if (chartData.length === 0) return null;

  const corFat = "hsl(var(--series-1))";
  const corAds = "hsl(var(--warning))";
  const corMmFat = "hsl(var(--series-2))";
  const corMmAds = "hsl(var(--attention-text))";
  const corUnid = "hsl(var(--ok))";
  const corMmUnid = "hsl(var(--series-3))";
  const corTend =
    tend?.sentido === "caindo"
      ? "hsl(var(--destructive))"
      : tend?.sentido === "estavel"
        ? "hsl(var(--warning))"
        : "hsl(var(--ok))";

  return (
    <div className="glass-card p-5">
      <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Desempenho Diário (Ciclo 24h)
          </h3>
          <TooltipInfo text="Essencial mostra só faturamento e ads. Suavizado acrescenta MM7. Unidades usa escala própria (antes ficavam achatadas na escala de R$). Completo inclui tendência. Clique na legenda para ocultar uma série." />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {!modoUnidades && <TendenciaChip t={tend} />}
          <span className="text-[10px] text-muted-foreground bg-muted/20 border border-border/30 px-2 py-0.5 rounded tabular-nums">
            {chartData.length} dias
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Vista do gráfico">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={vista === v.id}
            title={v.dica}
            onClick={() => trocarVista(v.id)}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded-md border transition-[transform,background-color,color,border-color] duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]",
              vista === v.id
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            {v.rotulo}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={typeof window !== "undefined" && window.innerWidth < 640 ? 260 : 340}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradTgmv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={corFat} stopOpacity={0.18} />
              <stop offset="100%" stopColor={corFat} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="hsl(var(--grid))" />

          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--axis))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={xInterval}
            angle={chartData.length > 15 ? -45 : 0}
            textAnchor={chartData.length > 15 ? "end" : "middle"}
            height={chartData.length > 15 ? 50 : 30}
            padding={isSinglePoint ? { left: 50, right: 50 } : undefined}
          />

          <YAxis
            yAxisId="left"
            domain={yDomainLeft}
            tick={{ fill: "hsl(var(--axis))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmtNumCompact(v)}
            width={55}
          />

          {!modoUnidades && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={yDomainRight}
              tick={{ fill: "hsl(var(--axis))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtNumCompact(v)}
              width={55}
            />
          )}

          <Tooltip content={<ChartTooltipContent vista={vista} />} />

          {/* Séries da vista atual: `hide` mantém a legenda clicável para religar. */}
          {ativas.has("tgmv") && (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="tgmv"
              name="Faturamento (R$)"
              stroke={corFat}
              strokeWidth={2.5}
              fill="url(#gradTgmv)"
              dot={isSinglePoint ? { r: 6, fill: corFat, strokeWidth: 2, stroke: corFat } : false}
              activeDot={{ r: 5, strokeWidth: 2, fill: corFat }}
              animationDuration={600}
              hide={!visivel("tgmv")}
            />
          )}

          {ativas.has("ads") && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ads"
              name="Investimento Ads (R$)"
              stroke={corAds}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2 }}
              animationDuration={600}
              hide={!visivel("ads")}
            />
          )}

          {ativas.has("ma7tgmv") && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ma7tgmv"
              name="MM7 Faturamento"
              stroke={corMmFat}
              strokeWidth={1.75}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 1 }}
              animationDuration={600}
              connectNulls
              hide={!visivel("ma7tgmv")}
            />
          )}

          {ativas.has("ma7ads") && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ma7ads"
              name="MM7 Ads"
              stroke={corMmAds}
              strokeWidth={1.75}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 1 }}
              animationDuration={600}
              connectNulls
              hide={!visivel("ma7ads")}
            />
          )}

          {ativas.has("tsi") && (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="tsi"
              name="Unidades Vendidas"
              stroke={corUnid}
              strokeWidth={2.5}
              fill={corUnid}
              fillOpacity={0.08}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2 }}
              animationDuration={600}
              hide={!visivel("tsi")}
            />
          )}

          {ativas.has("ma7tsi") && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ma7tsi"
              name="MM7 Unidades"
              stroke={corMmUnid}
              strokeWidth={1.75}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 1 }}
              animationDuration={600}
              connectNulls
              hide={!visivel("ma7tsi")}
            />
          )}

          {!modoUnidades && tend && visivel("tgmv") && (
            <ReferenceLine
              yAxisId="left"
              y={tend.media}
              stroke="hsl(var(--media))"
              strokeWidth={1}
              strokeDasharray="6 4"
              label={{
                value: `Média ${fmtNumCompact(tend.media)}`,
                position: "insideTopRight",
                fill: "hsl(var(--media))",
                fontSize: 10,
              }}
            />
          )}

          {ativas.has("tendTgmv") && (
            <Line
              yAxisId="left"
              type="linear"
              dataKey="tendTgmv"
              name="Tendência do faturamento"
              stroke={corTend}
              strokeWidth={2}
              strokeDasharray="10 5"
              dot={false}
              activeDot={false}
              hide={!visivel("tendTgmv")}
            />
          )}

          <Legend
            wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
            onClick={handleLegendClick}
            formatter={(value: string, entry: any) => (
              <span
                className="text-xs"
                style={{
                  color: ocultas.has(entry.dataKey) ? "hsl(var(--muted-foreground) / 0.4)" : "hsl(var(--muted-foreground))",
                  textDecoration: ocultas.has(entry.dataKey) ? "line-through" : "none",
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
