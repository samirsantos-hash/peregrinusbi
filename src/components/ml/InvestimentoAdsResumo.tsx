import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContaMl } from '@/components/dashboard/RupturaApi';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { metaInvestimentoAds } from '@/lib/analiseDiaria';
import { brl, num } from '@/lib/format';
import KpiVidro from '@/components/dashboard/visaoGeral/KpiVidro';
import { Skeleton } from '@/components/ui/skeleton';

type Periodo = { inicio: string; fim: string };
type Linha = { dia: string; campaign_id: number; cost: number | null };
type Props = { custId: string; periodo: Periodo; anteriorPeriodo: Periodo; faturamento: number; faturamentoAnterior: number };

export default function InvestimentoAdsResumo({ custId, periodo, anteriorPeriodo, faturamento, faturamentoAnterior }: Props) {
  const conta = useContaMl(custId);
  const accountId = conta.data;
  const q = useQuery({
    queryKey: ['resumo-meta-ads', accountId, anteriorPeriodo.inicio, periodo.fim],
    enabled: !!accountId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await fetchAllRows<Linha>((de, ate) => supabase.from('ml_ads_metrics_daily')
        .select('dia, campaign_id, cost').eq('account_id', accountId ?? '').eq('nivel', 'campanha')
        .gte('dia', anteriorPeriodo.inicio).lte('dia', periodo.fim)
        .order('dia').order('campaign_id').range(de, ate));
      if (error) throw error;
      return data;
    },
  });
  if (conta.isLoading || q.isLoading) return <>{[0, 1].map(i => <Skeleton key={i} className="h-[180px] w-full" />)}</>;
  const rows = !q.error && accountId ? q.data ?? [] : [];
  const atual = metaInvestimentoAds(rows, periodo.inicio, periodo.fim, faturamento);
  const anterior = metaInvestimentoAds(rows, anteriorPeriodo.inicio, anteriorPeriodo.fim, faturamentoAnterior);
  const faixa = atual?.faixa;
  const delta = atual && anterior ? atual.share - anterior.share : null;
  const metaDelta = atual && anterior ? atual.atingimento - anterior.atingimento : null;
  const cobertura = q.error ? 'Leitura de Ads indisponível.' : 'Aguardando cobertura diária completa de Ads.';
  return <>
    <KpiVidro rotulo="Investimento em Ads" valor={atual ? `${num(atual.share, 2)}%` : 'Sem dado'}
      delta={delta} deltaPontos melhorQuando="neutro" periodo="vs 30 dias anteriores"
      nota={atual ? <>{brl(atual.investimento)} investidos · meta interna 3%<br />{faixa?.tier ? `Atende investimento do Tier ${faixa.tier}` : 'Abaixo do requisito do Tier 3'}</> : <>Meta interna: 3% do faturamento<br />{cobertura}</>} />
    <KpiVidro rotulo="Atingimento da meta Ads" valor={atual ? `${num(atual.atingimento, 1)}%` : 'Sem dado'}
      delta={metaDelta} deltaPontos melhorQuando="neutro" periodo="vs 30 dias anteriores"
      nota={<>Meta de 3%: {Number.isFinite(faturamento) && faturamento > 0 ? brl(faturamento * 0.03) : 'Sem dado'}<br />{atual ? <>{atual.falta > 0 ? `Faltam ${brl(atual.falta)}` : 'Meta interna atingida'}<br /></> : <>{cobertura}<br /></>}Tier 1 ≥ 2,5% · Tier 2 ≥ 1,25% · Tier 3 ≥ 0,5%<br />Somente requisito financeiro; não define o tier da loja.</>} />
  </>;
}