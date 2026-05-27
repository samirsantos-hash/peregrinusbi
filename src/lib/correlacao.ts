export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  if (!isFinite(den) || den === 0) return 0;
  return Math.max(-1, Math.min(1, num / den));
}

export function strengthLabel(r: number): { label: string; tone: "muted" | "warning" | "emerald" | "destructive" } {
  const a = Math.abs(r);
  if (a < 0.3) return { label: "Fraca", tone: "muted" };
  if (a < 0.6) return { label: "Moderada", tone: "warning" };
  return r >= 0 ? { label: "Forte +", tone: "emerald" } : { label: "Forte −", tone: "destructive" };
}