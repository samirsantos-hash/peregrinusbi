import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { num, pct } from '@/lib/format';
import { rankingClips } from '@/lib/clipsRanking';
import type { ListingQuality } from '@/hooks/useListingsQuality';
import type { EligibilityItem } from '@/hooks/useEligibility';
import TooltipInfo from './TooltipInfo';

export default function ClipsRanking({ itens, nomes }: { itens: ListingQuality[]; nomes: EligibilityItem[] }) {
  const [ordem, setOrdem] = useState<'conversao' | 'visitas'>('conversao');
  const ranking = useMemo(() => rankingClips(itens.map(i => ({ sellerId: i.sellerId, itemId: i.itemId, date: i.date, visitas: i.clipsVisitasMedidas ?? null, pedidos: i.clipsPedidosMedidos ?? null })), ordem).slice(0, 5), [itens, ordem]);
  const titulos = new Map(nomes.map(i => [`${i.sellerId}:${i.itemId}`, i.itemName]));
  return <div className="w-full min-w-0 space-y-3" aria-label="Anúncios líderes em Clips">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-medium">Destaques por vídeo<TooltipInfo text="Conversão = pedidos via Clips ÷ visitas via Clips × 100, do mesmo registro por anúncio. Ranking da última medição disponível; não distribui os totais da loja entre produtos e não representa visitas por vídeo individual." /></h4>
      <ToggleGroup type="single" value={ordem} onValueChange={v => { if (v === 'conversao' || v === 'visitas') setOrdem(v); }}><ToggleGroupItem value="conversao" className="text-xs">Conversão</ToggleGroupItem><ToggleGroupItem value="visitas" className="text-xs">Visitas</ToggleGroupItem></ToggleGroup>
    </div>
    {ranking.length ? <div className="overflow-x-auto"><table className="w-full text-xs tabular-nums"><thead className="text-muted-foreground text-left"><tr><th className="py-2">Anúncio</th><th className="py-2 text-right">Conversão</th><th className="py-2 text-right">Visitas via vídeos</th></tr></thead><tbody className="divide-y divide-border">{ranking.map(i => <tr key={`${i.sellerId}:${i.itemId}`}><td className="py-2 pr-3"><a className="text-primary hover:underline flex items-center gap-1" target="_blank" rel="noopener noreferrer" href={`https://produto.mercadolivre.com.br/${i.itemId.replace(/^MLB-?/, 'MLB-')}`}><span className="line-clamp-2">{titulos.get(`${i.sellerId}:${i.itemId}`) || i.itemId}</span><ExternalLink className="h-3 w-3 shrink-0" /></a><span className="text-muted-foreground">{i.itemId} · {i.date ? new Date(`${i.date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR') : 'Sem data'}</span></td><td className="py-2 text-right">{pct(i.conversao, 2)}</td><td className="py-2 text-right">{num(i.visitas)}</td></tr>)}</tbody></table></div> : <div className="border-t border-border py-5 text-sm text-muted-foreground"><p className="font-medium text-foreground">Sem dado por anúncio</p><p className="mt-1 text-xs">{ordem === 'conversao' ? 'Pedidos e visitas via Clips por anúncio não estão disponíveis para calcular a conversão.' : 'Não há visitas via Clips medidas por anúncio.'}</p></div>}
    {ranking.length > 0 && <p className="text-xs text-muted-foreground">Fonte: planilha · última medição por anúncio · pedidos ÷ visitas via Clips</p>}
  </div>;
}