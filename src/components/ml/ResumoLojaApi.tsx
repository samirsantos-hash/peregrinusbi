import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { brl, brlCurto, num, pctFracao } from '@/lib/format';
import { useAnaliseMl } from '@/hooks/useAnaliseMl';
import KpiVidro from '@/components/dashboard/visaoGeral/KpiVidro';
import SaudeConta from '@/components/dashboard/visaoGeral/SaudeConta';
import { RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LeituraContaApi from './LeituraContaApi';

type Total = { faturamento: number; pedidos: number; unidades: number; visitas: number | null; conversao: number | null; cancelados: number; taxaCancelamento: number | null; ticket: number | null; serie: { data: string; faturamento: number }[] };
type Resposta = { atual: Total; anterior: Total; periodo: { inicio: string; fim: string }; consultadoEm: string };

const br = (s: string) => s.split('-').reverse().join('/');
const PERIODO_DELTA = 'vs 30 dias anteriores';

/** Variação relativa (%) ou absoluta em p.p.; null quando não há base comparável. */
const delta = (atual: number | null, ant: number | null, pontos = false) =>
  atual == null || ant == null || (!pontos && ant === 0) ? null : pontos ? (atual - ant) * 100 : (atual / ant - 1) * 100;

function TooltipVidro({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0B0F17]/90 px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
      <p className="text-slate-300 tabular-nums">{label ? br(label) : ''}</p>
      <p className="mt-0.5 font-semibold text-white tabular-nums">{brl(payload[0].value, true)}</p>
      <p className="text-slate-400">Faturamento pago</p>
    </div>
  );
}

const Rotulo = ({ children }: { children: React.ReactNode }) => (
  <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-400">{children}</p>
);

/**
 * Resultado da loja direto da API do Mercado Livre (30 dias UTC), em módulo de
 * vidro escuro. Nível superior: Resumo executivo (8 col) + Saúde da conta (4 col),
 * alturas alinhadas. Nível inferior: evolução diária (8 col) + Visitas/Conversão (4 col).
 */
export default function ResumoLojaApi({ custId, historico }: { custId?: string; historico: React.ReactNode }) {
  const q = useAnaliseMl<Resposta>(custId, 'resumo');
  if (!custId || (!q.verificandoConexao && !q.conectada && !q.erroConexao)) return <>{historico}</>;
  if (q.verificandoConexao || q.isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (q.error || q.erroConexao || !q.data) {
    return (
      <section className="painel-noite space-y-3">
        <h3 className="text-base font-semibold text-white">Resumo Mercado Livre</h3>
        <p className="text-sm text-slate-300">{q.error?.message ?? 'Não foi possível confirmar a fonte da loja.'}</p>
        <Button variant="outline" onClick={() => q.refetch()}>Tentar novamente</Button>
        <details className="border-t border-white/[0.08] pt-3">
          <summary className="cursor-pointer text-sm text-slate-300">Histórico importado · fonte separada</summary>
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
      {/* Cabeçalho enxuto: título + metadados em chips, uma linha */}
      <header className="painel-noite-cabeca">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="painel-noite-titulo">Resultado da loja</h3>
          <span className="noite-chip">Mercado Livre</span>
          <span className="noite-chip" title={`${br(periodo.inicio)} a ${br(periodo.fim)}`}>
            {br(periodo.inicio).slice(0, 5)} – {br(periodo.fim).slice(0, 5)}
          </span>
          <span className="noite-chip">30 dias UTC</span>
          <span className="noite-chip" title={consulta.toLocaleString('pt-BR')}>consulta {horaConsulta}</span>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0 border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          aria-label="Consultar resumo novamente"
          disabled={q.isFetching}
          onClick={() => q.refetch()}
        >
          <RefreshCw className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {/* Nível superior: Macro (8) × Saúde operacional (4) — mesma altura */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-8">
          <Rotulo>Resumo executivo</Rotulo>
          <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiVidro focal rotulo="Faturamento pago" valor={brl(a.faturamento)} delta={delta(a.faturamento, p.faturamento)} periodo={PERIODO_DELTA} />
            <KpiVidro rotulo="Pedidos pagos" valor={num(a.pedidos)} delta={delta(a.pedidos, p.pedidos)} periodo={PERIODO_DELTA} />
            <KpiVidro rotulo="Ticket por pedido" valor={a.ticket == null ? 'Sem dado' : brl(a.ticket)} delta={delta(a.ticket, p.ticket)} periodo={PERIODO_DELTA} />
            <KpiVidro rotulo="Unidades vendidas" valor={num(a.unidades)} delta={delta(a.unidades, p.unidades)} periodo={PERIODO_DELTA} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-4">
          <Rotulo>Saúde operacional</Rotulo>
          <SaudeConta custId={custId} className="flex-1" />
        </div>
      </div>

      {/* Nível inferior: Evolução (8) × Funil (4) — colunas fecham na mesma linha */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="noite-vidro flex min-h-[320px] min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all duration-200 hover:border-white/15 lg:col-span-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="truncate text-sm font-semibold tracking-tight text-white">Evolução diária do faturamento pago</h4>
            <span className="noite-chip">{a.serie.length} dias</span>
          </div>
          <div className="mt-3 min-h-[220px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={a.serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="vg-faturamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14A86C" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#14A86C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="data"
                  tickFormatter={(d: string) => br(d).slice(0, 5)}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={(v: number) => brlCurto(v)}
                  width={70}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<TooltipVidro />} cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  stroke="#3BD394"
                  strokeWidth={2}
                  fill="url(#vg-faturamento)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3BD394', stroke: '#0B0F17', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-3 text-xs text-slate-400">
            <span className="tabular-nums">
              Cancelados: <span className="font-medium text-slate-200">{num(a.cancelados)}</span> pedidos
            </span>
            <span className="tabular-nums">
              Taxa: <span className={`font-medium ${taxaCanc != null && taxaCanc >= 0.02 ? 'text-rose-400' : 'text-slate-200'}`}>{pctFracao(taxaCanc, 2)}</span>
            </span>
            {delta(a.cancelados, p.cancelados) != null && (
              <span className="tabular-nums">{num(delta(a.cancelados, p.cancelados), 1)}% {PERIODO_DELTA}</span>
            )}
          </p>
        </div>
        <div className="grid min-w-0 grid-rows-2 gap-5 lg:col-span-4">
          <KpiVidro
            rotulo="Visitas"
            valor={a.visitas == null ? 'Sem dado' : num(a.visitas)}
            delta={delta(a.visitas, p.visitas)}
            periodo={PERIODO_DELTA}
            nota="todos os anúncios"
          />
          <KpiVidro
            rotulo="Conversão por pedido"
            valor={pctFracao(a.conversao, 2)}
            delta={delta(a.conversao, p.conversao, true)}
            deltaPontos
            periodo={PERIODO_DELTA}
            nota="pedidos ÷ visitas"
          />
        </div>
      </div>

      <LeituraContaApi custId={custId} faturamento30d={a.faturamento} ticketDelta={delta(a.ticket, p.ticket)} />

      <details className="border-t border-white/[0.08] pt-3">
        <summary className="cursor-pointer text-sm text-slate-300 transition-colors hover:text-white">
          Histórico e diagnóstico importados · fonte separada
        </summary>
        <div className="space-y-4 pt-4">{historico}</div>
      </details>
    </section>
  );
}
