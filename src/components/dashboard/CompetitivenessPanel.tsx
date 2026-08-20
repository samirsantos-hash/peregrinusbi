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
import InsightsPrecificacaoPanel from "@/components/seller/InsightsPrecificacaoPanel";
import MonitoramentoPrecoPanel from "@/components/seller/MonitoramentoPrecoPanel";
import type { DadosMes } from "@/lib/queries/insightsPrecificacao";
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

  /* ── Histórico mensal para Insights de Precificação ── */
  const { historicoInsights, dadosAtualInsights } = useMemo(() => {
    const src = monthlyKpis.length > 0 ? monthlyKpis : kpis;
    const byMonth: Record<string, { match: number; cheap: number; exp: number }> = {};
    for (const k of src) {
      if (!byMonth[k.date]) byMonth[k.date] = { match: 0, cheap: 0, exp: 0 };
      byMonth[k.date].match += k.visitsMatch || 0;
      byMonth[k.date].cheap += k.visitsCheaper || 0;
      byMonth[k.date].exp += k.visitsExpensive || 0;
    }
    const historico: DadosMes[] = Object.entries(byMonth)
      .map(([mes, v]) => {
        const total = v.match + v.cheap + v.exp;
        return {
          mes,
          pctMaisBarato: total > 0 ? (v.cheap / total) * 100 : 0,
          pctEquivalente: total > 0 ? (v.match / total) * 100 : 0,
          pctMaisCaro: total > 0 ? (v.exp / total) * 100 : 0,
          totalBPC: total,
        };
      })
      .filter((m) => m.totalBPC > 0)
      .sort((a, b) => a.mes.localeCompare(b.mes));
    return {
      historicoInsights: historico,
      dadosAtualInsights: historico.length > 0 ? historico[historico.length - 1] : null,
    };
  }, [monthlyKpis, kpis]);

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
      // Lower cancellation rate = better competitiveness (invert: 0% → 100, 5% → 0)
      // repCancellationsRate vem como fração (0-1). Converter para % antes de escalar.
      const avgCancRatePct = s.qualCount > 0 ? (s.cancellationsRate / s.qualCount) * 100 : 0;
      const cancScore = Math.max(0, 100 - avgCancRatePct * 20); // 5% → 0 score
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

  // Cor dinâmica para % Mais Caro: <20 verde, 20-30 âmbar, >=30 vermelho
  const pctExpColor =
    monthlyTotals.pctExpensive >= 30
      ? "hsl(0, 84%, 60%)"
      : monthlyTotals.pctExpensive >= 20
      ? "hsl(40, 95%, 55%)"
      : "hsl(160, 84%, 39%)";
  const pctExpAlert =
    monthlyTotals.pctExpensive >= 30
      ? "⚠️ Acima de 30% — o ML começa a rebaixar o anúncio"
      : monthlyTotals.pctExpensive >= 20
      ? "→ Próximo do limite. Monitorar."
      : null;

  // Detecta ausência de concorrentes reais (1/1 sellers)
  const semConcorrentes = !bpcData || bpcData.total <= 1;

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
            color: monthlyTotals.pctExpensive < 20 ? "emerald-text" : "warning-text",
            tooltip: "% das comparações de preço onde o ML identificou que o seller estava mais caro que o rival. Acima de 30%: o algoritmo começa a rebaixar o anúncio progressivamente.",
            alert: pctExpAlert,
            inlineStyle: { color: pctExpColor },
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
              <p className={`metric-value ${m.color}`} style={(m as any).inlineStyle}>{m.value}</p>
              {sampleWarning && m.label === "% Não Competitivo" && (
                <span className="status-badge text-[10px] bg-muted/40 text-muted-foreground border-border/40">
                  {sampleWarning}
                </span>
              )}
            </div>
            {(m as any).alert && (
              <p
                className="text-[10px] mt-1.5 leading-tight font-medium"
                style={{ color: (m as any).inlineStyle?.color ?? "hsl(40, 95%, 55%)" }}
              >
                {(m as any).alert}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── BPC Indicator ── */}
      {bpcData && semConcorrentes && (
        <div className="glass-card p-5 border-dashed">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              BPC — Best Price Competitiveness
            </h3>
            <TooltipInfo text={TOOLTIP_BPC} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Nenhum concorrente direto identificado pelo ML nesta categoria/período
            ({bpcData.count}/{bpcData.total} seller). O índice BPC e o "Menor Preço
            Rival" não têm referência externa válida.
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Isso pode indicar: produto de nicho sem concorrentes diretos no catálogo ML,
            ou dados BPC ainda não disponíveis para este período.
          </p>
        </div>
      )}
      {bpcData && !semConcorrentes && (
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Índice de Competitividade de Preço
              </p>
              <p className="text-3xl font-bold font-mono" style={{ color: bpcData.median >= 0.9 ? '#1D9E75' : bpcData.median >= 0.7 ? 'hsl(175, 60%, 45%)' : bpcData.median >= 0.6 ? '#BA7517' : '#E24B4A' }}>
                {bpcData.median.toFixed(3)}
              </p>
              <p className="text-[11px] text-muted-foreground text-center leading-snug">
                = {fmtNum(monthlyTotals.indiceCompetitividade, 1)}% das comparações sem preço mais caro
                <br />
                ({fmtNum(monthlyTotals.pctMatch, 1)}% mesmo preço + {fmtNum(monthlyTotals.pctCheaper, 1)}% mais barato)
              </p>
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

      {/* ── Evolução da Competitividade de Preço — área empilhada 100% ── */}
      <PriceCompetitivenessChart
        kpis={monthlyKpis.length > 0 ? monthlyKpis : kpis}
        granularity={monthlyKpis.length > 0 ? "consolidated" : dataGranularity}
        tooltipBpc={`Faixas de preço em área empilhada 100% sobre as comparações BPC — não sobre visitas totais. ${TOOLTIP_BPC}`}
      />

      {/* ── Insights e Sugestões de Investigação ── */}
      <InsightsPrecificacaoPanel
        historico={historicoInsights}
        dadosAtual={dadosAtualInsights}
        pctOptinCDP={0}
      />

      {/* ── Planos de Ação por Segmento ── */}
      <McKinseyActionPlans
        listingsQuality={listingsQuality}
        sellerName={kpis[0]?.productName}
      />

      {/* ── Anúncios identificados com problema ── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border/60" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Anúncios identificados com problema
        </h3>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <MonitoramentoPrecoPanel sellerId={(kpis?.[0] as any)?.sellerId} />

    </motion.div>
  );
};

export default CompetitivenessPanel;
