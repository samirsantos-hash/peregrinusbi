import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TrendingUp, TrendingDown, BarChart3, Users, Target } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { type CppRow, parseBrNumber, cleanCustId } from "@/utils/cppAggregation";

// Fallback benchmarks by DOM1
const DOM1_BENCHMARKS: Record<string, { n: number; gmv: number; roas: number; conv: number }> = {
  "ACC CARS & VANS": { n: 209, gmv: 47777, roas: 8.6, conv: 3.4 },
  "OILS & FILTERS": { n: 147, gmv: 35005, roas: 7.7, conv: 3.2 },
  "CONSTRUCTION": { n: 166, gmv: 64322, roas: 8.7, conv: 3.5 },
  "ACC MOTORCYCLES": { n: 111, gmv: 58231, roas: 9.3, conv: 3.6 },
  "ACC COMMERCIAL VEHICLES": { n: 98, gmv: 58348, roas: 8.2, conv: 3.2 },
  "HOUSEHOLD ITEMS": { n: 72, gmv: 128696, roas: 9.6, conv: 4.6 },
  "INDUSTRY": { n: 86, gmv: 88990, roas: 9.4, conv: 3.5 },
  "FURNITURE": { n: 43, gmv: 241294, roas: 9.3, conv: 3.1 },
  "AUDIO & GENERAL": { n: 68, gmv: 76848, roas: 9.5, conv: 3.4 },
  "IT PERIPHERALS": { n: 64, gmv: 72095, roas: 9.1, conv: 3.0 },
  "STATIONERY": { n: 121, gmv: 58465, roas: 7.8, conv: 3.5 },
  "TOOLS": { n: 105, gmv: 58972, roas: 8.4, conv: 3.4 },
  "HEALTH GOODS": { n: 37, gmv: 175208, roas: 9.0, conv: 4.3 },
  "BEAUTY PERSONAL CARE": { n: 8, gmv: 320212, roas: 20.1, conv: 6.0 },
};

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

function fmtPctDelta(seller: number, bench: number): { text: string; positive: boolean } {
  if (bench === 0) return { text: "—", positive: true };
  const delta = ((seller - bench) / bench) * 100;
  return {
    text: `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%`,
    positive: delta >= 0,
  };
}

interface Props {
  seller: { CUS_CUST_ID_SEL: string; CUS_NICKNAME: string };
  rawRows: CppRow[];
  startDate: string;
  endDate: string;
}

interface CategoryInfo {
  dom1: string;
  itens: number;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-2 text-xs space-y-1 shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {fmtCompact(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function CppCategoryChart({ seller, rawRows, startDate, endDate }: Props) {
  const custId = seller.CUS_CUST_ID_SEL;

  // STEP 1: Detect seller's active categories from TOTAL_LIVELISTINGS
  const categories = useMemo((): CategoryInfo[] => {
    const sellerRows = rawRows.filter(r => cleanCustId(r["CUS_CUST_ID_SEL"]) === custId);
    const catMap = new Map<string, number>();
    for (const r of sellerRows) {
      const dom1 = String(r["DOM_DOMAIN_AGG1"] || r["dom_domain_agg1"] || "").trim();
      if (!dom1) continue;
      const itens = parseBrNumber(r["TOTAL_LIVELISTINGS"]);
      catMap.set(dom1, (catMap.get(dom1) || 0) + itens);
    }
    return Array.from(catMap.entries())
      .filter(([, v]) => v > 0)
      .map(([dom1, itens]) => ({ dom1, itens: Math.round(itens) }))
      .sort((a, b) => b.itens - a.itens);
  }, [rawRows, custId]);

  const [selectedCat, setSelectedCat] = useState<string>("");

  // Auto-select first category
  const activeCat = selectedCat || (categories[0]?.dom1 || "");

  // STEP 2: Peers = sellers that also have this DOM1
  const peerCustIds = useMemo(() => {
    if (!activeCat) return new Set<string>();
    const peers = new Set<string>();
    for (const r of rawRows) {
      const dom1 = String(r["DOM_DOMAIN_AGG1"] || r["dom_domain_agg1"] || "").trim();
      if (dom1 !== activeCat) continue;
      const id = cleanCustId(r["CUS_CUST_ID_SEL"]);
      if (id && id !== custId) peers.add(id);
    }
    return peers;
  }, [rawRows, activeCat, custId]);

  // STEP 3: Daily data for chart
  const chartData = useMemo(() => {
    if (!activeCat) return [];

    // Seller daily GMV
    const sellerDaily = new Map<string, number>();
    const peerDaily = new Map<string, number[]>();

    for (const r of rawRows) {
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      if (!d || d < startDate || d > endDate) continue;
      const id = cleanCustId(r["CUS_CUST_ID_SEL"]);
      const tgmv = parseBrNumber(r["TGMV_LC"]);

      if (id === custId) {
        sellerDaily.set(d, (sellerDaily.get(d) || 0) + tgmv);
      } else if (peerCustIds.has(id)) {
        if (!peerDaily.has(d)) peerDaily.set(d, []);
        // Accumulate per peer per day
        const peerDayMap = new Map<string, number>();
        // Actually we need to aggregate per peer first then median
        // This simplified approach: accumulate all peer tgmv values per day
      }
    }

    // Better approach: aggregate per peer per day, then median
    const peerDayAgg = new Map<string, Map<string, number>>(); // date -> peer -> tgmv
    for (const r of rawRows) {
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      if (!d || d < startDate || d > endDate) continue;
      const id = cleanCustId(r["CUS_CUST_ID_SEL"]);
      if (!peerCustIds.has(id)) continue;
      const tgmv = parseBrNumber(r["TGMV_LC"]);
      if (!peerDayAgg.has(d)) peerDayAgg.set(d, new Map());
      const dayMap = peerDayAgg.get(d)!;
      dayMap.set(id, (dayMap.get(id) || 0) + tgmv);
    }

    // Collect all dates
    const allDates = new Set([...sellerDaily.keys(), ...peerDayAgg.keys()]);
    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map(d => {
      const sellerGmv = sellerDaily.get(d) || 0;
      const peerValues = peerDayAgg.has(d) ? Array.from(peerDayAgg.get(d)!.values()) : [];
      const medianGmv = median(peerValues);
      return {
        date: `${d.slice(8, 10)}/${d.slice(5, 7)}`,
        rawDate: d,
        sellerGmv,
        medianGmv,
      };
    });
  }, [rawRows, activeCat, custId, peerCustIds, startDate, endDate]);

  // Aggregated comparison metrics (using monthly-like sum for the period)
  const comparisonMetrics = useMemo(() => {
    if (!activeCat) return null;

    // Seller totals
    let sellerTgmv = 0, sellerInv = 0, sellerTgmvPads = 0, sellerTsi = 0, sellerVisitas = 0;
    const peerTotals = new Map<string, { tgmv: number; inv: number; tgmvPads: number; tsi: number; visitas: number }>();

    for (const r of rawRows) {
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      if (!d || d < startDate || d > endDate) continue;
      const id = cleanCustId(r["CUS_CUST_ID_SEL"]);

      if (id === custId) {
        sellerTgmv += parseBrNumber(r["TGMV_LC"]);
        sellerInv += parseBrNumber(r["INV_PADS"]);
        sellerTgmvPads += parseBrNumber(r["TGMV_LC_PADS"]);
        sellerTsi += parseBrNumber(r["TSI"]);
        sellerVisitas += parseBrNumber(r["VISITAS"]);
      } else if (peerCustIds.has(id)) {
        if (!peerTotals.has(id)) peerTotals.set(id, { tgmv: 0, inv: 0, tgmvPads: 0, tsi: 0, visitas: 0 });
        const p = peerTotals.get(id)!;
        p.tgmv += parseBrNumber(r["TGMV_LC"]);
        p.inv += parseBrNumber(r["INV_PADS"]);
        p.tgmvPads += parseBrNumber(r["TGMV_LC_PADS"]);
        p.tsi += parseBrNumber(r["TSI"]);
        p.visitas += parseBrNumber(r["VISITAS"]);
      }
    }

    const peers = Array.from(peerTotals.values());
    const gmvMedian = peers.length > 0 ? median(peers.map(p => p.tgmv)) : (DOM1_BENCHMARKS[activeCat]?.gmv || 0);
    const roasValues = peers.filter(p => p.inv > 0).map(p => p.tgmvPads / p.inv);
    const roasMedian = roasValues.length > 0 ? median(roasValues) : (DOM1_BENCHMARKS[activeCat]?.roas || 0);
    const convValues = peers.filter(p => p.visitas > 0).map(p => (p.tsi / p.visitas) * 100);
    const convMedian = convValues.length > 0 ? median(convValues) : (DOM1_BENCHMARKS[activeCat]?.conv || 0);

    const sellerRoas = sellerInv > 0 ? sellerTgmvPads / sellerInv : 0;
    const sellerConv = sellerVisitas > 0 ? (sellerTsi / sellerVisitas) * 100 : 0;

    // Position
    const allGmvs = [...peers.map(p => p.tgmv), sellerTgmv].sort((a, b) => b - a);
    const position = allGmvs.indexOf(sellerTgmv) + 1;
    const totalPeers = allGmvs.length;

    return {
      sellerGmv: sellerTgmv,
      medianGmv: gmvMedian,
      sellerRoas,
      medianRoas: roasMedian,
      sellerConv,
      medianConv: convMedian,
      position,
      totalPeers,
      peerCount: peers.length,
    };
  }, [rawRows, activeCat, custId, peerCustIds, startDate, endDate]);

  if (categories.length === 0) return null;

  // Check if we need dual Y axis (>10x difference)
  const maxSeller = Math.max(...chartData.map(d => d.sellerGmv), 1);
  const maxMedian = Math.max(...chartData.map(d => d.medianGmv), 1);
  const needsDualAxis = maxSeller > 0 && maxMedian > 0 && (maxSeller / maxMedian > 10 || maxMedian / maxSeller > 10);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Seller vs Categoria
          </h3>
          <TooltipInfo text="Compara o GMV total do seller com a mediana dos peers que operam na mesma categoria (DOM_DOMAIN_AGG1)." />
          {comparisonMetrics && (
            <Badge variant="outline" className="text-[10px] ml-auto">
              {comparisonMetrics.peerCount} peers em {activeCat}
            </Badge>
          )}
        </div>

        {/* Category pills */}
        <ToggleGroup
          type="single"
          value={activeCat}
          onValueChange={(v) => { if (v) setSelectedCat(v); }}
          className="flex flex-wrap gap-1"
        >
          {categories.slice(0, 10).map(c => (
            <ToggleGroupItem
              key={c.dom1}
              value={c.dom1}
              className="text-[10px] px-2.5 py-1 h-6 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400 data-[state=on]:border-emerald-500/30 rounded-full border border-border/50"
            >
              {c.dom1.length > 22 ? c.dom1.slice(0, 20) + "…" : c.dom1}
              <span className="ml-1 opacity-60">({c.itens})</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickFormatter={(v) => fmtCompact(v)}
                />
                {needsDualAxis && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                    tickFormatter={(v) => fmtCompact(v)}
                  />
                )}
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sellerGmv"
                  name="Este seller"
                  stroke="#1D9E75"
                  strokeWidth={2.5}
                  dot={chartData.length <= 7 ? { r: 4 } : false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId={needsDualAxis ? "right" : "left"}
                  type="monotone"
                  dataKey="medianGmv"
                  name={`Mediana ${activeCat.length > 20 ? activeCat.slice(0, 18) + "…" : activeCat}`}
                  stroke="#E24B4A"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparison cards */}
        {comparisonMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(() => {
              const m = comparisonMetrics;
              const gmvDelta = fmtPctDelta(m.sellerGmv, m.medianGmv);
              const roasDelta = fmtPctDelta(m.sellerRoas, m.medianRoas);
              const convDelta = fmtPctDelta(m.sellerConv, m.medianConv);
              return [
                {
                  label: "GMV",
                  seller: fmtCompact(m.sellerGmv),
                  bench: fmtCompact(m.medianGmv),
                  delta: gmvDelta,
                },
                {
                  label: "ROAS",
                  seller: `${m.sellerRoas.toFixed(1)}x`,
                  bench: `${m.medianRoas.toFixed(1)}x`,
                  delta: roasDelta,
                },
                {
                  label: "Conversão",
                  seller: `${m.sellerConv.toFixed(1)}%`,
                  bench: `${m.medianConv.toFixed(1)}%`,
                  delta: convDelta,
                },
                {
                  label: "Posição",
                  seller: `${m.position}º`,
                  bench: `de ${m.totalPeers}`,
                  delta: { text: `Top ${Math.round((1 - (m.position - 1) / Math.max(m.totalPeers - 1, 1)) * 100)}%`, positive: m.position <= Math.ceil(m.totalPeers * 0.5) },
                },
              ].map((card) => (
                <div key={card.label} className="rounded-lg border border-border/50 bg-card/60 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{card.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold font-mono text-foreground">{card.seller}</span>
                    <span className="text-[10px] text-muted-foreground">vs {card.bench}</span>
                  </div>
                  <span className={`text-[10px] font-semibold ${card.delta.positive ? "text-emerald-400" : "text-destructive"}`}>
                    {card.delta.text}
                  </span>
                </div>
              ));
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
