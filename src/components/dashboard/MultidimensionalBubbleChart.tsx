import { useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend,
} from "recharts";
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

/* ── Color scale (blue gradient for marketing investment) ── */
function colorScale(value: number, min: number, max: number): string {
  const range = max - min || 1;
  const t = Math.max(0, Math.min(1, (value - min) / range));
  // From cool grey to vibrant blue
  const h = 199;
  const s = 30 + t * 70; // 30% → 100%
  const l = 70 - t * 35; // 70% → 35%
  return `hsl(${h}, ${s}%, ${l}%)`;
}

const BubbleTooltip = ({ active, payload, xLabel, yLabel, colorLabel, sizeLabel }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1 max-w-[260px]">
      <p className="font-semibold text-foreground truncate">{d.name}</p>
      <p className="text-muted-foreground">
        {xLabel}: <span className="text-foreground font-mono">{d.x?.toLocaleString("pt-BR")}</span>
      </p>
      <p className="text-muted-foreground">
        {yLabel}: <span className="text-foreground font-mono">R$ {d.y?.toLocaleString("pt-BR")}</span>
      </p>
      <p className="text-muted-foreground">
        {colorLabel}: <span className="text-foreground font-mono">R$ {d.colorVal?.toLocaleString("pt-BR")}</span>
      </p>
      <p className="text-muted-foreground">
        {sizeLabel}: <span className="text-foreground font-mono">R$ {d.sizeVal?.toLocaleString("pt-BR")}</span>
      </p>
      <p className="text-muted-foreground mt-1">
        Elasticidade: <span className={`font-mono font-medium ${d.elasticity < -1 ? "text-emerald-400" : d.elasticity < 0 ? "text-amber-400" : "text-destructive"}`}>
          {d.elasticity?.toFixed(2)}
        </span>
      </p>
    </div>
  );
};

const MultidimensionalBubbleChart = ({
  data, xVar, yVar, colorVar, sizeVar, nameKey,
  period, onPeriodChange,
}: MultidimensionalBubbleChartProps) => {
  const { chartData, trend, colorMin, colorMax } = useMemo(() => {
    const points = data
      .filter(d =>
        d[xVar.key] != null && d[yVar.key] != null &&
        isFinite(Number(d[xVar.key])) && isFinite(Number(d[yVar.key]))
      )
      .map(d => ({
        name: String(d[nameKey] || ""),
        x: Number(d[xVar.key]),
        y: Number(d[yVar.key]),
        colorVal: Number(d[colorVar.key]) || 0,
        sizeVal: Number(d[sizeVar.key]) || 0,
        z: Math.max(Number(d[sizeVar.key]) || 1, 1),
        elasticity: (() => {
          // Simple point elasticity proxy: (% change Y) / (% change X) vs mean
          const avgX = data.reduce((s, r) => s + (Number(r[xVar.key]) || 0), 0) / Math.max(data.length, 1);
          const avgY = data.reduce((s, r) => s + (Number(r[yVar.key]) || 0), 0) / Math.max(data.length, 1);
          if (avgX === 0 || avgY === 0) return 0;
          const pctX = (Number(d[xVar.key]) - avgX) / avgX;
          const pctY = (Number(d[yVar.key]) - avgY) / avgY;
          return pctX === 0 ? 0 : pctY / pctX;
        })(),
      }));

    const colorVals = points.map(p => p.colorVal);
    const cMin = colorVals.length > 0 ? Math.min(...colorVals) : 0;
    const cMax = colorVals.length > 0 ? Math.max(...colorVals) : 1;

    const tLine = trendLine(points.map(p => ({ x: p.x, y: p.y })));

    return { chartData: points, trend: tLine, colorMin: cMin, colorMax: cMax };
  }, [data, xVar, yVar, colorVar, sizeVar, nameKey]);

  if (chartData.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Análise Multidimensional de Elasticidade
          </h3>
          <TooltipInfo text={`Eixo X: ${xVar.label}. Eixo Y: ${yVar.label}. Cor: ${colorVar.label} (mais escuro = maior valor). Tamanho: ${sizeVar.label}. Linha vermelha: tendência (sensibilidade).`} />
        </div>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
          <XAxis
            type="number"
            dataKey="x"
            name={xVar.label}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
            axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
            label={{ value: `${xVar.label} →`, position: "bottom", offset: 10, fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
            domain={["auto", "auto"]}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yVar.label}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
            axisLine={{ stroke: "hsl(215, 20%, 25%)" }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            label={{ value: `${yVar.label} ↑`, angle: -90, position: "insideLeft", fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="z" range={[60, 500]} name={sizeVar.label} />
          <Tooltip
            content={
              <BubbleTooltip
                xLabel={xVar.label}
                yLabel={yVar.label}
                colorLabel={colorVar.label}
                sizeLabel={sizeVar.label}
              />
            }
            cursor={{ strokeDasharray: "3 3", stroke: "hsl(215, 20%, 35%)" }}
          />
          <Scatter name="Sellers" data={chartData} animationDuration={800}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colorScale(entry.colorVal, colorMin, colorMax)}
                fillOpacity={0.8}
                stroke={colorScale(entry.colorVal, colorMin, colorMax)}
                strokeWidth={1}
              />
            ))}
          </Scatter>
          {/* Trend line */}
          {trend.length === 2 && (
            <Scatter
              name="Tendência"
              data={trend}
              fill="none"
              line={{ stroke: "hsl(0, 84%, 60%)", strokeWidth: 2, strokeDasharray: "6 3" }}
              legendType="none"
              r={0}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Color scale legend */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <span className="text-[10px] text-muted-foreground">{colorVar.label}:</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Baixo</span>
          <div
            className="h-2.5 w-24 rounded-full"
            style={{
              background: `linear-gradient(to right, hsl(199, 30%, 70%), hsl(199, 100%, 35%))`,
            }}
          />
          <span className="text-[10px] text-muted-foreground">Alto</span>
        </div>
        <span className="mx-2 text-border">|</span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-3 h-0.5" style={{ background: "hsl(0, 84%, 60%)", display: "inline-block" }} /> Tendência
        </span>
        <span className="mx-2 text-border">|</span>
        <span className="text-[10px] text-muted-foreground">Tamanho = {sizeVar.label}</span>
      </div>
    </div>
  );
};

export default MultidimensionalBubbleChart;
