import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type AcaoEmLote, ROTULO_RESULTADO, type StatusResultado } from "@/lib/mlAcoes";

const COR_RESULTADO: Record<StatusResultado, string> = {
  feito: "text-ec-verde-txt",
  ja_feito: "text-muted-foreground",
  conflito: "text-ec-ambar",
  recusado: "text-destructive",
  bloqueado: "text-muted-foreground",
  nao_enviado: "text-ec-ambar",
};

/** Antes → depois de cada item, confirmação e resultado item a item. */
export function DialogoPrevia({ acao, titulo, textoConfirmar }: { acao: AcaoEmLote; titulo: string; textoConfirmar: string }) {
  const { estado, erro } = acao;
  const aberto = estado.fase !== "ocioso";
  const linhas = estado.fase === "previa" || estado.fase === "enviando" || estado.fase === "resultado" ? estado.linhas : [];
  const resultados = estado.fase === "resultado" ? new Map(estado.resultados.map((r) => [r.chave, r])) : null;
  const enviaveis = linhas.filter((l) => !l.bloqueio).length;
  const feitos = estado.fase === "resultado" ? estado.resultados.filter((r) => r.status === "feito" || r.status === "ja_feito").length : 0;

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v && estado.fase !== "enviando") acao.fechar(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {estado.fase === "carregando" && "Lendo o estado atual no Mercado Livre…"}
            {estado.fase === "previa" && `Revise antes de enviar. ${enviaveis} de ${linhas.length} serão enviados ao Mercado Livre.`}
            {estado.fase === "enviando" && "Enviando ao Mercado Livre. Não feche esta janela."}
            {estado.fase === "resultado" && `${feitos} de ${linhas.length} concluídos.`}
          </DialogDescription>
        </DialogHeader>

        {estado.fase === "carregando" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        )}

        {linhas.length > 0 && (
          <div className="overflow-x-auto border border-border [border-width:0.5px]">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-muted-foreground text-left">
                <tr className="border-b border-border">
                  <th className="py-2 px-2">Item</th>
                  <th className="pr-2">Antes</th>
                  <th className="w-4" />
                  <th className="pr-2">Depois</th>
                  <th className="pr-2">{resultados ? "Resultado" : "Observação"}</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const r = resultados?.get(l.chave);
                  return (
                    <tr key={l.chave} className="border-t border-border align-top">
                      <td className="py-2 px-2 min-w-[200px]">
                        <span className="line-clamp-2">{l.titulo ?? l.item_id ?? l.chave}</span>
                        {l.item_id && <span className="text-muted-foreground">{l.item_id}</span>}
                      </td>
                      <td className="py-2 pr-2">{l.antes}</td>
                      <td className="py-2"><ArrowRight className="h-3 w-3 text-muted-foreground" /></td>
                      <td className={`py-2 pr-2 ${l.bloqueio ? "text-muted-foreground line-through" : "font-medium"}`}>{l.depois}</td>
                      <td className="py-2 pr-2 max-w-[260px]">
                        {r ? (
                          <>
                            <span className={`font-medium ${COR_RESULTADO[r.status]}`}>{ROTULO_RESULTADO[r.status]}</span>
                            {r.mensagem && <span className="block text-muted-foreground">{r.mensagem}</span>}
                          </>
                        ) : l.bloqueio ? (
                          <span className="text-destructive">{l.bloqueio}</span>
                        ) : l.aviso ? (
                          <span className="text-ec-ambar">{l.aviso}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <DialogFooter>
          {estado.fase === "resultado" ? (
            <Button onClick={acao.fechar}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={acao.fechar} disabled={estado.fase === "enviando"}>Cancelar</Button>
              <Button onClick={acao.confirmar} disabled={estado.fase !== "previa" || enviaveis === 0}>
                {estado.fase === "enviando" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {textoConfirmar}{enviaveis > 1 ? ` (${enviaveis})` : ""}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
