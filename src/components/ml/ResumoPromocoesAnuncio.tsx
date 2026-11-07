import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { brl } from '@/lib/format';
import type { AnuncioParticipacao } from '@/lib/participacaoAnuncios';

type Promo = { promotion_id: string | null; tipo: string; nome: string | null; nome_tipo: string; status: string; inicio: string | null; fim: string | null; preco: number | null };
const data = (v: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
export default function ResumoPromocoesAnuncio({ accountId, itemId, promocoes, aoGerenciar }: { accountId?: string; itemId: string; promocoes?: AnuncioParticipacao['promocoes']; aoGerenciar?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const q = useQuery({ queryKey: ['ml-resumo-promocoes-item', accountId, itemId], enabled: aberto && !!accountId && !promocoes, queryFn: () => chamarFuncaoMl<{ promocoes: Promo[] }>('ml-promotions-item', { account_id: accountId, item_id: itemId }) });
  const lista = promocoes ?? q.data?.promocoes.filter(p => ['started', 'active', 'pending', 'programmed'].includes(p.status)).map(p => ({ id: `${p.tipo}:${p.promotion_id ?? ''}`, nome: p.nome ?? p.nome_tipo, status: p.status, inicio: p.inicio, fim: p.fim, preco: p.preco }));
  return <Popover open={aberto} onOpenChange={setAberto}>
    <PopoverTrigger asChild><Button variant="ghost" size="sm" className="h-auto min-h-7 gap-1.5 px-2" aria-label={`Promoções de ${itemId}`}>
      {promocoes && <span className="inline-flex flex-wrap gap-0.5">{promocoes.length ? promocoes.map(p => <Check key={p.id} className="h-4 w-4 text-primary" strokeWidth={3} />) : <X className="h-4 w-4 text-destructive" />}</span>}
      Promoções
    </Button></PopoverTrigger>
    <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto rounded-lg border-border bg-popover text-popover-foreground space-y-3">
      <h3 className="font-semibold">Promoções do anúncio</h3>
      {!lista && !q.isError && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Conferindo participações…</p>}
      {q.isError && <p role="alert" className="text-sm text-muted-foreground">Participações indisponíveis nesta consulta.</p>}
      {lista?.length === 0 && <p className="text-sm text-muted-foreground">Sem promoção ativa ou programada confirmada.</p>}
      {lista?.map(p => <div key={p.id} className="flex gap-2 border-t border-border pt-2 text-sm"><Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={3} /><div className="min-w-0 break-words"><p className="font-medium">{p.nome}</p><p className="text-xs text-muted-foreground">{['active', 'started'].includes(p.status) ? 'Ativa' : 'Programada'}</p>{(p.inicio || p.fim) && <p className="text-xs text-muted-foreground">{data(p.inicio)} a {data(p.fim)}</p>}{'preco' in p && typeof p.preco === 'number' && p.preco > 0 && <p>{brl(p.preco, true)}</p>}</div></div>)}
      {lista && lista.length > 1 && <p className="text-xs text-muted-foreground">Participações distintas não comprovam descontos acumulados.</p>}
      {aoGerenciar && <Button variant="outline" size="sm" onClick={() => { setAberto(false); aoGerenciar(); }}>Gerenciar promoções</Button>}
    </PopoverContent>
  </Popover>;
}