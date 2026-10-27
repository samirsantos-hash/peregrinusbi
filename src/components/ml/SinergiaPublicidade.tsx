import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnaliseMl } from "@/hooks/useAnaliseMl";
import { useContaMl } from "@/components/dashboard/RupturaApi";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { calcularSinergiaPublicidade, type PontoPublicidade } from "@/lib/sinergiaPublicidade";
import { num, pctFracao } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import GraficoPublicidadeSerie from "@/components/dashboard/GraficoPublicidadeSerie";
import SynergyAnalysisPanel from "@/components/dashboard/SynergyAnalysisPanel";

export function SinergiaIndicadores({ pontos, compacto = false, fonte }: { pontos: PontoPublicidade[]; compacto?: boolean; fonte: string }) {
  const r = calcularSinergiaPublicidade(pontos);
  const leitura = r.correlacao == null ? "Sem base suficiente ou variação para avaliar a relação."
    : Math.abs(r.correlacao) < 0.4 ? "Investimento e faturamento apresentam pouca associação linear."
    : r.correlacao > 0 ? "Investimento e faturamento se movem na mesma direção."
    : "Investimento e faturamento se movem em direções opostas.";
  return <section aria-label="Sinergia e dependência de publicidade" className="space-y-3 border-t border-border/50 pt-4">
    <h4 className="text-sm font-semibold">Sinergia e dependência de publicidade</h4>
    <p className="text-xs text-muted-foreground">{fonte}</p>
    <GraficoPublicidadeSerie pontos={pontos} compacto={compacto} />
    <SynergyAnalysisPanel compacto={compacto} kpis={pontos.map(p => ({ gmv: p.faturamento, adsInvestment: p.investimento, visits: p.visitas, repCancellationsRate: p.cancelamentos }))} />
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div><dt className="text-xs text-muted-foreground">Participação atribuída a Ads</dt><dd className="text-xl font-medium tabular-nums">{r.participacao == null ? "Sem dado" : pctFracao(r.participacao, 1)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Dependência de investimento · TACOS</dt><dd className="text-xl font-medium tabular-nums">{r.tacos == null ? "Sem dado" : pctFracao(r.tacos, 2)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Sinergia investimento × faturamento · r</dt><dd className="text-xl font-medium tabular-nums">{r.correlacao == null ? "Sem dado" : num(r.correlacao, 2)}</dd></div>
    </dl>
    <p className="text-sm">{r.participacao != null ? `${pctFracao(r.participacao, 1)} do faturamento corresponde à receita atribuída a Ads. ` : ""}{leitura}</p>
    {r.atribuicaoIncompativel && <p className="text-xs text-muted-foreground">A receita atribuída supera o faturamento pago; participação indisponível por diferença de atribuição.</p>}
    {(r.investimento == null || r.receitaAds == null) && <p className="text-xs text-muted-foreground">Faltam métricas de publicidade em parte das datas. Participação e TACOS aguardam cobertura completa; dias ausentes não representam gasto zero.</p>}
    {compacto && <p className="text-xs text-muted-foreground">{num(r.observacoes)} observações pareadas · associação não é causalidade.</p>}
    {!compacto && <div className="space-y-1 text-xs text-muted-foreground">
      <p>Participação = receita atribuída ÷ faturamento; TACOS = investimento ÷ faturamento. Razões dos totais das mesmas datas, sem média de percentuais.</p>
      <p>ROAS = soma das vendas atribuídas a Ads ÷ soma do investimento. Faturamento total ÷ Ads não é ROAS.</p>
      <p>Pearson usa {num(r.observacoes)} observações pareadas; mínimo de 7. Valores de −1 a +1 indicam associação inversa ou direta, não causalidade.</p>
    </div>}
    <p className="text-xs text-muted-foreground">Atribuição não mede vendas incrementais nem prevê o que aconteceria ao desligar campanhas.</p>
  </section>;
}

type Resumo = { periodo: { inicio: string; fim: string }; atual: { serie: { data: string; faturamento: number; cancelados?: number; visitas?: number }[] } };
type Linha = { dia: string; campaign_id: number; cost: number | null; total_amount: number | null };

/** Reuses paid-order summary; reads only campaign metrics on those exact UTC dates. */
export default function SinergiaPublicidadeApi({ custId, accountId: fornecida, compacto = false }: { custId?: string; accountId?: string; compacto?: boolean }) {
  const conta = useContaMl(custId);
  const accountId = fornecida ?? conta.data;
  const vinculo = useQuery({ queryKey: ["sinergia-conta-vinculo", accountId], enabled: !!accountId && !custId, staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("ml_sync_tema").select("cust_id").eq("account_id", accountId ?? "").limit(1).maybeSingle();
      if (error) throw error;
      return data?.cust_id ?? undefined;
    } });
  const resumo = useAnaliseMl<Resumo>(custId ?? vinculo.data, "resumo");
  const periodo = resumo.data?.periodo;
  const diario = useQuery({ queryKey: ["sinergia-ads-diario", accountId, periodo?.inicio, periodo?.fim], enabled: !!accountId && !!periodo, staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await fetchAllRows<Linha>((de, ate) => (supabase as any).from("ml_ads_metrics_daily")
        .select("dia, campaign_id, cost, total_amount").eq("account_id", accountId).eq("nivel", "campanha")
        .gte("dia", periodo?.inicio).lte("dia", periodo?.fim).order("dia").order("campaign_id").range(de, ate));
      if (error) throw error;
      return data;
    } });
  if (resumo.isLoading || diario.isLoading || vinculo.isLoading) return <Skeleton className="h-28 w-full" />;
  const pontos = (resumo.data?.atual.serie ?? []).map(d => {
    const ls = (diario.data ?? []).filter(l => l.dia === d.data);
    const soma = (campo: "cost" | "total_amount") => ls.length && ls.every(l => l[campo] != null && Number.isFinite(Number(l[campo]))) ? ls.reduce((s, l) => s + Number(l[campo]), 0) : null;
    return { data: d.data, faturamento: d.faturamento, investimento: soma("cost"), receitaAds: soma("total_amount"), visitas: d.visitas ?? null, cancelamentos: d.cancelados ?? null };
  });
  return <SinergiaIndicadores pontos={pontos} compacto={compacto} fonte={periodo
    ? `Mercado Livre · ${periodo.inicio.split("-").reverse().join("/")} a ${periodo.fim.split("-").reverse().join("/")} · dias completos UTC${resumo.error || diario.error ? " · leitura indisponível" : ""}`
    : "Mercado Livre · sem leitura de faturamento e publicidade no mesmo período"} />;
}