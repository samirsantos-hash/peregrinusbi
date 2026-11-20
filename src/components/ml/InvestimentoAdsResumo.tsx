import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContaMl } from '@/components/dashboard/RupturaApi';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { metaInvestimentoAdsCoberta } from '@/lib/analiseDiaria';
import { brl, num } from '@/lib/format';
import KpiVidro from '@/components/dashboard/visaoGeral/KpiVidro';
import { Skeleton } from '@/components/ui/skeleton';

type Periodo = { inicio: string; fim: string };
type Linha = { dia: string; campaign_id: number; cost: number | null };
type Serie = { data: string; faturamento: number }[];
type Props = { custId: string; periodo: Periodo; anteriorPeriodo: Periodo; faturamento: number; faturamentoAnterior: number; serie: Serie; serieAnterior: Serie };

export function useInvestimentoAdsResumo({ custId, periodo, anteriorPeriodo, serie, serieAnterior }: Props) {
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
  const rows = !q.error && accountId ? q.data ?? [] : [];
  const atual = metaInvestimentoAdsCoberta(rows, serie, periodo.inicio, periodo.fim);
  const anterior = metaInvestimentoAdsCoberta(rows, serieAnterior, anteriorPeriodo.inicio, anteriorPeriodo.fim);
  return { atual, anterior, comparavel: !!atual && !!anterior && !atual.parcial && !anterior.parcial, isLoading: conta.isLoading || q.isLoading, error: conta.error || q.error };
}

export function notaCoberturaAds(m: NonNullable<ReturnType<typeof metaInvestimentoAdsCoberta>>) {
  const data = (d: string) => d.split('-').reverse().join('/');
  return `${num(m.dias)} de ${num(m.totalDias)} dias medidos · ${data(m.inicio)} a ${data(m.fim)}${m.parcial ? ' · período parcial; não representa o período inteiro' : ''}`;
}

export default function InvestimentoAdsResumo(props: Props) {
  const { faturamento } = props;
  const { atual, anterior, comparavel, isLoading, error } = useInvestimentoAdsResumo(props);
  if (isLoading) return <>{[0, 1].map(i => <Skeleton key={i} className="h-[180px] w-full" />)}</>;
  const faixa = atual?.faixa;
  const delta = comparavel && atual && anterior ? atual.share - anterior.share : null;
  const metaDelta = comparavel && atual && anterior ? atual.atingimento - anterior.atingimento : null;
  const cobertura = error ? 'Leitura de Ads indisponível.' : 'Sem investimento e faturamento medidos nas mesmas datas.';
  return <>
    <KpiVidro rotulo="Investimento em Ads" valor={atual ? `${num(atual.share, 2)}%` : 'Sem dado'}
      delta={delta} deltaPontos melhorQuando="neutro" periodo="vs 30 dias anteriores"
      nota={atual ? <>{brl(atual.investimento)} investidos · meta interna 3%<br />{notaCoberturaAds(atual)}<br />{atual.parcial ? 'Percentual sobre o faturamento dos mesmos dias medidos.' : faixa?.tier ? `Atende investimento do Tier ${faixa.tier}` : 'Abaixo do requisito do Tier 3'}</> : <>Meta interna: 3% do faturamento<br />{cobertura}</>} />
    <KpiVidro rotulo="Atingimento da meta Ads" valor={atual ? `${num(atual.atingimento, 1)}%` : 'Sem dado'}
      delta={metaDelta} deltaPontos melhorQuando="neutro" periodo="vs 30 dias anteriores"
      nota={<>Meta de 3%{atual?.parcial ? ' nos dias medidos' : ''}: {atual ? brl(atual.meta) : Number.isFinite(faturamento) && faturamento > 0 ? brl(faturamento * 0.03) : 'Sem dado'}<br />{atual ? <>{notaCoberturaAds(atual)}<br />{atual.falta > 0 ? `Faltam ${brl(atual.falta)}${atual.parcial ? ' neste recorte' : ''}` : `Meta interna atingida${atual.parcial ? ' neste recorte' : ''}`}<br /></> : <>{cobertura}<br /></>}Tier 1 ≥ 2,5% · Tier 2 ≥ 1,25% · Tier 3 ≥ 0,5%<br />Somente requisito financeiro; não define o tier da loja.</>} />
  </>;
}