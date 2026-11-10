import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { brl, num, pctFracao } from '@/lib/format';

type Hoje = { dia: string; faturamento: number; pedidos: number; unidades: number; compradores: number; visitas: number | null; conversao: number | null; ticket: number | null; top: { id: string; titulo: string; unidades: number; faturamento: number; thumbnail: string | null }[]; consultadoEm: string };

const Celula = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div className="rounded-lg border border-border bg-card/60 p-3 text-center">
    <p className="text-xs text-muted-foreground">{rotulo}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{valor}</p>
  </div>
);

/** Coluna lateral do Resumo: vendas do dia corrente (parcial até a consulta) da loja selecionada. */
export default function VendasHojeLateral({ custId }: { custId: string }) {
  const q = useQuery({ queryKey: ['ml-analise-loja', custId, 'hoje'], staleTime: 60_000, refetchInterval: 2 * 60_000, retry: false,
    queryFn: () => chamarFuncaoMl<Hoje>('ml-analise-loja', { cust_id: custId, modo: 'hoje' }) });
  if (q.isLoading) return <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-56 w-full" /><Skeleton className="h-72 w-full" /></div>;
  if (q.error || !q.data) return <div className="noite-vidro rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Vendas de hoje indisponíveis no momento.</div>;
  const d = q.data, hora = new Date(d.consultadoEm);
  return (
    <aside className="flex min-w-0 flex-col gap-3" aria-label="Vendas de hoje">
      <section className="noite-vidro overflow-hidden rounded-xl border border-primary/40 bg-card">
        <div className="p-4">
          <h4 className="text-sm font-semibold text-foreground">Vendas de hoje</h4>
          <p className="mt-3 text-center text-3xl font-bold tabular-nums text-foreground">{brl(d.faturamento)}</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" aria-hidden />
            {hora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}, {hora.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">Dia parcial, desde 00h (Brasília) até agora · atualiza a cada 2 min</p>
      </section>
      <section className="noite-vidro rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-sm font-semibold text-foreground">Métricas-chave</h4>
        <div className="grid grid-cols-2 gap-2">
          <Celula rotulo="Visitas" valor={d.visitas == null ? 'Sem dado' : num(d.visitas)} />
          <Celula rotulo="Total de compradores" valor={num(d.compradores)} />
          <Celula rotulo="Quantidade de vendas" valor={num(d.pedidos)} />
          <Celula rotulo="Conversão" valor={pctFracao(d.conversao, 2)} />
          <Celula rotulo="Unidades vendidas" valor={`${num(d.unidades)} u.`} />
          <Celula rotulo="Preço médio" valor={d.ticket == null ? 'Sem dado' : brl(d.ticket)} />
        </div>
      </section>
      <section className="noite-vidro rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-sm font-semibold text-foreground">Produtos mais vendidos hoje</h4>
        {d.top.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma venda paga hoje até agora.</p> : (
          <ol className="space-y-3">
            {d.top.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3">
                <span className="w-3 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                {t.thumbnail ? <img src={t.thumbnail} alt="" className="h-9 w-9 shrink-0 rounded-md bg-card object-contain" loading="lazy" /> : <Package className="h-9 w-9 shrink-0 p-2 text-muted-foreground" />}
                <div className="min-w-0">
                  <a href={`https://produto.mercadolivre.com.br/${t.id.replace('MLB', 'MLB-')}`} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-foreground hover:text-primary" title={t.titulo}>{t.titulo}</a>
                  <p className="text-xs tabular-nums text-muted-foreground">{brl(t.faturamento)} · {num(t.unidades)} u.</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}
