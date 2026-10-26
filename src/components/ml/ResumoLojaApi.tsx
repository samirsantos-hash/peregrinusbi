import { KpiCard } from '@/components/ds';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { brl, num, pctFracao } from '@/lib/format';
import { useAnaliseMl } from '@/hooks/useAnaliseMl';
import { RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
type Total = { faturamento: number; pedidos: number; unidades: number; visitas: number | null; conversao: number | null; cancelados: number; taxaCancelamento: number | null; ticket: number | null; serie: { data: string; faturamento: number }[] };
type Resposta = { atual: Total; anterior: Total; periodo: { inicio: string; fim: string }; consultadoEm: string };
const br = (s: string) => s.split('-').reverse().join('/');
export default function ResumoLojaApi({ custId, historico }: { custId?: string; historico: React.ReactNode }) {
  const q = useAnaliseMl<Resposta>(custId, 'resumo');
  if (!custId || (!q.verificandoConexao && !q.conectada && !q.erroConexao)) return <>{historico}</>;
  if (q.verificandoConexao || q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error || q.erroConexao || !q.data) return <section className="space-y-3 py-4"><h3 className="font-semibold">Resumo Mercado Livre</h3><p className="text-sm text-muted-foreground">{q.error?.message ?? 'Não foi possível confirmar a fonte da loja.'}</p><Button variant="outline" onClick={() => q.refetch()}>Tentar novamente</Button><details><summary className="text-sm cursor-pointer">Histórico importado · fonte separada</summary><div className="mt-4">{historico}</div></details></section>;
  const { atual: a, anterior: p, periodo } = q.data;
  const variacao = (atual: number | null, ant: number | null, pontos = false) => atual == null || ant == null || (!pontos && ant === 0) ? 'Sem comparação anterior' : `${pontos ? num((atual - ant) * 100, 2) + ' p.p.' : num((atual / ant - 1) * 100, 1) + '%'} vs 30 dias anteriores`;
  const d = (atual: number | null, ant: number | null, pontos = false) => atual == null || ant == null || (!pontos && ant === 0) ? null : pontos ? (atual - ant) * 100 : (atual / ant - 1) * 100;
  return <section className="space-y-5 py-2">
    <div className="flex flex-wrap justify-between items-center gap-2"><div><h3 className="text-base font-semibold">Resultado da loja · Mercado Livre</h3><p className="text-xs text-muted-foreground">{br(periodo.inicio)} a {br(periodo.fim)} · 30 dias UTC completos · consulta {new Date(q.data.consultadoEm).toLocaleString('pt-BR')} · independente do calendário histórico</p></div><Button size="icon" variant="outline" aria-label="Consultar resumo novamente" disabled={q.isFetching} onClick={() => q.refetch()}><RefreshCw className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} /></Button></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <KpiCard rotulo="Faturamento pago" valor={brl(a.faturamento)} referencia={variacao(a.faturamento, p.faturamento)} variacao={d(a.faturamento, p.faturamento)} melhorQuando="subir" focal />
      <KpiCard rotulo="Pedidos pagos" valor={num(a.pedidos)} referencia={variacao(a.pedidos, p.pedidos)} variacao={d(a.pedidos, p.pedidos)} melhorQuando="subir" />
      <KpiCard rotulo="Ticket por pedido" valor={a.ticket == null ? 'Sem dado' : brl(a.ticket)} referencia={variacao(a.ticket, p.ticket)} variacao={d(a.ticket, p.ticket)} melhorQuando="subir" />
      <KpiCard rotulo="Conversão por pedido" valor={pctFracao(a.conversao, 2)} referencia={variacao(a.conversao, p.conversao, true)} variacao={d(a.conversao, p.conversao, true)} melhorQuando="subir" />
      <KpiCard rotulo="Visitas" valor={a.visitas == null ? 'Sem dado' : num(a.visitas)} referencia={variacao(a.visitas, p.visitas)} variacao={d(a.visitas, p.visitas)} melhorQuando="subir" />
      <KpiCard rotulo="Unidades vendidas" valor={num(a.unidades)} referencia={variacao(a.unidades, p.unidades)} variacao={d(a.unidades, p.unidades)} melhorQuando="subir" />
      <KpiCard rotulo="Pedidos cancelados" valor={num(a.cancelados)} referencia={variacao(a.cancelados, p.cancelados)} variacao={d(a.cancelados, p.cancelados)} melhorQuando="descer" />
      <KpiCard rotulo="Taxa de cancelamento" valor={pctFracao(a.taxaCancelamento, 2)} referencia={variacao(a.taxaCancelamento, p.taxaCancelamento, true)} variacao={d(a.taxaCancelamento, p.taxaCancelamento, true)} melhorQuando="descer" />
    </div>
    <div className="h-64"><h4 className="text-sm font-medium mb-2">Evolução diária do faturamento pago</h4><ResponsiveContainer width="100%" height="90%"><LineChart data={a.serie}><CartesianGrid vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="data" tickFormatter={d => br(d).slice(0, 5)} tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => brl(v)} width={78} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={br} formatter={(v: number) => [brl(v), 'Faturamento pago']} /><Line dataKey="faturamento" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls={false} /></LineChart></ResponsiveContainer></div>
    <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm text-muted-foreground">Histórico e diagnóstico importados · fonte separada</summary><div className="pt-4 space-y-4">{historico}</div></details>
  </section>;
}