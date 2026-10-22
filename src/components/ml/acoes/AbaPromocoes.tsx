import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ds";
import { brl, num } from "@/lib/format";
import { chamarFuncaoMl, dataHoraBr } from "@/lib/mlFuncoes";
import { useAcaoEmLote } from "@/lib/mlAcoes";
import { PROMO_PRECO_VENDEDOR, STATUS_PROMO_ITEM, STATUS_PROMOCAO, TIPO_PROMOCAO } from "@/lib/mlRotulos";
import { DialogoPrevia } from "./DialogoPrevia";
import { ErroAcao, lerNumero, MAX_LOTE } from "./AlterarPreco";
import { CriarCupom } from "./CriarCupom";

type Promocao = {
  promotion_id: string;
  tipo: string;
  sub_tipo: string | null;
  status: string | null;
  nome: string | null;
  inicio: string | null;
  fim: string | null;
  prazo: string | null;
  beneficios: { meli_percent?: number; seller_percent?: number } | null;
  extras: Record<string, unknown>;
  candidatos: number | null;
  participando: number | null;
  itens_completo: boolean;
  synced_at: string;
};

type ItemPromo = {
  item_id: string;
  status: string;
  status_item: string | null;
  preco: number | null;
  preco_original: number | null;
  offer_id: string | null;
  preco_min: number | null;
  preco_max: number | null;
  preco_sugerido: number | null;
  meli_pct: number | null;
  vendedor_pct: number | null;
};

type Filtro = "convites" | "participando" | "todos";
const STATUS_FILTRO: Record<Filtro, string[] | null> = {
  convites: ["candidate", "candidated"],
  participando: ["started", "pending", "programmed", "active"],
  todos: null,
};
const PASSO = 200;

const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const convite = (s: string) => s === "candidate" || s === "candidated";

export function AbaPromocoes({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const [atualizando, setAtualizando] = useState(false);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [criandoCupom, setCriandoCupom] = useState(false);
  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["ml-promocoes", accountId] });
    qc.invalidateQueries({ queryKey: ["ml-promocao-itens", accountId] });
  };
  const acao = useAcaoEmLote("ml-promotions-action", accountId, recarregar);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const avisar = () => { clearTimeout(t); t = setTimeout(recarregar, 1500); };
    const canal = supabase
      .channel(`ml_promocoes_${accountId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ml_promotions", filter: `account_id=eq.${accountId}` }, avisar)
      .on("postgres_changes", { event: "*", schema: "public", table: "ml_promotion_items", filter: `account_id=eq.${accountId}` }, avisar)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(canal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const promocoes = useQuery({
    queryKey: ["ml-promocoes", accountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_promotions").select("*")
        .eq("account_id", accountId).order("prazo", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Promocao[];
    },
  });

  useEffect(() => { setSelecionada(null); }, [accountId]);

  const atualizar = async () => {
    setAtualizando(true);
    try {
      const r = await chamarFuncaoMl<{ contas: { erro: string | null; promocoes: number; pendentes: number }[] }>("ml-promotions-sync", { account_id: accountId });
      const c = r.contas?.[0];
      if (c?.erro) toast.error(c.erro);
      else if (c?.pendentes) toast.info(`${num(c.promocoes)} promoções lidas. Faltam os anúncios de ${num(c.pendentes)}; clique em Atualizar de novo.`);
      else toast.success("Promoções atualizadas do Mercado Livre.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar agora.");
    } finally {
      setAtualizando(false);
      recarregar();
    }
  };

  const lista = promocoes.data ?? [];
  const ultima = lista.reduce<string | null>((m, p) => (!m || p.synced_at > m ? p.synced_at : m), null);
  const promo = lista.find((p) => p.promotion_id === selecionada) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {ultima ? `Fonte: Mercado Livre · atualizado em ${dataHoraBr(ultima)}` : "Fonte: Mercado Livre"} · o desconto individual fica em Promoções de cada anúncio
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setCriandoCupom(true)}><Plus className="h-3.5 w-3.5 mr-1.5" /> Criar cupom</Button>
          <Button size="sm" variant="outline" onClick={atualizar} disabled={atualizando}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${atualizando ? "animate-spin" : ""}`} />
            {atualizando ? "Atualizando…" : "Atualizar"}
          </Button>
        </div>
      </div>

      {promocoes.isLoading && <Carregando />}
      {promocoes.isError && <EmptyState falta="Não foi possível carregar as promoções." acao="Tente de novo em instantes." />}
      {promocoes.data && lista.length === 0 && (
        <EmptyState falta="Nenhuma promoção importada desta conta." acao="Use Atualizar para ler os convites e campanhas do Mercado Livre." />
      )}

      {lista.length > 0 && (
        <div className="overflow-x-auto border border-border [border-width:0.5px]">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border">
                <th className="py-2 px-2">Promoção</th>
                <th className="pr-2">Situação</th>
                <th className="pr-2">Período</th>
                <th className="pr-2">Aceitar até</th>
                <th className="pr-2 text-right">Convites</th>
                <th className="pr-2 text-right">Participando</th>
                <th className="pr-2">Desconto</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr
                  key={p.promotion_id}
                  onClick={() => setSelecionada(p.promotion_id === selecionada ? null : p.promotion_id)}
                  className={`border-t border-border cursor-pointer hover:bg-muted/40 ${p.promotion_id === selecionada ? "bg-muted/60" : ""}`}
                >
                  <td className="py-2 px-2">
                    <span className="font-medium">{p.nome || TIPO_PROMOCAO[p.tipo] || p.tipo}</span>
                    <span className="block text-muted-foreground">{TIPO_PROMOCAO[p.tipo] ?? p.tipo} · {p.promotion_id}</span>
                  </td>
                  <td className="pr-2">{STATUS_PROMOCAO[p.status ?? ""] ?? p.status ?? "—"}</td>
                  <td className="pr-2">{dataBr(p.inicio)} a {dataBr(p.fim)}</td>
                  <td className="pr-2">{dataBr(p.prazo)}</td>
                  <td className="pr-2 text-right">{p.candidatos == null ? "—" : num(p.candidatos)}</td>
                  <td className="pr-2 text-right">{p.participando == null ? "—" : num(p.participando)}</td>
                  <td className="pr-2">{descontoTexto(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {promo && <ItensDaPromocao key={promo.promotion_id} accountId={accountId} promo={promo} acao={acao} />}

      <CriarCupom acao={acao} aberto={criandoCupom} aoFechar={() => setCriandoCupom(false)} />
      {acao.erro && acao.estado.fase === "ocioso" && <ErroAcao mensagem={acao.erro} aoFechar={acao.fechar} />}
      <DialogoPrevia acao={acao} titulo="Promoções" textoConfirmar="Confirmar no Mercado Livre" />
    </div>
  );
}

function descontoTexto(p: Promocao) {
  const e = p.extras ?? {};
  if (p.tipo === "SELLER_COUPON_CAMPAIGN") {
    const v = e.fixed_percentage != null ? `${e.fixed_percentage}%` : e.fixed_amount != null ? brl(Number(e.fixed_amount), true) : "—";
    const restante = e.remaining_budget != null ? ` · resta ${brl(Number(e.remaining_budget), true)}` : "";
    return `${v} acima de ${brl(Number(e.min_purchase_amount ?? 0), true)}${restante}`;
  }
  const b = p.beneficios;
  if (b && (b.meli_percent != null || b.seller_percent != null)) return `ML ${b.meli_percent ?? 0}% · vendedor ${b.seller_percent ?? 0}%`;
  return "—";
}

function ItensDaPromocao({ accountId, promo, acao }: { accountId: string; promo: Promocao; acao: ReturnType<typeof useAcaoEmLote> }) {
  const [filtro, setFiltro] = useState<Filtro>(promo.candidatos ? "convites" : "participando");
  const [limite, setLimite] = useState(PASSO);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const precoVendedor = PROMO_PRECO_VENDEDOR.has(promo.tipo);
  const relampago = promo.tipo === "LIGHTNING";

  const itens = useQuery({
    queryKey: ["ml-promocao-itens", accountId, promo.promotion_id, filtro, limite],
    queryFn: async () => {
      let q = (supabase as any).from("ml_promotion_items")
        .select("item_id, status, status_item, preco, preco_original, offer_id, preco_min, preco_max, preco_sugerido, meli_pct, vendedor_pct")
        .eq("account_id", accountId).eq("promotion_id", promo.promotion_id).order("item_id").limit(limite);
      const st = STATUS_FILTRO[filtro];
      if (st) q = q.in("status", st);
      const { data, error } = await q;
      if (error) throw error;
      const linhas = (data ?? []) as ItemPromo[];
      const ids = linhas.map((l) => l.item_id);
      const titulos = new Map<string, { titulo: string | null; thumbnail: string | null }>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data: an } = await (supabase as any).from("ml_listings").select("item_id, titulo, thumbnail").in("item_id", ids.slice(i, i + 200));
        (an ?? []).forEach((a: { item_id: string; titulo: string | null; thumbnail: string | null }) => titulos.set(a.item_id, a));
      }
      return linhas.map((l) => ({ ...l, ...(titulos.get(l.item_id) ?? { titulo: null, thumbnail: null }) }));
    },
  });

  useEffect(() => { setMarcados(new Set()); }, [filtro]);

  const linhas = useMemo(() => itens.data ?? [], [itens.data]);
  const marcadosLinhas = linhas.filter((l) => marcados.has(l.item_id));
  const paraEntrar = marcadosLinhas.filter((l) => convite(l.status));
  const paraSair = marcadosLinhas.filter((l) => !convite(l.status));
  const precoDe = (l: ItemPromo) => {
    const t = precos[l.item_id];
    if (t !== undefined) return lerNumero(t);
    return l.preco_sugerido ?? l.preco_max ?? NaN;
  };
  const precosValidos = !precoVendedor || paraEntrar.every((l) => Number.isFinite(precoDe(l)) && precoDe(l) > 0);

  const alternar = (id: string) => setMarcados((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else if (n.size < MAX_LOTE) n.add(id);
    else toast.info(`No máximo ${MAX_LOTE} anúncios por vez.`);
    return n;
  });
  const marcarTodos = () => setMarcados(marcados.size ? new Set() : new Set(linhas.slice(0, MAX_LOTE).map((l) => l.item_id)));

  const entrar = () => acao.previa({
    acao: "aderir",
    itens: paraEntrar.map((l) => ({
      item_id: l.item_id,
      promotion_type: promo.tipo,
      promotion_id: promo.promotion_id,
      offer_id: l.offer_id,
      ...(precoVendedor ? { deal_price: precoDe(l) } : {}),
    })),
  });
  const sair = () => acao.previa({
    acao: "sair",
    itens: paraSair.map((l) => ({ item_id: l.item_id, promotion_type: promo.tipo, promotion_id: promo.promotion_id, offer_id: l.offer_id })),
  });

  return (
    <div className="space-y-3 border border-border [border-width:0.5px] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{promo.nome || TIPO_PROMOCAO[promo.tipo] || promo.tipo}</p>
          <p className="text-xs text-muted-foreground">
            {TIPO_PROMOCAO[promo.tipo] ?? promo.tipo}
            {precoVendedor ? " · você define o preço" : promo.tipo === "SELLER_COUPON_CAMPAIGN" ? " · desconto no carrinho" : " · preço definido pelo Mercado Livre"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {promo.tipo === "SELLER_COUPON_CAMPAIGN" && promo.status !== "finished" && (
            <Button size="sm" variant="outline" onClick={() => acao.previa({ acao: "cupom_excluir", promotion_id: promo.promotion_id })}>Excluir cupom</Button>
          )}
          <Button size="sm" onClick={entrar} disabled={!paraEntrar.length || !precosValidos || relampago}>
            Entrar com selecionados{paraEntrar.length ? ` (${paraEntrar.length})` : ""}
          </Button>
          <Button size="sm" variant="outline" onClick={sair} disabled={!paraSair.length}>
            Sair com selecionados{paraSair.length ? ` (${paraSair.length})` : ""}
          </Button>
        </div>
      </div>
      {relampago && <p className="text-xs text-ec-ambar">Oferta relâmpago pede estoque por anúncio: use Promoções na linha do anúncio, na aba Anúncios.</p>}

      <Tabs value={filtro} onValueChange={(v) => { setFiltro(v as Filtro); setLimite(PASSO); }}>
        <TabsList>
          <TabsTrigger value="convites">Convites</TabsTrigger>
          <TabsTrigger value="participando">Participando</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {itens.isLoading && <Carregando />}
      {itens.isError && <EmptyState falta="Não foi possível carregar os anúncios desta promoção." acao="Tente de novo em instantes." />}
      {itens.data && linhas.length === 0 && (
        <EmptyState falta="Nenhum anúncio nesta situação." acao={promo.itens_completo ? "Troque o filtro." : "A leitura desta promoção não terminou. Use Atualizar."} />
      )}

      {linhas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border">
                <th className="py-2 px-2 w-6">
                  <Checkbox checked={marcados.size > 0} onCheckedChange={marcarTodos} aria-label="Marcar até 50" />
                </th>
                <th className="pr-2">Anúncio</th>
                <th className="pr-2">Situação</th>
                <th className="pr-2 text-right">Preço sem desconto</th>
                <th className="pr-2 text-right">{precoVendedor ? "Preço na promoção" : "Preço com desconto"}</th>
                {precoVendedor && <th className="pr-2 text-right">Faixa aceita</th>}
                <th className="pr-2">Desconto</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const editavel = precoVendedor && convite(l.status) && marcados.has(l.item_id);
                return (
                  <tr key={l.item_id} className="border-t border-border align-top">
                    <td className="py-2 px-2">
                      <Checkbox checked={marcados.has(l.item_id)} onCheckedChange={() => alternar(l.item_id)} aria-label={`Marcar ${l.item_id}`} />
                    </td>
                    <td className="py-2 pr-2 min-w-[220px]">
                      <span className="line-clamp-2">{l.titulo ?? l.item_id}</span>
                      <span className="text-muted-foreground">{l.item_id}{l.status_item === "paused" ? " · pausado" : ""}</span>
                    </td>
                    <td className="py-2 pr-2">{STATUS_PROMO_ITEM[l.status] ?? l.status}</td>
                    <td className="py-2 pr-2 text-right">{brl(l.preco_original, true)}</td>
                    <td className="py-2 pr-2 text-right">
                      {editavel ? (
                        <Input
                          className="h-7 w-24 ml-auto text-right"
                          inputMode="decimal"
                          value={precos[l.item_id] ?? String(l.preco_sugerido ?? l.preco_max ?? "").replace(".", ",")}
                          onChange={(e) => setPrecos((p) => ({ ...p, [l.item_id]: e.target.value }))}
                        />
                      ) : l.preco ? brl(l.preco, true) : "—"}
                    </td>
                    {precoVendedor && (
                      <td className="py-2 pr-2 text-right text-muted-foreground">
                        {l.preco_min != null || l.preco_max != null ? `${brl(l.preco_min, true)} a ${brl(l.preco_max, true)}` : "—"}
                        {l.preco_sugerido != null && <span className="block">sugerido {brl(l.preco_sugerido, true)}</span>}
                      </td>
                    )}
                    <td className="py-2 pr-2">
                      {l.meli_pct != null || l.vendedor_pct != null ? `ML ${l.meli_pct ?? 0}% · vendedor ${l.vendedor_pct ?? 0}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {linhas.length >= limite && (
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setLimite((n) => n + PASSO)}>Mostrar mais</Button>
          )}
        </div>
      )}
    </div>
  );
}

const Carregando = () => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
  </div>
);
