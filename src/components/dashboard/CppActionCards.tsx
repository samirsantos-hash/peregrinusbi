import { ArrowUpRight, AlertTriangle } from "lucide-react";
import type { ConsolidatedSeller } from "@/utils/cppAggregation";

interface Props {
  data: ConsolidatedSeller[];
  activeGroup: string | null;
  onToggle: (group: string | null) => void;
}

export default function CppActionCards({ data, activeGroup, onToggle }: Props) {
  const acelerar = data.filter(s => String(s.GRUPO_ACAO || "").toUpperCase().includes("ACELERAR"));
  const monitorar = data.filter(s => String(s.GRUPO_ACAO || "").toUpperCase().includes("MONITORAR"));

  const pct = data.length > 0 ? Math.round((monitorar.length / data.length) * 100) : 0;

  const cards = [
    {
      key: "ACELERAR",
      label: "Acelerar",
      count: acelerar.length,
      sub: "Sellers com alto potencial de crescimento",
      icon: ArrowUpRight,
      bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
      border: "border-emerald-500/30",
      iconColor: "text-emerald-400",
      ring: activeGroup === "ACELERAR" ? "ring-2 ring-emerald-500" : "",
    },
    {
      key: "MONITORAR",
      label: "Monitorar",
      count: monitorar.length,
      sub: `${pct}% da carteira — scores abaixo do ideal`,
      icon: AlertTriangle,
      bg: "bg-amber-500/10 hover:bg-amber-500/20",
      border: "border-amber-500/30",
      iconColor: "text-amber-400",
      ring: activeGroup === "MONITORAR" ? "ring-2 ring-amber-500" : "",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map(c => (
        <button
          key={c.key}
          onClick={() => onToggle(activeGroup === c.key ? null : c.key)}
          className={`flex items-center gap-4 p-5 rounded-xl border transition-all cursor-pointer text-left ${c.bg} ${c.border} ${c.ring}`}
        >
          <div className={`p-3 rounded-lg bg-background/50 ${c.iconColor}`}>
            <c.icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="text-3xl font-bold font-mono text-foreground">{c.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
