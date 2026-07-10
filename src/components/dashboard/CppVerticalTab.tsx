import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Info, Package, AlertTriangle, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CppRow, type ConsolidatedSeller,
  cleanCustId, parseBrNumber,
} from "@/utils/cppAggregation";
import { useEligibility } from "@/hooks/useEligibility";
import { CONVERSION_MARKET_BAND } from "@/lib/marketBands";

/* ──────────────── CDP SUB-CATEGORY REFERENCE (informativo, sem cortes de classificação) ──────────────── */

const CDP_SUBCATEGORY_BENCHMARKS: Record<string, { itens: number; sellers: number; descMedio: number }> = {
  "ACC CARS & VANS": { itens: 10849, sellers: 104, descMedio: 10.9 },
  "ACC MOTORCYCLES": { itens: 2483, sellers: 17, descMedio: 9.3 },
  "OILS & FILTERS": { itens: 1520, sellers: 55, descMedio: 10.1 },
  "CONSTRUCTION": { itens: 963, sellers: 31, descMedio: 12.2 },
  "HOUSEHOLD ITEMS": { itens: 488, sellers: 20, descMedio: 11.0 },
  "FURNITURE": { itens: 234, sellers: 7, descMedio: 19.0 },
  "APPAREL": { itens: 236, sellers: 9, descMedio: 20.5 },
  "TOOLS": { itens: 205, sellers: 13, descMedio: 17.1 },
};

/* ──────────────── HELPERS ──────────────── */

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmtCurrency(v);
}
function fmtNum(v: number): string { return Math.round(v).toLocaleString("pt-BR"); }

function matchKey<T>(map: Record<string, T>, vertical: string): T | null {
  const upper = vertical.toUpperCase();
  for (const [key, val] of Object.entries(map)) {
    if (upper.includes(key) || key.includes(upper)) return val;
  }
  return null;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type PeriodKey = "last_month" | "last_3_months" | "all";

/* ──────────────── COMPONENT ──────────────── */

interface Props {
  data: ConsolidatedSeller[];
  rawRows: CppRow[];
  dateRange: { min: string; max: string };
}

export default function CppVerticalTab({ data, rawRows, dateRange }: Props) {
  const [selectedCustId, setSelectedCustId] = useState<string>("");
  const [period, setPeriod] = useState<PeriodKey>("last_month");

  const seller = useMemo(() => data.find(s => s.CUS_CUST_ID_SEL === selectedCustId) || null, [data, selectedCustId]);

  // Compute period date range
  const { startStr, endStr } = useMemo(() => {
    if (!dateRange.max) return { startStr: "", endStr: "" };
    const maxD = new Date(dateRange.max + "T12:00:00");
    const minD = new Date(dateRange.min + "T12:00:00");
    let start: Date;
    if (period === "last_month") {
      start = new Date(maxD.getTime() - 29 * 86400000);
    } else if (period === "last_3_months") {
      start = new Date(maxD.getTime() - 89 * 86400000);
    } else {
      start = minD;
    }
    if (start < minD) start = minD;
    return {
      startStr: format(start, "yyyy-MM-dd"),
      endStr: format(maxD, "yyyy-MM-dd"),
    };
  }, [dateRange, period]);

  // Detect vertical from rawRows (group by VERTICAL, pick highest ITENS sum)
  const { vertical, subCategory, verticalSellers } = useMemo(() => {
    if (!seller) return { vertical: null, subCategory: null, verticalSellers: 0 };
    const custId = seller.CUS_CUST_ID_SEL;

    // Find vertical from raw rows
    const vertMap = new Map<string, number>();
    const subCatMap = new Map<string, number>();
    for (const r of rawRows) {
      if (cleanCustId(r["CUS_CUST_ID_SEL"]) !== custId) continue;
      const v = String(r["VERTICAL"] || r["DOM_DOMAIN_AGG1"] || r["dom_domain_agg1"] || "").trim().toUpperCase();
      const sc = String(r["DOM_DOMAIN_AGG1"] || r["dom_domain_agg1"] || "").trim().toUpperCase();
      if (v) {
        const itens = parseBrNumber(r["TOTAL_LIVELISTINGS"] || r["ITENS"] || 1);
        vertMap.set(v, (vertMap.get(v) || 0) + itens);
      }
      if (sc) {
        const itens = parseBrNumber(r["TOTAL_LIVELISTINGS"] || r["ITENS"] || 1);
        subCatMap.set(sc, (subCatMap.get(sc) || 0) + itens);
      }
    }

    let bestVert: string | null = null;
    let bestCount = 0;
    for (const [v, count] of vertMap) {
      if (count > bestCount) { bestVert = v; bestCount = count; }
    }

    let bestSub: string | null = null;
    let bestSubCount = 0;
    for (const [s, count] of subCatMap) {
      if (count > bestSubCount) { bestSub = s; bestSubCount = count; }
    }

    // Count sellers in vertical
    let vCount = 0;
    if (bestVert) {
      const sellersInVert = new Set<string>();
      for (const r of rawRows) {
        const v = String(r["VERTICAL"] || r["DOM_DOMAIN_AGG1"] || r["dom_domain_agg1"] || "").trim().toUpperCase();
        if (v && (v.includes(bestVert) || bestVert.includes(v))) {
          sellersInVert.add(cleanCustId(r["CUS_CUST_ID_SEL"]));
        }
      }
      vCount = sellersInVert.size;
    }

    return { vertical: bestVert, subCategory: bestSub, verticalSellers: vCount };
  }, [seller, rawRows]);

  // Pre-compute vertical benchmarks from rawRows (cache per vertical)
  const computedBenchmarks = useMemo(() => {
    if (!vertical || !seller) return null;
    const custId = seller.CUS_CUST_ID_SEL;

    // Collect all sellers in the same vertical, excluding selected seller
    const sellerMetrics = new Map<string, {
      tgmv: number; tsi: number; visitas: number; invPads: number; tgmvPads: number;
      fTgmv: number; cdpTgmv: number;
      visitsCheaper: number; visitsMatch: number; visitsExpensive: number;
    }>();

    for (const r of rawRows) {
      const v = String(r["VERTICAL"] || r["DOM_DOMAIN_AGG1"] || r["dom_domain_agg1"] || "").trim().toUpperCase();
      if (!v || !(v.includes(vertical) || vertical.includes(v))) continue;
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      if (d < startStr || d > endStr) continue;
      const id = cleanCustId(r["CUS_CUST_ID_SEL"]);
      if (id === custId) continue;

      if (!sellerMetrics.has(id)) {
        sellerMetrics.set(id, { tgmv: 0, tsi: 0, visitas: 0, invPads: 0, tgmvPads: 0, fTgmv: 0, cdpTgmv: 0, visitsCheaper: 0, visitsMatch: 0, visitsExpensive: 0 });
      }
      const m = sellerMetrics.get(id)!;
      m.tgmv += parseBrNumber(r["TGMV_LC"]);
      m.tsi += parseBrNumber(r["TSI"]);
      m.visitas += parseBrNumber(r["VISITAS"]);
      m.invPads += parseBrNumber(r["INV_PADS"]);
      m.tgmvPads += parseBrNumber(r["TGMV_LC_PADS"]);
      // Share Full = TGMV_LC_FBM / TGMV_LC. F_TGMV_LC é meta CPP, não Full logístico.
      m.fTgmv += parseBrNumber(r["TGMV_LC_FBM"]);
      m.cdpTgmv += parseBrNumber(r["CDP_TGMV_LC"]);
      m.visitsCheaper += parseBrNumber(r["VISITS_CHEAPER"]);
      m.visitsMatch += parseBrNumber(r["VISITS_MATCH"]);
      m.visitsExpensive += parseBrNumber(r["VISITS_EXPENSIVE"]);
    }

    if (sellerMetrics.size < 3) return null; // insufficient sample

    const arr = Array.from(sellerMetrics.values());
    const gmvs = arr.map(a => a.tgmv);
    const tsis = arr.map(a => a.tsi);
    const visitas = arr.map(a => a.visitas);
    const roass = arr.filter(a => a.invPads > 0).map(a => a.tgmvPads / a.invPads);
    const convs = arr.filter(a => a.visitas > 0).map(a => (a.tsi / a.visitas) * 100);
    const shareFulls = arr.filter(a => a.tgmv > 0).map(a => (a.fTgmv / a.tgmv) * 100);
    const shareCdps = arr.filter(a => a.tgmv > 0).map(a => (a.cdpTgmv / a.tgmv) * 100);

    // Price positioning
    const cheaperPcts = arr.filter(a => (a.visitsCheaper + a.visitsMatch + a.visitsExpensive) > 0)
      .map(a => { const t = a.visitsCheaper + a.visitsMatch + a.visitsExpensive; return (a.visitsCheaper / t) * 100; });
    const matchPcts = arr.filter(a => (a.visitsCheaper + a.visitsMatch + a.visitsExpensive) > 0)
      .map(a => { const t = a.visitsCheaper + a.visitsMatch + a.visitsExpensive; return (a.visitsMatch / t) * 100; });
    const expPcts = arr.filter(a => (a.visitsCheaper + a.visitsMatch + a.visitsExpensive) > 0)
      .map(a => { const t = a.visitsCheaper + a.visitsMatch + a.visitsExpensive; return (a.visitsExpensive / t) * 100; });

    return {
      gmv: median(gmvs), tsi: median(tsis), visitas: median(visitas),
      roas: median(roass), conv: median(convs),
      shareFull: median(shareFulls), shareCdp: median(shareCdps),
      priceCheaper: median(cheaperPcts), priceMatch: median(matchPcts), priceExpensive: median(expPcts),
      count: sellerMetrics.size,
    };
  }, [vertical, seller, rawRows, startStr, endStr]);

  // Seller metrics for the period
  const sellerMetrics = useMemo(() => {
    if (!seller) return null;
    const custId = seller.CUS_CUST_ID_SEL;
    let tgmv = 0, tsi = 0, visitas = 0, invPads = 0, tgmvPads = 0, fTgmv = 0, cdpTgmv = 0;
    let visitsCheaper = 0, visitsMatch = 0, visitsExpensive = 0;

    for (const r of rawRows) {
      if (cleanCustId(r["CUS_CUST_ID_SEL"]) !== custId) continue;
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      if (d < startStr || d > endStr) continue;
      tgmv += parseBrNumber(r["TGMV_LC"]);
      tsi += parseBrNumber(r["TSI"]);
      visitas += parseBrNumber(r["VISITAS"]);
      invPads += parseBrNumber(r["INV_PADS"]);
      tgmvPads += parseBrNumber(r["TGMV_LC_PADS"]);
      // Share Full = TGMV_LC_FBM / TGMV_LC. F_TGMV_LC é meta CPP, não Full logístico.
      fTgmv += parseBrNumber(r["TGMV_LC_FBM"]);
      cdpTgmv += parseBrNumber(r["CDP_TGMV_LC"]);
      visitsCheaper += parseBrNumber(r["VISITS_CHEAPER"]);
      visitsMatch += parseBrNumber(r["VISITS_MATCH"]);
      visitsExpensive += parseBrNumber(r["VISITS_EXPENSIVE"]);
    }

    const totalComp = visitsCheaper + visitsMatch + visitsExpensive;
    return {
      tgmv, tsi, visitas, invPads, tgmvPads, fTgmv, cdpTgmv,
      roas: invPads > 0 ? tgmvPads / invPads : null,
      conv: visitas > 0 ? (tsi / visitas) * 100 : null,
      shareFull: tgmv > 0 ? (fTgmv / tgmv) * 100 : null,
      shareCdp: tgmv > 0 ? (cdpTgmv / tgmv) * 100 : null,
      priceCheaper: totalComp > 0 ? (visitsCheaper / totalComp) * 100 : null,
      priceMatch: totalComp > 0 ? (visitsMatch / totalComp) * 100 : null,
      priceExpensive: totalComp > 0 ? (visitsExpensive / totalComp) * 100 : null,
    };
  }, [seller, rawRows, startStr, endStr]);

  // Daily GMV chart data
  const dailyChart = useMemo(() => {
    if (!seller || !vertical) return [];
    const custId = seller.CUS_CUST_ID_SEL;

    // Seller daily GMV
    const sellerDaily = new Map<string, number>();
    // Vertical daily GMV (all sellers in vertical)
    const verticalDaily = new Map<string, number>();
    const verticalSellersPerDay = new Map<string, Set<string>>();

    for (const r of rawRows) {
      const v = String(r["VERTICAL"] || r["DOM_DOMAIN_AGG1"] || r["dom_domain_agg1"] || "").trim().toUpperCase();
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      if (d < startStr || d > endStr) continue;
      const id = cleanCustId(r["CUS_CUST_ID_SEL"]);
      const gmv = parseBrNumber(r["TGMV_LC"]);

      if (id === custId) {
        sellerDaily.set(d, (sellerDaily.get(d) || 0) + gmv);
      }

      if (v && (v.includes(vertical) || vertical.includes(v))) {
        verticalDaily.set(d, (verticalDaily.get(d) || 0) + gmv);
        if (!verticalSellersPerDay.has(d)) verticalSellersPerDay.set(d, new Set());
        verticalSellersPerDay.get(d)!.add(id);
      }
    }

    const allDates = new Set([...sellerDaily.keys(), ...verticalDaily.keys()]);
    return Array.from(allDates).sort().map(date => {
      const nSellers = verticalSellersPerDay.get(date)?.size || 1;
      return {
        date,
        seller: Math.round(sellerDaily.get(date) || 0),
        verticalAvg: Math.round((verticalDaily.get(date) || 0) / nSellers),
      };
    });
  }, [seller, vertical, rawRows, startStr, endStr]);

  // Rank computation
  const rankInfo = useMemo(() => {
    if (!seller || !vertical) return null;
    const custId = seller.CUS_CUST_ID_SEL;
    const sellerGmvMap = new Map<string, number>();

    for (const r of rawRows) {
      const v = String(r["VERTICAL"] || r["DOM_DOMAIN_AGG1"] || r["dom_domain_agg1"] || "").trim().toUpperCase();
      if (!v || !(v.includes(vertical) || vertical.includes(v))) continue;
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      if (d < startStr || d > endStr) continue;
      const id = cleanCustId(r["CUS_CUST_ID_SEL"]);
      sellerGmvMap.set(id, (sellerGmvMap.get(id) || 0) + parseBrNumber(r["TGMV_LC"]));
    }

    const sorted = Array.from(sellerGmvMap.entries()).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([id]) => id === custId) + 1;
    const total = sorted.length;
    return { rank, total };
  }, [seller, vertical, rawRows, startStr, endStr]);

  // Eligibility data (Block 4) - use existing hook
  // The hook needs seller_id (uuid from sellers table), but we only have cust_id
  // Since eligibility is loaded from DB, we pass undefined if not available
  const { data: eligibilityData } = useEligibility(undefined);

  // Use fallback benchmarks if computed ones are insufficient
  const bench = useMemo(() => {
    if (computedBenchmarks) return computedBenchmarks;
    // Sem literais hardcoded — se a amostra de peers no período for insuficiente,
    // retornamos null e a UI exibe o aviso "amostra insuficiente" abaixo.
    return null;
  }, [computedBenchmarks]);

  // Days in period for avg
  const daysInPeriod = useMemo(() => {
    if (!startStr || !endStr) return 1;
    const s = new Date(startStr + "T12:00:00");
    const e = new Date(endStr + "T12:00:00");
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  }, [startStr, endStr]);

  function statusBadge(sellerVal: number | null, medianVal: number, invertPositive = false) {
    if (sellerVal === null) return <Badge variant="outline" className="text-[10px]">—</Badge>;
    const ratio = medianVal > 0 ? sellerVal / medianVal : 1;
    const isAbove = ratio > 1.10;
    const isBelow = ratio < 0.90;
    const positive = invertPositive ? isBelow : isAbove;
    const negative = invertPositive ? isAbove : isBelow;

    if (positive) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Acima</Badge>;
    if (negative) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Abaixo</Badge>;
    return <Badge className="bg-muted text-muted-foreground text-[10px]">Na média</Badge>;
  }

  function deltaText(sellerVal: number | null, medianVal: number) {
    if (sellerVal === null || medianVal === 0) return "—";
    const d = ((sellerVal - medianVal) / medianVal) * 100;
    const sign = d >= 0 ? "+" : "";
    return `${sign}${d.toFixed(1)}%`;
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCustId} onValueChange={setSelectedCustId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Selecionar Seller" />
          </SelectTrigger>
          <SelectContent>
            {data.map(s => (
              <SelectItem key={s.CUS_CUST_ID_SEL} value={s.CUS_CUST_ID_SEL}>
                {s.CUS_NICKNAME} ({s.CUS_CUST_ID_SEL})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_month">Último mês</SelectItem>
            <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vertical info */}
      {seller && vertical && (
        <p className="text-xs text-muted-foreground">
          Vertical: <span className="font-semibold text-foreground">{vertical}</span>
          {subCategory && subCategory !== vertical && (
            <> · Subcategoria: <span className="font-semibold text-foreground">{subCategory}</span></>
          )}
          {" · "}
          <span className="text-foreground">{verticalSellers} concorrentes</span> na mesma vertical
        </p>
      )}

      {!seller && (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Selecione um seller acima para visualizar a análise de vertical
          </CardContent>
        </Card>
      )}

      {seller && !vertical && (
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Vertical não identificada para este seller no período
          </CardContent>
        </Card>
      )}

      {seller && vertical && sellerMetrics && (
        <>
          {/* BLOCK 1 — Price Positioning */}
          {sellerMetrics.priceCheaper !== null ? (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  Posicionamento de preço na vertical
                  {bench && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">
                          <p className="font-semibold mb-1">Benchmark {vertical}</p>
                          <p>Mais barato: {bench.priceCheaper.toFixed(1)}%</p>
                          <p>Mesmo preço: {bench.priceMatch.toFixed(1)}%</p>
                          <p>Mais caro: {bench.priceExpensive.toFixed(1)}%</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Seller bar */}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Este seller</p>
                  <div className="flex w-full h-7 rounded overflow-hidden">
                    <div style={{ width: `${sellerMetrics.priceCheaper}%`, backgroundColor: "#1D9E75" }} className="flex items-center justify-center text-[10px] font-bold text-white">
                      {sellerMetrics.priceCheaper >= 8 ? `${sellerMetrics.priceCheaper.toFixed(1)}%` : ""}
                    </div>
                    <div style={{ width: `${sellerMetrics.priceMatch}%`, backgroundColor: "#888780" }} className="flex items-center justify-center text-[10px] font-bold text-white">
                      {sellerMetrics.priceMatch! >= 8 ? `${sellerMetrics.priceMatch!.toFixed(1)}%` : ""}
                    </div>
                    <div style={{ width: `${sellerMetrics.priceExpensive}%`, backgroundColor: "#E24B4A" }} className="flex items-center justify-center text-[10px] font-bold text-white">
                      {sellerMetrics.priceExpensive! >= 8 ? `${sellerMetrics.priceExpensive!.toFixed(1)}%` : ""}
                    </div>
                  </div>
                </div>

                {/* Benchmark bar */}
                {bench && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Mediana vertical</p>
                    <div className="flex w-full h-7 rounded overflow-hidden">
                      <div style={{ width: `${bench.priceCheaper}%`, backgroundColor: "#1D9E75" }} className="flex items-center justify-center text-[10px] font-bold text-white opacity-70">
                        {bench.priceCheaper >= 8 ? `${bench.priceCheaper.toFixed(1)}%` : ""}
                      </div>
                      <div style={{ width: `${bench.priceMatch}%`, backgroundColor: "#888780" }} className="flex items-center justify-center text-[10px] font-bold text-white opacity-70">
                        {bench.priceMatch >= 8 ? `${bench.priceMatch.toFixed(1)}%` : ""}
                      </div>
                      <div style={{ width: `${bench.priceExpensive}%`, backgroundColor: "#E24B4A" }} className="flex items-center justify-center text-[10px] font-bold text-white opacity-70">
                        {bench.priceExpensive >= 8 ? `${bench.priceExpensive.toFixed(1)}%` : ""}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>🟢 Mais barato</span><span>⚪ Mesmo preço</span><span>🔴 Mais caro</span>
                </div>

                {/* Interpretation */}
                {bench && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {sellerMetrics.priceExpensive! > bench.priceExpensive + 5
                      ? `⚠ Este seller pratica preços acima da média da categoria em ${sellerMetrics.priceExpensive!.toFixed(1)}% das visitas`
                      : sellerMetrics.priceCheaper! > bench.priceCheaper + 5
                        ? `✓ Este seller é mais competitivo que a média — preço abaixo em ${sellerMetrics.priceCheaper!.toFixed(1)}% das visitas`
                        : "Preço alinhado com a média da vertical"}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center text-muted-foreground text-xs">
                Dados de competitividade não disponíveis para este seller no período
              </CardContent>
            </Card>
          )}

          {/* BLOCK 2 — Scorecard */}
          {bench && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Desempenho vs concorrência — {vertical}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">KPI</TableHead>
                      <TableHead className="text-xs text-right">Este seller</TableHead>
                      <TableHead className="text-xs text-right">Mediana vertical</TableHead>
                      <TableHead className="text-xs text-center">Posição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { label: "GMV mensal", sv: sellerMetrics.tgmv, mv: bench.gmv, fmt: fmtCompact },
                      { label: "Itens vendidos", sv: sellerMetrics.tsi, mv: bench.tsi, fmt: fmtNum },
                      { label: "Visitas", sv: sellerMetrics.visitas, mv: bench.visitas, fmt: fmtNum },
                      { label: "ROAS", sv: sellerMetrics.roas, mv: bench.roas, fmt: (v: number) => `${v.toFixed(1)}x` },
                      { label: "Taxa de conversão", sv: sellerMetrics.conv, mv: bench.conv, fmt: (v: number) => `${v.toFixed(1)}%`, tooltip: CONVERSION_MARKET_BAND },
                      { label: "Share Full", sv: sellerMetrics.shareFull, mv: bench.shareFull, fmt: (v: number) => `${v.toFixed(1)}%` },
                      { label: "Share CDP", sv: sellerMetrics.shareCdp, mv: bench.shareCdp, fmt: (v: number) => `${v.toFixed(1)}%` },
                    ].map((row: any) => (
                      <TableRow key={row.label}>
                        <TableCell className="text-xs font-medium">
                          <span className="inline-flex items-center gap-1">
                            {row.label}
                            {row.tooltip && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                                  <TooltipContent className="text-xs max-w-[260px]">{row.tooltip}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">{row.sv !== null ? row.fmt(row.sv) : "—"}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground">{row.fmt(row.mv)}</TableCell>
                        <TableCell className="text-xs text-center">
                          <div className="flex items-center justify-center gap-1">
                            {statusBadge(row.sv, row.mv)}
                            <span className={cn("text-[10px]", row.sv !== null && row.mv > 0 && ((row.sv - row.mv) / row.mv) >= 0 ? "text-emerald-400" : "text-destructive")}>
                              {deltaText(row.sv, row.mv)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {!bench && (
            <p className="text-[10px] text-amber-400">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              Amostra insuficiente de peers no período (n&lt;3) — sem benchmark de vertical disponível.
            </p>
          )}

          {/* BLOCK 3 — Daily Trend */}
          {dailyChart.length > 1 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Tendência diária — seller vs média da vertical
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                        tickFormatter={v => { const p = v.split("-"); return `${p[2]}/${p[1]}`; }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                        tickFormatter={v => fmtCompact(v)}
                      />
                      {/* Use dual axis if scale difference is > 10x */}
                      {(() => {
                        const maxSeller = Math.max(...dailyChart.map(d => d.seller), 1);
                        const maxVert = Math.max(...dailyChart.map(d => d.verticalAvg), 1);
                        const useDual = maxVert / maxSeller > 10 || maxSeller / maxVert > 10;
                        return useDual ? (
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                            tickFormatter={v => fmtCompact(v)}
                          />
                        ) : null;
                      })()}
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
                        labelFormatter={(l) => { const p = l.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; }}
                      />
                      <Legend formatter={v => v === "seller" ? "Seller" : "Média Vertical"} />
                      <Line yAxisId="left" type="monotone" dataKey="seller" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line
                        yAxisId={(() => {
                          const maxSeller = Math.max(...dailyChart.map(d => d.seller), 1);
                          const maxVert = Math.max(...dailyChart.map(d => d.verticalAvg), 1);
                          return (maxVert / maxSeller > 10 || maxSeller / maxVert > 10) ? "right" : "left";
                        })()}
                        type="monotone"
                        dataKey="verticalAvg"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary metrics */}
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground justify-center">
                  <span>
                    GMV médio/dia seller: <span className="text-foreground font-semibold font-mono">
                      {sellerMetrics.tgmv > 0 ? fmtCompact(sellerMetrics.tgmv / daysInPeriod) : "—"}
                    </span>
                  </span>
                  <span>|</span>
                  <span>
                    GMV médio/dia vertical: <span className="text-foreground font-semibold font-mono">
                      {bench ? fmtCompact(bench.gmv / 30) : "—"}
                    </span>
                  </span>
                  <span>|</span>
                  <span>
                    Posição: <span className="text-foreground font-semibold">
                      {rankInfo ? `${rankInfo.rank}° de ${rankInfo.total} sellers` : "—"}
                      {rankInfo && rankInfo.total > 0 && (
                        <span className="text-muted-foreground"> (Top {Math.max(1, Math.round((rankInfo.rank / rankInfo.total) * 100))}%)</span>
                      )}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BLOCK 4 — CDP Opportunity */}
          <CdpOpportunityBlock custId={seller.CUS_CUST_ID_SEL} subCategory={subCategory} rawRows={rawRows} startStr={startStr} endStr={endStr} />
        </>
      )}
    </div>
  );
}

/* ──────────── BLOCK 4 Sub-component ──────────── */

function CdpOpportunityBlock({ custId, subCategory, rawRows, startStr, endStr }: {
  custId: string; subCategory: string | null; rawRows: CppRow[]; startStr: string; endStr: string;
}) {
  // Use eligibility from raw rows if available, or show empty state
  // Since eligibility comes from a separate CSV/DB, check if we have any eligibility-like fields
  // For now, use the useEligibility hook with the custId as sellerId
  // Note: The hook expects a DB seller UUID, not cust_id. We'll pass undefined to avoid errors.
  const { data: eligData, isLoading } = useEligibility(undefined);

  // We don't have a way to map cust_id to seller UUID in this context
  // Show informative empty state
  const subBench = subCategory ? matchKey(CDP_SUBCATEGORY_BENCHMARKS, subCategory) : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Tag className="w-4 h-4" />
          Itens elegíveis ao CDP — oportunidade não capturada
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-sm text-muted-foreground py-4">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Nenhum item elegível ao CDP encontrado</p>
          <p className="text-[10px] mt-1">Carregue o arquivo de elegibilidade para visualizar oportunidades CDP</p>
        </div>

        {subBench && (
          <div className="mt-3 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
            <p>
              Na subcategoria <span className="font-semibold text-foreground">{subCategory}</span>, a média da carteira tem{" "}
              <span className="font-semibold text-foreground">{fmtNum(subBench.itens)} itens s/ optin</span>{" "}
              com <span className="font-semibold text-foreground">{subBench.sellers} sellers</span>{" "}
              e desconto sugerido médio de{" "}
              <span className="font-semibold text-foreground">{subBench.descMedio.toFixed(1)}%</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
