import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Info, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, RectangleProps,
} from "recharts";

// ── Types ──
type Agg = "pond" | "mediana" | "p90";

interface RepRow {
  mes_ref: string;
  n_sellers_claims: number;
  n_sellers_atrasos: number;
  n_sellers_total: number;
  claims_pond_tgmv: number | null;
  atrasos_pond_tgmv: number | null;
  claims_mediana: number | null;
  atrasos_mediana: number | null;
  claims_p90: number | null;
  atrasos_p90: number | null;
}

interface ChartPoint {
  mes: string;
  mesLabel: string;
  claims: number | null;
  atrasos: number | null;
  nSellersClaims: number;
  nSellersAtrasos: number;
  nSellersTotal: number;
  coberturaClaims: number;
  coberturaAtrasos: number;
  claimsPrev: number | null;
  atrasosPrev: number | null;
}

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear()}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtPp(curr: number | null, prev: number | null): { text: string; icon: string } {
  if (curr == null || prev == null) return { text: "", icon: "" };
  const diff = (curr - prev) * 100;
  if (Math.abs(diff) < 0.005) return { text: "→ estável", icon: "→" };
  const sign = diff > 0 ? "+" : "";
  return {
    text: `${diff > 0 ? "↑" : "↓"} ${sign}${diff.toFixed(2)}pp vs mês anterior`,
    icon: diff > 0 ? "↑" : "↓",
  };
}

// ── Hook ──
function useReputacaoMensal() {
  return useQuery({
    queryKey: ["vw_reputacao_mensal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_reputacao_mensal" as any)
        .select("*")
        .order("mes_ref", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RepRow[];
    },
    staleTime: 5 * 60_000,
  });
}

// ── Custom Tooltip ──
function RepTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: ChartPoint = payload[0]?.payload;
  if (!p) return null;

  const claimsDelta = fmtPp(p.claims, p.claimsPrev);
  const atrasosDelta = fmtPp(p.atrasos, p.atrasosPrev);
  const lowCov = p.coberturaClaims < 70 || p.coberturaAtrasos < 70;

  return (
    <div className="rounded-lg border border-border/50 bg-card px-4 py-3 shadow-xl text-xs space-y-1.5 min-w-[260px]">
      <p className="font-semibold text-foreground">{p.mesLabel}</p>
      <div className="border-t border-border/30 my-1" />
      <div className="flex justify-between items-center">
        <span className="text-warning">🟡 Reclamações:</span>
        <span className="font-mono tabular-nums text-foreground">
          {fmtPct(p.claims)}{" "}
          <span className="text-muted-foreground text-[10px]">{claimsDelta.text}</span>
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-destructive">🔴 Atrasos HT:</span>
        <span className="font-mono tabular-nums text-foreground">
          {fmtPct(p.atrasos)}{" "}
          <span className="text-muted-foreground text-[10px]">{atrasosDelta.text}</span>
        </span>
      </div>
      <div className="border-t border-border/30 my-1" />
      <p className="text-muted-foreground">
        Sellers analisados: <span className="text-foreground font-mono">{p.nSellersClaims}</span>
      </p>
      <p className="text-muted-foreground">
        Cobertura: <span className="text-foreground font-mono">{p.coberturaClaims.toFixed(0)}%</span> da carteira
      </p>
      {lowCov && (
        <p className="text-warning flex items-center gap-1 mt-1">
          <AlertTriangle className="w-3 h-3" /> Cobertura baixa — interprete com cautela
        </p>
      )}
    </div>
  );
}

// ── No-data overlay stripes ──
function NoDataOverlay({ gaps, chartData }: { gaps: [number, number][]; chartData: ChartPoint[] }) {
  if (!gaps.length || chartData.length < 2) return null;
  return (
    <>
      {gaps.map(([start, end], i) => {
        const x1 = (start / (chartData.length - 1)) * 100;
        const x2 = ((end) / (chartData.length - 1)) * 100;
        return (
          <div
            key={i}
            className="absolute top-0 bottom-0 pointer-events-none flex items-center justify-center"
            style={{
              left: `${x1}%`,
              width: `${x2 - x1}%`,
              background: "repeating-linear-gradient(45deg, transparent, transparent 6px, hsl(var(--muted-foreground) / 0.08) 6px, hsl(var(--muted-foreground) / 0.08) 12px)",
            }}
          >
            <span className="text-[10px] text-muted-foreground bg-card/80 px-1.5 py-0.5 rounded">
              sem dados
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Main Component ──
export default function GraficoReputacao() {
  const [agg, setAgg] = useState<Agg>("pond");
  const { data: rows, isLoading } = useReputacaoMensal();

  const { chartData, gaps, qualityChip, qualityRows } = useMemo(() => {
    if (!rows?.length) return { chartData: [], gaps: [] as [number, number][], qualityChip: "red" as const, qualityRows: [] as any[] };

    const claimsKey = agg === "pond" ? "claims_pond_tgmv" : agg === "mediana" ? "claims_mediana" : "claims_p90";
    const atrasosKey = agg === "pond" ? "atrasos_pond_tgmv" : agg === "mediana" ? "atrasos_mediana" : "atrasos_p90";

    const points: ChartPoint[] = rows.map((r, idx) => {
      const prev = idx > 0 ? rows[idx - 1] : null;
      const covClaims = r.n_sellers_total > 0 ? (r.n_sellers_claims / r.n_sellers_total) * 100 : 0;
      const covAtrasos = r.n_sellers_total > 0 ? (r.n_sellers_atrasos / r.n_sellers_total) * 100 : 0;
      return {
        mes: r.mes_ref,
        mesLabel: fmtMonth(r.mes_ref),
        claims: r[claimsKey] != null ? r[claimsKey] : null,
        atrasos: r[atrasosKey] != null ? r[atrasosKey] : null,
        nSellersClaims: r.n_sellers_claims,
        nSellersAtrasos: r.n_sellers_atrasos,
        nSellersTotal: r.n_sellers_total,
        coberturaClaims: covClaims,
        coberturaAtrasos: covAtrasos,
        claimsPrev: prev && prev[claimsKey] != null ? prev[claimsKey] : null,
        atrasosPrev: prev && prev[atrasosKey] != null ? prev[atrasosKey] : null,
      };
    });

    // Detect consecutive null gaps > 2
    const gapRanges: [number, number][] = [];
    let gapStart: number | null = null;
    for (let i = 0; i < points.length; i++) {
      const isNull = points[i].claims == null && points[i].atrasos == null;
      if (isNull) {
        if (gapStart == null) gapStart = i;
      } else {
        if (gapStart != null && i - gapStart > 2) {
          gapRanges.push([gapStart, i - 1]);
        }
        gapStart = null;
      }
    }
    if (gapStart != null && points.length - gapStart > 2) {
      gapRanges.push([gapStart, points.length - 1]);
    }

    // Quality chip
    const hasNull = points.some(p => p.claims == null || p.atrasos == null);
    const hasLowN = points.some(p => p.nSellersClaims < 50);
    const hasLowCov = points.some(p => p.coberturaClaims < 50);
    let chip: "green" | "yellow" | "red" = "green";
    if (hasNull || hasLowCov) chip = "red";
    else if (hasLowN) chip = "yellow";

    const qRows = points.map(p => ({
      mes: p.mesLabel,
      nClaims: p.nSellersClaims,
      nAtrasos: p.nSellersAtrasos,
      cobertura: p.coberturaClaims,
    }));

    return { chartData: points, gaps: gapRanges, qualityChip: chip, qualityRows: qRows };
  }, [rows, agg]);

  const chipConfig = {
    green: { label: `${chartData.length} meses completos`, variant: "default" as const, className: "bg-emerald/20 text-emerald border-emerald/30" },
    yellow: { label: "Mês(es) incompleto(s)", variant: "outline" as const, className: "bg-warning/20 text-warning border-warning/30" },
    red: { label: "Lacunas detectadas", variant: "outline" as const, className: "bg-destructive/20 text-destructive border-destructive/30" },
  };
  const cc = chipConfig[qualityChip];

  const aggLabels: Record<Agg, string> = {
    pond: "Média ponderada",
    mediana: "Mediana",
    p90: "P90",
  };

  // Dynamic Y domain: max * 1.2 rounded up
  const yMax = useMemo(() => {
    let max = 0;
    for (const p of chartData) {
      if (p.claims != null && p.claims > max) max = p.claims;
      if (p.atrasos != null && p.atrasos > max) max = p.atrasos;
    }
    if (max === 0) return 0.05;
    return Math.ceil(max * 1.2 * 1000) / 1000; // keep precision for small %
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          Carregando dados de reputação…
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          Sem dados de reputação disponíveis.
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Evolução da Reputação
              </CardTitle>
              {/* Data quality chip */}
              <Popover>
                <PopoverTrigger asChild>
                  <Badge
                    variant={cc.variant}
                    className={`cursor-pointer text-[10px] ${cc.className}`}
                  >
                    {cc.label}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] max-h-[300px] overflow-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Mês</TableHead>
                        <TableHead className="text-xs text-right">Sellers (Recl.)</TableHead>
                        <TableHead className="text-xs text-right">Sellers (Atr.)</TableHead>
                        <TableHead className="text-xs text-right">Cobertura</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualityRows.map((r: any) => (
                        <TableRow key={r.mes}>
                          <TableCell className="text-xs font-mono">{r.mes}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{r.nClaims}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{r.nAtrasos}</TableCell>
                          <TableCell className={`text-xs text-right font-mono ${r.cobertura < 50 ? "text-destructive" : r.cobertura < 70 ? "text-warning" : ""}`}>
                            {r.cobertura.toFixed(0)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </PopoverContent>
              </Popover>
            </div>

            {/* Aggregation toggle */}
            <div className="flex items-center gap-2">
              <Tabs value={agg} onValueChange={(v) => setAgg(v as Agg)}>
                <TabsList className="h-7">
                  {(["pond", "mediana", "p90"] as Agg[]).map((a) => (
                    <TabsTrigger key={a} value={a} className="text-[10px] px-2 py-0.5">
                      {aggLabels[a]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <TooltipProvider>
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px] text-xs">
                    <strong>Ponderada por TGMV</strong> reflete o seller médio do faturamento.{" "}
                    <strong>Mediana</strong> resiste a outliers.{" "}
                    <strong>P90</strong> mostra a cauda dos sellers mais problemáticos.
                  </TooltipContent>
                </UiTooltip>
              </TooltipProvider>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">↓ menor = melhor</p>
        </CardHeader>
        <CardContent>
          <div className="relative h-[320px]">
            <NoDataOverlay gaps={gaps} chartData={chartData} />
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  {/* Red zone above claims target */}
                  <linearGradient id="repZoneClaims" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis
                  dataKey="mesLabel"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                  domain={[0, yMax]}
                />
                <Tooltip content={<RepTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
                {/* Target lines */}
                <ReferenceLine
                  y={0.01}
                  stroke="hsl(var(--warning))"
                  strokeDasharray="6 4"
                  strokeOpacity={0.7}
                  label={{ value: "Meta 1% (Recl.)", position: "right", fontSize: 9, fill: "hsl(var(--warning))" }}
                />
                <ReferenceLine
                  y={0.005}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="6 4"
                  strokeOpacity={0.7}
                  label={{ value: "Meta 0.5% (Atr.)", position: "right", fontSize: 9, fill: "hsl(var(--destructive))" }}
                />
                {/* Claims line */}
                <Line
                  type="linear"
                  dataKey="claims"
                  name="🟡 Reclamações"
                  stroke="hsl(40, 95%, 55%)"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 4, fill: "hsl(40, 95%, 55%)", strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
                {/* Delays line */}
                <Line
                  type="linear"
                  dataKey="atrasos"
                  name="🔴 Atrasos HT"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 4, fill: "hsl(0, 84%, 60%)", strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}