import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lerNumero } from "@/components/ml/acoes/AlterarPreco";
import {
  type DadosCampanha,
  type Estrategia,
  ESTRATEGIAS,
  NOME_ESTRATEGIA,
  ROAS_MAX,
  ROAS_MIN,
  type StatusAds,
} from "../../../../supabase/functions/_shared/mlAdsGestao";
import { type CampanhaLinha } from "@/lib/adsAnalise";

const paraTexto = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

/** Criar (campanha = null) ou editar. Envia só para a prévia; nada vai ao ML sem confirmação. */
export function FormCampanha({ campanha, aberto, aoFechar, aoRevisar }: {
  campanha: CampanhaLinha | null;
  aberto: boolean;
  aoFechar: () => void;
  aoRevisar: (dados: DadosCampanha) => void;
}) {
  const [nome, setNome] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [roas, setRoas] = useState("");
  const [estrategia, setEstrategia] = useState<Estrategia>("profitability");
  const [status, setStatus] = useState<StatusAds>("active");

  useEffect(() => {
    if (!aberto) return;
    setNome(campanha?.name ?? "");
    setOrcamento(paraTexto(campanha?.budget ?? campanha?.daily_budget));
    setRoas(paraTexto(campanha?.roas_target));
    setEstrategia((ESTRATEGIAS as readonly string[]).includes(campanha?.strategy?.toLowerCase() ?? "") ? campanha!.strategy!.toLowerCase() as Estrategia : "profitability");
    setStatus(campanha?.status?.toLowerCase() === "paused" ? "paused" : "active");
  }, [aberto, campanha]);

  const o = lerNumero(orcamento);
  const r = lerNumero(roas);
  const erros = [
    !nome.trim() && "Informe o nome.",
    !(Number.isFinite(o) && o > 0) && "Orçamento diário deve ser maior que zero.",
    !(Number.isFinite(r) && r >= ROAS_MIN && r <= ROAS_MAX) && `ROAS alvo entre ${ROAS_MIN} e ${ROAS_MAX}.`,
  ].filter(Boolean) as string[];

  const revisar = () => {
    if (erros.length) return;
    aoRevisar({ name: nome.trim(), budget: o, roas_target: r, strategy: estrategia, status });
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{campanha ? "Editar campanha" : "Nova campanha"}</DialogTitle>
          <DialogDescription>
            {campanha
              ? "Só os campos alterados são enviados. A prévia relê a campanha no Mercado Livre."
              : "A campanha nasce sem anúncios; inclua os anúncios depois, na aba Anúncios."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Nome</span>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Orçamento médio diário (R$)</span>
              <Input value={orcamento} onChange={(e) => setOrcamento(e.target.value)} inputMode="decimal" placeholder="50,00" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">ROAS alvo ({ROAS_MIN}× a {ROAS_MAX}×)</span>
              <Input value={roas} onChange={(e) => setRoas(e.target.value)} inputMode="decimal" placeholder="8" />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            O Mercado Livre pode gastar até o dobro do orçamento num dia, compensando em outros; a cobrança considera 30 dias.
            {Number.isFinite(r) && r > 0 ? ` ROAS ${String(r).replace(".", ",")}× equivale a ACOS de ${(100 / r).toFixed(1).replace(".", ",")}%.` : ""}
            {campanha?.roas_target == null && campanha?.acos_target != null ? ` Esta campanha tinha ACOS alvo de ${paraTexto(campanha.acos_target)}%; a API agora usa ROAS alvo.` : ""}
          </p>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Estratégia</span>
            <Select value={estrategia} onValueChange={(v) => setEstrategia(v as Estrategia)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTRATEGIAS.map((e) => <SelectItem key={e} value={e}>{NOME_ESTRATEGIA[e]}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusAds)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {erros.length > 0 && <p className="text-xs text-destructive">{erros.join(" ")}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>Cancelar</Button>
          <Button onClick={revisar} disabled={erros.length > 0}>Revisar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
