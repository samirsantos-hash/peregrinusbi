import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CURVA_A } from "@/config/limiaresCarteira";

/** Precisa do arquivo de anúncios por MLB com competitividade item a item; ainda não chega ao painel. */
export default function CurvaAPreco() {
  return (
    <section className="rounded-lg border border-border/50 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Itens Curva A com oportunidade de preço</h2>
        <Button size="sm" variant="outline" disabled className="gap-1 text-xs"><Download className="w-3.5 h-3.5" />Exportar CSV</Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Urgência: competitividade abaixo de {CURVA_A.urgencia * 100}% · Oportunidade: abaixo de {CURVA_A.oportunidade * 100}%
      </p>
      <p className="text-xs mt-3 rounded-md border border-dashed border-border/60 p-3 text-muted-foreground">
        Sem dado. Este bloco precisa do arquivo de anúncios com o código de cada anúncio (MLB) e a competitividade de preço por item. Ele aparece assim que esse arquivo for enviado.
      </p>
    </section>
  );
}
