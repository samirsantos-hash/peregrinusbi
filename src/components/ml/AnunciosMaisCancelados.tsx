import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { num, pctFracao } from '@/lib/format';
import { anunciosMaisCancelados, type OcorrenciasAnuncio } from '@/lib/anuncio/cancelamentos';

type Dados = { periodo: { inicio: string; fim: string }; itens: { mlb: string; titulo: string }[]; experienciaPedidos?: OcorrenciasAnuncio[]; coberturaCompleta: boolean };

export default function AnunciosMaisCancelados({ custId, periodo }: { custId: string; periodo: { inicio: string; fim: string } }) {
  const [expandido, setExpandido] = useState(false);
  const q = useQuery({
    queryKey: ['ml-curva-abc', custId, 30], enabled: !!custId, retry: false,
    queryFn: () => chamarFuncaoMl<Dados>('ml-analise-loja', { cust_id: custId, modo: 'curvaABC', dias: 30 }),
  });
  const d = q.data;
  const compativel = d?.coberturaCompleta === true && d.periodo.inicio === periodo.inicio && d.periodo.fim === periodo.fim && Array.isArray(d.experienciaPedidos);
  const linhas = compativel && d ? anunciosMaisCancelados(d.experienciaPedidos ?? [], new Map(d.itens.map(i => [i.mlb, i.titulo]))) : [];
  const ambiguos = compativel ? d?.experienciaPedidos?.filter(i => i.cancelamentos === null).length ?? 0 : 0;

  return <section className="mt-5 min-w-0 border-t border-border pt-4" aria-label="Anúncios mais afetados por cancelamentos">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-foreground">Anúncios mais afetados por cancelamentos</h4>
        <p className="mt-1 text-xs text-muted-foreground">Mesmos 30 dias · ordem por quantidade de pedidos cancelados</p>
      </div>
      <Button size="icon" variant="ghost" aria-label="Atualizar anúncios com cancelamentos" title="Atualizar anúncios com cancelamentos" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} /></Button>
    </div>
    {q.isPending ? <div className="mt-3 space-y-2" role="status" aria-label="Consultando cancelamentos por anúncio">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      : q.isError || !compativel ? <div className="mt-3 space-y-2"><p className="text-xs text-muted-foreground">Não foi possível confirmar os cancelamentos por anúncio neste período. O total da loja permanece separado.</p><Button size="sm" variant="outline" onClick={() => void q.refetch()}>Tentar novamente</Button></div>
      : <>
        <div className="mt-3 max-h-96 overflow-auto">
          {linhas.length > 0 ? <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr className="border-b border-border"><th className="py-2 text-left font-medium">Anúncio</th><th className="px-2 py-2 text-right font-medium">Pagos</th><th className="px-2 py-2 text-right font-medium">Cancelados</th><th className="py-2 text-right font-medium">Taxa</th></tr></thead>
            <tbody>{linhas.slice(0, expandido ? undefined : 5).map(r => <tr key={r.item_id} className="border-b border-border/50">
              <td className="min-w-0 py-3 pr-3"><a href={`https://articulo.mercadolibre.com.br/${r.item_id.replace('MLB', 'MLB-')}`} target="_blank" rel="noopener noreferrer" className="block max-w-sm break-words font-medium text-foreground hover:text-primary"><span className="line-clamp-2">{r.titulo}</span><span className="mt-1 inline-flex items-center gap-1 text-muted-foreground">{r.item_id}<ExternalLink className="h-3 w-3" aria-hidden /></span></a></td>
              <td className="px-2 py-3 text-right tabular-nums">{num(r.vendas)}</td><td className="px-2 py-3 text-right font-semibold tabular-nums text-destructive">{num(r.cancelamentos)}</td><td className="py-3 text-right tabular-nums">{pctFracao(r.taxa, 2)}</td>
            </tr>)}</tbody>
          </table> : <p className="py-3 text-xs text-muted-foreground">Nenhum anúncio com cancelamento de vínculo confirmado nesta janela.</p>}
        </div>
        {linhas.length > 5 && <Button size="sm" variant="ghost" className="mt-2" onClick={() => setExpandido(v => !v)}>{expandido ? 'Mostrar cinco anúncios' : `Ver todos (${num(linhas.length)})`}</Button>}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Taxa = cancelados ÷ (pagos + cancelados). Status atual por data de criação; não identifica quem cancelou nem representa taxa oficial de reputação.{ambiguos > 0 && ` ${num(ambiguos)} anúncios com vínculo incerto ficaram fora da lista; as linhas não recompõem necessariamente o total da loja.`}</p>
      </>}
  </section>;
}