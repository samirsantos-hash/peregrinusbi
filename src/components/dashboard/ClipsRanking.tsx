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
  const todos = useMemo(() => rankingClips(itens.map(i => ({ sellerId: i.sellerId, itemId: i.itemId, date: i.date, visitas: i.clipsVisitasMedidas ?? null, pedidos: i.clipsPedidosMedidos ?? null })), ordem), [itens, ordem]);
  const ranking = todos.slice(0, 10);
  const titulos = new Map(nomes.map(i => [`${i.sellerId}:${i.itemId}`, i.itemName]));
  return <div className="w-full min-w-0 space-y-3" aria-label="Anúncios líderes em Clips">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-lg font-semibold">Melhores anúncios com resultados de Clips<TooltipInfo text="Conversão = pedidos via Clips ÷ visitas via Clips × 100, do mesmo registro por anúncio. Ranking da última medição disponível; não distribui os totais da loja entre produtos e não representa visitas por vídeo individual. Compare também o volume de pedidos e visitas: uma taxa alta com poucas visitas não comprova um vídeo campeão. Datas distintas não representam um mesmo período." /></h4>
      <ToggleGroup type="single" value={ordem} onValueChange={v => { if (v === 'conversao' || v === 'visitas') setOrdem(v); }}><ToggleGroupItem value="conversao" className="text-xs">Conversão</ToggleGroupItem><ToggleGroupItem value="visitas" className="text-xs">Visitas</ToggleGroupItem></ToggleGroup>
    </div>
    {ranking.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm tabular-nums"><thead className="text-muted-foreground text-left bg-muted/30"><tr><th className="p-3">Posição / Anúncio</th><th className="p-3 text-right border-l border-border">Visitas via Clips</th><th className="p-3 text-right border-l border-border">Pedidos via Clips</th><th className="p-3 text-right border-l border-border">Conversão</th></tr></thead><tbody className="divide-y divide-border">{ranking.map((i, index) => <tr className="even:bg-muted/20 hover:bg-muted/30" key={`${i.sellerId}:${i.itemId}`}><td className="p-3"><div className="flex gap-3"><span className="text-muted-foreground">{index + 1}.</span><div><a className="text-primary hover:underline flex items-center gap-1" target="_blank" rel="noopener noreferrer" href={`https://produto.mercadolivre.com.br/${i.itemId.replace(/^MLB-?/, 'MLB-')}`}><span className="line-clamp-2">{titulos.get(`${i.sellerId}:${i.itemId}`) || i.itemId}</span><ExternalLink className="h-3 w-3 shrink-0" /></a><span className="text-xs text-muted-foreground">{i.itemId} · {i.date ? new Date(`${i.date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR') : 'Sem data'}</span></div></div></td><td className="p-3 text-right border-l border-border">{num(i.visitas)}</td><td className="p-3 text-right border-l border-border">{num(i.pedidos)}</td><td className="p-3 text-right border-l border-border font-semibold">{pct(i.conversao, 2)}</td></tr>)}</tbody></table></div> : <div className="border-t border-border py-5 text-sm text-muted-foreground"><p className="font-medium text-foreground">Sem dado por anúncio</p><p className="mt-1">{ordem === 'conversao' ? 'Pedidos e visitas via Clips por anúncio não estão disponíveis para calcular a conversão.' : 'Não há visitas via Clips medidas por anúncio.'}</p></div>}
    {ranking.length > 0 && <p className="text-sm text-muted-foreground">{ranking.length} de {todos.length} anúncios com medição · Fonte: planilha · última medição por anúncio, independente do filtro de período da loja.</p>}
  </div>;
}