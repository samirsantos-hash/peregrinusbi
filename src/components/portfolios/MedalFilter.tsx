import { Badge } from "@/components/ui/badge";

const MEDALS = [
  { key: "platinum", label: "Platinum", color: "bg-muted/20 text-muted-foreground border-border hover:bg-muted/30" },
  { key: "gold", label: "Gold", color: "bg-ec-amarelo/20 text-ec-ambar border-ec-amarelo/30 hover:bg-ec-amarelo/30" },
  { key: "silver", label: "Silver", color: "bg-muted/20 text-muted-foreground border-border hover:bg-muted/30" },
  { key: "leader", label: "Líder", color: "bg-ec-verde/20 text-ok border-ec-verde/30 hover:bg-ec-verde/30" },
  { key: "sem_medalha", label: "Sem Medalha", color: "bg-muted/50 text-muted-foreground border-border hover:bg-muted" },
];

interface Props {
  selected: string[];
  onChange: (v: string[]) => void;
}

export default function MedalFilter({ selected, onChange }: Props) {
  const toggle = (key: string) => {
    onChange(
      selected.includes(key)
        ? selected.filter((s) => s !== key)
        : [...selected, key]
    );
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {MEDALS.map((m) => {
        const active = selected.includes(m.key);
        return (
          <Badge
            key={m.key}
            variant="outline"
            className={`cursor-pointer text-xs px-2.5 py-1 transition-[transform,opacity,background-color,border-color,color] border ${
              active
                ? m.color + " ring-1 ring-primary/40"
                : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/40"
            }`}
            onClick={() => toggle(m.key)}
          >
            {m.label}
          </Badge>
        );
      })}
      {selected.length > 0 && (
        <Badge
          variant="outline"
          className="cursor-pointer text-xs px-2 py-1 border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => onChange([])}
        >
          Limpar
        </Badge>
      )}
    </div>
  );
}
