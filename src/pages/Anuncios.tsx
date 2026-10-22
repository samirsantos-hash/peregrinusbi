import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader } from "@/components/ds";
import CopiarAnuncio from "@/components/ds/CopiarAnuncio";
import { AlterarPreco, MAX_LOTE } from "@/components/ml/acoes/AlterarPreco";
import { PromocoesDoAnuncio } from "@/components/ml/acoes/PromocoesDoAnuncio";
import { AbaPromocoes } from "@/components/ml/acoes/AbaPromocoes";
import { AbaMelhorias } from "@/components/ml/acoes/AbaMelhorias";
import { MelhoriasDoAnuncio } from "@/components/ml/acoes/MelhoriasDoAnuncio";
import { brl, num } from "@/lib/format";
import { chamarFuncaoMl, dataHoraBr, useContasMl } from "@/lib/mlFuncoes";
import { LOGISTICA, STATUS_ANUNCIO, TIPO_ANUNCIO } from "@/lib/mlRotulos";

type Variacao = { id: number | null; sku: string | null; combinacao: string; preco: number | null; estoque: number | null; vendidos: number | null };

type Anuncio = {
  item_id: string;
  titulo: string | null;
  sku: string | null;
  preco: number | null;
  preco_original: number | null;
  estoque: number | null;
  vendidos: number | null;
  status: string | null;
  tipo_anuncio: string | null;
  logistica: string | null;
  frete_gratis: boolean | null;
  catalogo: boolean | null;
  thumbnail: string | null;
  link: string | null;
  saude: number | null;
  variacoes: Variacao[];
};

type Estado = { total_ml: number | null; lidos: number | null; pendentes: number | null; completo_em: string | null; synced_at: string };

function useAdiado(valor: string, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

export default function Anuncios() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contas = useContasMl();
  const [contaId, setContaId] = useState("");
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [aba, setAba] = useState("anuncios");
  const [marcados, setMarcados] = useState<Map<string, Anuncio>>(new Map());
  const [precoPara, setPrecoPara] = useState<Anuncio[]>([]);
  const [promocoesDe, setPromocoesDe] = useState<Anuncio | null>(null);
  const [melhoriasDe, setMelhoriasDe] = useState<Anuncio | null>(null);
  const busca = useAdiado(termo.trim());

  useEffect(() => {
    if (!contaId && contas.data?.length) setContaId(contas.data[0].id);
  }, [contas.data, contaId]);

  useEffect(() => { setMarcados(new Map()); }, [contaId]);

  const alternar = (a: Anuncio) => setMarcados((m) => {
    const n = new Map(m);
    if (n.has(a.item_id)) n.delete(a.item_id);
    else if (n.size < MAX_LOTE) n.set(a.item_id, a);
    else toast.info(`No máximo ${MAX_LOTE} anúncios por vez.`);
    return n;
  });

  const recarregarLista = () => {
    qc.invalidateQueries({ queryKey: ["ml-listings-busca", contaId] });
  };

  const estado = useQuery({
    queryKey: ["ml-listings-estado", contaId],
    enabled: !!contaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_listings_estado")
        .select("total_ml, lidos, pendentes, completo_em, synced_at").eq("account_id", contaId).maybeSingle();
      if (error) throw error;
      return data as Estado | null;
    },
  });

  const resultados = useQuery({
    queryKey: ["ml-listings-busca", contaId, busca],
    enabled: !!contaId && (busca.length === 0 || busca.length >= 2),
    queryFn: async () => {
      if (!busca) {
        const { data, error } = await (supabase as any).from("ml_listings").select("*")
          .eq("account_id", contaId).order("vendidos", { ascending: false, nullsFirst: false }).limit(50);
        if (error) throw error;
        return (data ?? []) as Anuncio[];
      }
      const { data, error } = await (supabase as any).rpc("ml_buscar_anuncios", { p_account_id: contaId, p_termo: busca, p_limite: 100 });
      if (error) throw error;
      return (data ?? []) as Anuncio[];
    },
  });

  const atualizar = async () => {
    if (!contaId) return;
    setAtualizando(true);
    try {
      const r = await chamarFuncaoMl<{ contas: { erro: string | null; pendentes: number; lidos: number }[] }>("ml-listings-sync", { account_id: contaId });
      const c = r.contas?.[0];
      if (c?.erro) toast.error(c.erro);
      else if (c?.pendentes) toast.info(`${num(c.lidos)} anúncios lidos. Faltam ${num(c.pendentes)}; clique em Atualizar de novo ou aguarde a próxima leitura automática.`);
      else toast.success("Anúncios atualizados do Mercado Livre.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar agora.");
    } finally {
      setAtualizando(false);
      qc.invalidateQueries({ queryKey: ["ml-listings-estado", contaId] });
      qc.invalidateQueries({ queryKey: ["ml-listings-busca", contaId] });
    }
  };

  const e = estado.data;
  const fonte = e
    ? `Fonte: Mercado Livre · atualizado em ${dataHoraBr(e.synced_at)} · ${num(e.total_ml)} anúncios ativos e pausados${e.pendentes ? ` · faltam ler ${num(e.pendentes)}` : ""}`
    : "Fonte: Mercado Livre";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Painel
        </Button>
        <PageHeader
          titulo="Anúncios"
          periodo={fonte}
          acoes={
            <div className="flex flex-wrap items-center gap-2">
              {(contas.data?.length ?? 0) > 1 && (
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Conta" /></SelectTrigger>
                  <SelectContent>
                    {contas.data!.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nickname ?? c.ml_user_id} · {c.site_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" variant="outline" onClick={atualizar} disabled={!contaId || atualizando}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${atualizando ? "animate-spin" : ""}`} />
                {atualizando ? "Atualizando…" : "Atualizar"}
              </Button>
            </div>
          }
        />

        {contas.isLoading && <Carregando />}
        {contas.isError && <EmptyState falta="Não foi possível carregar suas contas." acao="Recarregue a página." />}
        {contas.data && contas.data.length === 0 && (
          <EmptyState
            falta="Nenhuma conta do Mercado Livre ligada ao seu usuário."
            acao="O acesso vem das contas liberadas para você no Admin. Peça a liberação ao administrador."
          />
        )}

        {contaId && (
          <Tabs value={aba} onValueChange={setAba}>
            <TabsList>
              <TabsTrigger value="anuncios">Anúncios</TabsTrigger>
              <TabsTrigger value="promocoes">Promoções</TabsTrigger>
              <TabsTrigger value="melhorias">Melhorias</TabsTrigger>
            </TabsList>
            <TabsContent value="promocoes" className="mt-4">
              <AbaPromocoes accountId={contaId} />
            </TabsContent>
            <TabsContent value="melhorias" className="mt-4">
              <AbaMelhorias accountId={contaId} />
            </TabsContent>
            <TabsContent value="anuncios" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative max-w-xl flex-1 min-w-[240px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={termo}
                    onChange={(ev) => setTermo(ev.target.value)}
                    placeholder="Título, SKU ou MLB"
                    className="pl-8"
                    aria-label="Buscar anúncio por título, SKU ou MLB"
                  />
                </div>
                <Button size="sm" onClick={() => setPrecoPara([...marcados.values()])} disabled={!marcados.size}>
                  Alterar preço{marcados.size ? ` (${marcados.size})` : ""}
                </Button>
                {marcados.size > 0 && <Button size="sm" variant="ghost" onClick={() => setMarcados(new Map())}>Limpar seleção</Button>}
              </div>
              <p className="text-xs text-muted-foreground">
                {busca ? `Resultados para "${busca}"` : "Sem busca: os 50 anúncios mais vendidos da conta."}
              </p>

              {resultados.isLoading && <Carregando />}
              {resultados.isError && <EmptyState falta="Não foi possível buscar agora." acao="Tente de novo em instantes." />}
              {resultados.data && resultados.data.length === 0 && (
                e?.total_ml
                  ? <EmptyState falta="Nenhum anúncio encontrado." acao="Confira o termo. O MLB pode ser digitado com ou sem as letras." />
                  : <EmptyState falta="Os anúncios desta conta ainda não foram importados." acao="Use Atualizar para ler do Mercado Livre." />
              )}

              {resultados.data && resultados.data.length > 0 && (
                <div className="overflow-x-auto border border-border [border-width:0.5px]">
                  <table className="w-full text-xs tabular-nums">
                    <thead className="text-muted-foreground text-left">
                      <tr className="border-b border-border">
                        <th className="py-2 px-2 w-6" />
                        <th className="py-2 pr-1 w-6" />
                        <th className="py-2 pr-2">Anúncio</th>
                        <th className="pr-2">SKU</th>
                        <th className="pr-2 text-right">Preço</th>
                        <th className="pr-2 text-right">Estoque</th>
                        <th className="pr-2 text-right">Vendidos</th>
                        <th className="pr-2">Status</th>
                        <th className="pr-2">Tipo</th>
                        <th className="pr-2">Envio</th>
                        <th className="pr-2 text-right">Saúde</th>
                        <th className="pr-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.data.map((a) => {
                        const temVariacoes = (a.variacoes ?? []).length > 0;
                        const expandido = aberto === a.item_id;
                        return (
                          <Fragment key={a.item_id}>
                            <tr className="border-t border-border align-top">
                              <td className="py-2 px-2">
                                {temVariacoes && (
                                  <button
                                    type="button"
                                    onClick={() => setAberto(expandido ? null : a.item_id)}
                                    aria-label={expandido ? "Ocultar variações" : "Ver variações"}
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    {expandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  </button>
                                )}
                              </td>
                              <td className="py-2 pr-1">
                                <Checkbox checked={marcados.has(a.item_id)} onCheckedChange={() => alternar(a)} aria-label={`Selecionar ${a.item_id}`} />
                              </td>
                              <td className="py-2 pr-2 min-w-[260px]">
                                <div className="flex items-start gap-2">
                                  {a.thumbnail && <img src={a.thumbnail} alt="" className="h-10 w-10 object-contain border border-border" />}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      {a.link
                                        ? <a href={a.link} target="_blank" rel="noreferrer" className="text-primary hover:underline line-clamp-2">{a.titulo ?? a.item_id}</a>
                                        : <span className="line-clamp-2">{a.titulo ?? a.item_id}</span>}
                                      <CopiarAnuncio itemId={a.item_id} titulo={a.titulo} />
                                    </div>
                                    <p className="text-muted-foreground">
                                      {a.item_id}{a.catalogo ? " · Catálogo" : ""}{temVariacoes ? ` · ${a.variacoes.length} variações` : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="pr-2 py-2">{a.sku ?? "—"}</td>
                              <td className="pr-2 py-2 text-right">
                                {brl(a.preco, true)}
                                {a.preco_original && a.preco_original > (a.preco ?? 0) && (
                                  <span className="block text-muted-foreground line-through">{brl(a.preco_original, true)}</span>
                                )}
                              </td>
                              <td className="pr-2 py-2 text-right">{num(a.estoque)}</td>
                              <td className="pr-2 py-2 text-right">{num(a.vendidos)}</td>
                              <td className="pr-2 py-2">{STATUS_ANUNCIO[a.status ?? ""] ?? a.status ?? "—"}</td>
                              <td className="pr-2 py-2">{TIPO_ANUNCIO[a.tipo_anuncio ?? ""] ?? a.tipo_anuncio ?? "—"}</td>
                              <td className="pr-2 py-2">
                                {LOGISTICA[a.logistica ?? ""] ?? (a.logistica ? "Outro" : "—")}
                                {a.frete_gratis && <span className="block text-muted-foreground">Frete grátis</span>}
                              </td>
                              <td className="pr-2 py-2 text-right">{a.saude == null ? "Sem dado" : num(a.saude * 100)}</td>
                              <td className="pr-2 py-1.5 whitespace-nowrap text-right">
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPrecoPara([a])}>Preço</Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPromocoesDe(a)}>Promoções</Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setMelhoriasDe(a)}>Melhorias</Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => navigate(`/mercado?conta=${contaId}&item=${a.item_id}`)}>Estudar mercado</Button>
                              </td>
                            </tr>
                            {expandido && a.variacoes.map((v, i) => (
                              <tr key={`${a.item_id}-${v.id ?? i}`} className="bg-muted/30">
                                <td />
                                <td />
                                <td className="py-1.5 pr-2 pl-12 text-muted-foreground">{v.combinacao || "Variação"}</td>
                                <td className="pr-2">{v.sku ?? "—"}</td>
                                <td className="pr-2 text-right">{brl(v.preco, true)}</td>
                                <td className="pr-2 text-right">{num(v.estoque)}</td>
                                <td className="pr-2 text-right">{num(v.vendidos)}</td>
                                <td colSpan={5} />
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {contaId && (
          <>
            <AlterarPreco
              accountId={contaId}
              itens={precoPara}
              aberto={precoPara.length > 0}
              aoFechar={() => setPrecoPara([])}
              aoConcluir={() => { setMarcados(new Map()); recarregarLista(); }}
            />
            <PromocoesDoAnuncio
              accountId={contaId}
              item={promocoesDe}
              aoFechar={() => setPromocoesDe(null)}
              aoConcluir={recarregarLista}
            />
            <MelhoriasDoAnuncio accountId={contaId} item={melhoriasDe} aoFechar={() => setMelhoriasDe(null)} />
          </>
        )}
      </div>
    </div>
  );
}

const Carregando = () => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
  </div>
);
