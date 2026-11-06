import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnaliseMl } from "@/hooks/useAnaliseMl";
import { useContaMl } from "@/components/dashboard/RupturaApi";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { calcularSinergiaPublicidade, indicadoresPublicidadeCoberta, completarVisitasPiloto, type PontoPublicidade } from "@/lib/sinergiaPublicidade";
import { num, pctFracao } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import GraficoPublicidadeSerie from "@/components/dashboard/GraficoPublicidadeSerie";
import SynergyAnalysisPanel from "@/components/dashboard/SynergyAnalysisPanel";
import CancelamentosMensais from "@/components/ml/CancelamentosMensais";
import { Button } from "@/components/ui/button";

export function SinergiaIndicadores({ pontos, compacto = false, exibirMatriz = true, fonte, custId, de, ate, piloto }: { pontos: PontoPublicidade[]; compacto?: boolean; exibirMatriz?: boolean; fonte: string; custId?: string; de?: string; ate?: string; piloto?: { ativo: boolean; alternar: () => void } }) {
  const r = calcularSinergiaPublicidade(pontos);
  const cobertura = indicadoresPublicidadeCoberta(pontos);
  const notaCobertura = (m: { dias: number; inicio?: string; fim?: string }) => {
    const data = (s?: string) => s?.split('-').reverse().join('/') ?? '—';
    return `${num(m.dias)} de ${num(cobertura.total)} datas medidas${m.inicio ? ` · ${data(m.inicio)} a ${data(m.fim)}` : ''}${m.dias < cobertura.total ? ' · período parcial' : ''}`;
  };
  return <section aria-label="Sinergia e dependência de publicidade" className="resumo-sinergia space-y-5 border-t border-border/50 pt-5">
    <h4 className="text-sm font-semibold">Sinergia e dependência de publicidade</h4>
    <p className="text-xs text-muted-foreground">{fonte}</p>
    <div className="resumo-sinergia-evolucao"><GraficoPublicidadeSerie pontos={pontos} compacto={compacto} /></div>
    {piloto && <div className="flex justify-end">
      <Button variant="ghost" size="sm" onClick={piloto.alternar} className="text-xs text-muted-foreground">
        {piloto.ativo ? "Voltar à leitura publicada" : "Ver piloto de visitas"}
      </Button>
    </div>}
    <div className="grid min-w-0 items-start gap-6">
    {exibirMatriz && <SynergyAnalysisPanel compacto={compacto} kpis={pontos.map(p => ({ gmv: p.faturamento, adsInvestment: p.investimento, visits: p.visitas, repCancellationsRate: p.cancelamentos }))} />}
    <CancelamentosMensais custId={custId} de={de ?? pontos[0]?.data} ate={ate ?? pontos[pontos.length - 1]?.data} />
    </div>
    <dl className="grid grid-cols-1 gap-5 border-t border-border/50 pt-4 sm:grid-cols-2">
      <div><dt className="text-xs text-muted-foreground">Participação atribuída a Ads</dt><dd className="text-xl font-medium tabular-nums">{cobertura.participacao.valor == null ? "Sem dado" : pctFracao(cobertura.participacao.valor, 1)}</dd><p className="mt-2 text-xs text-muted-foreground">{notaCobertura(cobertura.participacao)}</p></div>
      <div><dt className="text-xs text-muted-foreground">Dependência de investimento · TACOS</dt><dd className="text-xl font-medium tabular-nums">{cobertura.tacos.valor == null ? "Sem dado" : pctFracao(cobertura.tacos.valor, 2)}</dd><p className="mt-2 text-xs text-muted-foreground">{notaCobertura(cobertura.tacos)}</p></div>
    </dl>
    {cobertura.participacao.incompativel && <p className="text-xs text-muted-foreground">A receita atribuída supera o faturamento pago; participação indisponível por diferença de atribuição.</p>}
    {(r.investimento == null || r.receitaAds == null) && <p className="text-xs text-muted-foreground">Cobertura incompleta: cada indicador considera apenas as datas com sua métrica de Ads e faturamento medidos juntos. Não representa o período inteiro; dias ausentes não representam gasto zero.</p>}
    {!compacto && <div className="space-y-1 text-xs text-muted-foreground">
      <p>Participação = receita atribuída ÷ faturamento; TACOS = investimento ÷ faturamento. Razões dos totais das mesmas datas, sem média de percentuais.</p>
      <p>ROAS = soma das vendas atribuídas a Ads ÷ soma do investimento. Faturamento total ÷ Ads não é ROAS.</p>
    </div>}
    <p className="text-xs text-muted-foreground">Atribuição não mede vendas incrementais nem prevê o que aconteceria ao desligar campanhas.</p>
  </section>;
}

type Resumo = { periodo: { inicio: string; fim: string }; atual: { serie: { data: string; faturamento: number; cancelados?: number; visitas?: number }[] } };
type Linha = { dia: string; campaign_id: number; cost: number | null; total_amount: number | null };
const PILOTO_VISITAS = "peregrinus-visitas-piloto";

function useVisitasPiloto() {
  const [ativo, setAtivo] = useState(true);
  useEffect(() => { try { setAtivo(localStorage.getItem(PILOTO_VISITAS) !== "0"); } catch { /* private mode keeps the pilot on */ } }, []);
  const alternar = () => setAtivo(atual => {
    const proximo = !atual;
    try { localStorage.setItem(PILOTO_VISITAS, proximo ? "1" : "0"); } catch { /* the choice lasts for this view */ }
    return proximo;
  });
  return { ativo, alternar };
}

export function usePilotoVisitas(custId?: string) {
  const piloto = useVisitasPiloto();
  const visitasSync = useQuery({ queryKey: ["sinergia-visitas-piloto", custId], enabled: piloto.ativo && !!custId, staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("ml_sync_tema").select("dados, atualizado_em").eq("cust_id", custId ?? "").eq("tema", "visitas").maybeSingle();
      if (error) throw error;
      const dados = data?.dados as { serie?: { data?: string; visitas?: number }[] } | null;
      return { serie: dados?.serie ?? [], atualizadoEm: data?.atualizado_em ?? null };
    } });
  const aplicar = <T extends { data: string; visitas?: number | null }>(pontos: T[]) => {
    const visitas = completarVisitasPiloto(pontos, visitasSync.data?.serie, piloto.ativo);
    const quando = visitasSync.data?.atualizadoEm ? new Date(visitasSync.data.atualizadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : null;
    const faltamVisitas = visitas.pontos.some(p => p.visitas == null);
    const nota = !piloto.ativo || (!faltamVisitas && visitas.dias === 0) ? ""
      : visitas.dias > 0 ? ` · piloto: visitas da sincronização${quando ? ` de ${quando}` : ""}, antes de publicar a função`
      : visitasSync.isError ? " · piloto sem leitura da sincronização"
      : " · piloto sem visitas sincronizadas nestas datas";
    return { pontos: visitas.pontos, nota, carregando: piloto.ativo && !!custId && visitasSync.isLoading };
  };
  return { piloto, aplicar };
}

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
  const loja = custId ?? vinculo.data;
  const { piloto, aplicar } = usePilotoVisitas(loja);
  const periodo = resumo.data?.periodo;
  const diario = useQuery({ queryKey: ["sinergia-ads-diario", accountId, periodo?.inicio, periodo?.fim], enabled: !!accountId && !!periodo, staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await fetchAllRows<Linha>((de, ate) => (supabase as any).from("ml_ads_metrics_daily")
        .select("dia, campaign_id, cost, total_amount").eq("account_id", accountId).eq("nivel", "campanha")
        .gte("dia", periodo?.inicio).lte("dia", periodo?.fim).order("dia").order("campaign_id").range(de, ate));
      if (error) throw error;
      return data;
    } });
  const pontos = (resumo.data?.atual.serie ?? []).map(d => {
    const ls = (diario.data ?? []).filter(l => l.dia === d.data);
    const soma = (campo: "cost" | "total_amount") => ls.length && ls.every(l => l[campo] != null && Number.isFinite(Number(l[campo]))) ? ls.reduce((s, l) => s + Number(l[campo]), 0) : null;
    return { data: d.data, faturamento: d.faturamento, investimento: soma("cost"), receitaAds: soma("total_amount"), visitas: d.visitas ?? null, cancelamentos: d.cancelados ?? null };
  });
  const visitas = aplicar(pontos);
  if (resumo.isLoading || diario.isLoading || vinculo.isLoading || visitas.carregando) return <Skeleton className="h-28 w-full" />;
  return <SinergiaIndicadores pontos={visitas.pontos} compacto={compacto} piloto={piloto} custId={loja} de={periodo?.inicio} ate={periodo?.fim} fonte={periodo
    ? `Mercado Livre · ${periodo.inicio.split("-").reverse().join("/")} a ${periodo.fim.split("-").reverse().join("/")} · dias completos UTC${resumo.error || diario.error ? " · leitura indisponível" : ""}${visitas.nota}`
    : "Mercado Livre · sem leitura de faturamento e publicidade no mesmo período"} />;
}