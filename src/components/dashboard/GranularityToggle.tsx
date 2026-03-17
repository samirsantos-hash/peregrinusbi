import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarDays, CalendarRange } from "lucide-react";
import TooltipInfo from "./TooltipInfo";

export type Granularity = "consolidated" | "daily";

interface GranularityToggleProps {
  value: Granularity;
  onChange: (val: Granularity) => void;
}

const GranularityToggle = ({ value, onChange }: GranularityToggleProps) => (
  <div className="flex items-center gap-2">
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as Granularity)}
      className="bg-card/60 border border-border/40 rounded-lg p-0.5"
    >
      <ToggleGroupItem
        value="consolidated"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium data-[state=on]:bg-primary/15 data-[state=on]:text-primary rounded-md transition-colors"
      >
        <CalendarRange className="w-3.5 h-3.5" />
        Fechamento Consolidado
      </ToggleGroupItem>
      <ToggleGroupItem
        value="daily"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium data-[state=on]:bg-neon-blue/15 data-[state=on]:text-neon-blue rounded-md transition-colors"
      >
        <CalendarDays className="w-3.5 h-3.5" />
        Desempenho Diário
      </ToggleGroupItem>
    </ToggleGroup>
    <TooltipInfo
      text="Fechamento Consolidado: acumulado mensal. Desempenho Diário: oscilação dia a dia para análise granular."
    />
  </div>
);

export default GranularityToggle;
