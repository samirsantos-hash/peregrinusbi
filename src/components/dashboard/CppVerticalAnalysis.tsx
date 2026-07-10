import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CppRow, type ConsolidatedSeller,
  computePeriodComparison, getDailySeries, cleanCustId, parseBrNumber,
} from "@/utils/cppAggregation";
import { format } from "date-fns";
import { CONVERSION_MARKET_BAND } from "@/lib/marketBands";

function findVertical(rawRows: CppRow[], custId: string): string | null {
  for (const r of rawRows) {
    if (cleanCustId(r["CUS_CUST_ID_SEL"]) !== custId) continue;
    const v = String(r["VERTICAL"] || r["vertical"] || r["DOM_DOMAIN_AGG1"] || "").trim().toUpperCase();
    if (v) return v;
  }
  return null;
}

/**
 * Peers benchmark computado dinamicamente a partir dos próprios rawRows do CPP
 * (mesma vertical, no período), calculando mediana. Retorna null se n<3.
 * Substitui os benchmarks literais hardcoded que existiam antes.
 */
function computeVerticalBenchmark(
  rawRows: CppRow[],
  vertical: string,
  custId: string,
  startStr: string,
  endStr: string,
) {
  const upper = vertical.toUpperCase();
  const perSeller = new Map<string, { tgmv: number; tsi: number; visitas: number; invPads: number; tgmvPads: number; vch: number; vm: number; vex: number }>();
  for (const r of rawRows) {
    const v = String(r["VERTICAL"] || r["vertical"] || r["DOM_DOMAIN_AGG1"] || "").trim().toUpperCase();
    if (!v || !(v.includes(upper) || upper.includes(v))) continue;
    const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
    if (d && (d < startStr || d > endStr)) continue;
    const id = cleanCustId(r["CUS_CUST_ID_SEL"]);
    if (!id || id === custId) continue;
    let m = perSeller.get(id);
    if (!m) { m = { tgmv: 0, tsi: 0, visitas: 0, invPads: 0, tgmvPads: 0, vch: 0, vm: 0, vex: 0 }; perSeller.set(id, m); }
    m.tgmv += parseBrNumber(r["TGMV_LC"]);
    m.tsi += parseBrNumber(r["TSI"]);
    m.visitas += parseBrNumber(r["VISITAS"]);
    m.invPads += parseBrNumber(r["INV_PADS"]);
    m.tgmvPads += parseBrNumber(r["TGMV_LC_PADS"]);
    m.vch += parseBrNumber(r["VISITS_CHEAPER"]);
    m.vm += parseBrNumber(r["VISITS_MATCH"]);
    m.vex += parseBrNumber(r["VISITS_EXPENSIVE"]);
  }
  if (perSeller.size < 3) return null;
  const arr = Array.from(perSeller.values());
  const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };
  const roas = arr.filter(a => a.invPads > 0).map(a => a.tgmvPads / a.invPads);
  const conv = arr.filter(a => a.visitas > 0).map(a => (a.tsi / a.visitas) * 100);
  const cheaperPcts: number[] = [], matchPcts: number[] = [], expPcts: number[] = [];
  for (const a of arr) {
    const t = a.vch + a.vm + a.vex;
    if (t > 0) { cheaperPcts.push((a.vch / t) * 100); matchPcts.push((a.vm / t) * 100); expPcts.push((a.vex / t) * 100); }
  }
  return {
    gmv: median(arr.map(a => a.tgmv)),
    tsi: median(arr.map(a => a.tsi)),
    roas: median(roas),
    conv: median(conv),
    cheaper: median(cheaperPcts),
    match: median(matchPcts),
    expensive: median(expPcts),
    n: perSeller.size,
  };
}

interface Props {
  seller: ConsolidatedSeller;
  rawRows: CppRow[];
  startDate: Date;
  endDate: Date;
}

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmtCurrency(v);
}

export default function CppVerticalAnalysis({ seller, rawRows, startDate, endDate }: Props) {
  const custId = seller.CUS_CUST_ID_SEL;
  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");

  const vertical = useMemo(() => findVertical(rawRows, custId), [rawRows, custId]);

  const sellerMetrics = useMemo(
    () => computePeriodComparison(rawRows, custId, startStr, endStr).current,
    [rawRows, custId, startStr, endStr]
  );

  const benchmark = useMemo(
    () => (vertical ? computeVerticalBenchmark(rawRows, vertical, custId, startStr, endStr) : null),
    [rawRows, vertical, custId, startStr, endStr]
  );
  const priceBench = benchmark
    ? { cheaper: benchmark.cheaper, match: benchmark.match, expensive: benchmark.expensive }
    : null;

  // Price positioning for seller
  const pricePositioning = useMemo(() => {
    const total = sellerMetrics.visitsCheaper + sellerMetrics.visitsMatch + sellerMetrics.visitsExpensive;
    if (total === 0) return null;
    return {
      cheaper: (sellerMetrics.visitsCheaper / total) * 100,
      match: (sellerMetrics.visitsMatch / total) * 100,
      expensive: (sellerMetrics.visitsExpensive / total) * 100,
    };
  }, [sellerMetrics]);

  // Daily GMV chart
  const dailyChart = useMemo(() => {
    const sellerDaily = getDailySeries(rawRows, custId, startStr, endStr);
    const verticalDailyAvg = benchmark ? benchmark.gmv / 30 : 0;
    return sellerDaily.map(d => ({
      date: d.date,
      seller: Math.round(d.gmv),
      vertical: Math.round(verticalDailyAvg),
    }));
  }, [rawRows, custId, startStr, endStr, benchmark]);

  if (!vertical) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Vertical não identificada para este seller no período
        </CardContent>
      </Card>
    );
  }

  const comparisonRows = benchmark ? [
    {
      label: "GMV mensal",
      seller: fmtCompact(sellerMetrics.tgmv),
      median: fmtCompact(benchmark.gmv),
      delta: benchmark.gmv > 0 ? ((sellerMetrics.tgmv - benchmark.gmv) / benchmark.gmv) * 100 : null,
      tooltip: null as string | null,
    },
    {
      label: "Itens vendidos",
      seller: Math.round(sellerMetrics.tsi).toLocaleString("pt-BR"),
      median: benchmark.tsi.toLocaleString("pt-BR"),
      delta: benchmark.tsi > 0 ? ((sellerMetrics.tsi - benchmark.tsi) / benchmark.tsi) * 100 : null,
      tooltip: null,
    },
    {
      label: "ROAS",
      seller: sellerMetrics.roas !== null ? `${sellerMetrics.roas.toFixed(1)}x` : "—",
      median: `${benchmark.roas.toFixed(1)}x`,
      delta: benchmark.roas > 0 && sellerMetrics.roas !== null ? ((sellerMetrics.roas - benchmark.roas) / benchmark.roas) * 100 : null,
      tooltip: null,
    },
    {
      label: "Taxa conversão",
      seller: sellerMetrics.txConversao !== null ? `${sellerMetrics.txConversao.toFixed(1)}%` : "—",
      median: `${benchmark.conv.toFixed(1)}%`,
      delta: benchmark.conv > 0 && sellerMetrics.txConversao !== null ? ((sellerMetrics.txConversao - benchmark.conv) / benchmark.conv) * 100 : null,
      tooltip: CONVERSION_MARKET_BAND,
    },
  ] : [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
        Desempenho vs Concorrência — {vertical}
        {benchmark && (
          <span className="ml-2 text-[10px] font-normal text-muted-foreground">
            (n={benchmark.n} peers no período)
          </span>
        )}
      </h3>

      {!benchmark && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center text-muted-foreground text-xs">
            Amostra insuficiente de peers no período (n&lt;3) — sem benchmark de vertical disponível.
          </CardContent>
        </Card>
      )}

      {/* Price Positioning Bar */}
      {pricePositioning && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Posicionamento de preço
              {priceBench && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3 h-3" /></TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <p>Benchmark {vertical}:</p>
                      <p>Mais barato: {priceBench.cheaper.toFixed(1)}%</p>
                      <p>Mesmo preço: {priceBench.match.toFixed(1)}%</p>
                      <p>Mais caro: {priceBench.expensive.toFixed(1)}%</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex w-full h-8 rounded-lg overflow-hidden">
              <div
                className="bg-emerald-500/70 flex items-center justify-center text-[10px] font-bold text-foreground"
                style={{ width: `${pricePositioning.cheaper}%` }}
              >
                {pricePositioning.cheaper >= 8 ? `${pricePositioning.cheaper.toFixed(0)}%` : ""}
              </div>
              <div
                className="bg-muted flex items-center justify-center text-[10px] font-bold text-foreground"
                style={{ width: `${pricePositioning.match}%` }}
              >
                {pricePositioning.match >= 8 ? `${pricePositioning.match.toFixed(0)}%` : ""}
              </div>
              <div
                className="bg-destructive/60 flex items-center justify-center text-[10px] font-bold text-foreground"
                style={{ width: `${pricePositioning.expensive}%` }}
              >
                {pricePositioning.expensive >= 8 ? `${pricePositioning.expensive.toFixed(0)}%` : ""}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>🟢 Mais barato</span>
              <span>⚪ Mesmo preço</span>
              <span>🔴 Mais caro</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      {comparisonRows.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">KPI</TableHead>
                  <TableHead className="text-xs text-right">Este seller</TableHead>
                  <TableHead className="text-xs text-right">Mediana vertical</TableHead>
                  <TableHead className="text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map(r => (
                  <TableRow key={r.label}>
                    <TableCell className="text-xs font-medium">
                      <span className="inline-flex items-center gap-1">
                        {r.label}
                        {r.tooltip && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                              <TooltipContent className="text-xs max-w-[260px]">{r.tooltip}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{r.seller}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{r.median}</TableCell>
                    <TableCell className="text-xs text-right">
                      {r.delta !== null ? (
                        <span className={cn("inline-flex items-center gap-0.5 font-semibold",
                          r.delta >= 0 ? "text-emerald-400" : "text-destructive")}>
                          {r.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {r.delta >= 0 ? "+" : ""}{r.delta.toFixed(1)}%
                        </span>
                      ) : (
                        <Minus className="w-3 h-3 text-muted-foreground inline" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Daily GMV Chart */}
      {dailyChart.length > 1 && benchmark && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              GMV diário — Seller vs Média da Vertical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                    tickFormatter={v => { const p = v.split("-"); return `${p[2]}/${p[1]}`; }}
                  />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    formatter={(v: number, name: string) => [
                      fmtCompact(v),
                      name === "seller" ? "Seller" : "Média Vertical",
                    ]}
                  />
                  <Legend formatter={v => v === "seller" ? "Seller" : "Média Vertical"} />
                  <Line type="monotone" dataKey="seller" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="vertical" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
