type Props = { cx?: number; cy?: number; motivos: string[] };

/** Solid sphere plus ring: the alert remains recognizable without color alone. */
export function PontoRupturaAds({ cx, cy, motivos }: Props) {
  if (cx == null || cy == null || !motivos.length) return <g />;
  return <g className="ponto-ruptura-ads" role="img" aria-label={motivos.join(' · ')}>
    <title>{motivos.join(' · ')}</title>
    <circle cx={cx} cy={cy} r={9} fill="transparent" />
    <circle cx={cx} cy={cy} r={4} fill="hsl(var(--background))" />
    <circle cx={cx} cy={cy} r={3.5} fill="none" stroke="hsl(var(--destructive))" strokeWidth={1} />
    <circle cx={cx} cy={cy} r={2.5} fill="hsl(var(--destructive))" />
  </g>;
}