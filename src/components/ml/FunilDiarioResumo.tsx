import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { num } from '@/lib/format';
import { funilDiarioResumo, type DiaFunil } from '@/lib/funilDiarioResumo';
import { DeltaCapsula } from '@/components/dashboard/visaoGeral/KpiVidro';

function Detalhe({ active, payload, label, pontos }: { active?: boolean; payload?: { value?: number | null; name?: string; dataKey?: string }[]; label?: string; pontos: boolean }) {
  if (!active || !payload?.length) return null;
  return <div className="panel-glass-tooltip p-3 text-xs"><p>{label?.split('-').reverse().join('/')}</p>{payload.map(p => <p key={p.dataKey} className="mt-1 tabular-nums">{p.name}: {p.value == null ? 'Sem dado' : `${num(p.value, pontos || p.dataKey?.startsWith('delta') ? 2 : 0)}${p.dataKey?.startsWith('delta') ? pontos ? ' p.p.' : '%' : pontos ? '%' : ''}`}</p>)}</div>;
}

export default function FunilDiarioResumo({ atual, anterior, visitas, conversao, deltaVisitas, deltaConversao }: { atual: DiaFunil[]; anterior: DiaFunil[]; visitas: string; conversao: string; deltaVisitas: number | null; deltaConversao: number | null }) {
  const serie = funilDiarioResumo(atual, anterior);
  return <>{([{ titulo:'Visitas', chave:'visitas', variacao:'deltaVisitas', valor:visitas, delta:deltaVisitas, pontos:false }, { titulo:'Conversão por pedido', chave:'conversao', variacao:'deltaConversao', valor:conversao, delta:deltaConversao, pontos:true }] as const).map(c => {
    const cobertura = serie.filter(d => d[c.chave] != null).length;
    return <section key={c.chave} className="noite-vidro min-w-0 p-4" aria-label={`Evolução diária · ${c.titulo}`}>
      <h4 className="text-sm font-medium text-muted-foreground">{c.titulo}</h4>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"><p className="text-2xl font-semibold tabular-nums text-foreground">{c.valor}</p><DeltaCapsula delta={c.delta} pontos={c.pontos} /></div>
      <p className="mt-1 text-xs text-muted-foreground">Total vs 30 dias anteriores · {cobertura}/{serie.length} dias medidos</p>
      {cobertura ? <div className="mt-3 h-[144px] min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={serie} margin={{top:8,right:0,left:0,bottom:0}}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="data" tickFormatter={d => d.slice(5).split('-').reverse().join('/')} tick={{fontSize:11,fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} minTickGap={40} interval="preserveStartEnd" />
        <YAxis yAxisId="valor" width={42} tickFormatter={v => `${num(v,c.pontos ? 1 : 0)}${c.pontos ? '%' : ''}`} tick={{fontSize:11,fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} />
        <YAxis yAxisId="delta" hide />
        <Tooltip content={<Detalhe pontos={c.pontos} />} />
        <Line yAxisId="valor" dataKey={c.chave} name={c.titulo} stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} activeDot={{r:3}} connectNulls={false} isAnimationActive={false} />
        <Line yAxisId="delta" dataKey={c.variacao} name="Variação diária vs 30 dias antes" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
      </LineChart></ResponsiveContainer></div> : <p className="py-5 text-sm text-muted-foreground">Série diária indisponível.</p>}
      <p className="mt-1 text-xs text-muted-foreground">Linha verde: {c.pontos ? 'conversão diária' : 'visitas diárias'} · tracejada: variação {c.pontos ? '(p.p.)' : '(%)'}, escala independente</p>
    </section>;
  })}</>;
}