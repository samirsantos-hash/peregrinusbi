import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { brl, brlCurto, num, pctFracao } from "@/lib/format";
import type { PontoPublicidade } from "@/lib/sinergiaPublicidade";
import { agruparPublicidade } from '@/lib/publicidadeSerie';
import type { Limites } from '../../../supabase/functions/_shared/mlAdsGestao';
import { motivoAlertaAds } from '@/lib/alertasGraficoAds';
import { PontoRupturaAds } from '@/components/ml/ads/PontoRupturaAds';

type Metrica = 'faturamento' | 'investimento' | 'receitaAds' | 'receitaOrganica' | 'roas' | 'acos' | 'tacos';
const METRICAS: { id: Metrica; nome: string; eixo: string }[] = [
  { id: 'faturamento', nome: 'Faturamento pago', eixo: 'receita' },
  { id: 'investimento', nome: 'Investimento Ads', eixo: 'ads' },
  { id: 'receitaAds', nome: 'Receita atribuída a Ads', eixo: 'receita' },
  { id: 'receitaOrganica', nome: 'Receita sem publicidade', eixo: 'receita' },
  { id: 'roas', nome: 'ROAS', eixo: 'roas' },
  { id: 'acos', nome: 'ACOS', eixo: 'taxas' },
  { id: 'tacos', nome: 'TACOS', eixo: 'taxas' },
];
const formatar = (id: Metrica, v: number | null) => v == null ? 'Sem dado' : id === 'roas' ? `${num(v, 2)}x` : id === 'acos' || id === 'tacos' ? pctFracao(v, 2) : brl(v);

export default function GraficoPublicidadeSerie({ pontos, compacto = false, limites, compararVendas = false }: { pontos: PontoPublicidade[]; compacto?: boolean; limites?: Limites; compararVendas?: boolean }) {
  const mobile = useIsMobile();
  const [semanal, setSemanal] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Metrica[]>(compararVendas ? ['receitaAds', 'receitaOrganica'] : ['faturamento', 'investimento', 'roas']);
  const serie = agruparPublicidade(pontos, semanal);
  const defs = METRICAS.filter(m => selecionadas.includes(m.id));
  const todos = selecionadas.length === METRICAS.length;
  const alternar = (id: Metrica) => setSelecionadas(s => s.includes(id) ? s.length === 1 ? s : s.filter(m => m !== id) : [...s, id]);
  const motivos = (id: Metrica, p: Record<string, unknown>) => (id === 'investimento' ? ['acos', 'tacos'] : [id]).map(m => motivoAlertaAds(m, p[m], limites)).filter((t): t is string => t != null);
  const tem = (eixo: string) => defs.some(m => m.eixo === eixo);
  return <div className="ads-serie-chart space-y-3 min-w-0" aria-label={compararVendas ? 'Comparação de faturamento e receita atribuída' : 'Gráfico Faturamento Ads ROAS'}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h4 className="text-sm font-semibold">{compararVendas ? 'Vendas com e sem publicidade' : 'Evolução da publicidade'}</h4>
      {!compacto && <div className="flex gap-1" role="group" aria-label="Agrupar evolução">
        <Button size="sm" variant={semanal ? "ghost" : "secondary"} aria-pressed={!semanal} onClick={() => setSemanal(false)}>Dia</Button>
        <Button size="sm" variant={semanal ? "secondary" : "ghost"} aria-pressed={semanal} onClick={() => setSemanal(true)}>Semana</Button>
      </div>}
    </div>
    {!compararVendas && <div className="flex flex-wrap gap-1.5" role="group" aria-label="Métricas do gráfico">
      {METRICAS.map(m => <Button key={m.id} size="sm" variant={selecionadas.includes(m.id) ? 'secondary' : 'outline'} aria-pressed={selecionadas.includes(m.id)} onClick={() => alternar(m.id)}>{m.nome}</Button>)}
      <Button size="sm" variant={todos ? 'secondary' : 'outline'} aria-pressed={todos} onClick={() => setSelecionadas(METRICAS.map(m => m.id))}>Tudo junto</Button>
    </div>}
    <div className={compacto ? "h-[220px]" : "h-[340px]"}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={serie} margin={{ top: 12, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="data" tickFormatter={d => d.slice(5).split('-').reverse().join('/')} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} height={36} padding={{ left: 10, right: 10 }} />
          <YAxis yAxisId="receita" hide={!tem('receita')} width={mobile ? 56 : 70} tickCount={4} tickFormatter={brlCurto} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="ads" orientation="right" hide={!tem('ads')} width={mobile ? 50 : 65} tickCount={4} tickFormatter={brlCurto} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="roas" hide={tem('receita') || tem('ads') || !tem('roas')} domain={[0, 'auto']} width={48} tickFormatter={v => `${num(v, 1)}x`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis yAxisId="taxas" orientation="right" hide={tem('ads') || !tem('taxas')} width={48} domain={[0, 'auto']} tickFormatter={v => pctFracao(v, 0)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip content={({ active, payload }) => {
            const p = payload?.[0]?.payload;
            if (!active || !p) return null;
            return <div className="panel-glass-tooltip max-w-[260px] space-y-2 p-3 text-xs tabular-nums">
              <p className="text-muted-foreground">{String(p.data).split('-').reverse().join('/')}</p>
              {defs.map(m => <p key={m.id}>{m.nome}: {formatar(m.id, p[m.id])}</p>)}
              {[...new Set(defs.flatMap(m => motivos(m.id, p)))].map(t => <p key={t} className="text-destructive">{t}</p>)}
            </div>;
          }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          {defs.map(m => m.id === 'investimento' ? <Scatter key={m.id} name={m.nome} yAxisId={m.eixo} dataKey={m.id} fill={`hsl(var(--ads-series-${m.id}))`} isAnimationActive={false} shape={p => {
            const ms = motivos(m.id, p.payload);
            return ms.length ? <PontoRupturaAds cx={p.cx} cy={p.cy} motivos={ms} /> : <circle cx={p.cx} cy={p.cy} r={2.5} fill={`hsl(var(--ads-series-${m.id}))`} />;
          }} /> : <Line key={m.id} className={`ads-metrica-${m.id}`} name={m.nome} yAxisId={m.eixo} dataKey={m.id} stroke={`hsl(var(--ads-series-${m.id}))`} strokeWidth={2} strokeDasharray={m.id === 'roas' ? '4 4' : m.id === 'acos' ? '7 3' : m.id === 'tacos' ? '2 3' : undefined} dot={p => <PontoRupturaAds cx={p.cx} cy={p.cy} motivos={motivos(m.id, p.payload)} />} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <p className="text-xs text-muted-foreground">{compararVendas ? `Escopo: produtos das campanhas de publicidade, não toda a loja. Valores em R$ e atribuição conforme o Mercado Livre; não medem efeito incremental.${pontos.some(p => p.receitaOrganica == null) ? ' Receita sem publicidade indisponível nas datas sem medição confirmada; não calculada por subtração.' : ''}` : 'Investimento: pontos sem ligação. Esferas vermelhas: limite configurado excedido, com valor e referência ao passar o mouse ou tocar. ROAS em x; ACOS e TACOS em %; valores financeiros em R$.'}</p>
  </div>;
}
