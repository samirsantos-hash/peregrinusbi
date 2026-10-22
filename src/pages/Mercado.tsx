import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader } from "@/components/ds";
import { lerNumero } from "@/components/ml/acoes/AlterarPreco";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbaTendencias } from "@/components/ml/mercado/AbaTendencias";
import { EstudoMercado, Quadrado, type Estudo } from "@/components/ml/mercado/EstudoMercado";
import { brl } from "@/lib/format";
import { chamarFuncaoMl, dataHoraBr, useContasMl } from "@/lib/mlFuncoes";

type AnuncioCurto = { item_id: string; titulo: string | null; sku: string | null; preco: number | null; thumbnail: string | null; status: string | null };
type EstudoCurto = Pick<Estudo, "id" | "item_id" | "titulo" | "categoria_nome" | "criado_em" | "custo" | "sinais_verdes" | "sinais_amarelos" | "sinais_vermelhos">;

function useAdiado(valor: string, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

const valorOpcional = (s: string): number | null | "invalido" => {
  if (!s.trim()) return null;
  const n = lerNumero(s);
  return Number.isFinite(n) && n >= 0 ? n : "invalido";
};

export default function Mercado() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const contas = useContasMl();
  const contaId = params.get("conta") ?? "";
  const estudoId = params.get("estudo");
  const [estudando, setEstudando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mudar = (novos: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(novos)) v ? p.set(k, v) : p.delete(k);
    setParams(p, { replace: true });
  };

  useEffect(() => {
    if (!contaId && contas.data?.length) mudar({ conta: contas.data[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contas.data, contaId]);

  const lista = useQuery({
    queryKey: ["ml-estudos", contaId],
    enabled: !!contaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_market_studies")
        .select("id, item_id, titulo, categoria_nome, criado_em, custo, sinais_verdes, sinais_amarelos, sinais_vermelhos")
        .eq("account_id", contaId).order("criado_em", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as EstudoCurto[];
    },
  });

  const aberto = useQuery({
    queryKey: ["ml-estudo", estudoId],
    enabled: !!estudoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_market_studies").select("*").eq("id", estudoId).maybeSingle();
      if (error) throw error;
      const estudo = data as Estudo | null;
      if (!estudo) return { estudo: null, anterior: null };
      const { data: ant } = await (supabase as any).from("ml_market_studies").select("*")
        .eq("account_id", estudo.account_id).eq("item_id", estudo.item_id).lt("criado_em", estudo.criado_em)
        .order("criado_em", { ascending: false }).limit(1).maybeSingle();
      return { estudo, anterior: (ant ?? null) as Estudo | null };
    },
  });

  const estudar = async (itemId: string, custo: number | null, frete: number | null) => {
    setEstudando(true);
    setErro(null);
    try {
      const r = await chamarFuncaoMl<{ estudo: Estudo }>("ml-market-study", { account_id: contaId, item_id: itemId, custo, frete });
      qc.invalidateQueries({ queryKey: ["ml-estudos", contaId] });
      mudar({ estudo: r.estudo.id, item: null });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível estudar agora.");
    } finally {
      setEstudando(false);
    }
  };

  const e = aberto.data?.estudo;
  const fonte = e ? `Fonte: Mercado Livre + IA · estudado em ${dataHoraBr(e.criado_em)}` : "Fonte: Mercado Livre + IA";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={() => (estudoId ? mudar({ estudo: null }) : navigate("/"))}>
          <ArrowLeft className="h-4 w-4" /> {estudoId ? "Estudos" : "Painel"}
        </Button>
        <PageHeader
          titulo="Estudo de mercado"
          periodo={fonte}
          acoes={
            <div className="flex flex-wrap items-center gap-2">
              {!estudoId && (contas.data?.length ?? 0) > 1 && (
                <Select value={contaId} onValueChange={(v) => mudar({ conta: v, item: null })}>
                  <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Conta" /></SelectTrigger>
                  <SelectContent>
                    {contas.data!.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nickname ?? c.ml_user_id} · {c.site_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {e && (
                <Button size="sm" variant="outline" onClick={() => estudar(e.item_id, e.custo, e.frete)} disabled={estudando}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${estudando ? "animate-spin" : ""}`} /> {estudando ? "Estudando…" : "Atualizar"}
                </Button>
              )}
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

        {estudando && <Carregando texto="Lendo o Mercado Livre e escrevendo o parecer. Pode levar até 1 minuto…" />}
        {erro && !estudando && <EmptyState falta={erro} acao="Tente de novo em instantes." />}

        {estudoId ? (
          <>
            {aberto.isLoading && <Carregando />}
            {aberto.isError && <EmptyState falta="Não foi possível abrir o estudo." acao="Recarregue a página." />}
            {aberto.data && !e && <EmptyState falta="Estudo não encontrado ou sem permissão." acao="Volte para a lista de estudos." />}
            {e && (
              <>
                <div className="space-y-0.5">
                  <p className="font-medium">
                    {e.resultado.anuncio.permalink
                      ? <a href={e.resultado.anuncio.permalink} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">{e.titulo ?? e.item_id} <ExternalLink className="h-3.5 w-3.5" /></a>
                      : e.titulo ?? e.item_id}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {e.item_id}{e.categoria_nome ? ` · ${e.categoria_nome}` : ""} · preço {brl(e.resultado.anuncio.preco, true)}
                    {e.custo != null ? ` · custo informado ${brl(e.custo, true)}${e.frete ? ` + frete ${brl(e.frete, true)}` : ""}` : ""}
                  </p>
                </div>
                <EstudoMercado estudo={e} anterior={aberto.data?.anterior ?? null} />
              </>
            )}
          </>
        ) : contaId && (
          <Tabs value={params.get("aba") ?? "estudos"} onValueChange={(v) => mudar({ aba: v === "estudos" ? null : v })}>
            <TabsList>
              <TabsTrigger value="estudos">Estudos</TabsTrigger>
              <TabsTrigger value="tendencias">Tendências</TabsTrigger>
            </TabsList>
            <TabsContent value="tendencias" className="mt-4">
              <AbaTendencias accountId={contaId} />
            </TabsContent>
            <TabsContent value="estudos" className="mt-4 space-y-4">
              <NovoEstudo contaId={contaId} itemInicial={params.get("item")} ocupado={estudando} aoEstudar={estudar} />
              <section className="space-y-2">
                <h2 className="font-medium">Estudos guardados</h2>
                {lista.isLoading && <Carregando />}
                {lista.isError && <EmptyState falta="Não foi possível carregar os estudos." acao="Recarregue a página." />}
                {lista.data && lista.data.length === 0 && <EmptyState falta="Nenhum estudo feito nesta conta." acao="Escolha um anúncio acima e clique em Estudar." />}
                {lista.data && lista.data.length > 0 && (
                  <div className="overflow-x-auto border border-border [border-width:0.5px]">
                    <table className="w-full text-xs tabular-nums">
                      <thead className="text-muted-foreground text-left">
                        <tr className="border-b border-border">
                          <th className="py-2 px-2">Data</th>
                          <th className="pr-2">Anúncio</th>
                          <th className="pr-2">Categoria</th>
                          <th className="pr-2">Sinais</th>
                          <th className="pr-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {lista.data.map((s) => (
                          <tr key={s.id} className="border-t border-border">
                            <td className="py-1.5 px-2 whitespace-nowrap">{dataHoraBr(s.criado_em)}</td>
                            <td className="pr-2"><span className="line-clamp-1">{s.titulo ?? s.item_id}</span><span className="text-muted-foreground">{s.item_id}{s.custo != null ? " · com custo" : ""}</span></td>
                            <td className="pr-2">{s.categoria_nome ?? "—"}</td>
                            <td className="pr-2 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <Quadrado sinal="verde" />{s.sinais_verdes}
                                <Quadrado sinal="amarelo" />{s.sinais_amarelos}
                                <Quadrado sinal="vermelho" />{s.sinais_vermelhos}
                              </span>
                            </td>
                            <td className="pr-2 py-1 text-right">
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => mudar({ estudo: s.id })}>Abrir</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function NovoEstudo({ contaId, itemInicial, ocupado, aoEstudar }: {
  contaId: string;
  itemInicial: string | null;
  ocupado: boolean;
  aoEstudar: (itemId: string, custo: number | null, frete: number | null) => void;
}) {
  const [termo, setTermo] = useState("");
  const [escolhido, setEscolhido] = useState<AnuncioCurto | null>(null);
  const [custo, setCusto] = useState("");
  const [frete, setFrete] = useState("");
  const busca = useAdiado(termo.trim());

  useEffect(() => { setEscolhido(null); }, [contaId]);

  const inicial = useQuery({
    queryKey: ["ml-listing-um", contaId, itemInicial],
    enabled: !!itemInicial,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_listings")
        .select("item_id, titulo, sku, preco, thumbnail, status").eq("account_id", contaId).eq("item_id", itemInicial).maybeSingle();
      if (error) throw error;
      return data as AnuncioCurto | null;
    },
  });
  useEffect(() => { if (inicial.data) setEscolhido(inicial.data); }, [inicial.data]);

  const resultados = useQuery({
    queryKey: ["ml-listings-mercado", contaId, busca],
    enabled: !escolhido && (busca.length === 0 || busca.length >= 2),
    queryFn: async () => {
      if (!busca) {
        const { data, error } = await (supabase as any).from("ml_listings").select("item_id, titulo, sku, preco, thumbnail, status")
          .eq("account_id", contaId).eq("status", "active").order("vendidos", { ascending: false, nullsFirst: false }).limit(10);
        if (error) throw error;
        return (data ?? []) as AnuncioCurto[];
      }
      const { data, error } = await (supabase as any).rpc("ml_buscar_anuncios", { p_account_id: contaId, p_termo: busca, p_limite: 20 });
      if (error) throw error;
      return (data ?? []) as AnuncioCurto[];
    },
  });

  const c = valorOpcional(custo), f = valorOpcional(frete);
  const invalido = c === "invalido" || f === "invalido";

  return (
    <section className="space-y-3 border border-border [border-width:0.5px] p-4">
      <h2 className="font-medium">Novo estudo</h2>
      {escolhido ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {escolhido.thumbnail && <img src={escolhido.thumbnail} alt="" className="h-10 w-10 object-contain border border-border" />}
            <div className="min-w-0">
              <p className="line-clamp-1">{escolhido.titulo ?? escolhido.item_id}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{escolhido.item_id} · {brl(escolhido.preco, true)}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEscolhido(null)} disabled={ocupado}>Trocar</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative max-w-xl">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={termo} onChange={(ev) => setTermo(ev.target.value)} placeholder="Título, SKU ou MLB do anúncio" className="pl-8" aria-label="Buscar anúncio para estudar" />
          </div>
          <p className="text-xs text-muted-foreground">{busca ? `Resultados para "${busca}"` : "Sem busca: os 10 anúncios ativos mais vendidos."}</p>
          {resultados.isLoading && <Carregando />}
          {resultados.isError && <EmptyState falta="Não foi possível buscar agora." acao="Tente de novo em instantes." />}
          {resultados.data && resultados.data.length === 0 && <EmptyState falta="Nenhum anúncio encontrado." acao="Confira o termo ou atualize os anúncios na página Anúncios." />}
          {resultados.data?.map((a) => (
            <button
              key={a.item_id}
              type="button"
              onClick={() => setEscolhido(a)}
              className="flex w-full items-center gap-2 border-t border-border pt-2 text-left hover:text-primary"
            >
              {a.thumbnail && <img src={a.thumbnail} alt="" className="h-8 w-8 object-contain border border-border" />}
              <span className="min-w-0 flex-1 line-clamp-1">{a.titulo ?? a.item_id}</span>
              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{a.item_id} · {brl(a.preco, true)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Custo do produto (opcional)</span>
          <Input value={custo} onChange={(ev) => setCusto(ev.target.value)} placeholder="R$ 0,00" inputMode="decimal" className="w-40" />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Frete pago por você (opcional)</span>
          <Input value={frete} onChange={(ev) => setFrete(ev.target.value)} placeholder="R$ 0,00" inputMode="decimal" className="w-40" />
        </label>
        <Button
          onClick={() => escolhido && !invalido && aoEstudar(escolhido.item_id, c as number | null, f as number | null)}
          disabled={!escolhido || invalido || ocupado}
        >
          {ocupado ? "Estudando…" : "Estudar"}
        </Button>
      </div>
      {invalido && <p className="text-xs text-destructive">Custo e frete devem ser valores em reais, maiores ou iguais a zero.</p>}
      <p className="text-xs text-muted-foreground">
        Compara com as ofertas do catálogo do Mercado Livre, os mais vendidos e os termos em alta da categoria. Sem o custo, o estudo mostra a tarifa do ML mas não a margem. Só leitura: nada é alterado no Mercado Livre.
      </p>
    </section>
  );
}

const Carregando = ({ texto = "Carregando…" }: { texto?: string }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" /> {texto}
  </div>
);
