import { useMemo, useState } from "react";
import { format, parseISO, subDays, isAfter, isBefore, startOfDay, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { SellerKPI } from "@/hooks/useSellerData";
import type { DateRange } from "react-day-picker";

const PERIOD_COLORS = ["hsl(190 95% 55%)", "hsl(45 95% 55%)", "hsl(265 85% 70%)"] as const;
const MAX_PERIODS = 3;

type Periodo = {
  id: string;
  label: string;
  inicio: string; // YYYY-MM-DD
  fim: string;    // YYYY-MM-DD
  cor: string;
};

type KpiKey = "gmv" | "ads" | "roas" | "visits" | "tsi";

const KPI_CONFIG: Record<KpiKey, { label: string; format: "currency" | "number" | "roas" }> = {
  gmv: { label: "GMV", format: "currency" },
  ads: { label: "Ads", format: "currency" },
  roas: { label: "ROAS", format: "roas" },
  visits: { label: "Visitas", format: "number" },
  tsi: { label: "Vendas (TSI)", format: "number" },
};

interface Daily7DPanelProps {
  dailyKpis: SellerKPI[];
  sellerNickname?: string;
}

const fmtBRLCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtInt = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));
const fmtRoas = (v: number) => `${(v || 0).toFixed(2)}x`;

function fmtKpi(v: number, format: "currency" | "number" | "roas", compact = false): string {
  if (format === "roas") return fmtRoas(v);
  if (format === "currency") return compact ? fmtBRLCompact(v) : fmtBRL(v);
  return fmtInt(v);
}

function deltaPct(a: number, b: number): number {
  if (!b) return 0;
  return ((a - b) / b) * 100;
}

function DeltaBadge({ pct }: { pct: number }) {
  const Icon = pct > 0.5 ? TrendingUp : pct < -0.5 ? TrendingDown : Minus;
  const cls = pct > 0.5 ? "text-emerald-400" : pct < -0.5 ? "text-rose-400" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] tnum lnum font-medium", cls)}>
      <Icon className="w-3 h-3" />
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function shortRangeLabel(inicio: string, fim: string): string {
  const a = format(parseISO(inicio), "dd/MM", { locale: ptBR });
  const b = format(parseISO(fim), "dd/MM", { locale: ptBR });
  return `${a} → ${b}`;
}

function buildPreset(label: string, inicio: Date, fim: Date, cor: string): Periodo {
  return { id: uid(), label, inicio: toISO(inicio), fim: toISO(fim), cor };
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

  const minDate = sorted[0] ? parseISO(sorted[0].date) : undefined;
  const maxDate = sorted[sorted.length - 1] ? parseISO(sorted[sorted.length - 1].date) : undefined;

  // Default: last 7 days
  const [periodos, setPeriodos] = useState<Periodo[]>(() => {
    const fim = maxDate ?? new Date();
    const inicio = subDays(fim, 6);
    return [buildPreset("Últimos 7 dias", inicio, fim, PERIOD_COLORS[0])];
  });

  const [kpiAtivo, setKpiAtivo] = useState<KpiKey>("gmv");

  // Compute per-period data from existing dailyKpis
  type PeriodoComputado = {
    periodo: Periodo;
    dias: Array<{ data: string; diaIndex: number; gmv: number; ads: number; roas: number; visits: number; tsi: number; tgmvPads: number }>;
    totais: { gmv: number; ads: number; roas: number; visits: number; tsi: number };
  };

  const dadosPorPeriodo: PeriodoComputado[] = useMemo(() => {
    return periodos.map((p) => {
      const start = startOfDay(parseISO(p.inicio));
      const end = startOfDay(parseISO(p.fim));
      const rows = sorted.filter((k) => {
        const d = startOfDay(parseISO(k.date));
        return !isBefore(d, start) && !isAfter(d, end);
      });
      const dias = rows.map((k, i) => ({
        data: k.date,
        diaIndex: i + 1,
        gmv: k.gmv || 0,
        ads: k.adsInvestment || 0,
        roas: k.roas || 0,
        visits: k.visits || 0,
        tsi: k.tsi || 0,
        tgmvPads: k.tgmvPads || 0,
      }));
      const sum = (key: keyof (typeof dias)[number]) =>
        dias.reduce((s, d) => s + (Number(d[key]) || 0), 0);
      const totalAds = sum("ads");
      const totalPads = sum("tgmvPads");
      return {
        periodo: p,
        dias,
        totais: {
          gmv: sum("gmv"),
          ads: totalAds,
          roas: totalAds > 0 ? totalPads / totalAds : 0,
          visits: sum("visits"),
          tsi: sum("tsi"),
        },
      };
    });
  }, [periodos, sorted]);

  const maxDias = Math.max(1, ...dadosPorPeriodo.map((p) => p.dias.length));

  const chartData = useMemo(() => {
    return Array.from({ length: maxDias }, (_, i) => {
      const ponto: Record<string, any> = { dia: `D${i + 1}` };
      dadosPorPeriodo.forEach((p) => {
        const d = p.dias[i];
        ponto[p.periodo.id] = d ? d[kpiAtivo] : null;
      });
      return ponto;
    });
  }, [dadosPorPeriodo, kpiAtivo, maxDias]);

  const kpiCfg = KPI_CONFIG[kpiAtivo];
  const yFmt = (v: number) =>
    kpiCfg.format === "currency" ? fmtBRLCompact(v) :
    kpiCfg.format === "roas" ? `${v.toFixed(1)}x` :
    new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v);

  if (sorted.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              KPIs Diários
              {sellerNickname && (
                <Badge variant="secondary" className="text-[10px] font-normal">{sellerNickname}</Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {periodos.length === 1
                ? `${shortRangeLabel(periodos[0].inicio, periodos[0].fim)} • ${dadosPorPeriodo[0]?.dias.length ?? 0} dia(s) com dados`
                : `Comparando ${periodos.length} períodos`}
            </p>
          </div>
          <PeriodPicker
            periodos={periodos}
            onChange={setPeriodos}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* KPI cards with comparison */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.keys(KPI_CONFIG) as KpiKey[]).map((key) => {
            const cfg = KPI_CONFIG[key];
            const principal = dadosPorPeriodo[0];
            const ativo = kpiAtivo === key;
            return (
              <button
                key={key}
                onClick={() => setKpiAtivo(key)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all",
                  ativo
                    ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30"
                    : "bg-card/40 border-border/40 hover:bg-card/60",
                )}
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{cfg.label}</div>
                <div className="text-base font-semibold tnum lnum mt-1" style={{ color: principal?.periodo.cor }}>
                  {fmtKpi(principal?.totais[key] ?? 0, cfg.format, true)}
                </div>
                <div className="mt-1.5 space-y-1">
                  {dadosPorPeriodo.slice(1).map((p) => {
                    const base = principal?.totais[key] ?? 0;
                    const val = p.totais[key];
                    const delta = deltaPct(base, val); // principal vs this period
                    return (
                      <div key={p.periodo.id} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.periodo.cor }} />
                          <span className="truncate">{fmtKpi(val, cfg.format, true)}</span>
                        </span>
                        <DeltaBadge pct={delta} />
                      </div>
                    );
                  })}
                  {dadosPorPeriodo.length === 1 && (
                    <div className="text-[10px] text-muted-foreground">
                      {shortRangeLabel(principal.periodo.inicio, principal.periodo.fim)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Period legend */}
        {dadosPorPeriodo.length > 1 && (
          <div className="flex flex-wrap gap-3 text-xs">
            {dadosPorPeriodo.map((p) => (
              <div key={p.periodo.id} className="flex items-center gap-2">
                <span className="w-3 h-0.5 rounded" style={{ background: p.periodo.cor }} />
                <span className="font-medium text-foreground">{p.periodo.label}</span>
                <span className="text-muted-foreground">
                  ({shortRangeLabel(p.periodo.inicio, p.periodo.fim)} • {p.dias.length}d)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Multi-line chart */}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={yFmt}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: any, name: string) => {
                  const p = dadosPorPeriodo.find((x) => x.periodo.id === name);
                  const lbl = p?.periodo.label ?? name;
                  if (value === null || value === undefined) return ["—", lbl];
                  return [fmtKpi(Number(value), kpiCfg.format), lbl];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => {
                  const p = dadosPorPeriodo.find((x) => x.periodo.id === value);
                  return <span style={{ color: "hsl(var(--foreground))" }}>{p?.periodo.label ?? value}</span>;
                }}
              />
              {dadosPorPeriodo.map((p) => (
                <Line
                  key={p.periodo.id}
                  type="monotone"
                  dataKey={p.periodo.id}
                  name={p.periodo.id}
                  stroke={p.periodo.cor}
                  strokeWidth={2}
                  dot={{ r: 3, fill: p.periodo.cor }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Period picker — popover with presets + range calendar + active list      */
/* ──────────────────────────────────────────────────────────────────────── */

function PeriodPicker({
  periodos,
  onChange,
  minDate,
  maxDate,
}: {
  periodos: Periodo[];
  onChange: (p: Periodo[]) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const today = maxDate ?? new Date();
  const nextColor = PERIOD_COLORS[periodos.length % PERIOD_COLORS.length];

  const presets: Array<{ label: string; build: () => Periodo }> = [
    { label: "Últ. 7 dias", build: () => buildPreset("Últ. 7 dias", subDays(today, 6), today, nextColor) },
    { label: "Últ. 14 dias", build: () => buildPreset("Últ. 14 dias", subDays(today, 13), today, nextColor) },
    { label: "Últ. 30 dias", build: () => buildPreset("Últ. 30 dias", subDays(today, 29), today, nextColor) },
    {
      label: "Mês atual",
      build: () => {
        const inicio = new Date(today.getFullYear(), today.getMonth(), 1);
        return buildPreset(
          format(inicio, "MMM yyyy", { locale: ptBR }),
          inicio, today, nextColor,
        );
      },
    },
    {
      label: "Mês anterior",
      build: () => {
        const inicio = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const fim = new Date(today.getFullYear(), today.getMonth(), 0);
        return buildPreset(
          format(inicio, "MMM yyyy", { locale: ptBR }),
          inicio, fim, nextColor,
        );
      },
    },
    {
      label: "Período anterior (espelhado)",
      build: () => {
        // Mirror the first period's length immediately before it
        if (periodos.length === 0) {
          return buildPreset("Últ. 7 dias", subDays(today, 6), today, nextColor);
        }
        const first = periodos[0];
        const aStart = parseISO(first.inicio);
        const aEnd = parseISO(first.fim);
        const len = differenceInCalendarDays(aEnd, aStart);
        const fim = subDays(aStart, 1);
        const inicio = subDays(fim, len);
        return buildPreset(
          `${format(inicio, "dd/MM")} → ${format(fim, "dd/MM")}`,
          inicio, fim, nextColor,
        );
      },
    },
  ];

  function add(p: Periodo) {
    if (periodos.length >= MAX_PERIODS) return;
    onChange([...periodos, p]);
  }

  function remove(id: string) {
    onChange(periodos.filter((p) => p.id !== id));
  }

  function updateLabel(id: string, label: string) {
    onChange(periodos.map((p) => (p.id === id ? { ...p, label } : p)));
  }

  function addCustomRange() {
    if (!range?.from || !range?.to) return;
    const inicio = range.from;
    const fim = range.to;
    add(buildPreset(
      `${format(inicio, "dd/MM")} → ${format(fim, "dd/MM")}`,
      inicio, fim, nextColor,
    ));
    setRange(undefined);
  }

  const atMax = periodos.length >= MAX_PERIODS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 px-3 text-xs gap-2 max-w-[460px]">
          <CalendarDays className="w-3.5 h-3.5" />
          {periodos.length === 0 ? (
            <span className="text-muted-foreground">Selecionar período</span>
          ) : (
            <span className="flex items-center gap-1.5 truncate">
              {periodos.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 max-w-[120px]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.cor }} />
                  <span className="truncate">{p.label}</span>
                </span>
              ))}
              {!atMax && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-primary/40 text-primary">
                  <Plus className="w-3 h-3" />
                  Comparar
                </span>
              )}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="p-3 border-b border-border space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Períodos ativos ({periodos.length}/{MAX_PERIODS})
          </div>
          {periodos.length === 0 && (
            <div className="text-xs text-muted-foreground italic">Nenhum período selecionado.</div>
          )}
          {periodos.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.cor }} />
              <input
                value={p.label}
                onChange={(e) => updateLabel(p.id, e.target.value)}
                className="flex-1 bg-transparent text-xs outline-none text-foreground min-w-0"
              />
              <span className="text-[10px] text-muted-foreground tnum lnum whitespace-nowrap">
                {shortRangeLabel(p.inicio, p.fim)}
              </span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remover período"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {!atMax && (
          <div className="p-3 space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <Plus className="w-3 h-3" />
              {periodos.length === 0 ? "Período principal" : "Adicionar comparação"}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((ps) => (
                <button
                  key={ps.label}
                  type="button"
                  onClick={() => add(ps.build())}
                  className="text-[11px] rounded-md px-2 py-1.5 text-left border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors"
                  style={{ borderLeft: `3px solid ${nextColor}`, color: nextColor }}
                >
                  {ps.label}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-border">
              <div className="text-[10px] text-muted-foreground mb-1">Ou intervalo personalizado:</div>
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={1}
                disabled={(date) => {
                  if (!minDate || !maxDate) return false;
                  return isBefore(date, startOfDay(minDate)) || isAfter(date, startOfDay(maxDate));
                }}
                defaultMonth={maxDate}
                locale={ptBR}
                className={cn("p-0 pointer-events-auto")}
              />
              {range?.from && range?.to && (
                <Button
                  size="sm"
                  className="w-full mt-2 h-8 text-xs"
                  onClick={addCustomRange}
                >
                  Adicionar {format(range.from, "dd/MM")} → {format(range.to, "dd/MM")}
                </Button>
              )}
            </div>
          </div>
        )}

        {atMax && (
          <div className="p-3 text-xs text-muted-foreground italic">
            Máximo de {MAX_PERIODS} períodos. Remova um para adicionar outro.
          </div>
        )}

        <div className="p-3 border-t border-border flex justify-end">
          <Button size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}