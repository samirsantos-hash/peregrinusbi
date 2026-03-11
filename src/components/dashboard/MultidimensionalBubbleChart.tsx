import { useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import { ExternalLink } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import PeriodSelector from "./PeriodSelector";

interface BubbleVariable {
  key: string;
  label: string;
}

interface MultidimensionalBubbleChartProps {
  data: Record<string, number | string>[];
  xVar: BubbleVariable;
  yVar: BubbleVariable;
  colorVar: BubbleVariable;
  sizeVar: BubbleVariable;
  nameKey: string;
  period: string;
  onPeriodChange: (v: string) => void;
  facetKey?: string;
  facetLabel?: string;
  sellerCustIdMap?: Record<string, string>;
}

/* ── Linear regression for trend line ── */
function trendLine(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n < 2) return [];
  const mx = data.reduce((s, d) => s + d.x, 0) / n;
  const my = data.reduce((s, d) => s + d.y, 0) / n;
  let num = 0, den = 0;
  for (const d of data) {
    num += (d.x - mx) * (d.y - my);
    den += (d.x - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  const xs = data.map(d => d.x).sort((a, b) => a - b);
  return [
    { x: xs[0], y: slope * xs[0] + intercept },
    { x: xs[xs.length - 1], y: slope * xs[xs.length - 1] + intercept },
  ];
}

/* ── Color scale (blue gradient) ── */
function colorScale(value: number, min: number, max: number): string {
  const range = max - min || 1;
  const t = Math.max(0, Math.min(1, (value - min) / range));
  const h = 199;
  const s = 30 + t * 70;
  const l = 70 - t * 35;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

const BubbleTooltip = ({ active, payload, xLabel, yLabel, colorLabel, sizeLabel, sellerCustIdMap }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const custId = sellerCustIdMap?.[d.sellerId];
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1 max-w-[260px]">
      <p className="font-semibold text-foreground truncate">{d.name}</p>
      {d.facet && <p className="text-muted-foreground text-[10px]">Cluster: {d.facet}</p>}
      <p className="text-muted-foreground">
        {xLabel}: <span className="text-foreground font-mono">{d.x?.toLocaleString("pt-BR")}</span>
      </p>
      <p className="text-muted-foreground">
        {yLabel}: <span className="text-foreground font-mono">R$ {d.y?.toLocaleString("pt-BR")}</span>
      </p>
      <p className="text-muted-foreground">
        {colorLabel}: <span className="text-foreground font-mono">{d.colorVal?.toLocaleString("pt-BR")}</span>
      </p>
      <p className="text-muted-foreground">
        {sizeLabel}: <span className="text-foreground font-mono">R$ {d.sizeVal?.toLocaleString("pt-BR")}</span>
      </p>
      <p className="text-muted-foreground mt-1">
        Elasticidade: <span className={`font-mono font-medium ${d.elasticity < -1 ? "text-emerald-400" : d.elasticity < 0 ? "text-amber-400" : "text-destructive"}`}>
          {d.elasticity?.toFixed(2)}
        </span>
      </p>
      {custId && (
        <a
          href={`https://lista.mercadolivre.com.br/_CustId_${custId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-1 text-primary hover:text-blue-400 hover:underline transition-colors text-[11px] font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Ir para a Loja <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};

interface ChartPoint {
  name: string;
  x: number;
  y: number;
  colorVal: number;
  sizeVal: number;
  z: number;
  elasticity: number;
  facet?: string;
}

function buildPoints(
  data: Record<string, number | string>[],
  xVar: BubbleVariable, yVar: BubbleVariable,
  colorVar: BubbleVariable, sizeVar: BubbleVariable,
  nameKey: string, facetKey?: string,
): ChartPoint[] {
  const filtered = data.filter(d =>
    d[xVar.key] != null && d[yVar.key] != null &&
    isFinite(Number(d[xVar.key])) && isFinite(Number(d[yVar.key]))
  );
  const avgX = filtered.reduce((s, r) => s + (Number(r[xVar.key]) || 0), 0) / Math.max(filtered.length, 1);
  const avgY = filtered.reduce((s, r) => s + (Number(r[yVar.key]) || 0), 0) / Math.max(filtered.length, 1);

  return filtered.map(d => {
    const pctX = avgX === 0 ? 0 : (Number(d[xVar.key]) - avgX) / avgX;
    const pctY = avgY === 0 ? 0 : (Number(d[yVar.key]) - avgY) / avgY;
    return {
      name: String(d[nameKey] || ""),
      x: Number(d[xVar.key]),
      y: Number(d[yVar.key]),
      colorVal: Number(d[colorVar.key]) || 0,
      sizeVal: Number(d[sizeVar.key]) || 0,
      z: Math.max(Number(d[sizeVar.key]) || 1, 1),
      elasticity: pctX === 0 ? 0 : pctY / pctX,
      facet: facetKey ? String(d[facetKey] || "Sem Cluster") : undefined,
    };
  });
}

/* ── Single facet chart ── */
const FacetChart = ({
  title, points, xVar, yVar, colorVar, sizeVar, colorMin, colorMax, height, sellerCustIdMap,
}: {
  title?: string;
  points: ChartPoint[];
  xVar: BubbleVariable; yVar: BubbleVariable;
  colorVar: BubbleVariable; sizeVar: BubbleVariable;
  colorMin: number; colorMax: number;
  height: number;
  sellerCustIdMap?: Record<string, string>;
}) => {
  const trend = trendLine(points.map(p => ({ x: p.x, y: p.y })));

  return (
    <div className="flex-1 min-w-0">
      {title && (
        <p className="text-[11px] font-semibold text-muted-foreground text-center mb-1 uppercase tracking-wider truncate px-1">
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 15, bottom: 35, left: 15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
          <XAxis
            type="number" dataKey="x" name={xVar.label}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
            axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
            label={{ value: xVar.label, position: "bottom", offset: 10, fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
            domain={["auto", "auto"]}
          />
          <YAxis
            type="number" dataKey="y" name={yVar.label}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
            axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            label={{ value: yVar.label, angle: -90, position: "insideLeft", fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} name={sizeVar.label} />
          <Tooltip
            content={<BubbleTooltip xLabel={xVar.label} yLabel={yVar.label} colorLabel={colorVar.label} sizeLabel={sizeVar.label} sellerCustIdMap={sellerCustIdMap} />}
            cursor={{ strokeDasharray: "3 3", stroke: "hsl(215, 20%, 35%)" }}
          />
          <Scatter name="Sellers" data={points} animationDuration={600}>
            {points.map((entry, i) => (
              <Cell key={i} fill={colorScale(entry.colorVal, colorMin, colorMax)} fillOpacity={0.8} stroke={colorScale(entry.colorVal, colorMin, colorMax)} strokeWidth={1} />
            ))}
          </Scatter>
          {trend.length === 2 && (
            <Scatter name="Tendência" data={trend} fill="none" line={{ stroke: "hsl(0, 84%, 60%)", strokeWidth: 2, strokeDasharray: "6 3" }} legendType="none" r={0} />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

const MultidimensionalBubbleChart = ({
  data, xVar, yVar, colorVar, sizeVar, nameKey,
  period, onPeriodChange, facetKey, facetLabel, sellerCustIdMap,
}: MultidimensionalBubbleChartProps) => {
  const { facets, allPoints, colorMin, colorMax } = useMemo(() => {
    const points = buildPoints(data, xVar, yVar, colorVar, sizeVar, nameKey, facetKey);

    const colorVals = points.map(p => p.colorVal);
    const cMin = colorVals.length > 0 ? Math.min(...colorVals) : 0;
    const cMax = colorVals.length > 0 ? Math.max(...colorVals) : 1;

    if (!facetKey) {
      return { facets: null, allPoints: points, colorMin: cMin, colorMax: cMax };
    }

    // Group by facet
    const grouped: Record<string, ChartPoint[]> = {};
    for (const p of points) {
      const key = p.facet || "Sem Cluster";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    }

    const sortedFacets = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    return { facets: sortedFacets, allPoints: points, colorMin: cMin, colorMax: cMax };
  }, [data, xVar, yVar, colorVar, sizeVar, nameKey, facetKey]);

  if (allPoints.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Análise Multidimensional de Elasticidade
          </h3>
          <TooltipInfo text={`Eixo X: ${xVar.label}. Eixo Y: ${yVar.label}. Cor: ${colorVar.label} (mais escuro = maior valor). Tamanho: ${sizeVar.label}. Linha vermelha: tendência.${facetKey ? ` Facetas: ${facetLabel || facetKey}.` : ""}`} />
        </div>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>

      {facets ? (
        /* ── Faceted layout ── */
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {facets.map(([facetName, points]) => (
              <div key={facetName} className="flex-1 min-w-[280px] border border-border/30 rounded-lg p-2">
                <FacetChart
                  title={facetName}
                  points={points}
                  xVar={xVar} yVar={yVar} colorVar={colorVar} sizeVar={sizeVar}
                  colorMin={colorMin} colorMax={colorMax}
                  height={320}
                  sellerCustIdMap={sellerCustIdMap}
                />
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  {points.length} seller{points.length !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
          {/* Consolidated view */}
          <details className="group">
            <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 py-1">
              <span className="group-open:rotate-90 transition-transform">▶</span> Visão consolidada (todos os clusters)
            </summary>
            <div className="mt-2">
              <FacetChart
                points={allPoints}
                xVar={xVar} yVar={yVar} colorVar={colorVar} sizeVar={sizeVar}
                colorMin={colorMin} colorMax={colorMax}
                height={380}
              />
            </div>
          </details>
        </div>
      ) : (
        /* ── Single chart (no facets) ── */
        <FacetChart
          points={allPoints}
          xVar={xVar} yVar={yVar} colorVar={colorVar} sizeVar={sizeVar}
          colorMin={colorMin} colorMax={colorMax}
          height={420}
        />
      )}

      {/* Color scale legend */}
      <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
        <span className="text-[10px] text-muted-foreground">{colorVar.label}:</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Baixo</span>
          <div className="h-2.5 w-24 rounded-full" style={{ background: `linear-gradient(to right, hsl(199, 30%, 70%), hsl(199, 100%, 35%))` }} />
          <span className="text-[10px] text-muted-foreground">Alto</span>
        </div>
        <span className="mx-2 text-border">|</span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-3 h-0.5" style={{ background: "hsl(0, 84%, 60%)", display: "inline-block" }} /> Tendência
        </span>
        <span className="mx-2 text-border">|</span>
        <span className="text-[10px] text-muted-foreground">Tamanho = {sizeVar.label}</span>
        {facetKey && (
          <>
            <span className="mx-2 text-border">|</span>
            <span className="text-[10px] text-muted-foreground">Facetas = {facetLabel || facetKey}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default MultidimensionalBubbleChart;
