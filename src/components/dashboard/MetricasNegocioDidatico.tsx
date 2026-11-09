import { useAnaliseMl } from '@/hooks/useAnaliseMl';
import { brl, num, pctFracao } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip } from 'recharts';
import { useNumeroAnimado } from '@/hooks/useNumeroAnimado';
import { notaCoberturaAds, useInvestimentoAdsResumo } from '@/components/ml/InvestimentoAdsResumo';

type Total = { faturamento: number; pedidos: number; unidades: number; visitas: number | null; conversao: number | null; ticket: number | null; serie: { data: string; faturamento: number }[] };
type Resumo = { atual: Total; anterior: Total; periodo: { inicio: string; fim: string }; anteriorPeriodo: { inicio: string; fim: string } };
const dataBr = (data: string) => data.split('-').reverse().join('/');
function Linha({ nome, valor, referencia }: { nome: string; valor: string; referencia: string }) {
  const animado = useNumeroAnimado(valor);
  return <div className="grid min-w-0 grid-cols-1 gap-1 border-b border-border py-4 sm:grid-cols-[1fr_1fr_1.3fr] sm:items-center sm:gap-4">
    <dt className="text-sm font-medium text-foreground">{nome}</dt>
    <dd className="break-words text-xl font-semibold tabular-nums text-foreground">{animado}</dd>
    <dd className="text-xs leading-5 text-muted-foreground">{referencia}</dd>
  </div>;
}
function Comparacao({ nome, atual, anterior, moeda = false }: { nome: string; atual: number | null; anterior: number | null; moeda?: boolean }) {
  const variacao = atual != null && anterior != null && anterior > 0 ? (atual / anterior - 1) * 100 : null;
  return <Linha nome={nome} valor={moeda ? brl(atual) : num(atual)} referencia={variacao == null ? 'Sem comparação confirmada' : `${variacao > 0 ? '+' : ''}${num(variacao, 1)}% vs 30 dias anteriores`} />;
}
function LinhasResumo({ resumo, custId }: { resumo: Resumo; custId: string }) {
  const { atual: a, anterior: p, periodo, anteriorPeriodo } = resumo;
  const ads = useInvestimentoAdsResumo({ custId, periodo, anteriorPeriodo, faturamento: a.faturamento, faturamentoAnterior: p.faturamento, serie: a.serie, serieAnterior: p.serie });
  return <>
    <p className="text-xs leading-5 text-muted-foreground">{dataBr(periodo.inicio)} a {dataBr(periodo.fim)} · 30 dias completos; estes indicadores são independentes do calendário histórico.</p>
    <dl>
      <Comparacao nome="Faturamento pago" atual={a.faturamento} anterior={p.faturamento} moeda />
      <Comparacao nome="Itens vendidos" atual={a.unidades} anterior={p.unidades} />
      <Linha nome="Ticket por pedido" valor={brl(a.ticket)} referencia="Mediana da vertical ainda não confirmada" />
      <Comparacao nome="Visitas" atual={a.visitas} anterior={p.visitas} />
      <Linha nome="Taxa de conversão" valor={pctFracao(a.conversao, 2)} referencia="Mediana histórica da loja ainda não confirmada" />
      <Linha nome="Investimento em publicidade" valor={ads.isLoading ? '…' : ads.atual ? `${num(ads.atual.share, 2)}%` : '—'} referencia={ads.atual ? `Meta interna: 3% · ${brl(ads.atual.investimento)} · ${notaCoberturaAds(ads.atual)}` : 'Meta interna: 3% · investimento nas mesmas datas não confirmado'} />
    </dl>
  </>;
}

export default function MetricasNegocioDidatico({ custId, mensal, inicio, fim }: { custId?: string; mensal: { date: string; tgmv?: number; revenue?: number }[]; inicio?: string; fim?: string }) {
  const q = useAnaliseMl<Resumo>(custId, 'resumo');
  const meses = mensal.filter(k => (!inicio || k.date.slice(0, 7) >= inicio.slice(0, 7)) && (!fim || k.date.slice(0, 7) <= fim.slice(0, 7))).map(k => ({ mes: k.date.slice(0, 7), faturamento: k.tgmv ?? k.revenue ?? null }));
  const mesAtual = new Date().toISOString().slice(0, 7);
  return <section className="min-w-0 space-y-6" aria-label="Métricas de Negócio">
    <header><h2 className="text-lg font-semibold text-foreground">Métricas de Negócio</h2></header>
    {q.isLoading || q.verificandoConexao ? <div role="status" aria-label="Carregando métricas">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="my-3 h-14 w-full" />)}</div>
      : q.data && custId ? <LinhasResumo resumo={q.data} custId={custId} />
      : <><p className="text-sm text-muted-foreground">{custId ? 'Não foi possível confirmar os indicadores de 30 dias desta loja.' : 'Selecione uma loja para conferir os indicadores de negócio.'}</p><dl>{['Faturamento pago', 'Itens vendidos', 'Ticket por pedido', 'Visitas', 'Taxa de conversão', 'Investimento em publicidade'].map(nome => <Linha key={nome} nome={nome} valor="—" referencia="Medição não confirmada" />)}</dl>{(q.error || q.erroConexao) && <Button variant="outline" onClick={() => q.refetch()}>Tentar novamente</Button>}</>}
    <div className="min-w-0 border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-foreground">Faturamento mensal · histórico</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Seleção do calendário por mês; histórico separado dos indicadores acima. Mês atual hachurado e parcial; cobertura dos demais meses não confirmada.</p>
      {meses.length ? <div className="mt-4 h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={meses} margin={{ left: 0, right: 12 }}>
        <defs><pattern id="didatico-mes-parcial" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="hsl(var(--primary) / .25)" /><line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--primary))" strokeWidth="2" /></pattern></defs>
        <XAxis dataKey="mes" tickFormatter={v => `${String(v).slice(5)}/${String(v).slice(0, 4)}`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} minTickGap={24} />
        <YAxis width={85} tickFormatter={v => brl(v)} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
        <Tooltip formatter={v => brl(Number(v))} contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
        <Bar dataKey="faturamento" name="Faturamento" maxBarSize={32} isAnimationActive={false}>{meses.map(m => <Cell key={m.mes} fill={m.mes === mesAtual ? 'url(#didatico-mes-parcial)' : 'hsl(var(--primary))'} />)}</Bar>
      </BarChart></ResponsiveContainer></div> : <p className="mt-4 text-sm text-muted-foreground">Sem faturamento mensal confirmado para a seleção.</p>}
    </div>
  </section>;
}