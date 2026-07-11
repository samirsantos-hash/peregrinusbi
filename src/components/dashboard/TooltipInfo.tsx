import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TooltipInfoProps {
  text: string;
}

const TooltipInfo = ({ text }: TooltipInfoProps) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help transition-colors inline-block ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[340px] text-xs leading-relaxed whitespace-pre-line">
        {text}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default TooltipInfo;
