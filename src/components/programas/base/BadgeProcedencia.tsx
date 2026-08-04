import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Metrica } from "@/types/programas";

const ROTULO: Record<Metrica["procedencia"], string> = {
  real: "",
  estimado: "est.",
  derivado: "der.",
};

const BadgeProcedencia = ({ metrica }: { metrica: Metrica }) => {
  if (metrica.procedencia === "real") return null;
  const texto = ROTULO[metrica.procedencia];
  const detalhe =
    metrica.procedencia === "derivado"
      ? `Derivado — ${metrica.formula ?? "fórmula não informada"}`
      : `Estimado — fonte: ${metrica.fonte}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ml-1 rounded border border-border px-1 text-[9px] uppercase tracking-wide text-muted-foreground align-middle cursor-help">
          {texto}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-xs">{detalhe}</TooltipContent>
    </Tooltip>
  );
};

export default BadgeProcedencia;
