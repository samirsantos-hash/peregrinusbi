import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PeriodSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => (
  <ToggleGroup
    type="single"
    value={value}
    onValueChange={(v) => v && onChange(v)}
    className="bg-card/60 border border-border/40 rounded-lg p-0.5"
  >
    {[
      { val: "7", label: "7D" },
      { val: "15", label: "15D" },
      { val: "30", label: "30D" },
    ].map((opt) => (
      <ToggleGroupItem
        key={opt.val}
        value={opt.val}
        className="px-3 py-1 text-xs font-medium data-[state=on]:bg-neon-blue/15 data-[state=on]:text-neon-blue rounded-md transition-colors"
      >
        {opt.label}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);

export default PeriodSelector;
