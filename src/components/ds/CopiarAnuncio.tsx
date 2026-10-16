import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

/** Copia "MLB123 · Título do anúncio" para colar na busca. */
export default function CopiarAnuncio({ itemId, titulo }: { itemId: string | number; titulo?: string | null }) {
  const [ok, setOk] = useState(false);
  const id = String(itemId ?? "").replace(/\D/g, "");
  if (!id) return null;
  const texto = titulo ? `MLB${id} ${titulo}` : `MLB${id}`;
  const copiar = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true); setTimeout(() => setOk(false), 1500);
      toast.success("Copiado para pesquisar", { description: texto });
    } catch { toast.error("Não foi possível copiar"); }
  };
  return (
    <button type="button" onClick={copiar} title={`Copiar: ${texto}`} aria-label="Copiar título e número do anúncio"
      className="inline-flex shrink-0 items-center rounded p-0.5 text-muted-foreground hover:bg-muted/50 hover:text-primary">
      {ok ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
