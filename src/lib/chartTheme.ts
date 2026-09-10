/**
 * Tema compartilhado de gráficos — Etapa A/B.
 *
 * Tokens CSS: --series-1..5, --grid, --axis, --attention, --attention-text
 * (declarados em src/index.css e mapeados em tailwind.config.ts).
 *
 * Grade: Névoa cheia, sem alpha (--grid).
 * Eixo/rótulos: Grafite (--axis), tick 11px.
 * Tracejado: reservado a meta e média móvel (Etapa C), não à grade.
 * Funcionais (--ok/--crit/--attention-text): só juízo, nunca como série neutra.
 */

export const AXIS_TICK_FONT_SIZE = 11;

/** Stroke da grade: Névoa cheia, sem transparência. */
export const CHART_GRID_STROKE = "hsl(var(--grid))";

/** Stroke/fill de eixo e rótulos. */
export const CHART_AXIS_STROKE = "hsl(var(--axis))";

/** Superfície de balão / card. */
export const CHART_CARD_FILL = "hsl(var(--card))";

/** Borda de componente (botão, tooltip). */
export const CHART_BORDER = "hsl(var(--border))";

/** Rampa de série (dado, não juízo). */
export const CHART_SERIES_1 = "hsl(var(--series-1))";
export const CHART_SERIES_2 = "hsl(var(--series-2))";
export const CHART_SERIES_3 = "hsl(var(--series-3))";
export const CHART_SERIES_4 = "hsl(var(--series-4))";
export const CHART_SERIES_5 = "hsl(var(--series-5))";

/** Semáforo / juízo — texto, ícone, linha fina, marcador. */
export const CHART_OK = "hsl(var(--ok))";
export const CHART_OK_SOFT = "hsl(var(--emerald))";
export const CHART_ATTENTION = "hsl(var(--attention))";
export const CHART_ATTENTION_TEXT = "hsl(var(--attention-text))";
export const CHART_CRIT = "hsl(var(--crit))";
export const CHART_MUTED = "hsl(var(--muted-foreground))";
export const CHART_ON_COLOR = "hsl(var(--primary-foreground))";
export const CHART_PRIMARY = "hsl(var(--primary))";
export const CHART_BRAND_PURPLE = "hsl(var(--brand-purple))";
export const CHART_PRICE_HOT = "hsl(var(--price-hot))";
export const CHART_PRICE_COOL = "hsl(var(--price-cool))";
export const CHART_PRICE_NEUTRAL = "hsl(var(--price-neutral))";

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

/** Estilo mínimo de tooltip Recharts (tema claro/escuro via tokens). */
export const chartTooltipContentStyle = {
  background: CHART_CARD_FILL,
  border: `1px solid ${CHART_BORDER}`,
  fontSize: 12,
} as const;
