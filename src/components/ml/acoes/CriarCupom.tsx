import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AcaoEmLote } from "@/lib/mlAcoes";
import { lerNumero } from "./AlterarPreco";

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const somarDias = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Formulário do cupom do vendedor. As regras finais são validadas no servidor e no Mercado Livre. */
export function CriarCupom({ acao, aberto, aoFechar }: { acao: AcaoEmLote; aberto: boolean; aoFechar: () => void }) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"FIXED_PERCENTAGE" | "FIXED_AMOUNT">("FIXED_PERCENTAGE");
  const [valor, setValor] = useState("");
  const [minCompra, setMinCompra] = useState("");
  const [maxDesconto, setMaxDesconto] = useState("");
  const [inicio, setInicio] = useState(hoje());
  const [fim, setFim] = useState(somarDias(hoje(), 7));
  const [orcamento, setOrcamento] = useState("");
  const [codigo, setCodigo] = useState("");

  const pct = tipo === "FIXED_PERCENTAGE";
  const preenchido = nome.trim() && lerNumero(valor) > 0 && lerNumero(minCompra) > 0 && lerNumero(orcamento) > 0
    && (!pct || lerNumero(maxDesconto) > 0) && inicio && fim;

  const revisar = () => {
    aoFechar();
    acao.previa({
      acao: "cupom_criar",
      cupom: {
        name: nome.trim(),
        sub_type: tipo,
        ...(pct ? { fixed_percentage: lerNumero(valor), max_purchase_amount: lerNumero(maxDesconto) } : { fixed_amount: lerNumero(valor) }),
        min_purchase_amount: lerNumero(minCompra),
        start_date: inicio,
        finish_date: fim,
        budget: lerNumero(orcamento),
        ...(codigo.trim() ? { partial_coupon_code: codigo.trim() } : {}),
      },
    });
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar cupom do vendedor</DialogTitle>
          <DialogDescription>
            O desconto vale no carrinho, somado à promoção ativa. Exige reputação verde e anúncios novos, ativos e não grátis. Até 31 dias.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Nome (só o vendedor vê)</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo de desconto</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FIXED_PERCENTAGE">Percentual</SelectItem>
                <SelectItem value="FIXED_AMOUNT">Valor fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{pct ? "Desconto (5% a 80%)" : "Desconto (R$)"}</Label>
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Compra mínima (R$)</Label>
            <Input inputMode="decimal" value={minCompra} onChange={(e) => setMinCompra(e.target.value)} />
          </div>
          {pct && (
            <div className="space-y-1">
              <Label className="text-xs">Desconto máximo por compra (R$)</Label>
              <Input inputMode="decimal" value={maxDesconto} onChange={(e) => setMaxDesconto(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Início</Label>
            <Input type="date" value={inicio} min={hoje()} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={fim} min={somarDias(inicio, 1)} max={somarDias(inicio, 31)} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Orçamento total (R$)</Label>
            <Input inputMode="decimal" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Código (opcional, até 10)</Label>
            <Input value={codigo} maxLength={10} onChange={(e) => setCodigo(e.target.value.replace(/[^A-Za-z0-9]/g, ""))} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Sem código, o cupom aparece para todos os compradores dos anúncios incluídos. Depois de criado, inclua os anúncios pela lista de convites do cupom.</p>
        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>Cancelar</Button>
          <Button onClick={revisar} disabled={!preenchido}>Revisar cupom</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
