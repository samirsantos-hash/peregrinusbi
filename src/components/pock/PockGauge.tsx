import { AlertTriangle, AlertCircle, Minus, CheckCircle2, HelpCircle } from "lucide-react";

export type Faixa = "crit" | "warn" | "warn-soft" | "ok" | "sem_dado";

export function faixaDe(v: number | null | undefined): Faixa {
  if (v === null || v === undefined || Number.isNaN(v)) return "sem_dado";
  if (v < 25) return "crit";
  if (v < 50) return "warn";
  if (v < 75) return "warn-soft";
  return "ok";
}

export const FAIXAS: { id: Faixa; rotulo: string; token: string; Icon: any }[] = [
  { id: "crit", rotulo: "Operação requer atenção", token: "--crit", Icon: AlertTriangle },
  { id: "warn", rotulo: "Abaixo do esperado", token: "--warn", Icon: AlertCircle },
  { id: "warn-soft", rotulo: "Média de Operação", token: "--warn-soft", Icon: Minus },
  { id: "ok", rotulo: "Modelo a ser seguido", token: "--ok", Icon: CheckCircle2 },
];

export function metaFaixa(f: Faixa) {
  return (
    FAIXAS.find((x) => x.id === f) ?? {
      id: "sem_dado" as Faixa,
      rotulo: "Sem dado",
      token: "--muted-foreground",
      Icon: HelpCircle,
    }
  );
}

interface Props {
  /** valor 0–100 em escala FIXA (nunca normalizado pelo máximo observado) */
  valor: number | null;
  rotulo: string;
  fonte?: string;
}

export default function PockGauge({ valor, rotulo, fonte }: Props) {
  const faixa = faixaDe(valor);
  const meta = metaFaixa(faixa);
  const cor = `hsl(var(${meta.token}))`;
  const pct = valor === null ? 0 : Math.max(0, Math.min(100, valor));
  const r = 34;
  const c = 2 * Math.PI * r;
  const Icon = meta.Icon;

  return (
    <div className="flex flex-col items-center text-center gap-1.5 min-w-0">
      <div className="relative w-[84px] h-[84px]">
        <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
          <circle cx="42" cy="42" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            stroke={valor === null ? "hsl(var(--border))" : cor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tnum" style={{ color: valor === null ? undefined : cor }}>
            {valor === null ? "—" : valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      <p className="text-[11px] leading-tight font-medium max-w-[120px]">{rotulo}</p>
      <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: valor === null ? undefined : cor }}>
        <Icon className="w-3 h-3 shrink-0" />
        <span className={valor === null ? "text-muted-foreground" : ""}>{meta.rotulo}</span>
      </span>
      {fonte && <span className="text-[9px] text-muted-foreground">{fonte}</span>}
    </div>
  );
}

export function LegendaFaixas() {
  const ranges = ["0–25", "25–50", "50–75", "75–100"];
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {FAIXAS.map((f, i) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1 text-[10px] rounded-full border px-2 py-0.5"
          style={{ borderColor: `hsl(var(${f.token}) / 0.4)`, color: `hsl(var(${f.token}))` }}
        >
          <f.Icon className="w-3 h-3" />
          <span className="tnum">{ranges[i]}</span>
          <span className="text-muted-foreground">{f.rotulo}</span>
        </span>
      ))}
    </div>
  );
}