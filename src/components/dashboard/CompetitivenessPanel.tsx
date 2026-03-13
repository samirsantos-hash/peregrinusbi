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
import { fmtBRL, fmtBRLCompact, fmtNum, fmtNumCompact } from "@/utils/formatters";
import { type ListingQuality } from "@/hooks/useListingsQuality";

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
}

interface SellerInfo {
  id: string;
  cluster?: string;
}

interface CompetitivenessPanelProps {
  kpis: KpiLike[];
  sellers?: SellerInfo[];
  sellerCustIdMap?: Record<string, string>;
  listingsQuality?: ListingQuality[];
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

const CompetitivenessPanel = ({ kpis, sellers = [], sellerCustIdMap = {}, listingsQuality = [] }: CompetitivenessPanelProps) => {
  const [scatterPeriod, setScatterPeriod] = useState("15");
  const [bubblePeriod, setBubblePeriod] = useState("15");

  /* ── Aggregate totals across all dates ── */
  // NOTE: visitsExpensive, visitsMatch, visitsCheaper are MONETARY values (R$), not counts
  const totalVisits = kpis.reduce((s, k) => s + k.visits, 0);
  const totalExpensive = kpis.reduce((s, k) => s + k.visitsExpensive, 0);
  const totalMatch = kpis.reduce((s, k) => s + k.visitsMatch, 0);
  const totalCheaper = kpis.reduce((s, k) => s + k.visitsCheaper, 0);
  const totalPriceBands = totalExpensive + totalMatch + totalCheaper;
  const pctExpensive = totalPriceBands > 0 ? (totalExpensive / totalPriceBands) * 100 : 0;
  const totalGmv = kpis.reduce((s, k) => s + k.gmv, 0);

  // Average min price rival (non-zero entries)
  const rivalEntries = kpis.filter(k => k.minPriceRival > 0);
  const avgMinPriceRival = rivalEntries.length > 0
    ? rivalEntries.reduce((s, k) => s + k.minPriceRival, 0) / rivalEntries.length
    : 0;

  /* ── Time series data by date ── */
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
    date: d.date.slice(5),
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

  /* ── Price evolution line chart ── */
  const priceEvolutionData = byDate.map((d) => {
    const totalBands = d.expensive + d.match + d.cheaper;
    const pctExp = totalBands > 0 ? (d.expensive / totalBands) * 100 : 0;
    const pctMatch = totalBands > 0 ? (d.match / totalBands) * 100 : 0;
    const pctCheap = totalBands > 0 ? (d.cheaper / totalBands) * 100 : 0;
    const avgRival = d.rivalCount > 0 ? d.minPriceRival / d.rivalCount : 0;
    return {
      date: d.date.slice(5),
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
          scoreQualidade: 0, qualCount: 0,
          upliftGmvM1: 0, upliftCount: 0,
        };
      }
      const s = byDateMap[k.date];
      s.gmv += k.gmv || 0;
      s.visits += k.visits || 0;
      s.visitsExpensive += k.visitsExpensive || 0;
      s.visitsMatch += k.visitsMatch || 0;
      s.visitsCheaper += k.visitsCheaper || 0;
      if (k.scoreQualidade > 0) { s.scoreQualidade += k.scoreQualidade; s.qualCount++; }
      if (k.upliftGmvM1 !== 0) { s.upliftGmvM1 += k.upliftGmvM1; s.upliftCount++; }
    }

    const entries = Object.values(byDateMap).filter((s) => s.visits > 0);

    const points = entries.map((s) => {
      const totalBands = s.visitsExpensive + s.visitsMatch + s.visitsCheaper;
      const gapPct = totalBands > 0 ? ((s.visitsExpensive / totalBands) * 100) : 0;
      const invertedGap = 100 - gapPct;
      const avgQualidade = s.qualCount > 0 ? s.scoreQualidade / s.qualCount : 50;
      const forcaCompetitiva = (invertedGap * 0.5) + (avgQualidade * 0.5);

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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Visitas", value: fmtNumCompact(totalVisits), icon: TrendingUp, color: "neon-text", tooltip: "Total de visitas nos anúncios do seller no período selecionado." },
          { label: "Receita c/ Preço Alto", value: fmtBRLCompact(totalExpensive), icon: AlertTriangle, color: "text-destructive", tooltip: "Receita (R$) em visitas onde seu preço era maior que o concorrente." },
          { label: "% Não Competitivo", value: `${fmtNum(pctExpensive, 1)}%`, icon: TrendingDown, color: pctExpensive > 30 ? "warning-text" : "emerald-text", tooltip: "Proporção de visitas onde seu preço era mais caro. Acima de 30% é crítico." },
          { label: "Preço Rival Médio", value: fmtBRL(avgMinPriceRival), icon: DollarSign, color: "neon-text", tooltip: "Média do menor preço encontrado entre concorrentes no período." },
          { label: "GMV Total", value: fmtBRLCompact(totalGmv), icon: TrendingUp, color: "neon-text", tooltip: "Faturamento total no período analisado." },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="metric-label">{m.label}</p>
              <TooltipInfo text={m.tooltip} />
            </div>
            <p className={`metric-value ${m.color}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Price Evolution Line Chart ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Evolução da Competitividade de Preço (%)
          </h3>
          <TooltipInfo text="Evolução percentual das faixas de preço ao longo do tempo. Mostra como a distribuição de visitas por competitividade muda mês a mês." />
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
            <Area type="monotone" dataKey="% Preço Alto" stroke="hsl(0, 84%, 60%)" fill="url(#gradExpensive)" strokeWidth={2} />
            <Area type="monotone" dataKey="% Equivalente" stroke="hsl(199, 100%, 50%)" fill="url(#gradMatch)" strokeWidth={2} />
            <Area type="monotone" dataKey="% Mais Barato" stroke="hsl(160, 84%, 39%)" fill="url(#gradCheaper)" strokeWidth={2} />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
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
