import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const CLUSTERS = [
  "Todos", "Mature", "Emerging", "In professionalization", "MeliPro", "Starter/Newbie", "Churn",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function CppClusterPills({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v); }}
      className="flex flex-wrap gap-1"
    >
      {CLUSTERS.map(c => (
        <ToggleGroupItem
          key={c}
          value={c}
          className="text-xs px-3 py-1 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-full"
        >
          {c}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
