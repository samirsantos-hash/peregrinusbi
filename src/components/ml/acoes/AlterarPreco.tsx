import { usePermissoes } from '@/hooks/usePermissoes';
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl } from "@/lib/format";
import { useAcaoEmLote } from "@/lib/mlAcoes";
import { DialogoPrevia } from "./DialogoPrevia";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { precoPorMargem } from '@/lib/precoPorMargem';

export type ItemPreco = { item_id: string; titulo: string | null; preco: number | null };
type TipoRegra = "valor" | "percentual" | "soma";

export const MAX_LOTE = 50;

/** Aceita "1.234,56", "1234,56" e "1234.56". */
export const lerNumero = (s: string) => {
  const t = s.trim().replace(/\s|R\$|%/g, "").replace("−", "-");
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};

/** Um anúncio: preço novo. Vários: mesmo valor, % ou soma em R$. A prévia vem do servidor com o preço atual do ML. */
export function AlterarPreco({ accountId, itens, aberto, aoFechar, aoConcluir }: {
  accountId: string;
  itens: ItemPreco[];
  aberto: boolean;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const { pode } = usePermissoes();
  const alterar = pode('preco.alterar');
  const acao = useAcaoEmLote("ml-price-action", accountId, aoConcluir);
  const [tipo, setTipo] = useState<TipoRegra>("valor");
  const [valor, setValor] = useState("");
  const [modo, setModo] = useState('preco');
  const [margem, setMargem] = useState('');
  const [custos, setCustos] = useState<Record<string, { custo: string; fixos: string; taxas: string }>>({});
  const um = itens.length === 1;
  const precoInicial = um && itens[0].preco != null ? String(itens[0].preco).replace(".", ",") : "";

  useEffect(() => {
    if (aberto) {
      setModo('preco'); setMargem(''); setCustos({});
      setTipo(um ? "valor" : "percentual");
      setValor(precoInicial);
    }
  }, [aberto, um, precoInicial]);

  const n = lerNumero(valor);
  const calculados = itens.map(i => {
    const c = custos[i.item_id];
    return { item_id: i.item_id, preco_novo: c ? precoPorMargem(lerNumero(c.custo),lerNumero(c.fixos),lerNumero(c.taxas),lerNumero(margem)) : null };
  });
  const valido = itens.length > 0 && itens.length <= MAX_LOTE && (modo === 'margem' ? calculados.every(i => i.preco_novo != null) : Number.isFinite(n) && (tipo === "valor" ? n > 0 : n !== 0));
  const editarCusto = (id: string, campo: 'custo' | 'fixos' | 'taxas', valor: string) => setCustos(c => ({...c,[id]:{ custo:'',fixos:'',taxas:'',...c[id],[campo]:valor }}));

  const revisar = () => {
    if (!alterar || !valido) return;
    aoFechar();
    if (modo === 'margem') acao.previa({ itens: calculados });
    else if (um) acao.previa({ itens: [{ item_id: itens[0].item_id, preco_novo: n }] });
    else acao.previa({ item_ids: itens.map((i) => i.item_id), regra: { tipo, valor: n } });
  };

  return (
    <>
      <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
        <DialogContent className="price-edit-dialog max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar preço</DialogTitle>
            <DialogDescription>
              {um ? `${itens[0]?.titulo ?? itens[0]?.item_id} · hoje ${brl(itens[0]?.preco, true)}` : `${itens.length} anúncios selecionados`}
            </DialogDescription>
          </DialogHeader>
          <Tabs value={modo} onValueChange={setModo}>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="preco">Preço de venda</TabsTrigger><TabsTrigger value="margem">Margem desejada</TabsTrigger></TabsList>
          </Tabs>
          {modo === 'margem' ? <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="margem-alvo">Margem de lucro desejada (%)</Label><Input id="margem-alvo" inputMode="decimal" value={margem} onChange={e => setMargem(e.target.value)} placeholder="20" /></div>
            <p className="text-xs text-muted-foreground">Margem sobre o preço de venda, considerando os custos e taxas informados. Inclua comissões, impostos e demais encargos; informe 0 quando não houver.</p>
            {itens.map(i => { const c = custos[i.item_id]; const preco = calculados.find(p => p.item_id === i.item_id)?.preco_novo; return <div key={i.item_id} className="space-y-3 border-t border-border pt-3">
              <p className="text-sm font-medium break-words">{i.titulo ?? i.item_id}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([{campo:'custo',texto:'Custo do produto (R$)'},{campo:'fixos',texto:'Outros custos fixos (R$)'},{campo:'taxas',texto:'Taxas e impostos (%)'}] as const).map(f => <div key={f.campo} className="space-y-1.5"><Label htmlFor={`${i.item_id}-${f.campo}`}>{f.texto}</Label><Input id={`${i.item_id}-${f.campo}`} inputMode="decimal" value={c?.[f.campo] ?? ''} onChange={e => editarCusto(i.item_id,f.campo,e.target.value)} placeholder="0,00" /></div>)}
              </div>
              <p className="text-sm tabular-nums">Preço calculado: <strong>{preco == null ? 'Preencha custos, taxas e margem válida' : brl(preco,true)}</strong></p>
            </div>; })}
            <p className="text-xs text-muted-foreground">Preço = (custo + custos fixos) ÷ (1 − taxas − margem). Taxas + margem devem ficar abaixo de 100%. A prévia confirma o preço atual no Mercado Livre.</p>
          </div> : <>
          {!um && (
            <div className="space-y-1.5">
              <Label>Como mudar</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRegra)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Subir ou baixar em %</SelectItem>
                  <SelectItem value="soma">Somar ou subtrair R$</SelectItem>
                  <SelectItem value="valor">Mesmo preço para todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="preco-valor">
              {tipo === "valor" ? "Preço novo (R$)" : tipo === "percentual" ? "Variação em % (use − para baixar)" : "Valor em R$ (use − para baixar)"}
            </Label>
            <Input id="preco-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === "percentual" ? "-5" : "0,00"} />
            <p className="text-xs text-muted-foreground">
              A prévia mostra o antes e o depois de cada anúncio, com o preço atual do Mercado Livre. Anúncios com automação de preços ativa ficam de fora.
            </p>
          </div>
          </>}
          <DialogFooter>
            <Button variant="outline" onClick={aoFechar}>Cancelar</Button>
            <Button onClick={revisar} disabled={!alterar || !valido || acao.estado.fase === "carregando"}>
              {acao.estado.fase === "carregando" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Revisar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {acao.erro && acao.estado.fase === "ocioso" && <ErroAcao mensagem={acao.erro} aoFechar={acao.fechar} />}
      <DialogoPrevia acao={acao} titulo="Alterar preço" textoConfirmar="Confirmar preço" />
    </>
  );
}

export function ErroAcao({ mensagem, aoFechar }: { mensagem: string; aoFechar: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="price-edit-dialog max-w-md">
        <DialogHeader>
          <DialogTitle>Não foi possível gerar a prévia</DialogTitle>
          <DialogDescription>{mensagem}</DialogDescription>
        </DialogHeader>
        <DialogFooter><Button onClick={aoFechar}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
