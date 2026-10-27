import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader } from "@/components/ds";
import { DialogoPrevia } from "@/components/ml/acoes/DialogoPrevia";
import { ErroAcao } from "@/components/ml/acoes/AlterarPreco";
import { VisaoGeralAds } from "@/components/ml/ads/VisaoGeralAds";
import { CampanhasAds } from "@/components/ml/ads/CampanhasAds";
import { AnunciosAds } from "@/components/ml/ads/AnunciosAds";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { useAcaoEmLote } from "@/lib/mlAcoes";
import { chamarFuncaoMl, dataHoraBr, useContasMl } from "@/lib/mlFuncoes";
import { type CampanhaLinha, type GrupoPainel, type LinhaCampanhaDia, montarPainel } from "@/lib/adsAnalise";
import { useDesenvolvedor } from '@/hooks/useDesenvolvedor';
import { registrarAviso } from '@/lib/avisosDesenvolvedor';
import SinergiaPublicidadeApi from '@/components/ml/SinergiaPublicidade';

/** Janela de comparação: 30 dias contra os 30 anteriores (a API guarda 90). */
const DIAS = 30;

type Estado = { status: "ativo" | "sem_product_ads"; synced_at: string; metricas_campanha_em: string | null };
type RespostaSync = { contas?: { status: string; dias_pendentes: number; erros: string[] }[] };

export default function Publicidade() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const contas = useContasMl();
  const { autorizado: isDesenvolvedor } = useDesenvolvedor();
  const contaId = params.get("conta") ?? "";
  const [atualizando, setAtualizando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const mudar = (novos: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(novos)) v ? p.set(k, v) : p.delete(k);
    setParams(p, { replace: true });
  };

  useEffect(() => {
    if (!contaId && contas.data?.length) mudar({ conta: contas.data[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contas.data, contaId]);

  const estado = useQuery({
    queryKey: ["ads-estado", contaId],
    enabled: !!contaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_ads_estado").select("status, synced_at, metricas_campanha_em").eq("account_id", contaId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Estado | null;
    },
  });

  const dados = useQuery({
    queryKey: ["ads-painel", contaId],
    enabled: !!contaId && estado.data?.status === "ativo",
    queryFn: async () => {
      const sb = supabase as any;
      const desde = new Date(Date.now() - (2 * DIAS + 1) * 86_400_000).toISOString().slice(0, 10);
      const [campanhas, serie, grupos, settings, vendas] = await Promise.all([
        fetchAllRows<CampanhaLinha>((de, ate) => sb.from("ml_ads_campaigns")
          .select("campaign_id, name, status, strategy, budget, daily_budget, roas_target, acos_target")
          .eq("account_id", contaId).order("campaign_id").range(de, ate)),
        fetchAllRows<LinhaCampanhaDia>((de, ate) => sb.from("ml_ads_metrics_daily")
          .select("campaign_id, dia, cost, total_amount, clicks, prints, units_quantity")
          .eq("account_id", contaId).eq("nivel", "campanha").gte("dia", desde)
          .order("dia").order("campaign_id").range(de, ate)),
        fetchAllRows<GrupoPainel>((de, ate) => sb.rpc("ml_ads_painel_grupos", { p_account_id: contaId, p_dias: DIAS }).range(de, ate)),
        sb.from("ml_settings").select("*").eq("account_id", contaId).maybeSingle(),
        sb.from("ml_sync_tema").select("dados, atualizado_em").eq("account_id", contaId).eq("tema", "vendas").maybeSingle(),
      ]);
      const erro = campanhas.error ?? serie.error ?? grupos.error ?? settings.error;
      if (erro) throw erro;
      const fat = (vendas.data?.dados as { faturamento_30d?: unknown } | null)?.faturamento_30d;
      return {
        painel: montarPainel({
          campanhas: campanhas.data,
          serie: serie.data,
          grupos: grupos.data,
          settings: settings.data,
          faturamento: typeof fat === "number" && Number.isFinite(fat) ? fat : null,
        }, undefined, DIAS),
        faturamentoEm: (vendas.data?.atualizado_em ?? null) as string | null,
      };
    },
  });

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["ads-estado", contaId] });
    qc.invalidateQueries({ queryKey: ["ads-painel", contaId] });
  };

  // Atualiza a tela sozinha quando a rotina grava campanhas novas.
  useEffect(() => {
    if (!contaId) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const avisar = () => { clearTimeout(t); t = setTimeout(recarregar, 1500); };
    const canal = supabase
      .channel(`ml_ads_${contaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ml_ads_campaigns", filter: `account_id=eq.${contaId}` }, avisar)
      .on("postgres_changes", { event: "*", schema: "public", table: "ml_ads_estado", filter: `account_id=eq.${contaId}` }, avisar)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(canal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contaId]);
  const acao = useAcaoEmLote("ml-ads-action", contaId, recarregar);

  const atualizar = async () => {
    setAtualizando(true);
    setAviso(null);
    try {
      const r = await chamarFuncaoMl<RespostaSync>("ml-ads-sync", { account_id: contaId });
      const c = r.contas?.[0];
      if (c?.status === "sem_token") setAviso("A autorização desta conta no Mercado Livre venceu. Peça ao lojista para reconectar.");
      else if (c?.status === "erro") setAviso(`O Mercado Livre recusou a leitura: ${c.erros[0] ?? "erro desconhecido"}.`);
      else if (c && c.dias_pendentes > 0) setAviso(`Faltam ${c.dias_pendentes} dia(s) de métricas por anúncio. O restante entra nas próximas leituras automáticas (de hora em hora).`);
      else if (c?.erros.length) setAviso(`Leitura concluída com avisos: ${c.erros[0]}.`);
      if (c && (c.erros.length || c.status === 'sem_token' || c.dias_pendentes > 0)) void registrarAviso(c.status === 'erro' || c.status === 'sem_token' ? 'atualizacao_falhou' : 'leitura_parcial', 'publicidade');
      recarregar();
    } catch (e) {
      void registrarAviso('atualizacao_falhou', 'publicidade');
      setAviso(e instanceof Error ? e.message : "Não foi possível atualizar agora.");
    } finally {
      setAtualizando(false);
    }
  };

  const painel = dados.data?.painel;
  const fonte = estado.data
    ? `Fonte: Mercado Livre · atualizado em ${dataHoraBr(estado.data.synced_at)}${painel ? ` · ${DIAS} dias até ${painel.hoje.split("-").reverse().slice(0, 2).join("/")}` : ""}`
    : "Fonte: Mercado Livre";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Painel
        </Button>
        <PageHeader
          titulo="Publicidade"
          periodo={fonte}
          acoes={
            <div className="flex flex-wrap items-center gap-2">
              {(contas.data?.length ?? 0) > 1 && (
                <Select value={contaId} onValueChange={(v) => mudar({ conta: v })}>
                  <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Conta" /></SelectTrigger>
                  <SelectContent>
                    {contas.data!.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nickname ?? c.ml_user_id} · {c.site_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {contaId && (
                <Button size="sm" variant="outline" onClick={atualizar} disabled={atualizando}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${atualizando ? "animate-spin" : ""}`} /> {atualizando ? "Lendo o Mercado Livre…" : "Atualizar"}
                </Button>
              )}
            </div>
          }
        />

        {aviso && <p className="text-sm text-ec-ambar">{isDesenvolvedor ? aviso : 'A atualização não foi concluída integralmente. Os dados disponíveis foram mantidos.'}</p>}
        {contas.isLoading && <Carregando />}
        {contas.isError && <EmptyState falta="Não foi possível carregar suas contas." acao="Recarregue a página." />}
        {contas.data && contas.data.length === 0 && (
          <EmptyState
            falta="Nenhuma conta do Mercado Livre ligada ao seu usuário."
            acao="O acesso vem das contas liberadas para você no Admin. Peça a liberação ao administrador."
          />
        )}

        {contaId && estado.isLoading && <Carregando />}
        {estado.isError && <EmptyState falta="Não foi possível ler o estado de Publicidade." acao="Recarregue a página." />}
        {contaId && estado.data === null && (
          <EmptyState falta="Publicidade ainda não foi lida nesta conta." acao="Clique em Atualizar para ler campanhas e métricas do Mercado Livre." />
        )}
        {estado.data?.status === "sem_product_ads" && (
          <EmptyState
            falta="Esta conta não tem Product Ads ativo no Mercado Livre."
            acao="O vendedor ativa em Mercado Livre > Publicidade. Depois, clique em Atualizar."
          />
        )}

        {estado.data?.status === "ativo" && (
          <>
            <SinergiaPublicidadeApi accountId={contaId} />
            {dados.isLoading && <Carregando texto="Montando o painel de publicidade…" />}
            {dados.isError && <EmptyState falta="Não foi possível carregar os dados de publicidade." acao="Recarregue a página ou clique em Atualizar." />}
            {painel && (
              <Tabs value={params.get("aba") ?? "geral"} onValueChange={(v) => mudar({ aba: v === "geral" ? null : v })}>
                <TabsList>
                  <TabsTrigger value="geral">Visão geral</TabsTrigger>
                  <TabsTrigger value="campanhas">Campanhas ({painel.campanhas.length})</TabsTrigger>
                  <TabsTrigger value="anuncios">Anúncios ({painel.grupos.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="geral" className="mt-4">
                  <VisaoGeralAds painel={painel} faturamentoEm={dados.data?.faturamentoEm ?? null} aoVerAnuncios={(filtro) => mudar({ aba: "anuncios", filtro })} />
                </TabsContent>
                <TabsContent value="campanhas" className="mt-4">
                  <CampanhasAds painel={painel} acao={acao} custId={String(contas.data?.find((c) => c.id === contaId)?.ml_user_id ?? "")} contaId={contaId} />
                </TabsContent>
                <TabsContent value="anuncios" className="mt-4">
                  <AnunciosAds
                    painel={painel}
                    acao={acao}
                    accountId={contaId}
                    filtroInicial={params.get("filtro")}
                  />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}

        {acao.erro && acao.estado.fase === "ocioso" && <ErroAcao mensagem={acao.erro} aoFechar={acao.fechar} />}
        <DialogoPrevia acao={acao} titulo="Publicidade" textoConfirmar="Confirmar no Mercado Livre" />
      </div>
    </div>
  );
}

const Carregando = ({ texto = "Carregando…" }: { texto?: string }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" /> {texto}
  </div>
);
