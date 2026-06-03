import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ZAxis, ReferenceLine, Cell, LineChart, Line, Area, AreaChart,
} from "recharts";
import { TrendingDown, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import PeriodSelector from "./PeriodSelector";
import PairplotMatrix from "./PairplotMatrix";
import MultidimensionalBubbleChart from "./MultidimensionalBubbleChart";
import McKinseyActionPlans from "./McKinseyActionPlans";
import PriceAuditTable from "./PriceAuditTable";
import CompetitivenessInsights from "./CompetitivenessInsights";
import { fmtBRL, fmtBRLCompact, fmtNum, fmtNumCompact, formatChartDate } from "@/utils/formatters";
import { type ListingQuality } from "@/hooks/useListingsQuality";

const TOOLTIP_BPC = "BPC (Buy Price Competitive) é o sistema do Mercado Livre que compara automaticamente o preço do seller com o dos concorrentes quando há produtos equivalentes no catálogo. Essa comparação não ocorre em todas as visitas — apenas quando o ML identifica um rival direto. Por isso, as porcentagens de competitividade são calculadas apenas sobre as visitas onde a comparação foi ativada.";

interface KpiLike {
  date: string;
  visits: number;
  visitsExpensive: number;
  visitsMatch: number;
  visitsCheaper: number;
  minPriceRival: number;
  gmv: number;
  productName: string;
  productId: string;
  repCancellationsRate?: number;
  upliftGmvM1?: number;
  bpc?: number | null;
}

interface SellerInfo {
  id: string;
  cluster?: string;
}

interface CompetitivenessPanelProps {
  kpis: KpiLike[];
  monthlyKpis?: KpiLike[];
  sellers?: SellerInfo[];
  sellerCustIdMap?: Record<string, string>;
  listingsQuality?: ListingQuality[];
  dataGranularity?: "consolidated" | "daily";
}

/* ── Shared Tooltip ── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("pt-BR") : p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Scatter Tooltip (McKinsey) ── */
const ScatterTooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const getQuadrant = (x: number, y: number, mx: number, my: number) => {
    if (x >= mx && y >= my) return { label: "🚀 Investir Agressivamente", color: "hsl(160, 84%, 39%)" };
    if (x < mx && y >= my) return { label: "🔄 Otimizar Conversão", color: "hsl(199, 100%, 50%)" };
    if (x >= mx && y < my) return { label: "⚙ Manter Eficiência", color: "hsl(40, 95%, 55%)" };
    return { label: "⚠ Descontinuar / Liquidar", color: "hsl(0, 84%, 60%)" };
  };

  const q = getQuadrant(d.forcaCompetitiva, d.atratividade, d.medianX, d.medianY);

  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1 max-w-[240px]">
      <p className="font-semibold text-foreground truncate">Período: {d.name}</p>
      <p className="text-muted-foreground">
        % Preço Alto: <span className={d.gapPct > 30 ? "text-destructive" : "text-emerald"}>{d.gapPct.toFixed(1)}%</span>
      </p>
      <p className="text-muted-foreground">Força Competitiva: <span className="text-foreground font-mono">{d.forcaCompetitiva.toFixed(1)}</span></p>
      <p className="text-muted-foreground">Atratividade: <span className="text-foreground font-mono">{d.atratividade.toFixed(1)}</span></p>
      <p className="text-muted-foreground">GMV: <span className="text-foreground font-mono">{fmtBRL(d.gmv)}</span></p>
      <p className="mt-1 font-medium" style={{ color: q.color }}>
        Status: {q.label}
      </p>
    </div>
  );
};

const CompetitivenessPanel = ({ kpis, monthlyKpis = [], sellers = [], sellerCustIdMap = {}, listingsQuality = [], dataGranularity = "daily" }: CompetitivenessPanelProps) => {
  const [scatterPeriod, setScatterPeriod] = useState("15");
  const [bubblePeriod, setBubblePeriod] = useState("15");

  /* ── CORREÇÃO 1: Use MONTHLY KPIs for competitiveness % ── */
  // Find the latest month in monthly data
  const latestMonthlyKpis = useMemo(() => {
    if (monthlyKpis.length === 0) return [];
    const dates = [...new Set(monthlyKpis.map(k => k.date))].sort();
    const latestDate = dates[dates.length - 1];
    return monthlyKpis.filter(k => k.date === latestDate);
  }, [monthlyKpis]);

  // Competitiveness % from MONTHLY data (correct source)
  const monthlyTotals = useMemo(() => {
    const src = latestMonthlyKpis.length > 0 ? latestMonthlyKpis : kpis;
    const totalExpensive = src.reduce((s, k) => s + k.visitsExpensive, 0);
    const totalMatch = src.reduce((s, k) => s + k.visitsMatch, 0);
    const totalCheaper = src.reduce((s, k) => s + k.visitsCheaper, 0);
    const totalPriceBands = totalExpensive + totalMatch + totalCheaper;
    const totalVisitsMonthly = src.reduce((s, k) => s + (k.visits || 0), 0);
    return {
      totalExpensive, totalMatch, totalCheaper, totalPriceBands,
      totalVisitsMonthly,
      pctExpensive: totalPriceBands > 0 ? (totalExpensive / totalPriceBands) * 100 : 0,
      pctMatch: totalPriceBands > 0 ? (totalMatch / totalPriceBands) * 100 : 0,
      pctCheaper: totalPriceBands > 0 ? (totalCheaper / totalPriceBands) * 100 : 0,
      indiceCompetitividade: totalPriceBands > 0 ? ((totalMatch + totalCheaper) / totalPriceBands) * 100 : 0,
      coberturaComparacao: totalVisitsMonthly > 0 ? (totalPriceBands / totalVisitsMonthly) * 100 : 0,
    };
  }, [latestMonthlyKpis, kpis]);

  /* ── BPC from monthly data ── */
  const bpcData = useMemo(() => {
    const src = latestMonthlyKpis.length > 0 ? latestMonthlyKpis : kpis;
    const bpcValues = src.filter(k => k.bpc != null && k.bpc !== undefined).map(k => k.bpc as number);
    if (bpcValues.length === 0) return null;
    const sorted = [...bpcValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const avg = bpcValues.reduce((s, v) => s + v, 0) / bpcValues.length;
    return { median, avg, count: bpcValues.length, total: src.length };
  }, [latestMonthlyKpis, kpis]);

  /* ── MIN_PRICE_RIVAL from monthly data ── */
  const minPriceRivalData = useMemo(() => {
    const src = latestMonthlyKpis.length > 0 ? latestMonthlyKpis : kpis;
    const rivalValues = src.filter(k => k.minPriceRival > 0).map(k => k.minPriceRival);
    if (rivalValues.length === 0) return null;
    const sorted = [...rivalValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { median, count: rivalValues.length };
  }, [latestMonthlyKpis, kpis]);

  /* ── CORREÇÃO 3: Small sample detection ── */
  const sampleWarning = useMemo(() => {
    const total = monthlyTotals.totalPriceBands;
    if (total < 10000) return "Amostra pequena";
    const pctCheaper = monthlyTotals.pctCheaper;
    const pctExpensive = monthlyTotals.pctExpensive;
    if ((Math.abs(pctCheaper - 50) < 0.1 && pctExpensive < 0.1) ||
        (Math.abs(pctExpensive - 50) < 0.1 && pctCheaper < 0.1)) {
      return "Dado insuficiente — apenas 1 rival comparado";
    }
    return null;
  }, [monthlyTotals]);

  /* ── Cluster coverage warning ── */
  const clusterCoverageWarning = useMemo(() => {
    const src = latestMonthlyKpis.length > 0 ? latestMonthlyKpis : kpis;
    const totalSellers = src.length;
    const withPriceData = src.filter(k => (k.visitsMatch + k.visitsCheaper + k.visitsExpensive) > 0).length;
    if (totalSellers === 0) return null;
    const coverage = (withPriceData / totalSellers) * 100;
    if (coverage < 20) {
      return `Dado de competitividade de preço disponível para menos de 20% dos sellers deste cluster. Resultado pode não ser representativo.`;
    }
    if (coverage < 60) {
      return `Cobertura parcial: ${Math.round(coverage)}% dos sellers possuem dado de competitividade de preço.`;
    }
    return null;
  }, [latestMonthlyKpis, kpis]);

  /* ── Totals from display kpis (for visits/GMV — these can use daily) ── */
  const totalVisits = kpis.reduce((s, k) => s + k.visits, 0);
  const totalGmv = kpis.reduce((s, k) => s + k.gmv, 0);

  // Average min price rival (non-zero entries)
  const rivalEntries = kpis.filter(k => k.minPriceRival > 0);
  const avgMinPriceRival = rivalEntries.length > 0
    ? rivalEntries.reduce((s, k) => s + k.minPriceRival, 0) / rivalEntries.length
    : 0;

  /* ── Time series data by date (for charts — uses daily kpis) ── */
  const byDate = useMemo(() => {
    const map: Record<string, { date: string; visits: number; expensive: number; match: number; cheaper: number; gmv: number; minPriceRival: number; rivalCount: number }> = {};
    for (const k of kpis) {
      if (!map[k.date]) map[k.date] = { date: k.date, visits: 0, expensive: 0, match: 0, cheaper: 0, gmv: 0, minPriceRival: 0, rivalCount: 0 };
      const d = map[k.date];
      d.visits += k.visits;
      d.expensive += k.visitsExpensive;
      d.match += k.visitsMatch;
      d.cheaper += k.visitsCheaper;
      d.gmv += k.gmv;
      if (k.minPriceRival > 0) { d.minPriceRival += k.minPriceRival; d.rivalCount++; }
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [kpis]);

  /* ── Stacked bar chart data ── */
  const chartData = byDate.map((d) => ({
    date: formatChartDate(d.date, dataGranularity),
    "Preço Mais Alto": d.expensive,
    "Preço Equivalente": d.match,
    "Preço Mais Baixo": d.cheaper,
  }));

  /* ── Pricing diagnostic table data (per date) ── */
  const diagnosticRows = byDate.map((d) => {
    const totalBands = d.expensive + d.match + d.cheaper;
    const pctExp = totalBands > 0 ? (d.expensive / totalBands) * 100 : 0;
    const pctMatch = totalBands > 0 ? (d.match / totalBands) * 100 : 0;
    const pctCheap = totalBands > 0 ? (d.cheaper / totalBands) * 100 : 0;
    const avgRival = d.rivalCount > 0 ? d.minPriceRival / d.rivalCount : 0;
    return { date: d.date, visits: d.visits, expensive: d.expensive, match: d.match, cheaper: d.cheaper, pctExp, pctMatch, pctCheap, avgRival, gmv: d.gmv };
  });

  /* ── CORREÇÃO 2: Price evolution line chart — filter null visit points ── */
  const priceEvolutionData = byDate
    .filter((d) => {
      const totalBands = d.expensive + d.match + d.cheaper;
      return totalBands > 0; // Skip days with no price data
    })
    .map((d) => {
      const totalBands = d.expensive + d.match + d.cheaper;
      const pctExp = (d.expensive / totalBands) * 100;
      const pctMatch = (d.match / totalBands) * 100;
      const pctCheap = (d.cheaper / totalBands) * 100;
      const avgRival = d.rivalCount > 0 ? d.minPriceRival / d.rivalCount : 0;
      return {
        date: formatChartDate(d.date, dataGranularity),
        "% Preço Alto": Math.round(pctExp * 10) / 10,
        "% Equivalente": Math.round(pctMatch * 10) / 10,
        "% Mais Barato": Math.round(pctCheap * 10) / 10,
        "Rival Mínimo (R$)": Math.round(avgRival * 100) / 100,
      };
    });

  /* ── Scatter data (McKinsey Adapted) ── */
  const { scatterData, medianX, medianY } = useMemo(() => {
    const allDates = [...new Set(kpis.map((k) => k.date))].sort();
    const cutoffDates = scatterPeriod === "all"
      ? new Set(allDates)
      : new Set(allDates.slice(-parseInt(scatterPeriod)));

    const filtered = kpis.filter((k) => cutoffDates.has(k.date));

    // Group by date for scatter (each date is a point)
    const byDateMap: Record<string, {
      date: string; gmv: number; visits: number; visitsExpensive: number;
      visitsMatch: number; visitsCheaper: number;
      cancellationsRate: number; qualCount: number;
      upliftGmvM1: number; upliftCount: number;
    }> = {};
    for (const k of filtered as any[]) {
      if (!byDateMap[k.date]) {
        byDateMap[k.date] = {
          date: k.date, gmv: 0, visits: 0, visitsExpensive: 0,
          visitsMatch: 0, visitsCheaper: 0,
          cancellationsRate: 0, qualCount: 0,
          upliftGmvM1: 0, upliftCount: 0,
        };
      }
      const s = byDateMap[k.date];
      s.gmv += k.gmv || 0;
      s.visits += k.visits || 0;
      s.visitsExpensive += k.visitsExpensive || 0;
      s.visitsMatch += k.visitsMatch || 0;
      s.visitsCheaper += k.visitsCheaper || 0;
      if (k.repCancellationsRate !== undefined) { s.cancellationsRate += k.repCancellationsRate || 0; s.qualCount++; }
      if (k.upliftGmvM1 !== 0) { s.upliftGmvM1 += k.upliftGmvM1; s.upliftCount++; }
    }

    const entries = Object.values(byDateMap).filter((s) => s.visits > 0);

    const points = entries.map((s) => {
      const totalBands = s.visitsExpensive + s.visitsMatch + s.visitsCheaper;
      const gapPct = totalBands > 0 ? ((s.visitsExpensive / totalBands) * 100) : 0;
      const invertedGap = 100 - gapPct;
      // Lower cancellation rate = better competitiveness (invert: 0% → 100, 10% → 0)
      const avgCancRate = s.qualCount > 0 ? s.cancellationsRate / s.qualCount : 0;
      const cancScore = Math.max(0, 100 - avgCancRate * 20); // 5% → 0 score
      const forcaCompetitiva = (invertedGap * 0.5) + (cancScore * 0.5);

      const avgUplift = s.upliftCount > 0 ? s.upliftGmvM1 / s.upliftCount : 0;
      const upliftFactor = 1 + Math.max(Math.min(avgUplift, 2), -0.5);
      const atratividade = s.visits * upliftFactor;

      return {
        name: s.date,
        forcaCompetitiva: Math.round(forcaCompetitiva * 10) / 10,
        atratividade: Math.round(atratividade),
        gapPct: Math.round(gapPct * 10) / 10,
        gmv: Math.round(s.gmv),
        z: Math.max(s.gmv, 1),
        medianX: 0,
        medianY: 0,
      };
    });

    const sortedX = points.map(p => p.forcaCompetitiva).sort((a, b) => a - b);
    const sortedY = points.map(p => p.atratividade).sort((a, b) => a - b);
    const mx = sortedX.length > 0 ? sortedX[Math.floor(sortedX.length / 2)] : 50;
    const my = sortedY.length > 0 ? sortedY[Math.floor(sortedY.length / 2)] : 50;

    points.forEach(p => { p.medianX = mx; p.medianY = my; });

    return { scatterData: points, medianX: mx, medianY: my };
  }, [kpis, scatterPeriod]);

  const getBubbleColor = (x: number, y: number) => {
    if (x >= medianX && y >= medianY) return "hsl(160, 84%, 39%)";
    if (x < medianX && y >= medianY) return "hsl(199, 100%, 50%)";
    if (x >= medianX && y < medianY) return "hsl(40, 95%, 55%)";
    return "hsl(0, 84%, 60%)";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Cluster coverage warning */}
      {clusterCoverageWarning && (
        <div className="glass-card p-4 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <p className="text-xs text-warning">{clusterCoverageWarning}</p>
          </div>
        </div>
      )}

      {/* Summary Cards — uses MONTHLY % */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: "Competitividade de Preço",
            value: `${fmtNum(monthlyTotals.indiceCompetitividade, 0)}%`,
            icon: TrendingUp,
            color: monthlyTotals.indiceCompetitividade >= 70 ? "emerald-text" : monthlyTotals.indiceCompetitividade >= 50 ? "warning-text" : "warning-text",
            tooltip: `Percentual de vezes que o ML comparou seu preço com o de um rival e seu preço estava igual ou mais barato. Calculado sobre o total de comparações de preço ativadas pelo algoritmo BPC — universo diferente do total de visitas. ${TOOLTIP_BPC}`,
          },
          {
            label: "% Mais Barato (rivais)",
            value: `${fmtNum(monthlyTotals.pctCheaper, 1)}%`,
            icon: TrendingUp,
            color: "emerald-text",
            tooltip: "% das comparações de preço onde seu preço estava mais barato que o rival. Denominador = total de comparações BPC, não total de visitas.",
          },
          {
            label: "% Preço Igual (rivais)",
            value: `${fmtNum(monthlyTotals.pctMatch, 1)}%`,
            icon: DollarSign,
            color: "neon-text",
            tooltip: "% das comparações de preço onde seu preço estava no mesmo nível do rival. Denominador = total de comparações BPC.",
          },
          {
            label: "% Mais Caro (rivais)",
            value: `${fmtNum(monthlyTotals.pctExpensive, 1)}%`,
            icon: TrendingDown,
            color: monthlyTotals.pctExpensive < 20 ? "emerald-text" : monthlyTotals.pctExpensive < 35 ? "warning-text" : "warning-text",
            tooltip: "% das comparações de preço onde o ML identificou que o seller estava mais caro que o rival. Acima de 30%: o algoritmo começa a rebaixar o anúncio progressivamente.",
          },
          {
            label: "Visitas em comparação",
            value: monthlyTotals.totalPriceBands.toLocaleString("pt-BR"),
            icon: DollarSign,
            color: "neon-text",
            tooltip: `De ${monthlyTotals.totalVisitsMonthly.toLocaleString("pt-BR")} visitas totais, ${fmtNum(monthlyTotals.coberturaComparacao, 0)}% ativaram a comparação BPC. ${TOOLTIP_BPC}`,
          },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="metric-label">{m.label}</p>
              <TooltipInfo text={m.tooltip} />
            </div>
            <div className="flex items-center gap-2">
              <p className={`metric-value ${m.color}`}>{m.value}</p>
              {sampleWarning && m.label === "% Não Competitivo" && (
                <span className="status-badge text-[10px] bg-muted/40 text-muted-foreground border-border/40">
                  {sampleWarning}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── BPC Indicator ── */}
      {bpcData && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Índice de Competitividade de Preço (BPC)
            </h3>
            <TooltipInfo text={`${TOOLTIP_BPC} Escala 0,5 (menos competitivo) a 1,0 (mais competitivo). Sellers com BPC entre 0,7 e 0,8 têm o maior GMV mediano da carteira (R$183k) e conversão de 5,0%.`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* BPC Value */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/20">
              <p className="text-3xl font-bold font-mono" style={{ color: bpcData.median >= 0.9 ? '#1D9E75' : bpcData.median >= 0.7 ? 'hsl(175, 60%, 45%)' : bpcData.median >= 0.6 ? '#BA7517' : '#E24B4A' }}>
                {bpcData.median.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">Índice BPC (mediana)</p>
              <span className="status-badge text-[11px]" style={{
                backgroundColor: bpcData.median >= 0.9 ? 'rgba(29,158,117,0.1)' : bpcData.median >= 0.7 ? 'rgba(29,158,117,0.08)' : bpcData.median >= 0.6 ? 'rgba(186,117,23,0.1)' : 'rgba(226,75,74,0.1)',
                color: bpcData.median >= 0.9 ? '#1D9E75' : bpcData.median >= 0.7 ? 'hsl(175, 60%, 45%)' : bpcData.median >= 0.6 ? '#BA7517' : '#E24B4A',
                borderColor: bpcData.median >= 0.9 ? 'rgba(29,158,117,0.3)' : bpcData.median >= 0.7 ? 'rgba(29,158,117,0.2)' : bpcData.median >= 0.6 ? 'rgba(186,117,23,0.3)' : 'rgba(226,75,74,0.3)',
              }}>
                {bpcData.median >= 0.9 ? 'Altamente competitivo' : bpcData.median >= 0.7 ? 'Competitivo' : bpcData.median >= 0.6 ? 'Moderado' : 'Pouco competitivo'}
              </span>
            </div>
            {/* MIN_PRICE_RIVAL */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/20">
              <p className="text-3xl font-bold font-mono text-foreground">
                {minPriceRivalData ? fmtBRL(minPriceRivalData.median) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Menor Preço Rival (mediana)</p>
              {minPriceRivalData ? (
                <p className="text-[11px] text-muted-foreground text-center">
                  Seu preço mínimo precisa ser ≤ {fmtBRL(minPriceRivalData.median)} para liderar nessa categoria
                </p>
              ) : (
                <span className="status-badge text-[11px] bg-muted/40 text-muted-foreground border-border/40">Sem rival identificado</span>
              )}
            </div>
            {/* Coverage */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/20">
              <p className="text-3xl font-bold font-mono text-foreground">
                {bpcData.count}/{bpcData.total}
              </p>
              <p className="text-xs text-muted-foreground">Sellers com comparação ativa</p>
              <p className="text-[11px] text-muted-foreground">
                Cobertura de comparação: {Math.round((bpcData.count / bpcData.total) * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Insights Estratégicos ── */}
      <CompetitivenessInsights kpis={latestMonthlyKpis.length > 0 ? latestMonthlyKpis : kpis} />

      {/* ── Auditoria de Preço ── */}
      <PriceAuditTable kpis={kpis} sellerCustIdMap={sellerCustIdMap} />

      {/* ── Price Evolution Line Chart ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Evolução da Competitividade de Preço (%)
          </h3>
          <TooltipInfo text={`Evolução percentual das faixas de preço ao longo do tempo. % calculado sobre comparações BPC — não sobre visitas totais. Dias sem dado de preço são omitidos. ${TOOLTIP_BPC}`} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={priceEvolutionData}>
            <defs>
              <linearGradient id="gradExpensive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradMatch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradCheaper" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={30} stroke="hsl(0, 84%, 60%)" strokeDasharray="4 4" label={{ value: "alerta: >30% caro", fill: "hsl(0, 84%, 60%)", fontSize: 10, position: "right" }} />
            <Area type="monotone" dataKey="% Preço Alto" stroke="hsl(0, 84%, 60%)" fill="url(#gradExpensive)" strokeWidth={2} />
            <Area type="monotone" dataKey="% Equivalente" stroke="hsl(199, 100%, 50%)" fill="url(#gradMatch)" strokeWidth={2} />
            <Area type="monotone" dataKey="% Mais Barato" stroke="hsl(160, 84%, 39%)" fill="url(#gradCheaper)" strokeWidth={2} />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-muted-foreground mt-3">
          ℹ️ As três linhas somam sempre 100% — representam como o preço do seller se comparou com rivais nas visitas onde o ML ativou a comparação de preço (BPC). Universo separado do total de visitas.
        </p>
      </div>

      {/* ── Scatter Plot — Matriz de Elasticidade ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Matriz de Elasticidade e Competitividade
            </h3>
            <TooltipInfo text="McKinsey Adaptada. Cada ponto representa um período. Eixo X = Força Competitiva (preço invertido + qualidade). Eixo Y = Atratividade (visitas × uplift). Tamanho = GMV." />
          </div>
          <PeriodSelector value={scatterPeriod} onChange={setScatterPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart key={scatterPeriod} margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              type="number" dataKey="forcaCompetitiva" name="Força Competitiva"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
              label={{ value: "Força Competitiva →", position: "bottom", offset: 5, fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <YAxis
              type="number" dataKey="atratividade" name="Atratividade"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              label={{ value: "Atratividade ↑", angle: -90, position: "insideLeft", fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="z" range={[80, 600]} name="GMV" />
            <ReferenceLine x={medianX} stroke="hsl(215, 20%, 35%)" strokeDasharray="6 3" strokeOpacity={0.6} />
            <ReferenceLine y={medianY} stroke="hsl(215, 20%, 35%)" strokeDasharray="6 3" strokeOpacity={0.6} />
            <Tooltip content={<ScatterTooltipContent />} cursor={{ strokeDasharray: "3 3", stroke: "hsl(215, 20%, 35%)" }} />
            <Scatter name="Períodos" data={scatterData} animationDuration={800} animationEasing="ease-in-out">
              {scatterData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBubbleColor(entry.forcaCompetitiva, entry.atratividade)}
                  fillOpacity={0.75}
                  stroke={getBubbleColor(entry.forcaCompetitiva, entry.atratividade)}
                  strokeWidth={1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 mt-3 justify-center text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(160, 84%, 39%)" }} /> Investir Agressivamente</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(199, 100%, 50%)" }} /> Otimizar Conversão</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(40, 95%, 55%)" }} /> Manter Eficiência</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0, 84%, 60%)" }} /> Descontinuar / Liquidar</span>
        </div>
      </div>

      {/* ── Planos de Ação por Segmento ── */}
      <McKinseyActionPlans
        listingsQuality={listingsQuality}
        sellerName={kpis[0]?.productName}
      />

      {/* ── Diagnóstico de Preço por Período ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Diagnóstico de Preço por Período
          </h3>
          <TooltipInfo text="Análise temporal da competitividade de preço. Cada linha representa um mês/período com a distribuição percentual de visitas por faixa de preço." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Período</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Visitas</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">% Alto</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">% Equiv.</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">% Barato</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Rival Médio</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">GMV</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {diagnosticRows.map((row, idx) => (
                <motion.tr
                  key={row.date}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-2.5 px-3 font-medium font-mono">{row.date}</td>
                  <td className="text-right py-2.5 px-3 font-mono">{row.visits.toLocaleString("pt-BR")}</td>
                  <td className="text-right py-2.5 px-3 font-mono text-destructive">{fmtNum(row.pctExp, 1)}%</td>
                  <td className="text-right py-2.5 px-3 font-mono text-neon-blue">{fmtNum(row.pctMatch, 1)}%</td>
                  <td className="text-right py-2.5 px-3 font-mono text-emerald">{fmtNum(row.pctCheap, 1)}%</td>
                  <td className="text-right py-2.5 px-3 font-mono">{fmtBRL(row.avgRival)}</td>
                  <td className="text-right py-2.5 px-3 font-mono">{fmtBRL(row.gmv)}</td>
                  <td className="text-center py-2.5 px-3">
                    <span className={`status-badge text-[11px] ${
                      row.pctExp > 30 ? "bg-destructive/10 text-destructive border-destructive/20" :
                      row.pctExp > 15 ? "bg-warning/10 text-warning border-warning/20" :
                      "bg-emerald/10 text-emerald border-emerald/20"
                    }`}>
                      {row.pctExp > 30 ? "⚠ Caro" : row.pctExp > 15 ? "Atenção" : "✓ Competitivo"}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {diagnosticRows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Sem dados de competitividade no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Distribuição de Visitas por Competitividade de Preço
          </h3>
          <TooltipInfo text="Visitas agrupadas pela posição de preço em relação aos concorrentes ao longo do tempo." />
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Preço Mais Alto" stackId="a" fill="hsl(0, 84%, 60%)" />
            <Bar dataKey="Preço Equivalente" stackId="a" fill="hsl(199, 100%, 50%)" />
            <Bar dataKey="Preço Mais Baixo" stackId="a" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Pairplot Matrix ── */}
      {(() => {
        const pairplotData = byDate.map(d => ({
          visits: d.visits,
          minPriceRival: d.rivalCount > 0 ? d.minPriceRival / d.rivalCount : 0,
          visitsExpensive: d.visits > 0 ? (d.expensive / d.visits) * 100 : 0,
          visitsCheaper: d.visits > 0 ? (d.cheaper / d.visits) * 100 : 0,
          gmv: d.gmv,
        }));
        return (
          <PairplotMatrix
            data={pairplotData}
            variables={[
              { key: "minPriceRival", label: "Preço Rival Mínimo", shortLabel: "Preço Rival" },
              { key: "visitsExpensive", label: "% Visitas c/ Preço Alto", shortLabel: "% Preço Alto" },
              { key: "visitsCheaper", label: "% Visitas c/ Preço Baixo", shortLabel: "% Preço Baixo" },
              { key: "visits", label: "Visitas Totais", shortLabel: "Visitas" },
            ]}
            resultVar={{ key: "gmv", label: "GMV (Faturamento)", shortLabel: "GMV" }}
          />
        );
      })()}

      {/* ── Multidimensional Bubble Chart ── */}
      {(() => {
        const allDates = [...new Set(kpis.map(k => k.date))].sort();
        const cutoff = bubblePeriod === "all"
          ? new Set(allDates)
          : new Set(allDates.slice(-parseInt(bubblePeriod)));
        const filtered = kpis.filter(k => cutoff.has(k.date));

        // Group by date for bubble chart
        const byDateBubble: Record<string, { date: string; visits: number; gmv: number; minPriceRival: number; count: number; visitsExpensive: number }> = {};
        for (const k of filtered) {
          if (!byDateBubble[k.date]) byDateBubble[k.date] = { date: k.date, visits: 0, gmv: 0, minPriceRival: 0, count: 0, visitsExpensive: 0 };
          const s = byDateBubble[k.date];
          s.visits += k.visits;
          s.gmv += k.gmv;
          s.visitsExpensive += k.visitsExpensive;
          if (k.minPriceRival > 0) { s.minPriceRival += k.minPriceRival; s.count++; }
        }

        const bubbleData = Object.values(byDateBubble).map(s => ({
          name: s.date,
          visits: s.visits,
          gmv: s.gmv,
          avgRivalPrice: s.count > 0 ? s.minPriceRival / s.count : 0,
          visitsExpensive: s.visitsExpensive,
          cluster: "Seller",
        }));

        return (
          <MultidimensionalBubbleChart
            data={bubbleData}
            xVar={{ key: "visits", label: "Visitas" }}
            yVar={{ key: "gmv", label: "GMV (R$)" }}
            colorVar={{ key: "visitsExpensive", label: "Visitas c/ Preço Alto" }}
            sizeVar={{ key: "avgRivalPrice", label: "Preço Rival Médio" }}
            nameKey="name"
            period={bubblePeriod}
            onPeriodChange={setBubblePeriod}
            facetKey="cluster"
            facetLabel="Período"
            sellerCustIdMap={sellerCustIdMap}
          />
        );
      })()}
    </motion.div>
  );
};

export default CompetitivenessPanel;
