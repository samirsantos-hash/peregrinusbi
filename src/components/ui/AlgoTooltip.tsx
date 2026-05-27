import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJuniorMode } from "@/hooks/useJuniorMode";
import { TOOLTIPS, type AlgoTooltipContent } from "@/lib/algoTooltips";

type Props =
  | ({ tooltipKey: keyof typeof TOOLTIPS; size?: "sm" | "md"; className?: string } & Partial<AlgoTooltipContent>)
  | ({ tooltipKey?: undefined; size?: "sm" | "md"; className?: string } & AlgoTooltipContent);

export function AlgoTooltip(props: Props) {
  const { enabled } = useJuniorMode();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  const base: AlgoTooltipContent | undefined = props.tooltipKey
    ? TOOLTIPS[props.tooltipKey]
    : undefined;

  const content: AlgoTooltipContent = {
    oque: (props as any).oque ?? base?.oque ?? "",
    algoritmo: (props as any).algoritmo ?? base?.algoritmo ?? "",
    seBom: (props as any).seBom ?? base?.seBom,
    seRuim: (props as any).seRuim ?? base?.seRuim,
    correlacao: (props as any).correlacao ?? base?.correlacao,
    benchmark: (props as any).benchmark ?? base?.benchmark,
  };

  if (!content.oque) return null;

  const size = props.size ?? "sm";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={150}>
      <TooltipTrigger
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={content.oque}
        className={cn(
          "inline-flex items-center justify-center text-muted-foreground hover:text-neon-blue transition-colors cursor-help",
          props.className,
        )}
      >
        <HelpCircle className={iconSize} />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        role="tooltip"
        className="max-w-sm space-y-2.5 p-3 text-[11px] leading-relaxed bg-popover border-border"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            O que é
          </p>
          <p className="text-foreground">{content.oque}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neon-blue mb-0.5">
            🤖 Como o algoritmo ML usa
          </p>
          <p className="text-foreground/90">{content.algoritmo}</p>
        </div>

        {(content.seBom || content.seRuim) && (
          <div className="space-y-1 pt-1 border-t border-border/40">
            {content.seBom && (
              <div className="flex gap-1.5 items-start">
                <TrendingUp className="w-3 h-3 text-emerald shrink-0 mt-0.5" />
                <p className="text-emerald">{content.seBom}</p>
              </div>
            )}
            {content.seRuim && (
              <div className="flex gap-1.5 items-start">
                <TrendingDown className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive">{content.seRuim}</p>
              </div>
            )}
          </div>
        )}

        {content.correlacao && (
          <div className="pt-1 border-t border-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-warning mb-0.5">
              🔗 Correlação
            </p>
            <p className="text-foreground/85">{content.correlacao}</p>
          </div>
        )}

        {content.benchmark && (
          <div className="pt-1 border-t border-border/40">
            <p className="text-foreground/80">📊 {content.benchmark}</p>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default AlgoTooltip;