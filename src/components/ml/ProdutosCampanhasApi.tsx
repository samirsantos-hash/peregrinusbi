import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { campanhaElegivel, PRODUTOS_INICIAIS } from '@/lib/produtosCampanhas';
import { brl, num } from '@/lib/format';
import { Button } from '@/components/ui/button';
import CopiarAnuncio from '@/components/ds/CopiarAnuncio';
import { Skeleton } from '@/components/ui/skeleton';

type Promo = { promotion_id: string | null; tipo: string; nome: string | null; nome_tipo: string; status: string; sugerido: number | null; vendedor_pct: number | null; meli_pct: number | null };
export default function ProdutosCampanhasApi({ accountId }: { accountId: string }) {
  const [limite, setLimite] = useState(PRODUTOS_INICIAIS);
  const lista = useQuery({ queryKey: ['ml-produtos-elegibilidade', accountId, limite], staleTime: 300_000, queryFn: async () => {
    const { data, error, count } = await supabase.from('ml_listings').select('item_id,titulo,link,estoque,preco,synced_at', { count: 'exact' })
      .eq('account_id', accountId).in('status', ['active', 'paused']).order('vendidos', { ascending: false, nullsFirst: false }).order('item_id').range(0, limite - 1);
    if (error) throw error;
    return { itens: data ?? [], total: count ?? 0 };
  }});
  const ids = lista.data?.itens.map(i => i.item_id) ?? [];
  const campanhas = useQuery({ queryKey: ['ml-campanhas-produtos-ao-vivo', accountId, ids], enabled: ids.length > 0, staleTime: 300_000, retry: false, queryFn: async () => {
    const resultado: Record<string, { lista: Promo[]; erro?: string }> = {};
    // Sequential calls avoid bursts against seller-promotions; cached earlier rows are reused.
    for (const itemId of ids) {
      try {
        const r = await chamarFuncaoMl<{ promocoes: Promo[] }>('ml-promotions-item', { account_id: accountId, item_id: itemId });
        resultado[itemId] = { lista: r.promocoes.filter(p => campanhaElegivel(p.status)) };
      } catch (e) { resultado[itemId] = { lista: [], erro: e instanceof Error ? e.message : 'Consulta indisponível' }; }
    }
    return resultado;
  }});
  return <section className="glass-card p-5 space-y-4" aria-label="Tabela de produtos Mercado Livre">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-sm font-semibold uppercase">Tabela de produtos</h3><p className="text-xs text-muted-foreground">Mercado Livre · produtos sincronizados · campanhas elegíveis consultadas ao vivo</p></div>
      <Button variant="outline" size="sm" disabled={lista.isFetching || campanhas.isFetching} onClick={() => { void lista.refetch(); void campanhas.refetch(); }}><RefreshCw className="mr-2 h-4 w-4" />Atualizar campanhas</Button>
    </div>
    {lista.isLoading ? <Skeleton className="h-60 w-full" /> : lista.error ? <p role="alert" className="text-sm text-destructive">{lista.error.message}</p> : <>
      <p className="text-xs text-muted-foreground">{num(lista.data?.itens.length ?? 0)} de {num(lista.data?.total ?? 0)} produtos</p>
      <div className="overflow-x-auto"><table className="w-full text-xs tabular-nums"><thead className="text-left text-muted-foreground"><tr>{['Produto', 'Preço atual', 'Estoque atual', 'Campanhas elegíveis'].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{lista.data?.itens.map(i => <tr key={i.item_id}>
          <td className="p-2 min-w-48 max-w-72"><div className="flex items-start gap-2"><a className="text-primary hover:underline" href={i.link || `https://produto.mercadolivre.com.br/${i.item_id.replace('MLB', 'MLB-')}`} target="_blank" rel="noopener noreferrer">{i.titulo || i.item_id}<span className="block text-muted-foreground">{i.item_id}</span></a><CopiarAnuncio itemId={i.item_id} titulo={i.titulo ?? undefined} /></div></td>
          <td className="p-2 whitespace-nowrap">{i.preco == null ? 'Sem dado' : brl(i.preco, true)}</td><td className="p-2">{i.estoque == null ? 'Sem dado' : num(i.estoque)}</td>
          <td className="p-2 min-w-64">{campanhas.isFetching ? <Skeleton className="h-8 w-full" /> : campanhas.data?.[i.item_id]?.erro ? <span className="text-destructive">{campanhas.data[i.item_id].erro}</span> : campanhas.data?.[i.item_id]?.lista.length ? <div className="space-y-2">{campanhas.data[i.item_id].lista.map((p, idx) => <div key={`${p.promotion_id}:${p.tipo}:${idx}`}><p className="font-medium">{p.nome || p.nome_tipo}</p><p className="text-muted-foreground">{p.promotion_id || 'Desconto individual'}{p.sugerido != null ? ` · preço sugerido ${brl(p.sugerido, true)}` : ''}{p.vendedor_pct != null ? ` · loja ${num(p.vendedor_pct)}%` : ''}{p.meli_pct != null ? ` · ML ${num(p.meli_pct)}%` : ''}</p></div>)}</div> : <span className="text-muted-foreground">{campanhas.data ? 'Nenhuma campanha elegível retornada' : 'Aguardando consulta'}</span>}</td>
        </tr>)}</tbody></table></div>
      {!lista.data?.itens.length && <p className="text-sm text-muted-foreground">Nenhum produto sincronizado disponível.</p>}
      <div className="flex justify-center gap-2">{limite < (lista.data?.total ?? 0) && <Button variant="outline" size="sm" disabled={campanhas.isFetching} onClick={() => setLimite(n => n + PRODUTOS_INICIAIS)}><ChevronDown className="mr-2 h-4 w-4" />Expandir · mais 10 produtos</Button>}{limite > PRODUTOS_INICIAIS && <Button variant="outline" size="sm" onClick={() => setLimite(PRODUTOS_INICIAIS)}><ChevronUp className="mr-2 h-4 w-4" />Recolher</Button>}</div>
    </>}
  </section>;
}