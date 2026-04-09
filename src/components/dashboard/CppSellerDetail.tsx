import { useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CalendarIcon, DollarSign, ShoppingCart, Eye, TrendingUp, TrendingDown, ArrowUpDown, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  type CppRow, type ConsolidatedSeller,
  computePeriodComparison, computeDowBreakdown, cleanCustId, parseBrNumber, getDailySeries,
} from "@/utils/cppAggregation";
import CppDailyChart from "@/components/dashboard/CppDailyChart";

// DOW benchmarks (whole portfolio)
const DOW_BENCHMARKS: Record<number, { roas: number; gmvMedio: number }> = {
  0: { roas: 74.6, gmvMedio: 4_300_000 }, // Domingo
  1: { roas: 71.7, gmvMedio: 4_800_000 }, // Segunda
  2: { roas: 84.1, gmvMedio: 5_300_000 }, // Terça (melhor)
  3: { roas: 75.9, gmvMedio: 4_600_000 }, // Quarta
  4: { roas: 78.1, gmvMedio: 4_600_000 }, // Quinta
  5: { roas: 77.3, gmvMedio: 5_400_000 }, // Sexta
  6: { roas: 61.8, gmvMedio: 4_000_000 }, // Sábado (pior)
};

interface Props {
  seller: ConsolidatedSeller;
  rawRows: CppRow[];
  dateRange: { min: string; max: string };
  startDate: Date;
  endDate: Date;
  onStartChange: (d: Date) => void;
  onEndChange: (d: Date) => void;
  onClose: () => void;
  /** Content rendered between the DOW heatmap and the listings table */
  middleContent?: ReactNode;
}

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtNum(v: number): string {
  return Math.round(v).toLocaleString("pt-BR");
}
function fmtPct1(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}
function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmtCurrency(v);
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground text-[10px]">—</span>;
  const isPos = value >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold",
      isPos ? "text-emerald-400" : "text-destructive")}>
      {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPos ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function DatePicker({ date, onChange, minDate, maxDate }: {
  date: Date; onChange: (d: Date) => void; minDate: Date; maxDate: Date;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <CalendarIcon className="w-3 h-3" />
          {format(date, "dd/MM/yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onChange(d)}
          disabled={(d) => d < minDate || d > maxDate}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function CustomDowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;
  const bench = DOW_BENCHMARKS[entry.dow];
  return (
    <div className="rounded-lg border border-border bg-card p-2 text-xs space-y-1 shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-foreground">Unidades: {fmtNum(entry.tsi)}</p>
      <p className="text-foreground">GMV: {fmtCompact(entry.tgmv)}</p>
      <p className="text-foreground">ROAS: {entry.roas !== null ? `${entry.roas.toFixed(1)}x` : "—"}</p>
      {bench && (
        <div className="border-t border-border pt-1 mt-1 text-muted-foreground">
          <p>Bench ROAS: {bench.roas.toFixed(1)}x</p>
          <p>Bench GMV médio/dia: {fmtCompact(bench.gmvMedio)}</p>
        </div>
      )}
    </div>
  );
}

export default function CppSellerDetail({ seller, rawRows, dateRange, startDate, endDate, onStartChange, onEndChange, onClose, middleContent }: Props) {
  const custId = seller.CUS_CUST_ID_SEL;
  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");
  const minD = new Date(dateRange.min + "T12:00:00");
  const maxD = new Date(dateRange.max + "T12:00:00");

  const comparison = useMemo(
    () => computePeriodComparison(rawRows, custId, startStr, endStr),
    [rawRows, custId, startStr, endStr]
  );

  const dowData = useMemo(
    () => computeDowBreakdown(rawRows, custId, startStr, endStr),
    [rawRows, custId, startStr, endStr]
  );

  const dailySeries = useMemo(
    () => getDailySeries(rawRows, custId, startStr, endStr),
    [rawRows, custId, startStr, endStr]
  );

  // Listings from raw data (aggregate TOTAL_LIVELISTINGS by vertical/category)
  const listings = useMemo(() => {
    const sellerRows = rawRows.filter(r => cleanCustId(r["CUS_CUST_ID_SEL"]) === custId);
    const catMap = new Map<string, { itens: number }>();
    for (const r of sellerRows) {
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      if (d < startStr || d > endStr) continue;
      const cat = String(r["VERTICAL"] || r["DOM_DOMAIN_AGG1"] || r["dom_domain_agg1"] || "Sem categoria").trim() || "Sem categoria";
      if (!catMap.has(cat)) catMap.set(cat, { itens: 0 });
      catMap.get(cat)!.itens += parseBrNumber(r["TOTAL_LIVELISTINGS"]);
    }
    const totalItens = Array.from(catMap.values()).reduce((s, v) => s + v.itens, 0);
    return Array.from(catMap.entries())
      .map(([cat, v]) => ({
        categoria: cat,
        itens: Math.round(v.itens),
        pct: totalItens > 0 ? (v.itens / totalItens) * 100 : 0,
      }))
      .filter(r => r.itens > 0)
      .sort((a, b) => b.itens - a.itens);
  }, [rawRows, custId, startStr, endStr]);

  const { current: c, deltas } = comparison;

  const kpiCards = [
    { label: "Vendas brutas (GMV)", value: fmtCompact(c.tgmv), delta: deltas.tgmv, icon: DollarSign, color: "text-primary" },
    { label: "Unidades vendidas", value: fmtNum(c.tsi), delta: deltas.tsi, icon: ShoppingCart, color: "text-chart-3" },
    { label: "Visitas", value: fmtNum(c.visitas), delta: deltas.visitas, icon: Eye, color: "text-chart-4" },
    { label: "Preço médio/unidade", value: c.precoMedio !== null ? `R$ ${c.precoMedio.toFixed(2).replace(".", ",")}` : "—", delta: deltas.precoMedio, icon: DollarSign, color: "text-secondary" },
    { label: "Conversão", value: fmtPct1(c.txConversao), delta: deltas.txConversao, icon: TrendingUp, color: "text-emerald-400" },
    { label: "ROAS", value: c.roas !== null ? `${c.roas.toFixed(1)}x` : "—", delta: deltas.roas, icon: ArrowUpDown, color: "text-amber-400" },
  ];

  const maxTsi = Math.max(...dowData.map(d => d.tsi), 1);

  return (
    <div className="space-y-5">
      {/* Header with date picker */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground">{seller.CUS_NICKNAME}</h2>
          <p className="text-xs text-muted-foreground">ID: {custId} · {String(seller.SUB_CLUSTER_SELLER || "")}</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker date={startDate} onChange={onStartChange} minDate={minD} maxDate={maxD} />
          <span className="text-muted-foreground text-xs">a</span>
          <DatePicker date={endDate} onChange={onEndChange} minDate={minD} maxDate={maxD} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(k => (
          <Card key={k.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <k.icon className={cn("w-3.5 h-3.5", k.color)} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</span>
              </div>
              <p className="text-xl font-bold font-mono text-foreground">{k.value}</p>
              <DeltaBadge value={k.delta} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Evolution Chart */}
      {dailySeries.length > 0 && (
        <CppDailyChart data={dailySeries} title="Evolução Diária do Seller" />
      )}

      {/* DOW Heatmap */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Vendas por dia da semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Tooltip content={<CustomDowTooltip />} />
                <Bar dataKey="tsi" radius={[4, 4, 0, 0]}>
                  {dowData.map((entry) => {
                    const intensity = entry.tsi / maxTsi;
                    const hue = 160;
                    const lightness = 30 + (1 - intensity) * 30;
                    return <Cell key={entry.dow} fill={`hsl(${hue}, 60%, ${lightness}%)`} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground justify-center flex-wrap">
            {dowData.filter(d => d.tsi > 0).map(d => (
              <span key={d.dow}>
                {d.label}: {fmtNum(d.tsi)} un · ROAS {d.roas !== null ? `${d.roas.toFixed(1)}x` : "—"}
                {DOW_BENCHMARKS[d.dow] && (
                  <span className="opacity-60"> (bench {DOW_BENCHMARKS[d.dow].roas.toFixed(0)}x)</span>
                )}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Middle content slot (Vertical Analysis goes here) */}
      {middleContent}

      {/* Listings Table */}
      {listings.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Anúncios por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Itens Ativos</TableHead>
                  <TableHead className="text-right">% Participação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map(l => (
                  <TableRow key={l.categoria}>
                    <TableCell className="text-xs">{l.categoria}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtNum(l.itens)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{l.pct.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
