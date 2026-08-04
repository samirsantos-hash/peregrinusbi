import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDadoReal } from "@/components/programas/DadoRealContext";
import BadgeProcedencia from "./BadgeProcedencia";
import type { Metrica } from "@/types/programas";

export function formatarValor(metrica: Metrica): string {
  const v = metrica.valor;
  if (v === null) return "—";
  switch (metrica.unidade) {
    case "BRL":
      return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    case "pct":
      return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
    case "dias":
      return `${v.toLocaleString("pt-BR")} d`;
    default:
      return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  }
}

interface Props {
  metrica: Metrica;
  className?: string;
  semBadge?: boolean;
}

/** Aplica 4.4 (zero ≠ sem dado) e 4.6 (procedência visível). */
const ValorMetrica = ({ metrica, className, semBadge }: Props) => {
  const { soDadoReal } = useDadoReal();
  const ocultar = soDadoReal && metrica.procedencia !== "real";
  const semDado = metrica.valor === null;

  if (ocultar) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("font-mono text-muted-foreground opacity-40 cursor-help", className)}>—</span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Oculto: métrica não é de fonte primária</TooltipContent>
      </Tooltip>
    );
  }

  if (semDado) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("font-mono text-muted-foreground cursor-help", className)}>—</span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Sem dado disponível</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatarValor(metrica)}
      {!semBadge && <BadgeProcedencia metrica={metrica} />}
    </span>
  );
};

export default ValorMetrica;
