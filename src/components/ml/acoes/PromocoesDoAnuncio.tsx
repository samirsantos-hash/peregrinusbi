import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ds";
import { brl } from "@/lib/format";
import { chamarFuncaoMl } from "@/lib/mlFuncoes";
import { useAcaoEmLote } from "@/lib/mlAcoes";
import { PROMO_PRECO_FIEL, STATUS_PROMO_ITEM } from "@/lib/mlRotulos";
import { DialogoPrevia } from "./DialogoPrevia";
import { ErroAcao, lerNumero } from "./AlterarPreco";

type PromoAoVivo = {
  promotion_id: string | null;
  tipo: string;
  status: string;
  preco: number | null;
  preco_original: number | null;
  offer_id: string | null;
  min: number | null;
  max: number | null;
  sugerido: number | null;
  nome: string | null;
  inicio: string | null;
  fim: string | null;
  meli_pct: number | null;
  vendedor_pct: number | null;
  estoque_min: number | null;
  estoque_max: number | null;
  nome_tipo: string;
  preco_por: "vendedor" | "ml" | "cupom" | null;
  pede_estoque: boolean;
  pede_datas: boolean;
  pode: { aderir: boolean; alterar: boolean; sair: boolean };
  motivo_sair: string | null;
};

type Resposta = { item: { item_id: string; titulo: string | null; preco: number | null; status: string | null }; promocoes: PromoAoVivo[] };

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const somarDias = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

/** Promoções de um anúncio lidas ao vivo do ML, com entrar, alterar oferta e sair. */
export function PromocoesDoAnuncio({ accountId, item, aoFechar, aoConcluir }: {
  accountId: string;
  item: { item_id: string; titulo: string | null } | null;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const consulta = useQuery({
    queryKey: ["ml-promocoes-item", accountId, item?.item_id],
    enabled: !!item,
    queryFn: () => chamarFuncaoMl<Resposta>("ml-promotions-item", { account_id: accountId, item_id: item!.item_id }),
  });
  const acao = useAcaoEmLote("ml-promotions-action", accountId, () => { consulta.refetch(); aoConcluir(); });
  const [editando, setEditando] = useState<{ chave: string; modo: "aderir" | "alterar" } | null>(null);

  const chaveDe = (p: PromoAoVivo) => `${p.tipo}:${p.promotion_id ?? ""}`;
  const lista = consulta.data?.promocoes ?? [];
  const ordem = (p: PromoAoVivo) => (p.pode.alterar || p.pode.sair ? 0 : p.pode.aderir ? 1 : 2);

  return (
    <>
      <Sheet open={!!item} onOpenChange={(v) => !v && aoFechar()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Promoções do anúncio</SheetTitle>
            <SheetDescription>
              {item?.titulo ?? item?.item_id} · {item?.item_id}
              {consulta.data?.item.preco != null && ` · preço atual ${brl(consulta.data.item.preco, true)}`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Fonte: Mercado Livre · lido agora</span>
            <Button size="sm" variant="outline" onClick={() => consulta.refetch()} disabled={consulta.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${consulta.isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {consulta.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>}
            {consulta.isError && <EmptyState falta={(consulta.error as Error).message} acao="Tente Atualizar em instantes." />}
            {consulta.data && lista.length === 0 && (
              <EmptyState falta="Nenhuma promoção ou convite para este anúncio." acao="Convites aparecem aqui quando o Mercado Livre envia." />
            )}
            {[...lista].sort((a, b) => ordem(a) - ordem(b)).map((p) => {
              const chave = chaveDe(p);
              const ed = editando?.chave === chave ? editando : null;
              return (
                <div key={chave} className="border border-border [border-width:0.5px] p-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{p.nome_tipo}{p.nome ? ` · ${p.nome}` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {STATUS_PROMO_ITEM[p.status] ?? p.status}
                        {p.inicio || p.fim ? ` · ${dataBr(p.inicio)} a ${dataBr(p.fim)}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs tabular-nums">
                      {p.preco != null && p.preco > 0 && <p className="font-medium">{brl(p.preco, true)}</p>}
                      {p.preco_original != null && p.preco_original > 0 && <p className="text-muted-foreground line-through">{brl(p.preco_original, true)}</p>}
                    </div>
                  </div>
                  {(p.min != null || p.max != null || p.sugerido != null) && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Faixa aceita pelo Mercado Livre: {brl(p.min, true)} a {brl(p.max, true)}{p.sugerido != null ? ` · sugerido ${brl(p.sugerido, true)}` : ""}
                    </p>
                  )}
                  {(p.meli_pct != null || p.vendedor_pct != null) && (
                    <p className="text-xs text-muted-foreground">Desconto: Mercado Livre {p.meli_pct ?? 0}% · vendedor {p.vendedor_pct ?? 0}%</p>
                  )}
                  {p.motivo_sair && !p.pode.sair && <p className="text-xs text-ec-ambar">{p.motivo_sair}</p>}

                  {ed ? (
                    <FormOferta
                      promo={p}
                      modo={ed.modo}
                      aoCancelar={() => setEditando(null)}
                      aoRevisar={(entrada) => {
                        setEditando(null);
                        acao.previa({ acao: ed.modo, itens: [{ item_id: item!.item_id, promotion_type: p.tipo, promotion_id: p.promotion_id, offer_id: p.offer_id, ...entrada }] });
                      }}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {p.pode.aderir && (
                        p.preco_por === "vendedor"
                          ? <Button size="sm" onClick={() => setEditando({ chave, modo: "aderir" })}>Entrar</Button>
                          : <Button size="sm" onClick={() => acao.previa({ acao: "aderir", itens: [{ item_id: item!.item_id, promotion_type: p.tipo, promotion_id: p.promotion_id, offer_id: p.offer_id }] })}>Entrar</Button>
                      )}
                      {p.pode.alterar && <Button size="sm" variant="outline" onClick={() => setEditando({ chave, modo: "alterar" })}>Alterar oferta</Button>}
                      {p.pode.sair && (
                        <Button size="sm" variant="outline" onClick={() => acao.previa({ acao: "sair", itens: [{ item_id: item!.item_id, promotion_type: p.tipo, promotion_id: p.promotion_id, offer_id: p.offer_id }] })}>
                          Sair
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
      {acao.erro && acao.estado.fase === "ocioso" && <ErroAcao mensagem={acao.erro} aoFechar={acao.fechar} />}
      <DialogoPrevia acao={acao} titulo="Promoção do anúncio" textoConfirmar="Confirmar no Mercado Livre" />
    </>
  );
}

function FormOferta({ promo, modo, aoCancelar, aoRevisar }: {
  promo: PromoAoVivo;
  modo: "aderir" | "alterar";
  aoCancelar: () => void;
  aoRevisar: (entrada: Record<string, unknown>) => void;
}) {
  const inicial = modo === "alterar" ? promo.preco : promo.sugerido ?? promo.max;
  const [preco, setPreco] = useState(inicial != null ? String(inicial).replace(".", ",") : "");
  const [fiel, setFiel] = useState("");
  const [estoque, setEstoque] = useState(promo.estoque_min != null ? String(promo.estoque_min) : "");
  const [inicio, setInicio] = useState(hoje());
  const [fim, setFim] = useState(somarDias(hoje(), 6));

  const p = lerNumero(preco);
  const f = fiel.trim() ? lerNumero(fiel) : null;
  const desconto = promo.preco_original && Number.isFinite(p) ? 1 - p / promo.preco_original : null;
  const valido = Number.isFinite(p) && p > 0 && (f === null || (Number.isFinite(f) && f > 0 && f < p))
    && (!promo.pede_estoque || Number(estoque) > 0) && (!promo.pede_datas || (inicio && fim && fim >= inicio));

  return (
    <div className="space-y-2 border-t border-border pt-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Preço na promoção (R$)</Label>
          <Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />
          {desconto != null && <p className="text-xs text-muted-foreground">{(desconto * 100).toFixed(1).replace(".", ",")}% de desconto</p>}
        </div>
        {PROMO_PRECO_FIEL.has(promo.tipo) && (
          <div className="space-y-1">
            <Label className="text-xs">Preço para compradores fiéis (opcional)</Label>
            <Input inputMode="decimal" value={fiel} onChange={(e) => setFiel(e.target.value)} />
          </div>
        )}
        {promo.pede_estoque && (
          <div className="space-y-1">
            <Label className="text-xs">Estoque reservado</Label>
            <Input inputMode="numeric" value={estoque} onChange={(e) => setEstoque(e.target.value.replace(/\D/g, ""))} />
            {(promo.estoque_min != null || promo.estoque_max != null) && (
              <p className="text-xs text-muted-foreground">Entre {promo.estoque_min ?? "—"} e {promo.estoque_max ?? "—"}</p>
            )}
          </div>
        )}
        {promo.pede_datas && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              <Input type="date" value={inicio} min={hoje()} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim (até 14 dias)</Label>
              <Input type="date" value={fim} min={inicio} max={somarDias(inicio, 13)} onChange={(e) => setFim(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!valido} onClick={() => aoRevisar({
          deal_price: p,
          ...(f !== null ? { top_deal_price: f } : {}),
          ...(promo.pede_estoque ? { stock: Number(estoque) } : {}),
          ...(promo.pede_datas ? { start_date: inicio, finish_date: fim } : {}),
        })}>
          Revisar
        </Button>
        <Button size="sm" variant="ghost" onClick={aoCancelar}>Cancelar</Button>
      </div>
    </div>
  );
}
