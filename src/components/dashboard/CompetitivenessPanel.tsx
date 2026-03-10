import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ZAxis, ReferenceLine, Cell,
} from "recharts";
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import PeriodSelector from "./PeriodSelector";

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
}

interface CompetitivenessPanelProps {
  kpis: KpiLike[];
}

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
      <p className="font-semibold text-foreground truncate">Produto: {d.name}</p>
      <p className="text-muted-foreground">
        Gap vs Rival: <span className={d.gapPct > 0 ? "text-destructive" : "text-emerald"}>{d.gapPct > 0 ? "+" : ""}{d.gapPct.toFixed(1)}%</span>
      </p>
      <p className="text-muted-foreground">Força Competitiva: <span className="text-foreground font-mono">{d.forcaCompetitiva.toFixed(1)}</span></p>
      <p className="text-muted-foreground">Atratividade: <span className="text-foreground font-mono">{d.atratividade.toFixed(1)}</span></p>
      <p className="text-muted-foreground">GMV: <span className="text-foreground font-mono">R$ {d.gmv.toLocaleString("pt-BR")}</span></p>
      <p className="mt-1 font-medium" style={{ color: q.color }}>
        Status: {q.label}
      </p>
    </div>
  );
};

/* ── Quadrant background (McKinsey) ── */
const QuadrantBackground = ({ xAxisMap, yAxisMap, medianX, medianY }: any) => {
  const xAxis = xAxisMap && Object.values(xAxisMap)[0] as any;
  const yAxis = yAxisMap && Object.values(yAxisMap)[0] as any;
  if (!xAxis || !yAxis) return null;

  const cx = xAxis.scale(medianX ?? 50);
  const cy = yAxis.scale(medianY ?? 50);
  const left = xAxis.x;
  const right = xAxis.x + xAxis.width;
  const top = yAxis.y;
  const bottom = yAxis.y + yAxis.height;

  return (
    <g>
      {/* Top-Right: Investir Agressivamente (Verde) */}
      <rect x={cx} y={top} width={right - cx} height={cy - top} fill="hsl(160, 84%, 39%)" fillOpacity={0.05} />
      <text x={right - 8} y={top + 16} fill="hsl(160, 84%, 39%)" fontSize={10} opacity={0.7} textAnchor="end">Investir Agressivamente</text>

      {/* Top-Left: Otimizar Conversão (Azul) */}
      <rect x={left} y={top} width={cx - left} height={cy - top} fill="hsl(199, 100%, 50%)" fillOpacity={0.05} />
      <text x={left + 8} y={top + 16} fill="hsl(199, 100%, 50%)" fontSize={10} opacity={0.7}>Otimizar Conversão</text>

      {/* Bottom-Right: Manter Eficiência (Amarelo) */}
      <rect x={cx} y={cy} width={right - cx} height={bottom - cy} fill="hsl(40, 95%, 55%)" fillOpacity={0.05} />
      <text x={right - 8} y={bottom - 8} fill="hsl(40, 95%, 55%)" fontSize={10} opacity={0.7} textAnchor="end">Manter Eficiência</text>

      {/* Bottom-Left: Descontinuar / Liquidar (Vermelho) */}
      <rect x={left} y={cy} width={cx - left} height={bottom - cy} fill="hsl(0, 84%, 60%)" fillOpacity={0.05} />
      <text x={left + 8} y={bottom - 8} fill="hsl(0, 84%, 60%)" fontSize={10} opacity={0.7}>Descontinuar / Liquidar</text>
    </g>
  );
};

const CompetitivenessPanel = ({ kpis }: CompetitivenessPanelProps) => {
  const [scatterPeriod, setScatterPeriod] = useState("15");

  const latestByProduct = kpis.reduce<Record<string, KpiLike>>((acc, k) => {
    if (!acc[k.productId] || k.date > acc[k.productId].date) acc[k.productId] = k;
    return acc;
  }, {});

  const products = Object.values(latestByProduct);

  const totalVisits = products.reduce((s, p) => s + p.visits, 0);
  const totalExpensive = products.reduce((s, p) => s + p.visitsExpensive, 0);
  const totalMatch = products.reduce((s, p) => s + p.visitsMatch, 0);
  const totalCheaper = products.reduce((s, p) => s + p.visitsCheaper, 0);
  const pctExpensive = totalVisits > 0 ? (totalExpensive / totalVisits) * 100 : 0;

  const byDate = kpis.reduce<Record<string, { date: string; visits: number; expensive: number; match: number; cheaper: number }>>((acc, k) => {
    if (!acc[k.date]) acc[k.date] = { date: k.date, visits: 0, expensive: 0, match: 0, cheaper: 0 };
    acc[k.date].visits += k.visits;
    acc[k.date].expensive += k.visitsExpensive;
    acc[k.date].match += k.visitsMatch;
    acc[k.date].cheaper += k.visitsCheaper;
    return acc;
  }, {});

  const chartData = Object.values(byDate)
    .map((d) => ({
      date: d.date.slice(5),
      "Preço Mais Alto": d.expensive,
      "Preço Equivalente": d.match,
      "Preço Mais Baixo": d.cheaper,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  /* ── Scatter data (McKinsey Adapted) ── */
  const { scatterData, medianX, medianY } = useMemo(() => {
    const days = parseInt(scatterPeriod);
    const allDates = [...new Set(kpis.map((k: any) => k.date))].sort();
    const cutoffDates = new Set(allDates.slice(-days));

    const filtered = kpis.filter((k: any) => cutoffDates.has(k.date));

    // Aggregate per seller/period
    const bySeller: Record<string, {
      name: string; gmv: number; visits: number; visitsExpensive: number;
      minPriceRival: number; count: number; scoreQualidade: number;
      upliftGmvM1: number; upliftCount: number;
    }> = {};
    for (const k of filtered as any[]) {
      if (!bySeller[k.productId]) {
        bySeller[k.productId] = {
          name: k.productName, gmv: 0, visits: 0, visitsExpensive: 0,
          minPriceRival: 0, count: 0, scoreQualidade: 0,
          upliftGmvM1: 0, upliftCount: 0,
        };
      }
      const s = bySeller[k.productId];
      s.gmv += k.gmv || 0;
      s.visits += k.visits || 0;
      s.visitsExpensive += k.visitsExpensive || 0;
      if (k.minPriceRival > 0) {
        s.minPriceRival += k.minPriceRival;
        s.count++;
      }
      if (k.scoreQualidade > 0) {
        s.scoreQualidade += k.scoreQualidade;
      }
      if (k.upliftGmvM1 !== 0) {
        s.upliftGmvM1 += k.upliftGmvM1;
        s.upliftCount++;
      }
    }

    const entries = Object.values(bySeller).filter((s) => s.visits > 0);

    const points = entries.map((s) => {
      // Eixo X: Força Competitiva = invertedGap + scoreQualidade
      const gapPct = s.visits > 0 ? ((s.visitsExpensive / s.visits) * 100) : 0;
      const invertedGap = 100 - gapPct; // Higher = more competitive price
      const avgQualidade = s.count > 0 ? s.scoreQualidade / Math.max(s.count, 1) : s.scoreQualidade;
      const forcaCompetitiva = (invertedGap * 0.5) + (avgQualidade * 0.5);

      // Eixo Y: Atratividade = visits normalized by uplift
      const avgUplift = s.upliftCount > 0 ? s.upliftGmvM1 / s.upliftCount : 0;
      const upliftFactor = 1 + Math.max(Math.min(avgUplift, 2), -0.5); // clamp
      const atratividade = s.visits * upliftFactor;

      return {
        name: s.name,
        forcaCompetitiva: Math.round(forcaCompetitiva * 10) / 10,
        atratividade: Math.round(atratividade),
        gapPct: Math.round(gapPct * 10) / 10,
        gmv: Math.round(s.gmv),
        z: Math.max(s.gmv, 1),
        medianX: 0, // placeholder, filled below
        medianY: 0,
      };
    });

    // Calculate medians for quadrant lines
    const sortedX = points.map(p => p.forcaCompetitiva).sort((a, b) => a - b);
    const sortedY = points.map(p => p.atratividade).sort((a, b) => a - b);
    const mx = sortedX.length > 0 ? sortedX[Math.floor(sortedX.length / 2)] : 50;
    const my = sortedY.length > 0 ? sortedY[Math.floor(sortedY.length / 2)] : 50;

    points.forEach(p => { p.medianX = mx; p.medianY = my; });

    return { scatterData: points, medianX: mx, medianY: my };
  }, [kpis, scatterPeriod]);

  const getBubbleColor = (x: number, y: number) => {
    if (x >= medianX && y >= medianY) return "hsl(160, 84%, 39%)"; // Investir
    if (x < medianX && y >= medianY) return "hsl(199, 100%, 50%)"; // Otimizar
    if (x >= medianX && y < medianY) return "hsl(40, 95%, 55%)"; // Manter
    return "hsl(0, 84%, 60%)"; // Descontinuar
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Visitas", value: totalVisits.toLocaleString(), icon: TrendingUp, color: "neon-text", tooltip: "Total de visitas nos anúncios do seller no período." },
          { label: "Visitas c/ Preço Alto", value: totalExpensive.toLocaleString(), icon: AlertTriangle, color: "text-destructive", tooltip: "Visitas onde seu preço era maior que o concorrente mais barato." },
          { label: "% Preço Não Competitivo", value: `${pctExpensive.toFixed(1)}%`, icon: TrendingDown, color: pctExpensive > 30 ? "warning-text" : "emerald-text", tooltip: "Proporção de visitas onde seu preço era mais caro. Acima de 30% é crítico." },
          { label: "Preço Rival Mínimo", value: `R$ ${(products[0]?.minPriceRival || 0).toFixed(2)}`, icon: TrendingDown, color: "neon-text", tooltip: "Menor preço encontrado entre seus concorrentes diretos." },
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

      {/* ── Scatter Plot — Matriz de Elasticidade ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Matriz de Elasticidade e Competitividade
            </h3>
            <TooltipInfo text="McKinsey Adaptada. Eixo X = Força Competitiva (preço invertido + qualidade). Eixo Y = Atratividade (visitas × uplift). Tamanho = GMV." />
          </div>
          <PeriodSelector value={scatterPeriod} onChange={setScatterPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart key={scatterPeriod} margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              type="number"
              dataKey="forcaCompetitiva"
              name="Força Competitiva"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
              label={{ value: "Força Competitiva →", position: "bottom", offset: 5, fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <YAxis
              type="number"
              dataKey="atratividade"
              name="Atratividade"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              label={{ value: "Atratividade ↑", angle: -90, position: "insideLeft", fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="z" range={[80, 600]} name="GMV" />
            <ReferenceLine
              x={medianX}
              stroke="hsl(215, 20%, 35%)"
              strokeDasharray="6 3"
              strokeOpacity={0.6}
            />
            <ReferenceLine
              y={medianY}
              stroke="hsl(215, 20%, 35%)"
              strokeDasharray="6 3"
              strokeOpacity={0.6}
            />
            <Tooltip content={<ScatterTooltipContent />} cursor={{ strokeDasharray: "3 3", stroke: "hsl(215, 20%, 35%)" }} />
            <Scatter
              name="Sellers"
              data={scatterData}
              animationDuration={800}
              animationEasing="ease-in-out"
            >
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
        {/* Quadrant legend */}
        <div className="flex flex-wrap gap-4 mt-3 justify-center text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(160, 84%, 39%)" }} /> Investir Agressivamente</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(199, 100%, 50%)" }} /> Otimizar Conversão</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(40, 95%, 55%)" }} /> Manter Eficiência</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0, 84%, 60%)" }} /> Descontinuar / Liquidar</span>
        </div>
      </div>

      {/* Pricing table */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Diagnóstico de Preço por Seller
          </h3>
          <TooltipInfo text="Análise comparativa usando MIN_PRICE_RIVAL e a distribuição de visitas por faixa de preço." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Usuário / Loja</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Visitas</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Preço Alto</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Equiv.</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Mais Barato</th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Rival Min</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const pctExp = p.visits > 0 ? (p.visitsExpensive / p.visits) * 100 : 0;
                return (
                  <motion.tr
                    key={p.productId + idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium">{p.productName}</td>
                    <td className="text-right py-2.5 px-3 font-mono">{p.visits.toLocaleString()}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-destructive">{p.visitsExpensive.toLocaleString()}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-neon-blue">{p.visitsMatch.toLocaleString()}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-emerald">{p.visitsCheaper.toLocaleString()}</td>
                    <td className="text-right py-2.5 px-3 font-mono">R$ {p.minPriceRival.toFixed(2)}</td>
                    <td className="text-center py-2.5 px-3">
                      <span className={`status-badge text-[11px] ${
                        pctExp > 30 ? "bg-destructive/10 text-destructive border-destructive/20" :
                        pctExp > 15 ? "bg-warning/10 text-warning border-warning/20" :
                        "bg-emerald/10 text-emerald border-emerald/20"
                      }`}>
                        {pctExp > 30 ? "⚠ Caro" : pctExp > 15 ? "Atenção" : "✓ OK"}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
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
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Preço Mais Alto" stackId="a" fill="hsl(0, 84%, 60%)" />
            <Bar dataKey="Preço Equivalente" stackId="a" fill="hsl(199, 100%, 50%)" />
            <Bar dataKey="Preço Mais Baixo" stackId="a" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default CompetitivenessPanel;
