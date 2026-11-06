import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { brl, brlCurto, num, pctFracao } from '@/lib/format';
import { useAnaliseMl } from '@/hooks/useAnaliseMl';
import KpiVidro from '@/components/dashboard/visaoGeral/KpiVidro';
import SaudeConta from '@/components/dashboard/visaoGeral/SaudeConta';
import { RefreshCw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LeituraContaApi from './LeituraContaApi';
import InvestimentoAdsResumo from './InvestimentoAdsResumo';
import SinteseIndicadores from './SinteseIndicadores';
import FunilDiarioResumo from './FunilDiarioResumo';
import { receitaPorVisita } from '@/lib/funilDiarioResumo';

type Total = { faturamento: number; pedidos: number; unidades: number; visitas: number | null; conversao: number | null; cancelados: number; taxaCancelamento: number | null; ticket: number | null; serie: { data: string; faturamento: number; pedidos?: number; cancelados?: number; visitas?: number | null }[] };
type Resposta = { atual: Total; anterior: Total; periodo: { inicio: string; fim: string }; anteriorPeriodo: { inicio: string; fim: string }; consultadoEm: string };

const br = (s: string) => s.split('-').reverse().join('/');
const PERIODO_DELTA = 'vs 30 dias anteriores';

/** Variação relativa (%) ou absoluta em p.p.; null quando não há base comparável. */
const delta = (atual: number | null, ant: number | null, pontos = false) =>
  atual == null || ant == null || (!pontos && ant === 0) ? null : pontos ? (atual - ant) * 100 : (atual / ant - 1) * 100;

function TooltipVidro({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey?: string; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel-glass-tooltip p-3 text-xs">
      <p className="text-muted-foreground tabular-nums">{label ? br(label) : ''}</p>
      {payload.map(p => <p key={p.dataKey} className={`mt-1 tabular-nums ${p.dataKey === 'cancelados' ? 'text-destructive' : 'text-foreground'}`}>{p.name}: {p.dataKey === 'faturamento' ? brl(p.value, true) : num(p.value)}</p>)}
    </div>
  );
}

const Rotulo = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-sm font-semibold tracking-normal text-foreground">{children}</h4>
);

/**
 * Resultado da loja direto da API do Mercado Livre (30 dias UTC), em módulo de
 * vidro escuro. Nível superior: Resumo executivo (8 col) + Saúde da conta (4 col),
 * alturas alinhadas. Nível inferior: evolução diária (8 col) + Visitas/Conversão (4 col).
 */
export default function ResumoLojaApi({ custId, historico, pagina = "geral" }: { custId?: string; historico: React.ReactNode; pagina?: string }) {
  const q = useAnaliseMl<Resposta>(custId, 'resumo');
  if (pagina === "analise") return <>{historico}</>;
  if (!custId || (!q.verificandoConexao && !q.conectada && !q.erroConexao)) return <>{historico}</>;
  if (q.verificandoConexao || q.isLoading) return (
    <div className="space-y-5" role="status" aria-label="Carregando resumo da loja">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-3 lg:col-span-8 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[156px] w-full" />)}
        </div>
        <Skeleton className="h-[196px] w-full lg:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Skeleton className="h-[320px] w-full lg:col-span-8" />
        <Skeleton className="h-[320px] w-full lg:col-span-4" />
      </div>
    </div>
  );
  if (q.error || q.erroConexao || !q.data) {
    return (
      <section className="painel-noite space-y-3">
        <h3 className="text-base font-semibold text-foreground">Resumo Mercado Livre</h3>
        <p className="text-sm text-muted-foreground">{q.error?.message ?? 'Não foi possível confirmar a fonte da loja.'}</p>
        <Button variant="outline" onClick={() => q.refetch()}>Tentar novamente</Button>
        <details className="border-t border-border pt-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">Histórico importado · fonte separada</summary>
          <div className="mt-4">{historico}</div>
        </details>
      </section>
    );
  }

  const { atual: a, anterior: p, periodo } = q.data;
  const consulta = new Date(q.data.consultadoEm);
  const horaConsulta = consulta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const taxaCanc = a.taxaCancelamento;

  return (
    <section className="painel-noite space-y-5">
      {/* Cabeçalho da referência: título e período, sem cápsulas adicionais. */}
      <header className="painel-noite-cabeca">
        <div className="min-w-0 space-y-1">
          <h3 className="painel-noite-titulo">Resultado da loja · Mercado Livre</h3>
          <p className="text-xs leading-5 text-muted-foreground tabular-nums">
            {br(periodo.inicio)} a {br(periodo.fim)} · 30 dias UTC completos · consulta {consulta.toLocaleDateString('pt-BR')}, {horaConsulta} · independente do calendário histórico
          </p>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 border-border bg-card text-foreground"
          aria-label="Consultar resumo novamente"
          disabled={q.isFetching}
          onClick={() => q.refetch()}
        >
          <RefreshCw className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      <div className="resumo-visual-ref space-y-8">
      {/* Nível superior: Macro (8) × Saúde operacional (4) — mesma altura */}
      <div className="space-y-3">
        <Rotulo>Resumo executivo</Rotulo>
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-8">
          <div className="grid h-full auto-rows-fr grid-cols-2 gap-3 2xl:grid-cols-3">
            <KpiVidro focal rotulo="Faturamento pago" valor={brl(a.faturamento)} delta={delta(a.faturamento, p.faturamento)} periodo={PERIODO_DELTA} />
            <KpiVidro rotulo="Pedidos pagos" valor={num(a.pedidos)} delta={delta(a.pedidos, p.pedidos)} periodo={PERIODO_DELTA} />
            <KpiVidro rotulo="Ticket por pedido" valor={a.ticket == null ? 'Sem dado' : brl(a.ticket)} delta={delta(a.ticket, p.ticket)} periodo={PERIODO_DELTA} />
            <KpiVidro rotulo="Unidades vendidas" valor={num(a.unidades)} delta={delta(a.unidades, p.unidades)} periodo={PERIODO_DELTA} />
            <InvestimentoAdsResumo custId={custId} periodo={periodo} anteriorPeriodo={q.data.anteriorPeriodo} faturamento={a.faturamento} faturamentoAnterior={p.faturamento} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-4">
          <SaudeConta custId={custId} compact />
          <SinteseIndicadores custId={custId} atual={a} anterior={p} periodo={periodo} anteriorPeriodo={q.data.anteriorPeriodo} />
        </div>
      </div>
      </div>

      {/* Funil compacto: cartões não esticam até a altura dos dois gráficos. */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="noite-vidro flex min-h-[320px] min-w-0 flex-col rounded-xl border border-border bg-card p-5 transition-transform duration-150 lg:col-span-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold tracking-normal text-foreground">Evolução diária do faturamento pago</h4>
          </div>
          <div className="mt-4 h-[250px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="data"
                  tickFormatter={(d: string) => br(d).slice(0, 5)}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={(v: number) => brlCurto(v)}
                  width={70}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<TooltipVidro />} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }} />
                <Bar
                  dataKey="faturamento"
                  name="Faturamento pago"
                  fill="hsl(var(--chart-1))"
                  maxBarSize={18}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <h4 className="mt-4 text-sm font-semibold text-foreground">Pedidos por dia</h4>
          <div className="mt-2 flex flex-wrap gap-4 text-xs"><span className="text-primary">Pedidos pagos</span><span className="text-destructive">Pedidos cancelados</span></div>
          <div className="mt-3 h-[170px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="data" tickFormatter={(d: string) => br(d).slice(0, 5)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                <YAxis allowDecimals={false} width={40} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipVidro />} cursor={{ fill: 'hsl(var(--muted) / .3)' }} />
                <Bar dataKey="pedidos" name="Pedidos pagos" fill="hsl(var(--chart-1))" maxBarSize={12} isAnimationActive={false} />
                <Bar dataKey="cancelados" name="Pedidos cancelados" fill="hsl(var(--destructive))" maxBarSize={12} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Status atual por data de criação do pedido; a API deste resumo não identifica quem cancelou.</p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="tabular-nums">
              Cancelados: <span className="font-medium text-foreground">{num(a.cancelados)}</span> pedidos
            </span>
            <span className="tabular-nums">
              Taxa: <span className={`font-medium ${taxaCanc != null && taxaCanc >= 0.02 ? 'text-destructive' : 'text-foreground'}`}>{pctFracao(taxaCanc, 2)}</span>
            </span>
            {delta(a.cancelados, p.cancelados) != null && (
              <span className="tabular-nums">{num(delta(a.cancelados, p.cancelados), 1)}% {PERIODO_DELTA}</span>
            )}
          </p>
        </div>
        <div className="resumo-funil grid min-w-0 grid-cols-1 items-start gap-3 self-start lg:col-span-4">
          <FunilDiarioResumo atual={a.serie} anterior={p.serie} visitas={a.visitas == null ? 'Sem dado' : num(a.visitas)} conversao={pctFracao(a.conversao, 2)} deltaVisitas={delta(a.visitas,p.visitas)} deltaConversao={delta(a.conversao,p.conversao,true)} />
          <KpiVidro rotulo="Receita por visita" valor={receitaPorVisita(a.faturamento,a.visitas) == null ? 'Sem dado' : brl(receitaPorVisita(a.faturamento,a.visitas), true)} delta={delta(receitaPorVisita(a.faturamento,a.visitas),receitaPorVisita(p.faturamento,p.visitas))} periodo={PERIODO_DELTA} nota="Faturamento pago ÷ visitas no mesmo período; não representa lucro." />
        </div>
      </div>

      </div>
      {pagina !== "indicadores" && <LeituraContaApi custId={custId} faturamento30d={a.faturamento} ticketDelta={delta(a.ticket, p.ticket)} />}

      <details className="border-t border-border pt-3">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          Histórico e diagnóstico importados · fonte separada
        </summary>
        <div className="space-y-4 pt-4">{historico}</div>
      </details>
    </section>
  );
}
