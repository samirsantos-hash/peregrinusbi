import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";
import { fmtBRLCompact, fmtNum } from "@/utils/formatters";
import TooltipInfo from "./TooltipInfo";
import PeriodSelector from "./PeriodSelector";
import { useState } from "react";

interface KpiLike {
  date: string;
  adsInvestment: number;
  gmv: number;
  tgmv: number;
  productName: string;
  productId: string;
}

interface Props {
  kpis: KpiLike[];
}

interface ElasticityPoint {
  name: string;
  elasticity: number;
  salesVolume: number;
  deltaInv: number;
  deltaVend: number;
  invAnterior: number;
  invAtual: number;
  vendAnterior: number;
  vendAtual: number;
  quadrant: string;
  medianX: number;
  medianY: number;
}

const QUADRANTS = {
  star: { label: "⭐ Escalar (Estrelas)", color: "hsl(160, 84%, 39%)", desc: "Alta elasticidade + alto volume. Priorizar orçamento." },
  cow: { label: "🐄 Saturados (Vacas Leiteiras)", color: "hsl(199, 100%, 50%)", desc: "Baixa elasticidade + alto volume. Manter investimento." },
  opportunity: { label: "🔬 Testar (Oportunidades)", color: "hsl(40, 95%, 55%)", desc: "Alta elasticidade + baixo volume. Aumentar investimento." },
  dog: { label: "🐕 Descartar (Cães)", color: "hsl(0, 84%, 60%)", desc: "Baixa elasticidade + baixo volume. Reduzir ou cortar." },
};

const getQuadrant = (elasticity: number, volume: number, mx: number, my: number) => {
  if (elasticity >= mx && volume >= my) return "star";
  if (elasticity < mx && volume >= my) return "cow";
  if (elasticity >= mx && volume < my) return "opportunity";
  return "dog";
};

const getColor = (q: string) => QUADRANTS[q as keyof typeof QUADRANTS]?.color ?? "hsl(215, 20%, 55%)";

const ScatterTooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d: ElasticityPoint = payload[0]?.payload;
  if (!d) return null;

  const q = QUADRANTS[d.quadrant as keyof typeof QUADRANTS];

  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1 max-w-[260px]">
      <p className="font-semibold text-foreground truncate">{d.name}</p>
      <div className="border-t border-border/50 pt-1 mt-1 space-y-0.5">
        <p className="text-muted-foreground">Inv. Anterior: <span className="text-foreground font-mono">{fmtBRLCompact(d.invAnterior)}</span></p>
        <p className="text-muted-foreground">Inv. Atual: <span className="text-foreground font-mono">{fmtBRLCompact(d.invAtual)}</span></p>
        <p className="text-muted-foreground">ΔInv: <span className={`font-mono ${d.deltaInv >= 0 ? "text-emerald" : "text-destructive"}`}>{d.deltaInv >= 0 ? "+" : ""}{fmtNum(d.deltaInv * 100, 1)}%</span></p>
      </div>
      <div className="border-t border-border/50 pt-1 space-y-0.5">
        <p className="text-muted-foreground">Vendas Anterior: <span className="text-foreground font-mono">{fmtBRLCompact(d.vendAnterior)}</span></p>
        <p className="text-muted-foreground">Vendas Atual: <span className="text-foreground font-mono">{fmtBRLCompact(d.vendAtual)}</span></p>
        <p className="text-muted-foreground">ΔVendas: <span className={`font-mono ${d.deltaVend >= 0 ? "text-emerald" : "text-destructive"}`}>{d.deltaVend >= 0 ? "+" : ""}{fmtNum(d.deltaVend * 100, 1)}%</span></p>
      </div>
      <div className="border-t border-border/50 pt-1">
        <p className="text-muted-foreground">Elasticidade: <span className="text-foreground font-mono font-semibold">{fmtNum(d.elasticity, 2)}</span></p>
        <p className="text-muted-foreground">Volume Vendas: <span className="text-foreground font-mono">{fmtBRLCompact(d.salesVolume)}</span></p>
      </div>
      <p className="mt-1 font-medium text-[11px]" style={{ color: q?.color }}>
        {q?.label} — {q?.desc}
      </p>
    </div>
  );
};

const ElasticityAdsChart = ({ kpis }: Props) => {
  const [period, setPeriod] = useState("all");

  const { points, medianX, medianY, stars } = useMemo(() => {
    // Filter by period
    const allDates = [...new Set(kpis.map((k) => k.date))].sort();
    const cutoffDates = period === "all"
      ? new Set(allDates)
      : new Set(allDates.slice(-parseInt(period)));

    const filtered = kpis.filter((k) => cutoffDates.has(k.date));
    const sortedDates = [...cutoffDates].sort();

    if (sortedDates.length < 2) return { points: [], medianX: 0, medianY: 0, stars: [] };

    // Split dates into two halves: anterior and atual
    const midIdx = Math.floor(sortedDates.length / 2);
    const anteriorDates = new Set(sortedDates.slice(0, midIdx));
    const atualDates = new Set(sortedDates.slice(midIdx));

    // Aggregate per seller/product for each period
    const byProduct: Record<string, {
      name: string;
      invAnterior: number; invAtual: number;
      vendAnterior: number; vendAtual: number;
    }> = {};

    for (const k of filtered) {
      if (!byProduct[k.productId]) {
        byProduct[k.productId] = { name: k.productName, invAnterior: 0, invAtual: 0, vendAnterior: 0, vendAtual: 0 };
      }
      const p = byProduct[k.productId];
      if (anteriorDates.has(k.date)) {
        p.invAnterior += k.adsInvestment;
        p.vendAnterior += k.gmv;
      } else {
        p.invAtual += k.adsInvestment;
        p.vendAtual += k.gmv;
      }
    }

    const entries = Object.values(byProduct).filter(
      (p) => p.vendAnterior > 0 || p.vendAtual > 0
    );

    const pts: ElasticityPoint[] = entries.map((p) => {
      const deltaInv = p.invAnterior > 0 ? (p.invAtual - p.invAnterior) / p.invAnterior : 0;
      const deltaVend = p.vendAnterior > 0 ? (p.vendAtual - p.vendAnterior) / p.vendAnterior : 0;

      // Elasticity: if investment didn't change, treat as inelastic (0)
      const elasticity = Math.abs(deltaInv) > 0.001 ? deltaVend / deltaInv : 0;

      // Clamp elasticity to avoid extreme outliers
      const clampedElasticity = Math.max(-5, Math.min(5, elasticity));

      return {
        name: p.name,
        elasticity: Math.round(clampedElasticity * 100) / 100,
        salesVolume: Math.round(p.vendAtual),
        deltaInv,
        deltaVend,
        invAnterior: p.invAnterior,
        invAtual: p.invAtual,
        vendAnterior: p.vendAnterior,
        vendAtual: p.vendAtual,
        quadrant: "",
        medianX: 0,
        medianY: 0,
      };
    });

    // Calculate medians
    const sortedX = pts.map((p) => p.elasticity).sort((a, b) => a - b);
    const sortedY = pts.map((p) => p.salesVolume).sort((a, b) => a - b);
    const mx = sortedX.length > 0 ? sortedX[Math.floor(sortedX.length / 2)] : 0;
    const my = sortedY.length > 0 ? sortedY[Math.floor(sortedY.length / 2)] : 0;

    pts.forEach((p) => {
      p.quadrant = getQuadrant(p.elasticity, p.salesVolume, mx, my);
      p.medianX = mx;
      p.medianY = my;
    });

    const starList = pts
      .filter((p) => p.quadrant === "star")
      .sort((a, b) => b.salesVolume - a.salesVolume);

    return { points: pts, medianX: mx, medianY: my, stars: starList };
  }, [kpis, period]);

  if (points.length === 0) {
    return (
      <div className="glass-card p-5 text-center text-muted-foreground text-sm">
        Dados insuficientes para calcular elasticidade. São necessários pelo menos 2 períodos.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Scatter Plot */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Matriz de Elasticidade: Investimento Ads vs Volume de Vendas
            </h3>
            <TooltipInfo text="Cruza a variação do investimento em Ads com a variação das vendas para identificar a sensibilidade (elasticidade publicitária). O período é dividido ao meio: a primeira metade é o 'anterior', a segunda é o 'atual'. Elasticidade = ΔVendas / ΔInvestimento." />
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart key={period} margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              type="number"
              dataKey="elasticity"
              name="Elasticidade"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
              label={{ value: "Elasticidade (Sensibilidade Ads) →", position: "bottom", offset: 15, fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              domain={["auto", "auto"]}
            />
            <YAxis
              type="number"
              dataKey="salesVolume"
              name="Volume de Vendas"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
              tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              label={{ value: "Volume de Vendas (GMV) ↑", angle: -90, position: "insideLeft", fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="salesVolume" range={[100, 600]} />
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
            <Scatter name="Sellers" data={points} animationDuration={800} animationEasing="ease-in-out">
              {points.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(entry.quadrant)}
                  fillOpacity={0.8}
                  stroke={getColor(entry.quadrant)}
                  strokeWidth={1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 justify-center text-[11px]">
          {Object.entries(QUADRANTS).map(([key, q]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: q.color }} />
              {q.label}
            </span>
          ))}
        </div>
      </div>

      {/* Stars table — Alta Elasticidade + Alta Competitividade */}
      {stars.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              ⭐ Priorizar Orçamento — Alta Elasticidade & Alto Volume
            </h3>
            <TooltipInfo text="Sellers/anúncios no quadrante Estrela: as vendas reagem fortemente ao investimento e já possuem alto volume. São os melhores candidatos para escalar o orçamento de Ads." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Usuário / Loja</th>
                  <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Elasticidade</th>
                  <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">ΔInv</th>
                  <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">ΔVendas</th>
                  <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Vendas Atual</th>
                  <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Inv. Atual</th>
                </tr>
              </thead>
              <tbody>
                {stars.map((s, idx) => (
                  <motion.tr
                    key={s.name + idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium">{s.name}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-semibold text-emerald">{fmtNum(s.elasticity, 2)}</td>
                    <td className={`text-right py-2.5 px-3 font-mono ${s.deltaInv >= 0 ? "text-emerald" : "text-destructive"}`}>
                      {s.deltaInv >= 0 ? "+" : ""}{fmtNum(s.deltaInv * 100, 1)}%
                    </td>
                    <td className={`text-right py-2.5 px-3 font-mono ${s.deltaVend >= 0 ? "text-emerald" : "text-destructive"}`}>
                      {s.deltaVend >= 0 ? "+" : ""}{fmtNum(s.deltaVend * 100, 1)}%
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono">{fmtBRLCompact(s.salesVolume)}</td>
                    <td className="text-right py-2.5 px-3 font-mono">{fmtBRLCompact(s.invAtual)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ElasticityAdsChart;
