import { useMemo, useState } from "react";
import { format, parseISO, subDays, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { SellerKPI } from "@/hooks/useSellerData";

interface Daily7DPanelProps {
  dailyKpis: SellerKPI[];
  sellerNickname?: string;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtInt = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));
const fmtRoas = (v: number) => `${(v || 0).toFixed(2)}x`;

function deltaPct(a: number, b: number): number {
  if (!b) return 0;
  return ((a - b) / b) * 100;
}

function DeltaBadge({ pct }: { pct: number }) {
  const Icon = pct > 0.5 ? TrendingUp : pct < -0.5 ? TrendingDown : Minus;
  const cls = pct > 0.5 ? "text-emerald-400" : pct < -0.5 ? "text-rose-400" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] tnum lnum", cls)}>
      <Icon className="w-3 h-3" />
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

export function Daily7DPanel({ dailyKpis, sellerNickname }: Daily7DPanelProps) {
  // Sort & dedupe by date
  const sorted = useMemo(() => {
    const map = new Map<string, SellerKPI>();
    for (const k of dailyKpis || []) {
      const d = String(k.date || "").slice(0, 10);
      if (d) map.set(d, k);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyKpis]);

  const availableDates = useMemo(() => sorted.map((k) => parseISO(k.date)), [sorted]);
  const minDate = availableDates[0];
  const maxDate = availableDates[availableDates.length - 1];

  const [anchor, setAnchor] = useState<Date | undefined>(undefined);
  const effectiveAnchor = anchor ?? maxDate;

  const window7 = useMemo(() => {
    if (!effectiveAnchor) return [] as SellerKPI[];
    const end = startOfDay(effectiveAnchor);
    const start = subDays(end, 6);
    return sorted.filter((k) => {
      const d = startOfDay(parseISO(k.date));
      return !isAfter(d, end) && !isBefore(d, start);
    });
  }, [sorted, effectiveAnchor]);

  const dayRow = useMemo(() => {
    if (!effectiveAnchor) return null;
    const key = format(effectiveAnchor, "yyyy-MM-dd");
    return sorted.find((k) => k.date.startsWith(key)) || null;
  }, [sorted, effectiveAnchor]);

  const prevRow = useMemo(() => {
    if (!effectiveAnchor) return null;
    const prev = format(subDays(effectiveAnchor, 1), "yyyy-MM-dd");
    return sorted.find((k) => k.date.startsWith(prev)) || null;
  }, [sorted, effectiveAnchor]);

  // 7-day moving averages for context
  const avg7 = useMemo(() => {
    if (window7.length === 0) return { gmv: 0, ads: 0, roas: 0, visits: 0, tsi: 0 };
    const gmv = window7.reduce((s, k) => s + (k.gmv || 0), 0);
    const ads = window7.reduce((s, k) => s + (k.adsInvestment || 0), 0);
    const visits = window7.reduce((s, k) => s + (k.visits || 0), 0);
    const tsi = window7.reduce((s, k) => s + (k.tsi || 0), 0);
    const tgmvPads = window7.reduce((s, k) => s + (k.tgmvPads || 0), 0);
    return {
      gmv: gmv / window7.length,
      ads: ads / window7.length,
      visits: visits / window7.length,
      tsi: tsi / window7.length,
      roas: ads > 0 ? tgmvPads / ads : 0,
    };
  }, [window7]);

  // Chart data with formatted labels
  const chartData = useMemo(() => {
    return window7.map((k) => ({
      label: format(parseISO(k.date), "dd/MM", { locale: ptBR }),
      gmv: Math.round(k.gmv || 0),
      ads: Math.round(k.adsInvestment || 0),
      roas: k.roas || 0,
      visits: Math.round(k.visits || 0),
      tsi: Math.round(k.tsi || 0),
    }));
  }, [window7]);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              KPIs Diários — Últimos 7 dias
              {sellerNickname && (
                <Badge variant="secondary" className="text-[10px] font-normal">{sellerNickname}</Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Janela: {window7[0] ? format(parseISO(window7[0].date), "dd/MM") : "—"}
              {" → "}
              {window7[window7.length - 1] ? format(parseISO(window7[window7.length - 1].date), "dd/MM") : "—"}
              {" • "}{window7.length} dia(s) com dados
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs">
                <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                {effectiveAnchor ? format(effectiveAnchor, "dd 'de' MMM yyyy", { locale: ptBR }) : "Selecionar dia"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={effectiveAnchor}
                onSelect={(d) => d && setAnchor(d)}
                disabled={(date) => {
                  if (!minDate || !maxDate) return true;
                  return isBefore(date, startOfDay(minDate)) || isAfter(date, startOfDay(maxDate));
                }}
                defaultMonth={effectiveAnchor}
                initialFocus
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* KPI cards for the selected day */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "GMV", value: fmtBRL(dayRow?.gmv || 0), prev: prevRow?.gmv || 0, curr: dayRow?.gmv || 0, sub: `MM7 ${fmtBRL(avg7.gmv)}` },
            { label: "Ads", value: fmtBRL(dayRow?.adsInvestment || 0), prev: prevRow?.adsInvestment || 0, curr: dayRow?.adsInvestment || 0, sub: `MM7 ${fmtBRL(avg7.ads)}` },
            { label: "ROAS", value: fmtRoas(dayRow?.roas || 0), prev: prevRow?.roas || 0, curr: dayRow?.roas || 0, sub: `MM7 ${fmtRoas(avg7.roas)}` },
            { label: "Visitas", value: fmtInt(dayRow?.visits || 0), prev: prevRow?.visits || 0, curr: dayRow?.visits || 0, sub: `MM7 ${fmtInt(avg7.visits)}` },
            { label: "Vendas (TSI)", value: fmtInt(dayRow?.tsi || 0), prev: prevRow?.tsi || 0, curr: dayRow?.tsi || 0, sub: `MM7 ${fmtInt(avg7.tsi)}` },
          ].map((k) => (
            <div key={k.label} className="rounded-lg bg-card/40 border border-border/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="text-base font-semibold tnum lnum mt-1">{k.value}</div>
              <div className="flex items-center justify-between mt-1.5">
                <DeltaBadge pct={deltaPct(k.curr, k.prev)} />
                <span className="text-[10px] text-muted-foreground tnum lnum">{k.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 7-day chart */}
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `${v.toFixed(1)}x`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: any, name: string) => {
                  if (name === "ROAS") return [fmtRoas(Number(value)), name];
                  if (name === "GMV" || name === "Ads") return [fmtBRL(Number(value)), name];
                  return [fmtInt(Number(value)), name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="gmv" name="GMV" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="ads" name="Ads" fill="hsl(var(--neon-blue)/0.6)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="hsl(var(--emerald))" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}