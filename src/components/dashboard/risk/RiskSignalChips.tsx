import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RiskSignal, SignalKind } from "@/lib/risk/riskAggregator";

const KIND_LABEL: Record<SignalKind, string> = {
  bpc: "BPC",
  reputacao_claims: "Reclamações",
  reputacao_delayed: "Atrasos",
  churn_relativo: "Queda MoM",
  churn_absoluto: "Churn",
};

export function RiskSignalChips({ signals }: { signals: RiskSignal[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {signals.map((s, i) => {
        const styles =
          s.severity === "alta"
            ? "bg-destructive/10 text-destructive border-destructive/30"
            : "bg-warning/10 text-warning border-warning/30";
        return (
          <Tooltip key={i} delayDuration={200}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium tabular-nums cursor-help",
                  styles,
                )}
              >
                {KIND_LABEL[s.kind]}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-xs">
              <p className="font-semibold mb-0.5">{s.label}</p>
              <p className="text-muted-foreground">{s.detail}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}