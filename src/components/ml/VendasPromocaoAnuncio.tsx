import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, RefreshCw, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { brl, num } from '@/lib/format';
import { linhasVinculo, roasCampanhasAnuncio, type PromoAtual, type VendasPromocao, type MetricaAnuncioDia } from '@/lib/vinculoPromocao';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissoes } from '@/hooks/usePermissoes';
import { ComparacaoCampanhasPromocao } from './ComparacaoCampanhasPromocao';

type Leitura = { vendasPromocao: VendasPromocao | null; periodo: { inicio: string; fim: string } };
const data = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const STATUS: Record<string, string> = { started: 'Ativa', active: 'Ativa', pending: 'Programada', programmed: 'Programada', candidate: 'Disponível', finished: 'Encerrada' };

export default function VendasPromocaoAnuncio({ accountId, custId, itemId }: { accountId: string; custId: string; itemId: string }) {
  const { pode } = usePermissoes();
  const [filtro, setFiltro] = useState('ativas');
  const promos = useQuery({ queryKey: ['inv-promos-item', accountId, itemId], retry: false,
    queryFn: () => chamarFuncaoMl<{ promocoes: PromoAtual[] }>('ml-promotions-item', { account_id: accountId, item_id: itemId }) });
  const vendas = useQuery({ queryKey: ['inv-vendas-promo-v2', custId, itemId], retry: false,
    queryFn: () => chamarFuncaoMl<Leitura>('ml-buscar-produtos', { cust_id: custId, item_id: itemId, vendas_promocao: true }) });
  const periodo = vendas.data?.periodo;
  const ads = useQuery({ queryKey: ['promo-roas-anuncio', accountId, itemId, periodo?.inicio, periodo?.fim], retry: false,
    enabled: !!periodo && pode('publicidade.visualizar'), queryFn: async () => {
      if (!periodo) throw new Error('Período indisponível.');
      // Exact item identity only. Family/catalog aggregates are not item performance.
      const grupos = await fetchAllRows<{ ad_group_id: number; campaign_id: number | null }>((de, ate) => supabase.from('ml_ads_ads').select('ad_group_id,campaign_id')
        .eq('account_id', accountId).eq('external_id', itemId).order('ad_group_id').range(de, ate));
      if (grupos.error) throw grupos.error;
      if (!grupos.data.length) return [];
      const ids = grupos.data.map(g => g.ad_group_id);
      const metricas = await fetchAllRows<MetricaAnuncioDia>((de, ate) => supabase.from('ml_ads_metrics_daily')
        .select('campaign_id,ad_group_id,dia,cost,total_amount').eq('account_id', accountId).eq('nivel', 'anuncio')
        .in('ad_group_id', ids).gte('dia', periodo.inicio).lte('dia', periodo.fim)
        .order('campaign_id').order('ad_group_id').order('dia').range(de, ate));
      if (metricas.error) throw metricas.error;
      const resultados = roasCampanhasAnuncio(metricas.data, periodo.inicio, periodo.fim);
      const campanhasIds = [...new Set([...resultados.map(r => r.id), ...grupos.data.flatMap(g => g.campaign_id == null ? [] : [g.campaign_id])])];
      if (!campanhasIds.length) return [];
      const nomes = await fetchAllRows<{ campaign_id: number; name: string | null }>((de, ate) => supabase.from('ml_ads_campaigns')
        .select('campaign_id,name').eq('account_id', accountId).in('campaign_id', campanhasIds).order('campaign_id').range(de, ate));
      if (nomes.error) throw nomes.error;
      return campanhasIds.map(id => ({ ...(resultados.find(r => r.id === id) ?? { id, custo: null, receita: null, dias: 0, roas: null, incompletas: true }), nome: nomes.data.find(n => n.campaign_id === id)?.name ?? 'Campanha sem nome disponível' }));
    } });
  const v = vendas.data?.vendasPromocao;
  const todas = linhasVinculo(promos.data?.promocoes ?? [], v);
  const linhas = todas.filter(r => filtro === 'todas' || (filtro === 'ativas' ? r.ativa : r.confirmada));
  const totalDias = periodo ? Math.round((Date.parse(periodo.fim) - Date.parse(periodo.inicio)) / 86400000) + 1 : 30;
  return <section className="space-y-5 min-w-0" aria-label="Vínculo real entre promoção e venda">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div><h3 className="font-semibold text-base flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" />Campanhas e resultados deste anúncio</h3>
        {periodo && <p className="text-xs text-muted-foreground">{data(periodo.inicio)} – {data(periodo.fim)} · dias completos</p>}</div>
      <Button size="sm" variant="outline" disabled={promos.isFetching || vendas.isFetching || ads.isFetching} onClick={() => { void promos.refetch(); void vendas.refetch(); if (pode('publicidade.visualizar') && periodo) void ads.refetch(); }}><RefreshCw className="h-4 w-4 mr-2" />Atualizar análise</Button>
    </div>
    <p className="text-sm text-muted-foreground">Participar agora não comprova uma venda passada. O vínculo exige a identificação da promoção na venda.</p>
    <Select value={filtro} onValueChange={setFiltro}><SelectTrigger className="w-full sm:w-72" aria-label="Filtrar promoções na análise"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ativas">Promoções ativas</SelectItem><SelectItem value="confirmadas">Com vendas comprovadas</SelectItem><SelectItem value="todas">Todas as promoções e vínculos</SelectItem></SelectContent></Select>
    {(promos.isPending || vendas.isPending) && <Skeleton className="h-28 w-full" />}
    {promos.isError && <p role="alert" className="text-sm text-destructive">Não foi possível confirmar as promoções atuais. Atualize a análise.</p>}
    {vendas.isError && <p role="alert" className="text-sm text-destructive">Não foi possível ler as vendas deste anúncio. Atualize a análise.</p>}
    {vendas.isSuccess && !v && <p className="text-sm text-muted-foreground">Vendas indisponíveis: leitura do período não confirmada.</p>}
    {v && !v.completo && <p className="text-sm text-muted-foreground">Leitura parcial · {num(v.naoLidos)} pedidos sem leitura de desconto. Não representam zero de vendas.</p>}
    {promos.isSuccess && vendas.isSuccess && <>
      <ComparacaoCampanhasPromocao linhas={linhas} vendas={v} />
      <div className="overflow-x-auto rounded-lg border border-border bg-card/30">
        <table className="w-full text-sm [&_th]:p-3 [&_td]:p-3"><thead className="text-left text-muted-foreground"><tr><th>Campanha de promoção</th><th>Diagnóstico do vínculo</th><th>Pedidos</th><th>Unidades</th><th>Faturamento</th><th>Ticket por pedido</th><th>ROAS da promoção</th><th>ROI da promoção</th></tr></thead>
          <tbody className="divide-y divide-border">{linhas.map(r => <tr key={r.chave}>
            <td className="min-w-48"><div className="flex gap-2 items-start">{r.ativa && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}<div><p className="font-medium">{r.promo?.nome ?? r.promo?.nome_tipo ?? 'Promoção identificada na venda · nome indisponível'}</p><p className="text-xs text-muted-foreground">{r.promo ? STATUS[r.promo.status] ?? 'Situação atual não confirmada' : 'Sem correspondência atual'}{r.promo?.inicio && r.promo.fim ? ` · ${data(r.promo.inicio)} – ${data(r.promo.fim)}` : ''}</p></div></div></td>
            <td className={r.confirmada ? 'text-primary' : 'text-muted-foreground'}>{r.grupo ? `${num(r.grupo.unidades)} unidades vendidas neste anúncio, faturando ${brl(r.grupo.faturamento, true)}${v?.completo ? '.' : ' nas vendas lidas.'}` : r.zeroConfirmado ? 'Nenhuma venda vinculada' : 'Vendas desta campanha ainda não confirmadas'}</td>
            <td className="tabular-nums">{r.grupo ? num(r.grupo.pedidos) : r.zeroConfirmado ? '0' : '—'}</td><td className="tabular-nums">{r.grupo ? num(r.grupo.unidades) : r.zeroConfirmado ? '0' : '—'}</td><td className="tabular-nums whitespace-nowrap">{r.grupo ? brl(r.grupo.faturamento, true) : r.zeroConfirmado ? brl(0) : '—'}</td><td className="tabular-nums whitespace-nowrap">{r.grupo && r.grupo.pedidos > 0 ? brl(r.grupo.faturamento / r.grupo.pedidos, true) : '—'}</td><td className="text-muted-foreground">Indisponível</td><td className="text-muted-foreground">Indisponível</td>
          </tr>)}</tbody></table>
        {!linhas.length && <p className="p-4 text-sm text-muted-foreground">Nenhuma promoção confirmada neste filtro.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 text-xs text-muted-foreground">
        <p><span className="font-medium text-foreground">ROAS da promoção:</span> exige receita publicitária e investimento atribuídos à mesma promoção, anúncio e período. O ROAS publicitário abaixo não substitui esse vínculo.</p>
        <p><span className="font-medium text-foreground">ROI da promoção:</span> exige resultado líquido e investimento comprovados, incluindo custos do produto, taxas, frete e desconto efetivamente suportado. Faturamento não é lucro.</p>
      </div>
      {v && <div className="grid sm:grid-cols-2 gap-4 border-y border-border py-4 text-sm">
        <div><p className="text-muted-foreground">Desconto sem promoção identificada</p><p className="font-semibold tabular-nums">{num(v.descontoSemPromocao.pedidos)} pedidos · {brl(v.descontoSemPromocao.faturamento, true)}</p></div>
        <div><p className="text-muted-foreground">Sem desconto identificado</p><p className="font-semibold tabular-nums">{num(v.semDesconto.pedidos)} pedidos · {brl(v.semDesconto.faturamento, true)}</p></div>
      </div>}
    </>}
    <div className="space-y-3 border-t border-border pt-4" aria-label="ROAS por campanha publicitária do anúncio">
      <h3 className="text-base font-semibold">ROAS por campanha publicitária deste anúncio</h3>
      <p className="text-sm text-muted-foreground">Receita atribuída à publicidade ÷ investimento nas mesmas datas. Não é o retorno da promoção: faltam investimento e receita publicitária vinculados a ela.</p>
      {!pode('publicidade.visualizar') ? <p className="text-sm text-muted-foreground">Visualização de publicidade não liberada para seu acesso.</p> : !periodo ? <p className="text-sm text-muted-foreground">Aguardando período das vendas.</p> : ads.isPending ? <Skeleton className="h-20 w-full" /> : ads.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível ler as campanhas publicitárias.</p> : !ads.data?.length ? <p className="text-sm text-muted-foreground">Sem métricas de campanhas com vínculo exato a este anúncio no período. Resultados de famílias de produtos não são atribuídos a ele.</p> :
        <div className="overflow-x-auto rounded-lg border border-border bg-card/30"><table className="w-full text-sm [&_td]:p-3 [&_th]:p-3"><thead className="text-left text-muted-foreground"><tr><th>Campanha</th><th>Receita atribuída</th><th>Investimento</th><th>ROAS</th><th>Cobertura</th></tr></thead><tbody className="divide-y divide-border">{ads.data.map(r => <tr key={r.id}><td className="min-w-48 font-medium">{r.nome}</td><td className="tabular-nums whitespace-nowrap">{r.receita == null ? '—' : brl(r.receita, true)}</td><td className="tabular-nums whitespace-nowrap">{r.custo == null ? '—' : brl(r.custo, true)}</td><td className="tabular-nums font-semibold">{r.roas == null ? 'Indisponível' : `${num(r.roas, 2)}×`}</td><td>{num(r.dias)}/{num(totalDias)} dias{r.dias < totalDias || r.incompletas ? ' · parcial' : ''}</td></tr>)}</tbody></table></div>}
      <p className="text-xs text-muted-foreground">Comparação com o período anterior indisponível nesta análise. Cada pedido conta uma vez; cupons e cashback não multiplicam faturamento.</p>
    </div>
  </section>;
}