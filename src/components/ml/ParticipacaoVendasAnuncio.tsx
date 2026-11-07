import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PromocoesInvestigacaoAnuncio from '@/components/seller/PromocoesInvestigacaoAnuncio';
import ResumoPromocoesAnuncio from './ResumoPromocoesAnuncio';
import VendasPromocaoAnuncio from './VendasPromocaoAnuncio';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AbaPromocoes } from './acoes/AbaPromocoes';

type Item = { item_id: string; titulo: string | null; thumbnail: string | null };
type Props = { accountId: string; custId: string; aoGerenciar: (item: Item) => void; analise?: boolean };
export default function ParticipacaoVendasAnuncio(props: Props) {
  if (props.analise) return <PorAnuncio {...props} />;
  return <Tabs defaultValue="anuncio"><TabsList><TabsTrigger value="anuncio">Por anúncio</TabsTrigger><TabsTrigger value="campanha">Por campanha</TabsTrigger></TabsList><TabsContent value="anuncio"><PorAnuncio {...props} /></TabsContent><TabsContent value="campanha"><AbaPromocoes accountId={props.accountId} /></TabsContent></Tabs>;
}
function PorAnuncio({ accountId, custId, aoGerenciar, analise }: Props) {
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');
  const [selecionado, setSelecionado] = useState<Item | null>(null);
  const q = useQuery({ queryKey: ['promo-vendas-anuncios', accountId, termo], queryFn: async () => {
    if (termo) {
      const { data, error } = await supabase.rpc('ml_buscar_anuncios', { p_account_id: accountId, p_termo: termo, p_limite: 50 });
      if (error) throw error;
      return (data ?? []) as Item[];
    }
    const { data, error } = await supabase.from('ml_listings').select('item_id,titulo,thumbnail').eq('account_id', accountId).order('vendidos', { ascending: false, nullsFirst: false }).order('item_id').limit(10);
    if (error) throw error;
    return (data ?? []) as Item[];
  }});
  return <section className="space-y-4 min-w-0" aria-label="Participação e vendas por anúncio">
    <h2 className="text-lg font-semibold">{analise ? 'Vendas por promoção e anúncio' : 'Participação e vendas por anúncio'}</h2>
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setTermo(busca.trim()); setSelecionado(null); }}>
      <Input aria-label="Buscar anúncio para promoções" placeholder="Título, SKU ou MLB" value={busca} onChange={e => setBusca(e.target.value)} className="min-w-0" />
      <Button type="submit" variant="outline" disabled={!!busca.trim() && busca.trim().length < 2}><Search className="h-4 w-4 mr-2" />Buscar</Button>
    </form>
    {q.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-label="Carregando anúncios" />}
    {q.isError && <p role="alert" className="text-sm text-destructive">Não foi possível ler os anúncios.</p>}
    {q.isSuccess && q.data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum anúncio encontrado nesta busca.</p>}
    <div className="divide-y divide-border">
      {q.data?.map(item => <div key={item.item_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <Button variant="ghost" className="h-auto min-w-0 justify-start text-left whitespace-normal px-0 flex-1 basis-64" onClick={() => setSelecionado(item)}>
          {item.thumbnail && <img src={item.thumbnail} alt="" className="h-10 w-10 shrink-0 object-contain mr-3 rounded" />}
          <span className="min-w-0 break-words">{item.titulo ?? item.item_id}<span className="block text-xs text-muted-foreground">{item.item_id}</span></span>
        </Button>
        <div className="flex items-center gap-2"><ResumoPromocoesAnuncio accountId={accountId} itemId={item.item_id} aoGerenciar={() => aoGerenciar(item)} /><Button size="sm" variant="outline" onClick={() => { setSelecionado(item); aoGerenciar(item); }}>Participar</Button></div>
      </div>)}
    </div>
    {!termo && <p className="text-xs text-muted-foreground">10 anúncios iniciais · use a busca para localizar outros anúncios da loja.</p>}
    {selecionado && <div className="border-t border-border pt-4 space-y-3">
      <h3 className="font-semibold break-words">{selecionado.titulo ?? selecionado.item_id} · {selecionado.item_id}</h3>
      {analise ? <VendasPromocaoAnuncio key={selecionado.item_id} accountId={accountId} custId={custId} itemId={selecionado.item_id} /> : <PromocoesInvestigacaoAnuncio key={selecionado.item_id} accountId={accountId} custId={custId} itemId={selecionado.item_id} />}
    </div>}
  </section>;
}