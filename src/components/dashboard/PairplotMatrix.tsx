import { useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Line, ComposedChart,
  Bar, BarChart,
} from "recharts";
import TooltipInfo from "./TooltipInfo";

interface PairplotVariable {
  key: string;
  label: string;
  shortLabel: string;
}

interface PairplotMatrixProps {
  data: Record<string, number>[];
  variables: PairplotVariable[];
  resultVar: PairplotVariable;
}

/* ── Stats helpers ── */
function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

function linReg(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

function histogram(values: number[], bins = 12) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / bins;
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[idx]++;
  }
  return counts.map((c, i) => ({
    bin: Math.round((min + (i + 0.5) * binWidth) * 100) / 100,
    count: c,
  }));
}

/* ── Color helpers ── */
function corrColor(r: number): string {
  const abs = Math.abs(r);
  if (abs > 0.7) return r > 0 ? "hsl(199, 100%, 50%)" : "hsl(0, 84%, 60%)";
  if (abs > 0.4) return r > 0 ? "hsl(199, 70%, 65%)" : "hsl(0, 60%, 70%)";
  return "hsl(215, 20%, 55%)";
}

function corrBg(r: number): string {
  const abs = Math.abs(r);
  if (abs > 0.7) return r > 0 ? "hsl(199 100% 50% / 0.08)" : "hsl(0 84% 60% / 0.08)";
  if (abs > 0.4) return r > 0 ? "hsl(199 100% 50% / 0.04)" : "hsl(0 84% 60% / 0.04)";
  return "transparent";
}

/* ── Scatter cell tooltip ── */
const CellTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="glass-card p-2 !bg-card/95 text-[10px] space-y-0.5">
      <p className="font-mono">X: {d.x?.toLocaleString("pt-BR")}</p>
      <p className="font-mono">Y: {d.y?.toLocaleString("pt-BR")}</p>
    </div>
  );
};

const CELL_SIZE = 130;
const CHART_COLORS = {
  dot: "hsl(199, 100%, 50%)",
  regression: "hsl(0, 84%, 60%)",
  histogram: "hsl(199, 80%, 55%)",
  grid: "hsl(215, 25%, 14%)",
  axis: "hsl(215, 20%, 55%)",
};

const PairplotMatrix = ({ data, variables, resultVar }: PairplotMatrixProps) => {
  const allVars = useMemo(() => [...variables, resultVar], [variables, resultVar]);
  const n = allVars.length;

  const cells = useMemo(() => {
    const result: {
      row: number; col: number; type: "scatter" | "histogram" | "correlation";
      scatterData?: { x: number; y: number }[];
      regLine?: { x: number; y: number }[];
      histData?: { bin: number; count: number }[];
      corr?: number;
      xLabel?: string; yLabel?: string;
    }[][] = [];

    for (let row = 0; row < n; row++) {
      const rowCells: typeof result[0] = [];
      for (let col = 0; col < n; col++) {
        if (row === col) {
          // Diagonal: histogram
          const vals = data.map(d => d[allVars[row].key]).filter(v => v != null && isFinite(v));
          rowCells.push({ row, col, type: "histogram", histData: histogram(vals) });
        } else if (row > col) {
          // Lower triangle: scatter + regression
          const pairs = data
            .map(d => ({ x: d[allVars[col].key], y: d[allVars[row].key] }))
            .filter(p => p.x != null && p.y != null && isFinite(p.x) && isFinite(p.y));
          const xs = pairs.map(p => p.x);
          const ys = pairs.map(p => p.y);
          const { slope, intercept } = linReg(xs, ys);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const regLine = [
            { x: minX, y: slope * minX + intercept },
            { x: maxX, y: slope * maxX + intercept },
          ];
          rowCells.push({ row, col, type: "scatter", scatterData: pairs, regLine, xLabel: allVars[col].shortLabel, yLabel: allVars[row].shortLabel });
        } else {
          // Upper triangle: correlation
          const xs = data.map(d => d[allVars[col].key]).filter(v => v != null && isFinite(v));
          const ys = data.map(d => d[allVars[row].key]).filter(v => v != null && isFinite(v));
          const minLen = Math.min(xs.length, ys.length);
          const corr = pearson(xs.slice(0, minLen), ys.slice(0, minLen));
          rowCells.push({ row, col, type: "correlation", corr });
        }
      }
      result.push(rowCells);
    }
    return result;
  }, [data, allVars, n]);

  if (data.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Matriz de Correlação (Pairplot)
        </h3>
        <TooltipInfo text="Triângulo inferior: dispersão com regressão linear. Diagonal: histograma de densidade. Triângulo superior: coeficiente de Pearson. Azul = correlação positiva, Vermelho = negativa." />
      </div>

      {/* Variable labels on top */}
      <div className="overflow-x-auto">
        <div style={{ display: "grid", gridTemplateColumns: `80px repeat(${n}, ${CELL_SIZE}px)`, gap: 2 }}>
          {/* Top header row */}
          <div />
          {allVars.map((v) => (
            <div key={`h-${v.key}`} className="text-[10px] font-medium text-muted-foreground text-center py-1 truncate">
              {v.shortLabel}
            </div>
          ))}

          {/* Grid rows */}
          {cells.map((row, ri) => (
            <>
              {/* Row label */}
              <div key={`rl-${ri}`} className="flex items-center justify-end pr-2">
                <span className="text-[10px] font-medium text-muted-foreground truncate">
                  {allVars[ri].shortLabel}
                </span>
              </div>
              {row.map((cell, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  className="border border-border/30 rounded-sm overflow-hidden"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: cell.type === "correlation" ? corrBg(cell.corr || 0) : undefined,
                  }}
                >
                  {cell.type === "scatter" && cell.scatterData && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke={CHART_COLORS.grid} strokeOpacity={0.5} />
                        <XAxis type="number" dataKey="x" hide />
                        <YAxis type="number" dataKey="y" hide />
                        <Tooltip content={<CellTooltip />} />
                        <Scatter data={cell.scatterData} fill={CHART_COLORS.dot} fillOpacity={0.5} r={2.5} />
                        {cell.regLine && (
                          <Scatter
                            data={cell.regLine}
                            fill="none"
                            line={{ stroke: CHART_COLORS.regression, strokeWidth: 1.5 }}
                            legendType="none"
                            r={0}
                          />
                        )}
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                  {cell.type === "histogram" && cell.histData && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cell.histData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                        <Bar dataKey="count" fill={CHART_COLORS.histogram} fillOpacity={0.6} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {cell.type === "correlation" && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <span
                        className="text-lg font-bold font-mono"
                        style={{ color: corrColor(cell.corr || 0) }}
                      >
                        {(cell.corr || 0).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-muted-foreground mt-0.5">Pearson</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 justify-center text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS.dot }} /> Dispersão
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5" style={{ background: CHART_COLORS.regression }} /> Regressão
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS.histogram, opacity: 0.6 }} /> Histograma
        </span>
      </div>
    </div>
  );
};

export default PairplotMatrix;
