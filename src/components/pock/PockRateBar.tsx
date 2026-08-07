import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

interface Props {
  rotulo: string;
  /** fração 0–1 (armazenada como fração, convertida só aqui) */
  valor: number | null;
  /** teto aceitável, também em fração */
  limite: number;
  /** máximo do eixo, em fração */
  maximo?: number;
  fonte?: string;
}

const fmtPct = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export default function PockRateBar({ rotulo, valor, limite, maximo = 0.2, fonte }: Props) {
  const semDado = valor === null || valor === undefined || Number.isNaN(valor);
  const pctBarra = semDado ? 0 : Math.min(100, (valor! / maximo) * 100);
  const pctLimite = Math.min(100, (limite / maximo) * 100);
  const dentro = !semDado && valor! <= limite;
  const cor = semDado ? "hsl(var(--border))" : dentro ? "hsl(var(--ok))" : "hsl(var(--crit))";
  const Icon = semDado ? HelpCircle : dentro ? CheckCircle2 : AlertTriangle;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maximo);

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium">{rotulo}</p>
        <span
          className="inline-flex items-center gap-1 text-[10px]"
          style={{ color: semDado ? undefined : cor }}
        >
          <Icon className="w-3 h-3" />
          <span className={semDado ? "text-muted-foreground" : ""}>
            {semDado ? "Sem dado" : dentro ? "Dentro do limite" : "Acima do limite"}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-base font-bold tnum w-[64px]" style={{ color: semDado ? undefined : cor }}>
          {semDado ? "—" : fmtPct(valor!)}
        </span>
        <div className="relative flex-1 h-2.5 rounded-full bg-muted/50 overflow-visible">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pctBarra}%`, background: cor }}
          />
          {/* marcador de limite */}
          <div
            className="absolute -top-1 -bottom-1 w-[2px]"
            style={{ left: `${pctLimite}%`, background: "hsl(var(--crit))" }}
            title={`Teto aceitável: ${fmtPct(limite)}`}
          />
        </div>
      </div>

      <div className="flex justify-between text-[9px] text-muted-foreground tnum">
        {ticks.map((t) => (
          <span key={t}>{fmtPct(t)}</span>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground">
        Limite em <span style={{ color: "hsl(var(--crit))" }}>vermelho</span>: {fmtPct(limite)}
        {fonte ? ` · ${fonte}` : ""}
      </p>
    </div>
  );
}