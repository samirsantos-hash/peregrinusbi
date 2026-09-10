/**
 * Tema compartilhado de gráficos — Etapa A.
 *
 * Tokens CSS: --series-1..5, --grid, --axis, --attention, --attention-text
 * (declarados em src/index.css e mapeados em tailwind.config.ts).
 *
 * Grade: Névoa cheia, sem alpha (--grid).
 * Eixo/rótulos: Grafite (--axis), tick 11px.
 * Tracejado: reservado a meta e média móvel (Etapa C), não à grade.
 */

export const AXIS_TICK_FONT_SIZE = 11;

/** Stroke da grade: Névoa cheia, sem transparência. */
export const CHART_GRID_STROKE = "hsl(var(--grid))";

/** Stroke/fill de eixo e rótulos. */
export const CHART_AXIS_STROKE = "hsl(var(--axis))";

/** Props padrão de tick de eixo (Recharts). */
export const chartAxisTick = {
  fontSize: AXIS_TICK_FONT_SIZE,
  fill: CHART_AXIS_STROKE,
} as const;

/** Props mínimas de CartesianGrid horizontal (migração completa = Etapa C). */
export const chartGridProps = {
  stroke: CHART_GRID_STROKE,
  vertical: false,
  strokeDasharray: undefined as undefined,
} as const;
