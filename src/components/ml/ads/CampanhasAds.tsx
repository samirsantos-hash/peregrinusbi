import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CampanhaGrafico, { type LinhaDiaCampanha } from "@/components/ml/ads/CampanhaGrafico";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ds";
import { FormCampanha } from "@/components/ml/ads/FormCampanha";
import { dataCurta } from "@/components/ml/ads/VisaoGeralAds";
import { type CampanhaLinha, orcamentoDiario, type PainelAds } from "@/lib/adsAnalise";
import { type AcaoEmLote } from "@/lib/mlAcoes";
import { brl, num, pctFracao, vezes } from "@/lib/format";
import { alertasDesempenho, type Estrategia, NOME_ESTRATEGIA } from "../../../../supabase/functions/_shared/mlAdsGestao";

const nomeEstrategia = (s: string | null) => NOME_ESTRATEGIA[(s ?? "").toLowerCase() as Estrategia] ?? s ?? "—";
const ativa = (s: string | null) => (s ?? "").toLowerCase() === "active";

type GrupoResumo = PainelAds["grupos"][number];

/** Detalhe expandido: série diária da campanha e estatísticas do anúncio principal lidas ao vivo. */
function DetalheCampanha({ c, contaId, custId, item, i }: { c: CampanhaLinha; contaId: string; custId: string; item: GrupoResumo | null; i: any }) {
  const serie = useQuery({
    queryKey: ["ads-camp-serie", contaId, c.campaign_id],
    queryFn: async () => {
      const desde = new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10);
      const { data, error } = await (supabase as any).from("ml_ads_metrics_daily")
        .select("campaign_id, dia, cost, total_amount, clicks, prints, units_quantity")
        .eq("account_id", contaId).eq("nivel", "campanha").eq("campaign_id", c.campaign_id).gte("dia", desde).order("dia");
      if (error) throw error;
      return (data ?? []) as LinhaDiaCampanha[];
    },
  });
  const est = useQuery({
    queryKey: ["ads-camp-item", custId, item?.item_id],
    enabled: !!custId && !!item?.item_id,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ml-buscar-produtos", { body: { cust_id: custId, item_id: item!.item_id } });
      if (error || data?.error) throw new Error(data?.error ?? "Indisponível");
      return data.estatisticas as { visitas: number | null; pedidos: number | null; unidades: number | null; faturamento: number | null; conversao: number | null };
    },
  });
  const e = est.data;
  const sd = (v: string) => (est.isLoading ? "…" : v);
  const kpis: [string, string][] = [
    ["Visitas do anúncio", sd(e?.visitas == null ? "Sem dado" : num(e.visitas))],
    ["Conversão do anúncio", sd(e?.conversao == null ? "Sem dado" : pctFracao(e.conversao, 2))],
    ["Pedidos pagos", sd(e?.pedidos == null ? "Sem dado" : num(e.pedidos))],
    ["Impressões", num(i?.impressoes)],
    ["Cliques", num(i?.cliques)],
    ["CTR", pctFracao(i?.ctr, 2)],
    ["CPC", brl(i?.cpc, true)],
    ["Investimento", brl(i?.investimento, true)],
    ["Receita de Ads", brl(i?.receita, true)],
    ["ROAS", vezes(i?.roas)],
    ["ACOS", pctFracao(i?.acos)],
    ["Unidades por Ads", num(i?.unidades)],
  ];
  return (
    <div className="space-y-5 p-5">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(([r, v]) => (
          <div key={r} className="space-y-1">
            <p className="text-[11px] text-muted-foreground">{r}</p>
            <p className="text-base font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      {serie.isLoading ? <p className="text-xs text-muted-foreground">Carregando gráfico…</p>
        : <CampanhaGrafico nome={c.name ?? `Campanha ${c.campaign_id}`} linhas={serie.data ?? []} faturamentoDia={[]} aoFechar={() => {}} />}
      <p className="text-[11px] text-muted-foreground">Visitas, conversão e pedidos são do anúncio principal nos últimos 30 dias, direto do Mercado Livre. As demais métricas são da campanha no período.</p>
    </div>
  );
}

export function CampanhasAds({ painel, acao, custId = "", contaId = "" }: { painel: PainelAds; acao: AcaoEmLote; custId?: string; contaId?: string }) {
  const [form, setForm] = useState<{ campanha: CampanhaLinha | null } | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);
  // Anúncio principal de cada campanha: o de maior investimento no período.
  const principal = new Map<number, GrupoResumo>();
  const itensCamp = new Map<number, Set<string>>();
  for (const g of painel.grupos) {
    if (g.campaign_id == null || !g.item_id) continue;
    const p = principal.get(g.campaign_id);
    if (!p || (g.custo ?? 0) > (p.custo ?? 0)) principal.set(g.campaign_id, g);
    const s = itensCamp.get(g.campaign_id) ?? new Set<string>(); s.add(g.item_id); itensCamp.set(g.campaign_id, s);
  }
  const todosItens = [...new Set(painel.grupos.map((g) => g.item_id).filter(Boolean) as string[])];
  const vendas = useQuery({
    queryKey: ["ads-vendas30d", custId],
    enabled: !!custId,
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ml-analise-loja", { body: { cust_id: custId, modo: "vendas30d" } });
      if (error || !data?.itens) throw error ?? new Error("sem vendas");
      return new Map((data.itens as { id: string; unidades: number; faturamento: number }[]).map((x) => [x.id, x]));
    },
  });
  const promos = useQuery({
    queryKey: ["ads-promos", contaId, todosItens.length],
    enabled: !!contaId && todosItens.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ml_promotion_items").select("item_id").eq("account_id", contaId).eq("status", "started").limit(20000);
      return new Set<string>((data ?? []).map((r: any) => r.item_id));
    },
  });
  const vendasCamp = (id: number) => {
    if (!vendas.data) return null;
    let u = 0, f = 0;
    for (const it of itensCamp.get(id) ?? []) { const v = vendas.data.get(it); if (v) { u += v.unidades; f += v.faturamento; } }
    return { unidades: u, faturamento: f };
  };
  const per = `${dataCurta(painel.periodo.atual.de)} a ${dataCurta(painel.periodo.atual.ate)}`;
  const anuncios = new Map<number, { ativos: number; total: number }>();
  for (const g of painel.grupos) {
    if (g.campaign_id == null) continue;
    const x = anuncios.get(g.campaign_id) ?? { ativos: 0, total: 0 };
    x.total++;
    if (g.status === "active") x.ativos++;
    anuncios.set(g.campaign_id, x);
  }
  const ordenadas = [...painel.campanhas].sort((a, b) =>
    Number(ativa(b.status)) - Number(ativa(a.status)) ||
    (painel.porCampanha.get(b.campaign_id)?.atual.investimento ?? 0) - (painel.porCampanha.get(a.campaign_id)?.atual.investimento ?? 0));

  const alternar = (c: CampanhaLinha) =>
    acao.previa({ tipo: "campanha_editar", campaign_id: c.campaign_id, campanha: { status: ativa(c.status) ? "paused" : "active" } });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Desempenho de {per}. Alterações passam por prévia, releem a campanha no Mercado Livre e ficam no histórico de auditoria.</p>
        <Button size="sm" onClick={() => setForm({ campanha: null })}><Plus className="h-3.5 w-3.5 mr-1.5" /> Nova campanha</Button>
      </div>

      {ordenadas.length === 0 ? (
        <EmptyState falta="Nenhuma campanha nesta conta." acao="Crie uma campanha e inclua anúncios na aba Anúncios." />
      ) : (
        <div className="overflow-x-auto border border-border [border-width:0.5px]">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border">
                <th className="py-2 px-2">Campanha</th>
                <th className="pr-2">Estratégia</th>
                <th className="pr-2 text-right">Orçamento/dia</th>
                <th className="pr-2 text-right">ROAS alvo</th>
                <th className="pr-2 text-right">Anúncios</th>
                <th className="pr-2 text-right">Investimento</th>
                <th className="pr-2 text-right">Receita</th>
                <th className="pr-2 text-right">ROAS</th>
                <th className="pr-2 text-right">ACOS</th>
                <th className="pr-2 text-right">CTR</th>
                <th className="pr-2 text-right">CPC</th>
                <th className="pr-2">Alertas</th>
                <th className="pr-2" />
                <th className="pr-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((c) => {
                const m = painel.porCampanha.get(c.campaign_id);
                const i = m?.atual;
                const al = i ? alertasDesempenho(i, painel.limites) : [];
                const ad = anuncios.get(c.campaign_id);
                const abaixoAlvo = i?.roas != null && c.roas_target != null && i.roas < c.roas_target;
                const g = principal.get(c.campaign_id) ?? null;
                const vc = vendasCamp(c.campaign_id);
                const tacos = vc && vc.faturamento > 0 && i?.investimento != null ? i.investimento / vc.faturamento : null;
                const semPromo = !!promos.data && !!g?.item_id && ![...(itensCamp.get(c.campaign_id) ?? [])].some((x) => promos.data!.has(x));
                const exp = aberta === c.campaign_id;
                return (
                  <Fragment key={c.campaign_id}>
                  <tr className="border-t border-border align-top">
                    <td className="py-3 px-2 min-w-[300px]">
                      <div className="flex items-start gap-3">
                        {g?.thumbnail && <img src={g.thumbnail} alt="" className="h-12 w-12 shrink-0 object-contain border border-border bg-card" />}
                        <div className="min-w-0 space-y-1">
                          <span className="block font-medium line-clamp-1" title={c.name ?? ""}>{c.name ?? `Campanha ${c.campaign_id}`}</span>
                          <p className="text-[11px]">
                            {g?.item_id ? (g.link
                              ? <a href={g.link} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{g.item_id}</a>
                              : <span className="font-mono">{g.item_id}</span>) : null}
                            <span className={ativa(c.status) ? "text-ec-verde-txt" : "text-muted-foreground"}>{g?.item_id ? " · " : ""}{ativa(c.status) ? "Ativa" : "Pausada"}</span>
                          </p>
                          <p className="flex flex-wrap gap-x-4 text-[11px] text-muted-foreground tabular-nums">
                            <span>Estoque <b className="text-foreground font-medium">{g?.estoque == null ? "Sem dado" : num(g.estoque)}</b></span>
                            <span>Vendas 30d <b className="text-foreground font-medium">{vc == null ? (vendas.isLoading ? "…" : "Sem dado") : `${num(vc.unidades)} un.`}</b></span>
                            <span>TACOS <b className="text-foreground font-medium">{tacos == null ? "Sem dado" : pctFracao(tacos, 1)}</b></span>
                          </p>
                          {semPromo && (
                            <p className="flex items-center gap-1 text-[11px] text-ec-ambar"><AlertTriangle className="h-3 w-3" />Anúncio sem promoção ativa</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="pr-2 py-1.5">{nomeEstrategia(c.strategy)}</td>
                    <td className="pr-2 py-1.5 text-right">{brl(orcamentoDiario(c), true)}</td>
                    <td className="pr-2 py-1.5 text-right">
                      {c.roas_target != null ? vezes(c.roas_target) : c.acos_target != null ? `ACOS ${num(c.acos_target, 1)}%` : "—"}
                    </td>
                    <td className="pr-2 py-1.5 text-right">{ad ? `${num(ad.ativos)} / ${num(ad.total)}` : "0"}</td>
                    <td className="pr-2 py-1.5 text-right">{brl(i?.investimento, true)}</td>
                    <td className="pr-2 py-1.5 text-right">{brl(i?.receita, true)}</td>
                    <td className={`pr-2 py-1.5 text-right ${abaixoAlvo ? "text-ec-ambar font-medium" : ""}`} title={abaixoAlvo ? "Abaixo do ROAS alvo da campanha" : undefined}>{vezes(i?.roas)}</td>
                    <td className="pr-2 py-1.5 text-right">{pctFracao(i?.acos)}</td>
                    <td className="pr-2 py-1.5 text-right">{pctFracao(i?.ctr, 2)}</td>
                    <td className="pr-2 py-1.5 text-right">{brl(i?.cpc, true)}</td>
                    <td className="pr-2 py-1.5 max-w-[240px]">
                      {m && m.somas.dias === 0 ? <span className="text-muted-foreground">sem métrica no período</span>
                        : al.length ? <span className="text-destructive">{al.join(" · ")}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="pr-2 py-1 whitespace-nowrap text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setForm({ campanha: c })}>Editar</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => alternar(c)}>{ativa(c.status) ? "Pausar" : "Ativar"}</Button>
                    </td>
                    <td className="pr-2 py-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-expanded={exp} aria-label={exp ? "Recolher detalhes" : "Ver detalhes"} onClick={() => setAberta(exp ? null : c.campaign_id)}>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${exp ? "rotate-180" : ""}`} />
                      </Button>
                    </td>
                  </tr>
                  {exp && (
                    <tr className="border-t border-border bg-muted/10">
                      <td colSpan={14}><DetalheCampanha c={c} contaId={contaId} custId={custId} item={g} i={i} /></td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Anúncios: ativos / total na campanha. Vendas 30d e TACOS usam as vendas pagas dos anúncios da campanha nos últimos 30 dias, direto do Mercado Livre. ROAS em âmbar: abaixo do ROAS alvo da campanha. O orçamento é média diária; o Mercado Livre pode gastar até o dobro num dia.
      </p>

      <FormCampanha
        campanha={form?.campanha ?? null}
        aberto={!!form}
        aoFechar={() => setForm(null)}
        aoRevisar={(dados) => {
          const c = form?.campanha;
          setForm(null);
          if (c) acao.previa({ tipo: "campanha_editar", campaign_id: c.campaign_id, campanha: dados });
          else acao.previa({ tipo: "campanha_criar", campanha: dados });
        }}
      />
    </div>
  );
}
