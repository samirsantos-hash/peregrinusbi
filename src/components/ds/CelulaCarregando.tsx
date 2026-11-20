import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

const VAZIOS = new Set(["—", "…", "Sem dado", ""]);

/** Enquanto busca dados que faltam, troca o traço por um spinner; ao terminar, mostra o valor ou "Sem dado". */
export function CelulaCarregando({ valor, carregando }: { valor: ReactNode; carregando: boolean }) {
  const vazio = valor == null || (typeof valor === "string" && VAZIOS.has(valor));
  if (vazio && carregando) return <Loader2 className="inline h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Carregando" />;
  if (vazio) return <span className="text-muted-foreground">Sem dado</span>;
  return <>{valor}</>;
}
