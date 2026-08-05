import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavegarPreservando } from "@/contexts/ContextoNavegacao";

interface Props {
  anterior?: { rotulo: string; destino: string } | null;
  proximo?: { rotulo: string; destino: string } | null;
}

/** Setas ←/→ e teclado para o irmão anterior/seguinte, sem voltar à lista. */
export default function NavegacaoLateral({ anterior, proximo }: Props) {
  const navegar = useNavegarPreservando();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)) return;
      if (e.key === "ArrowLeft" && anterior) navegar(anterior.destino);
      if (e.key === "ArrowRight" && proximo) navegar(proximo.destino);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anterior, proximo, navegar]);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => anterior && navegar(anterior.destino)}
        disabled={!anterior}
        aria-label="Item anterior"
        title={anterior?.rotulo || "Sem item anterior"}
        className="p-1.5 rounded border border-border disabled:opacity-30 hover:bg-muted"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => proximo && navegar(proximo.destino)}
        disabled={!proximo}
        aria-label="Próximo item"
        title={proximo?.rotulo || "Sem próximo item"}
        className="p-1.5 rounded border border-border disabled:opacity-30 hover:bg-muted"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
