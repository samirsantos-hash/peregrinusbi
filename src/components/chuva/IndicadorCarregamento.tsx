import { useIsFetching } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import "./entrada-pagina.css";

export function IndicadorCarregamento() {
  const carregando = useIsFetching() > 0;
  if (!carregando) return null;
  return <div role="status" aria-label="Carregando página" className="indicador-carregamento rounded-full border border-border bg-background/80 p-2 text-primary shadow-sm"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /><span className="sr-only">Carregando página</span></div>;
}