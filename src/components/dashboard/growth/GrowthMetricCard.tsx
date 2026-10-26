import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  /** Texto auxiliar curto (ex.: participação, CPV). */
  hint?: string;
  /** Badge de variação (ex.: +12,4%). */
  delta?: { value: string; positive?: boolean };
  icon?: LucideIcon;
  className?: string;
  /** Valor principal em mono tabular. */
  mono?: boolean;
};

/**
 * Card tátil “branco gelo” — Design Engineering / consultoria growth.
 * Superfície limpa, borda ultrafina, sombra em camada única.
 */
export function GrowthMetricCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  className,
  mono = true,
}: Props) {
  return (
    <div
      className={cn(
        "bg-white border border-slate-200/80 rounded-xl",
        "shadow-[0_1px_3px_rgba(0,0,0,0.03)]",
        "hover:border-slate-300 transition-colors duration-150",
        "p-4 sm:p-5 flex flex-col gap-2 min-h-[116px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        {Icon && (
          <span className="rounded-lg bg-slate-50 border border-slate-200/70 p-1.5 text-slate-500">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p
          className={cn(
            "text-2xl sm:text-[1.75rem] font-semibold tracking-tight text-slate-900",
            mono && "font-mono tabular-nums",
          )}
        >
          {value}
        </p>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium font-mono tabular-nums border",
              delta.positive === false
                ? "bg-red-50 text-red-700 border-red-100"
                : "bg-emerald-50 text-emerald-700 border-emerald-100",
            )}
          >
            {delta.value}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500 leading-snug">{hint}</p>}
    </div>
  );
}

export default GrowthMetricCard;
