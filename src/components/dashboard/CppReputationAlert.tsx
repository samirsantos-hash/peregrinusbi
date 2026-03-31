import { ShieldAlert } from "lucide-react";
import type { ConsolidatedSeller } from "@/utils/cppAggregation";

interface Props {
  data: ConsolidatedSeller[];
}

export default function CppReputationAlert({ data }: Props) {
  const threshold = 0.02;
  const atRisk = data.filter(s => {
    const rate = Number(s.REP_DELAYED_HT_RATE) || 0;
    return rate > threshold;
  });

  if (atRisk.length === 0) return null;

  const pct = data.length > 0 ? ((atRisk.length / data.length) * 100).toFixed(1) : "0";

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-sm">
      <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
      <p className="text-foreground">
        <span className="font-bold text-destructive">{atRisk.length} sellers ({pct}%)</span>{" "}
        com taxa de atraso acima do limite de 2% — impacto direto no posicionamento orgânico
      </p>
    </div>
  );
}
