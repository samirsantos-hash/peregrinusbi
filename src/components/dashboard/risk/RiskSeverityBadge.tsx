import { cn } from "@/lib/utils";
import type { SeverityLevel } from "@/lib/risk/riskAggregator";

export function RiskSeverityBadge({ severity }: { severity: SeverityLevel }) {
  const styles =
    severity === "alta"
      ? "bg-destructive/15 text-destructive border-destructive/40"
      : "bg-warning/15 text-warning border-warning/40";
  const label = severity === "alta" ? "Alta" : "Média";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide tabular-nums",
        styles,
      )}
    >
      {label}
    </span>
  );
}