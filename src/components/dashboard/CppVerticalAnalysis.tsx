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
  computePeriodComparison, getDailyGmv, cleanCustId, parseBrNumber,
} from "@/utils/cppAggregation";
import { format } from "date-fns";

// Vertical benchmarks (medians)
const VERTICAL_BENCHMARKS: Record<string, { gmv: number; tsi: number; roas: number; conv: number }> = {
  "VEHICLE PARTS & ACCESSORIES": { gmv: 42357, tsi: 235, roas: 8.3, conv: 3.3 },
  "ACC CARS & VANS": { gmv: 42357, tsi: 235, roas: 8.3, conv: 3.3 },
  "CONSTRUCTION": { gmv: 71886, tsi: 694, roas: 10.9, conv: 5.3 },
  "FURNISHING": { gmv: 128840, tsi: 906, roas: 5.9, conv: 2.7 },
  "FASHION": { gmv: 3876, tsi: 91, roas: 5.6, conv: 1.9 },
  "CPG": { gmv: 45287, tsi: 534, roas: 10.2, conv: 6.5 },
  "TECHNOLOGY": { gmv: 57253, tsi: 147, roas: 6.2, conv: 2.4 },
  "HEALTH": { gmv: 31636, tsi: 357, roas: 6.5, conv: 5.4 },
  "BEAUTY": { gmv: 5514, tsi: 14, roas: 15.1, conv: 2.5 },
  "SPORTS": { gmv: 30846, tsi: 495, roas: 12.7, conv: 6.5 },
  "HOME ELECTRONICS": { gmv: 4855755, tsi: 4317, roas: 18.5, conv: 3.8 },
};

// Price positioning benchmarks
const PRICE_BENCHMARKS: Record<string, { cheaper: number; match: number; expensive: number }> = {
  "VEHICLE PARTS & ACCESSORIES": { cheaper: 20.2, match: 51.5, expensive: 28.4 },
  "ACC CARS & VANS": { cheaper: 20.2, match: 51.5, expensive: 28.4 },
  "CONSTRUCTION": { cheaper: 21.6, match: 52.3, expensive: 26.1 },
  "TECHNOLOGY": { cheaper: 14.8, match: 51.4, expensive: 33.8 },
  "FURNISHING": { cheaper: 20.6, match: 53.2, expensive: 26.2 },
  "FASHION": { cheaper: 20.7, match: 52.8, expensive: 26.4 },
  "CPG": { cheaper: 24.2, match: 52.9, expensive: 23.0 },
  "HEALTH": { cheaper: 20.2, match: 55.1, expensive: 24.7 },
  "BEAUTY": { cheaper: 33.7, match: 55.1, expensive: 11.3 },
  "SPORTS": { cheaper: 19.7, match: 51.0, expensive: 29.4 },
  "HOME ELECTRONICS": { cheaper: 11.6, match: 51.9, expensive: 36.4 },
};

function findVertical(rawRows: CppRow[], custId: string): string | null {
  for (const r of rawRows) {
    if (cleanCustId(r["CUS_CUST_ID_SEL"]) !== custId) continue;
    const v = String(r["VERTICAL"] || r["vertical"] || r["DOM_DOMAIN_AGG1"] || "").trim().toUpperCase();
    if (v) return v;
  }
  return null;
}

function findBenchmark(vertical: string) {
  const upper = vertical.toUpperCase();
  for (const [key, val] of Object.entries(VERTICAL_BENCHMARKS)) {
    if (upper.includes(key) || key.includes(upper)) return val;
  }
  return null;
}

function findPriceBenchmark(vertical: string) {
  const upper = vertical.toUpperCase();
  for (const [key, val] of Object.entries(PRICE_BENCHMARKS)) {
    if (upper.includes(key) || key.includes(upper)) return val;
  }
  return null;
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

  const benchmark = vertical ? findBenchmark(vertical) : null;
  const priceBench = vertical ? findPriceBenchmark(vertical) : null;

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
    const sellerDaily = getDailyGmv(rawRows, custId, startStr, endStr);
    const verticalDailyAvg = benchmark ? benchmark.gmv / 30 : 0;
    return sellerDaily.map(d => ({
      date: d.date,
      seller: Math.round(d.tgmv),
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
    },
    {
      label: "Itens vendidos",
      seller: Math.round(sellerMetrics.tsi).toLocaleString("pt-BR"),
      median: benchmark.tsi.toLocaleString("pt-BR"),
      delta: benchmark.tsi > 0 ? ((sellerMetrics.tsi - benchmark.tsi) / benchmark.tsi) * 100 : null,
    },
    {
      label: "ROAS",
      seller: sellerMetrics.roas !== null ? `${sellerMetrics.roas.toFixed(1)}x` : "—",
      median: `${benchmark.roas.toFixed(1)}x`,
      delta: benchmark.roas > 0 && sellerMetrics.roas !== null ? ((sellerMetrics.roas - benchmark.roas) / benchmark.roas) * 100 : null,
    },
    {
      label: "Taxa conversão",
      seller: sellerMetrics.txConversao !== null ? `${sellerMetrics.txConversao.toFixed(1)}%` : "—",
      median: `${benchmark.conv.toFixed(1)}%`,
      delta: benchmark.conv > 0 && sellerMetrics.txConversao !== null ? ((sellerMetrics.txConversao - benchmark.conv) / benchmark.conv) * 100 : null,
    },
  ] : [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
        Desempenho vs Concorrência — {vertical}
      </h3>

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
                    <TableCell className="text-xs font-medium">{r.label}</TableCell>
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
