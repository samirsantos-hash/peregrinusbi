import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TooltipInfo from "@/components/dashboard/TooltipInfo";
import type { PedidoML } from "@/lib/multilojas/parse";
import { fBRL, fInt, fPct } from "@/lib/multilojas/stats";
import type { LojaOficial } from "@/hooks/multilojas/usePerfilMultilojas";

interface Props {
  loja: LojaOficial | null;
  lojasDisponiveis: LojaOficial[];
  onTrocarLoja: (id: string) => void;
  pedidos: PedidoML[];   // já recortados pelos filtros globais
  ini: string;
  fim: string;
}

type Feed = {
  dias: string[];
  tgmv: number; tsi: number; gmv: number; fTgmv: number;
  full: number; flex: number;
  invPads: number; tgmvPads: number; tsiPads: number;
  visitas: number; match: number; cheaper: number; expensive: number;
  cdpTgmv: number; cdpTsi: number;
  listings: number | null;
};

const Chip = ({ ok, label, nota }: { ok: boolean; label: string; nota?: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${
    ok ? "border-emerald/50 text-emerald bg-emerald/10" : "border-border/60 text-muted-foreground"
  }`} title={nota}>
    {ok ? <CheckCircle2 className="w-3 h-3" /> : <CircleDashed className="w-3 h-3" />}{label}
  </span>
);

const Kpi = ({ label, value, hint, indisponivel }: { label: string; value: string; hint?: string; indisponivel?: string }) => (
  <div className="rounded-lg border border-border/40 bg-card/50 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center">
      {label}{hint && <TooltipInfo text={hint} />}
    </div>
    {indisponivel
      ? <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{indisponivel}</div>
      : <div className="text-lg font-semibold tabular-nums mt-0.5">{value}</div>}
  </div>
);

const Bloco = ({ titulo, origem, children }: { titulo: string; origem: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border/50 bg-card/60 p-4">
    <h3 className="text-xs font-semibold mb-3">
      {titulo} <span className="text-[10px] font-normal text-muted-foreground">· origem: {origem}</span>
    </h3>
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
  </div>
);

const MinhaLoja = ({ loja, lojasDisponiveis, onTrocarLoja, pedidos, ini, fim }: Props) => {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [eleg, setEleg] = useState<{ itens: number; optin: number; ruptura: number; melhorNaoAdotada: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const contaId = loja?.conta_id || null;

  useEffect(() => {
    let vivo = true;
    if (!contaId) { setFeed(null); setEleg(null); return; }
    (async () => {
      setLoading(true);
      const { data: seller } = await supabase.from("sellers").select("id").eq("cust_id", contaId).maybeSingle();
      if (!vivo) return;
      if (!seller) { setFeed(null); setEleg(null); setLoading(false); return; }

      const [{ data: kpi }, { data: ll }, { data: el }] = await Promise.all([
        supabase.from("sellers_kpi_daily").select("*").eq("seller_id", seller.id).gte("data", ini).lte("data", fim),
        supabase.from("live_listings").select("data, itens").eq("seller_id", seller.id).order("data", { ascending: false }).limit(400),
        supabase.from("seller_eligibility").select("flag_item_s_optin, flag_best_promo, estoque_medio_7d, pedidos_7d, acao_recomendada").eq("seller_id", seller.id).limit(5000),
      ]);
      if (!vivo) return;

      const rows = kpi || [];
      const s = (f: (r: Record<string, unknown>) => unknown) =>
        rows.reduce((a, r) => a + (Number(f(r as Record<string, unknown>)) || 0), 0);

      // TOTAL_LIVELISTINGS é estoque: usa o último dia, nunca soma
      const ultimoDia = (ll || [])[0]?.data;
      const listings = ultimoDia
        ? (ll || []).filter((x) => x.data === ultimoDia).reduce((a, x) => a + (Number(x.itens) || 0), 0)
        : null;

      setFeed(rows.length ? {
        dias: rows.map((r) => String(r.data)),
        tgmv: s((r) => r.tgmv_lc), tsi: s((r) => r.tsi), gmv: s((r) => r.gmv_lc), fTgmv: s((r) => r.f_tgmv_lc),
        full: s((r) => r.tgmv_lc_full), flex: s((r) => r.tgmv_lc_flex),
        invPads: s((r) => r.inv_pads), tgmvPads: s((r) => r.tgmv_lc_pads), tsiPads: s((r) => r.tsi_pads),
        visitas: s((r) => r.visits), match: s((r) => r.visits_match),
        cheaper: s((r) => r.visits_cheaper), expensive: s((r) => r.visits_expensive),
        cdpTgmv: s((r) => r.cdp_tgmv_lc), cdpTsi: s((r) => r.cdp_tsi),
        listings,
      } : null);

      const its = el || [];
      setEleg(its.length ? {
        itens: its.length,
        optin: its.filter((i) => i.flag_item_s_optin).length,
        ruptura: its.filter((i) => (Number(i.estoque_medio_7d) || 0) <= 0 && (Number(i.pedidos_7d) || 0) > 0).length,
        melhorNaoAdotada: its.filter((i) => i.flag_best_promo && !i.flag_item_s_optin).length,
      } : null);
      setLoading(false);
    })();
    return () => { vivo = false; };
  }, [contaId, ini, fim]);

  const vendas = useMemo(() => {
    const ps = loja ? pedidos.filter((p) => p.loja === loja.nome_publico || p.loja === loja.chave_tecnica) : [];
    const gmv = ps.reduce((a, p) => a + p.gmv, 0);
    const un = ps.reduce((a, p) => a + p.un, 0);
    const ids = new Set(ps.map((p) => p.id));
    return { ps, gmv, un, pedidos: ids.size, ticket: ids.size ? gmv / ids.size : 0, dias: new Set(ps.map((p) => p.dia)) };
  }, [pedidos, loja]);

  // reconciliação apenas na janela em que as duas origens têm dado
  const recon = useMemo(() => {
    if (!feed) return null;
    const comuns = new Set(feed.dias.filter((d) => vendas.dias.has(d)));
    if (!comuns.size) return null;
    const gmvVendas = vendas.ps.filter((p) => comuns.has(p.dia)).reduce((a, p) => a + p.gmv, 0);
    return { dias: comuns.size, gmvVendas, gmvFeed: feed.tgmv, div: feed.tgmv ? (gmvVendas - feed.tgmv) / feed.tgmv : NaN };
  }, [feed, vendas]);

  const acos = feed && feed.tgmvPads ? feed.invPads / feed.tgmvPads : NaN;
  const tacos = feed && feed.tgmv ? feed.invPads / feed.tgmv : NaN;
  const conv = feed && feed.visitas ? feed.tsi / feed.visitas : NaN;
  const compBase = feed ? feed.match + feed.cheaper + feed.expensive : 0;
  const shareFull = feed && feed.tgmv ? feed.full / feed.tgmv : NaN;

  const alertas: string[] = [];
  if (loja && !contaId) alertas.push("Loja sem vínculo com a conta de vendedor — todo o bloco de marketplace fica indisponível.");
  if (recon && Math.abs(recon.div) > 0.10) alertas.push(`Divergência de faturamento de ${fPct(recon.div)} entre Vendas e Performance na janela comum — verifique o recorte de data ou o vínculo de conta.`);
  if (Number.isFinite(acos) && acos > 0.15) alertas.push(`ACOS de ${fPct(acos)} acima do teto de 15%.`);
  if (Number.isFinite(conv) && conv < 0.008) alertas.push(`Conversão de ${fPct(conv)} abaixo de 0,8%.`);
  if (compBase && feed && feed.expensive / compBase > 0.35) alertas.push(`${fPct(feed.expensive / compBase)} das visitas comparadas veem a loja mais cara que o concorrente.`);
  if (Number.isFinite(shareFull) && shareFull < 0.30) alertas.push(`Penetração no Full de ${fPct(shareFull)} abaixo de 30%.`);
  if (eleg?.ruptura) alertas.push(`${eleg.ruptura} anúncio(s) elegível(is) com ruptura de estoque e venda nos últimos 7 dias.`);
  if (eleg?.melhorNaoAdotada) alertas.push(`${eleg.melhorNaoAdotada} anúncio(s) com campanha melhor disponível ainda não adotada.`);

  const semFeed = "depende do feed de performance";

  return (
    <div className="space-y-3">
      {lojasDisponiveis.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {lojasDisponiveis.map((l) => (
            <button key={l.id} onClick={() => onTrocarLoja(l.id)}
              className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                loja?.id === l.id ? "bg-primary/15 border-primary/60 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}>
              {l.nome_publico}
            </button>
          ))}
        </div>
      )}

      {!loja ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Nenhuma loja oficial atribuída. O vínculo é feito pelo Administrador no cadastro de lojas.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border/50 bg-card/60 p-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground mr-1">Cobertura das fontes</span>
            <Chip ok={vendas.ps.length > 0} label="Vendas" nota="Relatório nativo de Vendas do Mercado Livre" />
            <Chip ok={!!feed} label="Performance" nota="Indicadores diários da conta no marketplace" />
            <Chip ok={!!feed?.cdpTgmv} label="Campanhas" nota="Faturamento e investimento em campanhas" />
            <Chip ok={feed?.listings != null} label="Catálogo" nota="Anúncios ativos por categoria" />
            <Chip ok={!!eleg} label="Elegibilidade" nota="Itens elegíveis a campanha" />
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
            <span className="text-[10px] text-muted-foreground ml-auto">
              fonte ausente não é zero — é informação indisponível
            </span>
          </div>

          <Bloco titulo="Faturamento próprio" origem="Vendas">
            <Kpi label="GMV bruto" value={fBRL(vendas.gmv)} />
            <Kpi label="Pedidos" value={fInt(vendas.pedidos)} />
            <Kpi label="Unidades" value={fInt(vendas.un)} />
            <Kpi label="Ticket médio" value={fBRL(vendas.ticket)} />
          </Bloco>

          <Bloco titulo="Faturamento marketplace" origem="Performance">
            <Kpi label="TGMV" value={fBRL(feed?.tgmv || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="Itens vendidos (TSI)" value={fInt(feed?.tsi || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="GMV" value={fBRL(feed?.gmv || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="Meta CPP (F_TGMV)" value={fBRL(feed?.fTgmv || 0)} indisponivel={feed ? undefined : semFeed}
              hint="F_TGMV_LC é a meta do plano CPP, não uma métrica de logística." />
          </Bloco>

          <Bloco titulo="Logística" origem="Performance">
            <Kpi label="Share Full" value={fPct(shareFull)} indisponivel={feed ? undefined : semFeed}
              hint="TGMV_LC_FULL ÷ TGMV_LC. O resíduo inclui Flex, Agência, Correios e Places, não separáveis nesta base." />
            <Kpi label="GMV Full" value={fBRL(feed?.full || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="GMV Flex" value={fBRL(feed?.flex || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="Outros modais" value={fBRL(Math.max(0, (feed?.tgmv || 0) - (feed?.full || 0) - (feed?.flex || 0)))}
              indisponivel={feed ? undefined : semFeed}
              hint="Resíduo: inclui Agência, Correios e Places — a base diária não os separa individualmente." />
          </Bloco>

          <Bloco titulo="Publicidade" origem="Performance">
            <Kpi label="Investimento PADS" value={fBRL(feed?.invPads || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="GMV por PADS" value={fBRL(feed?.tgmvPads || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="ACOS" value={fPct(acos)} indisponivel={feed ? undefined : semFeed}
              hint="Investimento ÷ GMV gerado pela mídia. Teto de referência: 15%." />
            <Kpi label="TACOS" value={fPct(tacos)} indisponivel={feed ? undefined : semFeed}
              hint="Investimento ÷ GMV total da operação." />
          </Bloco>

          <Bloco titulo="Audiência e competitividade" origem="Performance">
            <Kpi label="Visitas" value={fInt(feed?.visitas || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="Conversão" value={fPct(conv)} indisponivel={feed ? undefined : semFeed}
              hint="TSI ÷ visitas. Referência de mercado: abaixo de 2% baixa, 3% média, acima de 3,5% ótima." />
            <Kpi label="Preço em paridade" value={fPct(compBase ? (feed!.match || 0) / compBase : NaN)} indisponivel={feed ? undefined : semFeed}
              hint="Denominador é a soma de match, mais barato e mais caro — nunca o total de visitas." />
            <Kpi label="Preço acima do concorrente" value={fPct(compBase ? (feed!.expensive || 0) / compBase : NaN)} indisponivel={feed ? undefined : semFeed} />
          </Bloco>

          <Bloco titulo="Campanhas e portfólio" origem="Performance + Catálogo">
            <Kpi label="GMV em campanhas" value={fBRL(feed?.cdpTgmv || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="Itens em campanha" value={fInt(feed?.cdpTsi || 0)} indisponivel={feed ? undefined : semFeed} />
            <Kpi label="Anúncios ativos" value={fInt(feed?.listings || 0)} indisponivel={feed?.listings != null ? undefined : "depende do feed de catálogo"}
              hint="Estoque: usa o último dia do período, nunca a soma dos dias." />
            <Kpi label="Itens elegíveis com opt-in" value={eleg ? `${fInt(eleg.optin)} de ${fInt(eleg.itens)}` : "—"}
              indisponivel={eleg ? undefined : "depende do feed de elegibilidade"} />
          </Bloco>

          <div className="rounded-xl border border-border/50 bg-card/60 p-4">
            <h3 className="text-xs font-semibold mb-2">
              Reconciliação entre Vendas e Performance
              <TooltipInfo text="Compara só os dias em que as duas origens têm dado. Fora dessa janela a diferença é de cobertura, não de dado. TGMV inclui cancelamentos e devoluções; a receita de produto do relatório de Vendas não — divergência de poucos pontos percentuais é esperada." />
            </h3>
            {!recon ? (
              <p className="text-[11px] text-muted-foreground">Sem janela comum entre as duas origens no período filtrado.</p>
            ) : (
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                <Kpi label="Dias em comum" value={fInt(recon.dias)} />
                <Kpi label="Vendas (conta)" value={fBRL(recon.gmvVendas)} />
                <Kpi label="Feed de performance" value={fBRL(recon.gmvFeed)} />
                <Kpi label="Divergência" value={fPct(recon.div)} hint="Acima de 10% em módulo dispara alerta." />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-card/60 p-4">
            <h3 className="text-xs font-semibold mb-2">Alertas de cruzamento de fontes</h3>
            {!alertas.length ? (
              <p className="text-[11px] text-emerald flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Nenhum alerta no período.</p>
            ) : (
              <ul className="space-y-1.5">
                {alertas.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-[11px] text-warning">
                    <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />{a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MinhaLoja;
