export const brl = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const int = (v: number | null) => (v === null ? "—" : Math.round(v).toLocaleString("pt-BR"));
export const pct = (v: number | null, d = 1) =>
  v === null ? "—" : `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
export const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="text-muted-foreground">—</span>;
  const cls = v > 0 ? "text-[hsl(var(--ok))]" : v < 0 ? "text-[hsl(var(--crit))]" : "text-muted-foreground";
  return <span className={`tabular-nums ${cls}`}>{v > 0 ? "▲ +" : v < 0 ? "▼ " : ""}{pct(v)}</span>;
}

/** Hachura para período incompleto. */
export const HACHURA = {
  backgroundImage: "repeating-linear-gradient(135deg, hsl(var(--muted)) 0 6px, transparent 6px 12px)",
};
