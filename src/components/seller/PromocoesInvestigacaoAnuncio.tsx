import { useQuery } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { brl, num } from '@/lib/format';

type Promo = { promotion_id: string | null; offer_id?: string | null; tipo: string; nome: string | null; nome_tipo: string; status: string; inicio: string | null; fim: string | null; preco: number | null; pode: { aderir: boolean } };
type Grupo = { id: string; tipo: string | null; pedidos: number; unidades: number; faturamento: number };
type Vendas = { porPromocao: Grupo[]; semDesconto: Omit<Grupo, 'id' | 'tipo'>; descontoSemPromocao: Omit<Grupo, 'id' | 'tipo'>; naoLidos: number; completo: boolean };
const PARTICIPA = ['started', 'active', 'pending', 'programmed'];
const ESTADO: Record<string, string> = { started: 'Ativa', active: 'Ativa', pending: 'Programada', programmed: 'Programada', candidate: 'Disponível' };
const dt = (v: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const faixa = (a: string | null, b: string | null) => a || b ? ` · ${dt(a)} – ${dt(b)}` : '';

export default function PromocoesInvestigacaoAnuncio({ custId, accountId, itemId }: { custId: string; accountId: string; itemId: string }) {
  const promos = useQuery({ queryKey: ['inv-promos-item', accountId, itemId], retry: false, queryFn: () => chamarFuncaoMl<{ promocoes: Promo[] }>('ml-promotions-item', { account_id: accountId, item_id: itemId }) });
  const vendas = useQuery({ queryKey: ['inv-vendas-promo', custId, itemId], retry: false, queryFn: () => chamarFuncaoMl<{ vendasPromocao: Vendas | null; periodo: { inicio: string; fim: string } }>('ml-buscar-produtos', { cust_id: custId, item_id: itemId, vendas_promocao: true }) });
  const lista = promos.data?.promocoes ?? [];
  const participa = lista.filter(p => PARTICIPA.includes(p.status));
  const disponiveis = lista.filter(p => p.pode?.aderir && !PARTICIPA.includes(p.status));
  const achar = (id: string) => lista.find(x => x.offer_id === id || x.promotion_id === id);
  const OUTRAS = 'Promoções encerradas ou não identificadas';
  const v = vendas.data?.vendasPromocao;
  const linhasPromo = (() => {
    const m = new Map<string, { nome: string; pedidos: number; unidades: number; faturamento: number }>();
    for (const g of v?.porPromocao ?? []) {
      const p = achar(g.id), nome = p ? (p.nome ?? p.nome_tipo) : g.id.startsWith('OFFER-') ? 'Desconto individual' : OUTRAS;
      const r = m.get(nome) ?? { nome, pedidos: 0, unidades: 0, faturamento: 0 };
      r.pedidos += g.pedidos; r.unidades += g.unidades; r.faturamento += g.faturamento; m.set(nome, r);
    }
    return [...m.values()].sort((a, b) => (a.nome === OUTRAS ? 1 : 0) - (b.nome === OUTRAS ? 1 : 0) || b.faturamento - a.faturamento);
  })();

  return <div className="space-y-3 text-xs" onClick={e => e.stopPropagation()}>
    <div className="flex items-center gap-2">
      <span className="font-semibold text-sm">Promoções do anúncio</span>
      {promos.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : promos.isError ? <span className="text-muted-foreground">Sem dado</span>
        : participa.length ? <span className="inline-flex gap-0.5" aria-label={`Participa de ${participa.length} promoções`}>{participa.map((p, i) => <Check key={i} className="h-4 w-4 text-primary" aria-hidden />)}</span>
        : <span className="font-semibold text-destructive" title="Sem promoção">0</span>}
    </div>
    {promos.isError && <p className="text-muted-foreground">{promos.error.message}</p>}
    {participa.length > 0 && <ul className="space-y-1">{participa.map((p, i) => <li key={i} className="flex gap-2 items-center"><Check className="h-3 w-3 text-primary shrink-0" aria-hidden /><span>{p.nome ?? p.nome_tipo} · {ESTADO[p.status] ?? p.status}{faixa(p.inicio, p.fim)}{p.preco ? ` · ${brl(p.preco)}` : ''}</span></li>)}</ul>}

    <div><p className="font-semibold mb-1">Disponíveis para participar · {num(disponiveis.length)}</p>
      {promos.isSuccess && (disponiveis.length ? <ul className="space-y-1">{disponiveis.map((p, i) => <li key={i}>{p.nome ?? p.nome_tipo}{faixa(p.inicio, p.fim)}{p.preco ? ` · preço sugerido ${brl(p.preco)}` : ''}</li>)}</ul> : <p className="text-muted-foreground">Nenhuma promoção disponível para este anúncio agora.</p>)}
    </div>

    <div><p className="font-semibold mb-1">Vendido por promoção{vendas.data && ` · ${dt(vendas.data.periodo.inicio + 'T12:00')} – ${dt(vendas.data.periodo.fim + 'T12:00')}`}</p>
      {vendas.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
      {vendas.isError && <p className="text-muted-foreground">{vendas.error.message}</p>}
      {vendas.isSuccess && !v && <p className="text-muted-foreground">Sem dado: os pedidos do período não puderam ser lidos por completo.</p>}
      {v && <table className="w-full"><thead><tr className="text-muted-foreground"><th className="text-left py-1">Promoção</th><th className="text-right">Pedidos</th><th className="text-right">Unidades</th><th className="text-right">Faturamento</th></tr></thead>
        <tbody className="tabular-nums">
          {linhasPromo.map(g => <tr key={g.nome}><td className="py-1">{g.nome}</td><td className="text-right">{num(g.pedidos)}</td><td className="text-right">{num(g.unidades)}</td><td className="text-right">{brl(g.faturamento)}</td></tr>)}
          {v.descontoSemPromocao.pedidos > 0 && <tr><td className="py-1">Desconto sem promoção identificada</td><td className="text-right">{num(v.descontoSemPromocao.pedidos)}</td><td className="text-right">{num(v.descontoSemPromocao.unidades)}</td><td className="text-right">{brl(v.descontoSemPromocao.faturamento)}</td></tr>}
          <tr className="text-muted-foreground"><td className="py-1">Sem desconto</td><td className="text-right">{num(v.semDesconto.pedidos)}</td><td className="text-right">{num(v.semDesconto.unidades)}</td><td className="text-right">{brl(v.semDesconto.faturamento)}</td></tr>
        </tbody></table>}
      {v && v.naoLidos > 0 && <p className="text-muted-foreground mt-1">{num(v.naoLidos)} pedidos sem leitura de desconto; não entram em nenhuma linha.</p>}
    </div>
  </div>;
}
