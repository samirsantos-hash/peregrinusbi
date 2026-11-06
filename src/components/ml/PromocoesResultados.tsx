import { useQuery } from '@tanstack/react-query';
import { LineChart, RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { participacoesConfirmadas } from '@/lib/promocoesParticipacao';
import { STATUS_PROMOCAO, TIPO_PROMOCAO } from '@/lib/mlRotulos';
import { num } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CampanhasAtribuicaoApi from './CampanhasAtribuicaoApi';
import type { Tables } from '@/integrations/supabase/types';

type Promo = Pick<Tables<'ml_promotions'>, 'promotion_id' | 'nome' | 'tipo' | 'status' | 'inicio' | 'fim' | 'itens_completo' | 'participando' | 'synced_at'>;
type Item = Pick<Tables<'ml_promotion_items'>, 'promotion_id' | 'item_id' | 'status'>;

export default function PromocoesResultados({ custId }: { custId?: string }) {
  const q = useQuery({
    queryKey: ['ml-promocoes-resultados', custId], enabled: !!custId, retry: false, staleTime: 300_000,
    queryFn: async () => {
      const conta = await supabase.from('ml_accounts').select('id,nickname,status').eq('ml_user_id', Number(custId)).maybeSingle();
      if (conta.error) throw conta.error;
      if (!conta.data) return null;
      const accountId = conta.data.id;
      const [promos, participacoes] = await Promise.all([
        fetchAllRows<Promo>((de, ate) => supabase.from('ml_promotions')
          .select('promotion_id,nome,tipo,status,inicio,fim,itens_completo,participando,synced_at')
          .eq('account_id', accountId).order('promotion_id').range(de, ate)),
        fetchAllRows<Item>((de, ate) => supabase.from('ml_promotion_items')
          .select('promotion_id,item_id,status').eq('account_id', accountId)
          .order('promotion_id').order('item_id').order('tipo').range(de, ate)),
      ]);
      if (promos.error) throw promos.error;
      if (participacoes.error) throw participacoes.error;
      return { conta: conta.data, lista: participacoesConfirmadas(promos.data, participacoes.data), parcial: promos.data.some(p => !p.itens_completo) };
    },
  });
  const data = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Sem data';
  if (!custId) return <p className="py-6 text-sm text-muted-foreground">Selecione uma loja para consultar suas promoções.</p>;
  return <section className="w-full min-w-0 max-w-full overflow-hidden space-y-5" aria-label="Resultados das promoções">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Promoções{q.data ? ` · ${q.data.conta.nickname || 'Loja selecionada'}` : ''}</h2>
        <p className="text-sm text-muted-foreground">Adesões atuais · resultados por promoção</p></div>
      <Button variant="outline" size="sm" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar leitura</Button>
    </div>
    {q.isLoading ? <Skeleton className="h-48 w-full" /> : q.error ? <p role="alert" className="text-sm text-destructive">Não foi possível consultar as promoções. Tente atualizar a leitura.</p> : !q.data ? <p className="text-sm text-muted-foreground">Esta loja não possui uma conta integrada acessível. Não há resultados de promoções pela API.</p> : <>
      <div className="space-y-3">
        <h3 className="text-base font-medium">Promoções aderidas</h3>
        {q.data.parcial && <p className="text-xs text-muted-foreground">Leitura de anúncios incompleta em algumas promoções. Quantidades parciais não representam o total.</p>}
        {!q.data.lista.length ? <p className="text-sm text-muted-foreground">Nenhuma adesão confirmada nos dados disponíveis{q.data.parcial ? '; leitura incompleta' : ''}.</p> :
          <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr>{['Promoção', 'Situação', 'Vigência', 'Anúncios aderidos', 'ROAS', 'ROI'].map(t => <th className="p-3 font-medium" key={t}>{t}</th>)}</tr></thead><tbody className="divide-y divide-border">
            {q.data.lista.map(p => <tr key={p.promotion_id}>
              <td className="p-3"><div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-40"><p className="font-medium">{p.nome || TIPO_PROMOCAO[p.tipo] || 'Promoção'}</p><p className="text-xs text-muted-foreground">Leitura: {data(p.synced_at)}</p></div></div></td>
              <td className="p-3">{STATUS_PROMOCAO[p.status || ''] || 'Sem situação confirmada'}</td>
              <td className="p-3 whitespace-nowrap tabular-nums">{data(p.inicio)}<br />{data(p.fim)}</td>
              <td className="p-3 tabular-nums">{p.quantidade == null ? `Parcial · ${num(p.observados)} confirmados` : num(p.quantidade)}</td>
              <td className="p-3 text-muted-foreground">Sem dados</td><td className="p-3 text-muted-foreground">Sem dados</td>
            </tr>)}
          </tbody></table></div>}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[{ nome: 'ROAS por promoção', motivo: 'Receita e investimento publicitário atribuídos à promoção não estão disponíveis no mesmo período.' },
          { nome: 'ROI por promoção', motivo: 'Lucro líquido, custos e investimento realizados por promoção não estão disponíveis.' }].map(m =>
          <div key={m.nome} className="min-w-0 border-t border-border pt-4" aria-label={m.nome}>
            <h3 className="text-base font-medium">{m.nome}</h3>
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center"><LineChart className="h-7 w-7 text-muted-foreground" /><p className="text-sm">Desempenho indisponível</p><p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{m.motivo}</p></div>
            <p className="text-xs text-muted-foreground">Comparação com o período anterior indisponível.</p>
          </div>)}
      </div>
      <CampanhasAtribuicaoApi custId={custId} />
    </>}
  </section>;
}