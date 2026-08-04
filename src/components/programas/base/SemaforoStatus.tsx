import { CheckCircle2, CircleDashed, CircleHelp, Minus, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EstadoAlavanca, StatusOkr } from "@/types/programas";

type Tom = "verde" | "ambar" | "vermelho" | "neutro" | "hachurado";

const TOM_CLASSES: Record<Tom, string> = {
  verde: "text-emerald border-emerald/40 bg-emerald/10",
  ambar: "text-warning border-warning/40 bg-warning/10",
  vermelho: "text-destructive border-destructive/40 bg-destructive/10",
  neutro: "text-muted-foreground border-border bg-muted/40",
  hachurado: "text-muted-foreground border-dashed border-border bg-muted/20",
};

const MAPA_ALAVANCA: Record<EstadoAlavanca, { tom: Tom; rotulo: string; Icon: typeof CheckCircle2 }> = {
  ativo: { tom: "verde", rotulo: "Ativo", Icon: CheckCircle2 },
  parcial: { tom: "ambar", rotulo: "Parcial", Icon: PieChart },
  nao_ativado: { tom: "vermelho", rotulo: "Não ativado", Icon: CircleDashed },
  nao_elegivel: { tom: "neutro", rotulo: "Não elegível", Icon: Minus },
  sem_dado: { tom: "hachurado", rotulo: "Sem dado", Icon: CircleHelp },
};

const MAPA_OKR: Record<StatusOkr, { tom: Tom; rotulo: string; Icon: typeof CheckCircle2 }> = {
  verde: { tom: "verde", rotulo: "No alvo", Icon: CheckCircle2 },
  atencao: { tom: "ambar", rotulo: "Atenção", Icon: PieChart },
  critico: { tom: "vermelho", rotulo: "Crítico", Icon: CircleDashed },
  sem_dado: { tom: "hachurado", rotulo: "Sem dado", Icon: CircleHelp },
};

interface Props {
  estado?: EstadoAlavanca;
  status?: StatusOkr;
  className?: string;
  compacto?: boolean;
}

/** Nunca comunica status só por cor: cor + ícone + rótulo textual. */
const SemaforoStatus = ({ estado, status, className, compacto }: Props) => {
  const cfg = estado ? MAPA_ALAVANCA[estado] : MAPA_OKR[status ?? "sem_dado"];
  const { Icon } = cfg;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TOM_CLASSES[cfg.tom],
        className,
      )}
      aria-label={cfg.rotulo}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {!compacto && cfg.rotulo}
    </span>
  );
};

export default SemaforoStatus;
