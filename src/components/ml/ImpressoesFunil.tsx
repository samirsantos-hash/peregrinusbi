import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContaMl } from '@/components/dashboard/RupturaApi';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { resumirImpressoesAds } from '@/lib/impressoesAds';
import { num } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { DeltaCapsula } from '@/components/dashboard/visaoGeral/KpiVidro';

export default function ImpressoesFunil({ custId, atual, anterior }: { custId: string; atual: string[]; anterior: string[] }) {
  const conta = useContaMl(custId);
  const datas = [...anterior, ...atual].sort();
  const q = useQuery({ queryKey: ['funil-impressoes-ads', conta.data, datas[0], datas[datas.length - 1]], enabled: !!conta.data && datas.length > 0, staleTime: 300_000,
    queryFn: async () => {
      const r = await fetchAllRows<{ dia: string; prints: number | null }>((de, ate) => supabase.from('ml_ads_metrics_daily').select('dia,prints').eq('account_id', conta.data ?? '').eq('nivel','campanha').gte('dia',datas[0]).lte('dia',datas[datas.length - 1]).order('dia').order('campaign_id').range(de,ate));
      if (r.error) throw r.error;
      return r.data;
    }, retry: false });
  const a = resumirImpressoesAds(atual, q.data ?? []), p = resumirImpressoesAds(anterior, q.data ?? []);
  const comparavel = a.cobertura === a.dias && p.cobertura === p.dias && a.total != null && p.total != null && p.total > 0;
  const delta = comparavel && a.total != null && p.total != null ? (a.total / p.total - 1) * 100 : null;
  return <section className="noite-vidro min-w-0 rounded-2xl p-4" aria-label="Impressões de publicidade no funil">
    <h4 className="text-sm font-medium text-muted-foreground">Impressões de publicidade</h4>
    {q.isLoading ? <Skeleton className="mt-2 h-8 w-32" /> : <div className="mt-2 flex flex-wrap items-center gap-3"><p className="text-2xl font-semibold tabular-nums">{a.total == null || q.isError ? 'Sem dado' : num(a.total)}</p><DeltaCapsula delta={delta} /></div>}
    <p className="mt-2 text-xs text-muted-foreground">Product Ads · {a.cobertura}/{a.dias} dias medidos{a.cobertura < a.dias ? ' · período parcial' : ''}</p>
    <p className="mt-1 text-xs text-muted-foreground">{comparavel ? 'Comparação com os 30 dias anteriores.' : 'Comparação anterior indisponível sem cobertura completa.'} Impressões de Ads não são as impressões totais da loja nem visitas.</p>
    {q.isError && <p role="alert" className="mt-2 text-xs text-destructive">Leitura de impressões indisponível.</p>}
  </section>;
}