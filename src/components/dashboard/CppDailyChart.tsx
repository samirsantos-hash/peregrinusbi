import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush,
} from "recharts";
import type { DailySeriesPoint } from "@/utils/cppAggregation";

type Metric = "gmv" | "tsi" | "roas";

interface Props {
  data: DailySeriesPoint[];
  title?: string;
}

function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtNum(v: number): string {
  return Math.round(v).toLocaleString("pt-BR");
}

function fmtDateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
}

const METRIC_CONFIG: Record<Metric, { label: string; color: string; mm7Key: string; fmt: (v: number) => string; unit?: string }> = {
  gmv: { label: "GMV", color: "hsl(var(--primary))", mm7Key: "gmvMM7", fmt: fmtCompact },
  tsi: { label: "Unidades", color: "hsl(var(--chart-3))", mm7Key: "", fmt: fmtNum },
  roas: { label: "ROAS", color: "hsl(var(--chart-5, 30 80% 55%))", mm7Key: "roasMM7", fmt: (v) => `${v.toFixed(1)}x`, unit: "x" },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DailySeriesPoint | undefined;
  if (!d) return null;
  const parts = d.date.split("-");
  const fullDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d.date;
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 text-xs space-y-1 shadow-lg">
      <p className="font-semibold text-foreground">{fullDate}</p>
      <p className="text-foreground">GMV: {fmtCompact(d.gmv)}</p>
      <p className="text-foreground">Unidades: {fmtNum(d.tsi)}</p>
      <p className="text-foreground">Visitas: {fmtNum(d.visitas)}</p>
      <p className="text-foreground">Ads: {fmtCompact(d.invPads)}</p>
      <p className="text-foreground">ROAS: {d.roas !== null ? `${d.roas.toFixed(1)}x` : "—"}</p>
      {d.gmvMM7 !== null && (
        <div className="border-t border-border pt-1 mt-1 text-muted-foreground">
          <p>MM7 GMV: {fmtCompact(d.gmvMM7)}</p>
          {d.roasMM7 !== null && <p>MM7 ROAS: {d.roasMM7.toFixed(1)}x</p>}
        </div>
      )}
    </div>
  );
}

export default function CppDailyChart({ data, title = "Evolução Diária" }: Props) {
  const [metric, setMetric] = useState<Metric>("gmv");
  const cfg = METRIC_CONFIG[metric];
  const showBrush = data.length > 60;
  const isSingleDay = data.length === 1;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {title}
        </CardTitle>
        <ToggleGroup
          type="single"
          value={metric}
          onValueChange={(v) => v && setMetric(v as Metric)}
          size="sm"
          className="h-7"
        >
          <ToggleGroupItem value="gmv" className="text-[10px] px-2 h-6">GMV</ToggleGroupItem>
          <ToggleGroupItem value="tsi" className="text-[10px] px-2 h-6">TSI</ToggleGroupItem>
          <ToggleGroupItem value="roas" className="text-[10px] px-2 h-6">ROAS</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 10, right: 10 }}>
              <defs>
                <linearGradient id="cppDailyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDateLabel}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                padding={isSingleDay ? { left: 50, right: 50 } : undefined}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(v) => metric === "gmv" ? fmtCompact(v) : metric === "roas" ? `${v.toFixed(0)}x` : fmtNum(v)}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              {metric !== "roas" && (
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={cfg.color}
                  fill="url(#cppDailyGrad)"
                  strokeWidth={2}
                  dot={isSingleDay}
                />
              )}
              {metric === "roas" && (
                <Area
                  type="monotone"
                  dataKey="roas"
                  stroke={cfg.color}
                  fill="url(#cppDailyGrad)"
                  strokeWidth={2}
                  dot={isSingleDay}
                  connectNulls
                />
              )}
              {/* Ads investment line when viewing GMV */}
              {metric === "gmv" && (
                <Line
                  type="monotone"
                  dataKey="invPads"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 2"
                  name="Ads"
                />
              )}
              {/* MM7 line */}
              {cfg.mm7Key && (
                <Line
                  type="monotone"
                  dataKey={cfg.mm7Key}
                  stroke={cfg.color}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls
                  name="MM7"
                  opacity={0.6}
                />
              )}
              {showBrush && (
                <Brush
                  dataKey="date"
                  height={20}
                  stroke="hsl(var(--border))"
                  tickFormatter={fmtDateLabel}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded" style={{ background: cfg.color }} /> {cfg.label}
          </span>
          {metric === "gmv" && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 rounded bg-destructive" style={{ borderTop: "1px dashed" }} /> Ads
            </span>
          )}
          {cfg.mm7Key && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 rounded opacity-60" style={{ background: cfg.color, borderTop: "2px dashed" }} /> MM7
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
