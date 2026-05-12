import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NewBadgeProps {
  featureKey: string;
  tooltip?: string;
  className?: string;
}

/** Pulsing "NEW" pill that disappears forever after the parent item is clicked once.
 *  Persistence: localStorage key `feature_seen_<featureKey>`. */
const NewBadge = ({ featureKey, tooltip = "Nova funcionalidade", className }: NewBadgeProps) => {
  const storageKey = `feature_seen_${featureKey}`;
  const [seen, setSeen] = useState(true);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    setSeen(localStorage.getItem(storageKey) === "1");
    const t = setTimeout(() => setPulse(false), 2000);
    return () => clearTimeout(t);
  }, [storageKey]);

  // Mark as seen when user clicks anywhere up the tree (parent NavLink fires click)
  useEffect(() => {
    if (seen) return;
    const onClick = () => {
      localStorage.setItem(storageKey, "1");
      setSeen(true);
    };
    // Capture click on body bubbled up — but only after parent navigates
    // Simpler: fire on next route change via a one-shot click listener attached to document
    document.addEventListener("click", onClick, { capture: false, once: false });
    return () => document.removeEventListener("click", onClick);
  }, [seen, storageKey]);

  if (seen) return null;

  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label="Funcionalidade nova"
            className={cn(
              "inline-flex items-center justify-center h-4 px-1.5 ml-2 rounded-full text-[10px] font-semibold tracking-wide bg-[#3B82F6] text-white align-middle",
              pulse && !reduceMotion && "animate-pulse",
              className,
            )}
          >
            NEW
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default NewBadge;