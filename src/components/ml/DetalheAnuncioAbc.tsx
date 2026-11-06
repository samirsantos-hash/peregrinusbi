import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ds';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { brl, num, pct } from '@/lib/format';
import { STATUS_ANUNCIO } from '@/lib/mlRotulos';

type Pendencia = { grupo: string | null; titulo: string; acao: string | null; link: string | null };
type Resposta = {
  estatisticas: { titulo: string; link: string; preco: number; visitas: number | null; pedidos: number | null; unidades: number | null; faturamento: number | null; cancelados: number | null; conversao: number | null; promocao: boolean | null };
  periodo: { inicio: string; fim: string };
  detalhe?: { status: string | null; estoque: number | null; saude: number | null; qualidade: { score: number | null; nivel: string | null; pendencias: Pendencia[] } | null };
};
const br = (s: string) => s.split('-').reverse().join('/');
const v = (x: number | null | undefined, f: (n: number) => string = num) => x == null ? 'Sem dado' : f(x);

export default function DetalheAnuncioAbc({ custId, mlb, onClose }: { custId: string; mlb: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['ml-detalhe-anuncio', custId, mlb], enabled: !!mlb, retry: false,
    queryFn: () => chamarFuncaoMl<Resposta>('ml-buscar-produtos', { cust_id: custId, item_id: mlb }),
  });
  const e = q.data?.estatisticas, d = q.data?.detalhe, ql = d?.qualidade;
  const taxaCanc = e?.cancelados != null && e.pedidos != null && e.pedidos + e.cancelados > 0 ? e.cancelados / (e.pedidos + e.cancelados) : null;
  const linhas: [string, string][] = e ? [
    ['Situação', d?.status ? STATUS_ANUNCIO[d.status] ?? d.status : 'Sem dado'],
    ['Preço atual', brl(e.preco)], ['Estoque', v(d?.estoque)],
    ['Visitas', v(e.visitas)], ['Pedidos pagos', v(e.pedidos)], ['Unidades', v(e.unidades)],
    ['Faturamento', v(e.faturamento, brl)], ['Conversão (pedidos/visita)', v(e.conversao, n => pct(n * 100))],
    ['Cancelados', v(e.cancelados)], ['Taxa de cancelamento', v(taxaCanc, n => pct(n * 100))],
    ['Promoção ativa', e.promocao == null ? 'Sem dado' : e.promocao ? 'Sim' : 'Não'],
  ] : [];

  return <Sheet open={!!mlb} onOpenChange={o => { if (!o) onClose(); }}>
    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
      <SheetHeader><SheetTitle className="break-words">{e?.titulo ?? mlb}</SheetTitle>
        <SheetDescription>{mlb}{q.data && ` · ${br(q.data.periodo.inicio)} – ${br(q.data.periodo.fim)}`}</SheetDescription></SheetHeader>
      {q.isPending && <div role="status" className="flex gap-2 items-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Consultando anúncio…</div>}
      {q.isError && <EmptyState falta={q.error.message} />}
      {e && <div className="space-y-5 mt-4 text-sm">
        <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary text-xs">Abrir no Mercado Livre<ExternalLink className="h-3 w-3" /></a>
        <section className="glass-card p-4 space-y-1">
          <h3 className="font-semibold">Qualidade do anúncio</h3>
          <p className="text-2xl font-semibold tabular-nums">{ql?.score != null ? num(ql.score) : 'Sem dado'}</p>
          <p className="text-xs text-muted-foreground">{ql?.nivel ?? 'Nível não informado'}{d?.saude != null && ` · saúde ${pct(d.saude * 100)}`}</p>
        </section>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">{linhas.map(([k, val]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold tabular-nums">{val}</dd></div>)}</dl>
        <section className="space-y-2"><h3 className="font-semibold">Pendências apontadas · {num(ql?.pendencias.length ?? 0)}</h3>
          {ql?.pendencias.length ? <ul className="space-y-2 text-xs">{ql.pendencias.map((p, i) => <li key={i} className="border-b border-border/50 pb-2"><p className="font-medium">{p.titulo}</p>{p.grupo && <p className="text-muted-foreground">{p.grupo}</p>}</li>)}</ul>
            : <p className="text-xs text-muted-foreground">{ql ? 'Nenhuma pendência apontada.' : 'Qualidade indisponível para este anúncio.'}</p>}
        </section>
      </div>}
    </SheetContent>
  </Sheet>;
}
