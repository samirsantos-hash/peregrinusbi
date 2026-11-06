import { Fragment, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BuscarLojaMl from "@/components/ml/BuscarLojaMl";
import CorrelacoesAnuncios from "@/components/ml/CorrelacoesAnuncios";
import ParticipacaoAnuncios from "@/components/ml/ParticipacaoAnuncios";
import GuardaPermissao from "@/components/GuardaPermissao";
import CurvaAbc from "@/components/ml/CurvaAbc";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X } from "lucide-react";
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
  categoria_id?: string | null;
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
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const contas = useContasMl();
  const { pode } = usePermissoes();
  const [contaId, setContaId] = useState("");
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [aba, setAba] = useState(['anuncios', 'promocoes', 'melhorias', 'correlacoes', 'abc', 'participacao', 'fora', 'multiplas'].includes(params.get('aba') ?? '') ? params.get('aba') ?? 'anuncios' : 'anuncios');
  useEffect(() => { const proxima = params.get('aba') ?? 'anuncios'; if (['anuncios', 'promocoes', 'melhorias', 'correlacoes', 'abc', 'participacao', 'fora', 'multiplas'].includes(proxima)) setAba(proxima); }, [params]);
  const [marcados, setMarcados] = useState<Map<string, Anuncio>>(new Map());
  const [precoPara, setPrecoPara] = useState<Anuncio[]>([]);
  const [promocoesDe, setPromocoesDe] = useState<Anuncio | null>(null);
  const [melhoriasDe, setMelhoriasDe] = useState<Anuncio | null>(null);
  const busca = useAdiado(termo.trim());

  useEffect(() => {
    if (!contaId && contas.data?.length) {
      const solicitada = contas.data.find(c => String(c.ml_user_id) === params.get("loja"));
      setContaId(solicitada?.id ?? contas.data[0].id);
    }
  }, [contas.data, contaId, params]);

  useEffect(() => { setMarcados(new Map()); setPromocoesDe(null); setMelhoriasDe(null); }, [contaId]);

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

  const idsVisiveis = (resultados.data ?? []).map(a => a.item_id);
  const participacoes = useQuery({
    queryKey: ["ml-promo-participacoes", contaId, idsVisiveis.join(",")],
    enabled: !!contaId && idsVisiveis.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_promotion_items").select("item_id, promotion_id")
        .eq("account_id", contaId).in("item_id", idsVisiveis).in("status", ["started", "pending", "programmed", "active"]);
      if (error) throw error;
      const porItem = new Map<string, Set<string>>();
      for (const r of data ?? []) { const s = porItem.get(r.item_id) ?? new Set(); s.add(r.promotion_id); porItem.set(r.item_id, s); }
      return new Map([...porItem].map(([k, s]) => [k, s.size]));
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
      <div className={`mx-auto w-full max-w-[1760px] px-3 sm:px-5 xl:px-6 py-6 space-y-5 ${promocoesDe || melhoriasDe ? "lg:!pr-[440px]" : ""}`}>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Painel
        </Button>
        <PageHeader
          titulo="Anúncios"
          periodo={fonte}
          acoes={
            <div className="flex flex-wrap items-center gap-2">
              {!!contas.data?.length && <BuscarLojaMl contas={contas.data} value={contaId} onChange={setContaId} />}
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
            <TabsList className="max-w-full overflow-x-auto justify-start">
              <TabsTrigger value="anuncios">Anúncios</TabsTrigger>
              {pode("promocoes.visualizar") && <TabsTrigger value="promocoes">Gerenciar promoções</TabsTrigger>}
              {pode("promocoes.visualizar") && <TabsTrigger value="participacao">Participação</TabsTrigger>}
              {pode("promocoes.visualizar") && <TabsTrigger value="fora">Fora de promoções</TabsTrigger>}
              {pode("promocoes.visualizar") && <TabsTrigger value="multiplas">Duas ou mais</TabsTrigger>}
              <TabsTrigger value="melhorias">Melhorias</TabsTrigger>
              {pode("correlacoes.visualizar") && <TabsTrigger value="correlacoes">Desempenho de anúncios</TabsTrigger>}
              {pode("correlacoes.visualizar") && <TabsTrigger value="abc">Curva ABC</TabsTrigger>}
            </TabsList>
            <TabsContent value="promocoes" className="mt-4">
              <GuardaPermissao permissao="promocoes.visualizar"><AbaPromocoes accountId={contaId} /></GuardaPermissao>
            </TabsContent>
            {["participacao", "fora", "multiplas"].map(f => <TabsContent key={f} value={f} className="mt-4"><GuardaPermissao permissao="promocoes.visualizar"><ParticipacaoAnuncios key={contaId + f} custId={String(contas.data?.find(c => c.id === contaId)?.ml_user_id ?? "")} filtro={f} /></GuardaPermissao></TabsContent>)}
            <TabsContent value="melhorias" className="mt-4">
              <AbaMelhorias accountId={contaId} />
            </TabsContent>
            {pode("correlacoes.visualizar") && <TabsContent value="correlacoes" className="mt-4">
              <CorrelacoesAnuncios key={contaId} accountId={contaId} custId={String(contas.data?.find(c => c.id === contaId)?.ml_user_id ?? "")} itens={resultados.data ?? []} carregando={resultados.isLoading} erro={resultados.isError} />
            </TabsContent>}
            {pode('correlacoes.visualizar') && <TabsContent value="abc" className="mt-4"><CurvaAbc key={contaId} custId={String(contas.data?.find(c => c.id === contaId)?.ml_user_id ?? '')} /></TabsContent>}
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
                <div className="overflow-x-auto rounded-lg border border-border bg-card/30">
                  <table className="w-full text-sm tabular-nums [&_th]:px-3 [&_th]:py-3 [&_td]:px-3 [&_td]:py-3 [&_td+td]:border-l [&_td+td]:border-border/60">
                    <thead className="text-muted-foreground text-left bg-muted/30">
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
                        <th className="pr-2 text-center">Promoções</th>
                        <th className="pr-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.data.map((a) => {
                        const temVariacoes = (a.variacoes ?? []).length > 0;
                        const expandido = aberto === a.item_id;
                        return (
                          <Fragment key={a.item_id}>
                            <tr className="border-t border-border align-top even:bg-muted/15 hover:bg-muted/30">
                              <td className="py-2 px-2">
                                {temVariacoes && (
                                  <Button variant="ghost" size="icon"
                                    type="button"
                                    onClick={() => setAberto(expandido ? null : a.item_id)}
                                    aria-label={expandido ? "Ocultar variações" : "Ver variações"}
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    {expandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  </Button>
                                )}
                              </td>
                              <td className="py-2 pr-1">
                                <Checkbox checked={marcados.has(a.item_id)} onCheckedChange={() => alternar(a)} aria-label={`Selecionar ${a.item_id}`} />
                              </td>
                              <td className="py-2 pr-2 min-w-[260px]">
                                <div className="flex items-start gap-2">
                                  {a.thumbnail && <img src={a.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded border border-border object-contain" />}
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
                              <td className="pr-2 py-2 text-center">
                                {participacoes.isError || !participacoes.data ? <span className="text-muted-foreground">—</span>
                                  : (participacoes.data.get(a.item_id) ?? 0) === 0
                                    ? <X className="mx-auto h-4 w-4 text-destructive" aria-label="Sem promoções ativas" />
                                    : <span className="inline-flex items-center gap-0.5" aria-label={`${participacoes.data.get(a.item_id)} promoções ativas`} title={`${participacoes.data.get(a.item_id)} promoções ativas`}>
                                        {Array.from({ length: participacoes.data.get(a.item_id)! }, (_, i) => <Check key={i} className="h-4 w-4 text-primary" strokeWidth={3} />)}
                                      </span>}
                              </td>
                              <td className="pr-2 py-1.5 whitespace-nowrap text-right">
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPrecoPara([a])}>Preço</Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setMelhoriasDe(null); setPromocoesDe(a); }}>Promoções</Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setPromocoesDe(null); setMelhoriasDe(a); }}>Melhorias</Button>
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
                                <td colSpan={6} />
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
