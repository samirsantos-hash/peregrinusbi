import { TrendingUp, TrendingDown, MoveRight } from "lucide-react";
import type { Tendencia } from "@/lib/tendencia";
import { cn } from "@/lib/utils";

const CFG = {
  crescendo: { rotulo: "Crescendo", Icone: TrendingUp, cls: "text-ok border-ok/40 bg-ok/10" },
  estavel: { rotulo: "Estável", Icone: MoveRight, cls: "text-warning border-warning/40 bg-warning/10" },
  caindo: { rotulo: "Caindo", Icone: TrendingDown, cls: "text-destructive border-destructive/40 bg-destructive/10" },
} as const;

export default function TendenciaChip({ t, className }: { t: Tendencia | null; className?: string }) {
  if (!t) return null;
  const { rotulo, Icone, cls } = CFG[t.sentido];
  const pct = `${t.variacaoPct > 0 ? "+" : ""}${t.variacaoPct.toFixed(1).replace(".", ",")}%`;
  return (
    <span
      title="Tendência pela reta do período (±5% da média = estável)"
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums", cls, className)}
    >
      <Icone className="h-3.5 w-3.5" /> {rotulo} {pct}
    </span>
  );
}
