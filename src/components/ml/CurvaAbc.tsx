import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ds';
import { chamarFuncaoMl, dataHoraBr } from '@/lib/mlFuncoes';
import { brl, num, pct } from '@/lib/format';
import { classificarAbc, cruzarAbc, type BaseAbc, type ItemVendas } from '@/lib/anuncio/curvaAbc';
import { STATUS_ANUNCIO } from '@/lib/mlRotulos';
import ListaCruzamentoAbc, { type Grupo } from '@/components/ml/ListaCruzamentoAbc';

type Dados = { periodo: { inicio: string; fim: string }; itens: ItemVendas[]; coberturaCompleta: boolean; catalogoCompleto: boolean; consultadoEm: string };
const dataBr = (s: string) => s.split('-').reverse().join('/');

export default function CurvaAbc({ custId }: { custId: string }) {
  const [dias, setDias] = useState(30);
  const [base, setBase] = useState<BaseAbc>('faturamento');
  const [corteA, setCorteA] = useState('80'), [corteB, setCorteB] = useState('95');
  const [expandido, setExpandido] = useState(false);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const query = useQuery({
    queryKey: ['ml-curva-abc', custId, dias], enabled: !!custId, retry: false,
    queryFn: async () => {
      const d = await chamarFuncaoMl<Dados>('ml-analise-loja', { cust_id: custId, modo: 'curvaABC', dias });
      if (!d.coberturaCompleta || !d.catalogoCompleto) throw new Error('Cobertura incompleta; classificação suspensa.');
      return d;
    },
  });
  const calculo = useMemo(() => {
    if (!query.data) return null;
    try {
      const cortes = { a: Number(corteA) / 100, b: Number(corteB) / 100 };
      const f = classificarAbc(query.data.itens, 'faturamento', cortes), u = classificarAbc(query.data.itens, 'unidades', cortes);
      return { atual: base === 'faturamento' ? f : u, cruzado: cruzarAbc(f, u), erro: null };
    } catch (e) { return { atual: null, cruzado: [], erro: e instanceof Error ? e.message : 'Valores inválidos.' }; }
  }, [query.data, base, corteA, corteB]);
  const r = calculo?.atual;
  const cruzados = new Map<string, ReturnType<typeof cruzarAbc>[number]>();
  for (const i of calculo?.cruzado ?? []) cruzados.set(i.mlb, i);
  const dinheiro = base === 'faturamento';
  const lista = r?.itens.slice(0, expandido ? undefined : 10) ?? [];
  const semVendas = query.data?.itens.filter(i => i.unidades === 0) ?? [];
  const valor = (v: number) => dinheiro ? brl(v / 100) : num(v);

  return <section className="space-y-5 min-w-0">
    <div className="flex flex-wrap justify-between gap-3 items-start">
      <div><h2 className="text-xl font-semibold">Curva ABC</h2>
        {query.data && <p className="text-xs text-muted-foreground mt-1">{dataBr(query.data.periodo.inicio)} – {dataBr(query.data.periodo.fim)} · pedidos pagos · atualizado em {dataHoraBr(query.data.consultadoEm)}</p>}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Tabs value={String(dias)} onValueChange={v => { setDias(Number(v)); setExpandido(false); }}><TabsList><TabsTrigger value="7">7 dias</TabsTrigger><TabsTrigger value="30">30 dias</TabsTrigger></TabsList></Tabs>
        <Button variant="outline" size="icon" aria-label="Atualizar Curva ABC" title="Atualizar Curva ABC" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} /></Button>
      </div>
    </div>
    <div className="flex flex-wrap gap-4 items-end">
      <Tabs value={base} onValueChange={v => { setBase(v as BaseAbc); setExpandido(false); }}><TabsList><TabsTrigger value="faturamento">Faturamento</TabsTrigger><TabsTrigger value="unidades">Unidades</TabsTrigger></TabsList></Tabs>
      <label className="text-xs space-y-1">Corte A (%)<Input aria-label="Corte A (%)" type="number" min="1" max="98" value={corteA} onChange={e => setCorteA(e.target.value)} className="w-20" /></label>
      <label className="text-xs space-y-1">Corte B (%)<Input aria-label="Corte B (%)" type="number" min="2" max="99" value={corteB} onChange={e => setCorteB(e.target.value)} className="w-20" /></label>
    </div>
    {query.isPending && <div role="status" className="flex gap-2 items-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Consultando pedidos e catálogo…</div>}
    {query.isError && <EmptyState falta={query.error.message} acao="Tente atualizar ou escolha uma janela menor." />}
    {calculo?.erro && <p role="alert" className="text-sm text-destructive">{calculo.erro}</p>}
    {r && <>
      <p className="text-xs text-muted-foreground">Cortes convencionais, não oficiais. O item que cruza o corte e os empatados permanecem na mesma classe; a participação pode ultrapassar o limite.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{r.resumo.map(g => <div key={g.classe} className="glass-card p-4 space-y-2">
        <h3 className="font-semibold">Classe {g.classe}</h3><p className="text-xl font-semibold tabular-nums">{valor(g.valor)}</p>
        <p className="text-xs text-muted-foreground">{num(g.itens)} anúncios · {pct(g.participacaoValor * 100)} da base</p>
      </div>)}</div>
      {r.totalBase > 0 ? <div className="min-w-0">
        <h3 className="font-semibold mb-3">Contribuição acumulada · {valor(r.totalBase)}</h3>
        <ResponsiveContainer width="100%" height={280}><LineChart data={[{ posicao: 0, acumulado: 0 }, ...r.itens.map(i => ({ posicao: i.posicao, acumulado: i.acumulado * 100, mlb: i.mlb }))]} margin={{ top: 10, right: 12, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--grid))" vertical={false} /><XAxis dataKey="posicao" type="number" domain={[0, r.itens.length]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={45} />
          <Tooltip formatter={(v: number) => [pct(v), 'Acumulado']} labelFormatter={v => `Posição ${v}`} contentStyle={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
          <ReferenceLine y={Number(corteA)} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" /><ReferenceLine y={Number(corteB)} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart></ResponsiveContainer>
      </div> : <EmptyState falta={`Nenhum anúncio com ${dinheiro ? 'faturamento' : 'unidades'} positivo no período.`} />}
      <h3 className="font-semibold">Cruzamento de faturamento e unidades</h3>
      <div className="grid grid-cols-3 gap-2 text-xs">{(['A', 'B', 'C'] as const).flatMap(cf => (['A', 'B', 'C'] as const).map(cu => <button type="button" key={cf + cu} onClick={() => setGrupo({ faturamento: cf, unidades: cu })} className="glass-card p-3 text-left cursor-pointer" aria-label={`Abrir lista Receita ${cf} · Unidades ${cu}`}><p className="text-muted-foreground">Receita {cf} · Unidades {cu}</p><p className="font-semibold mt-1">{num(calculo?.cruzado.filter(i => i.classeFaturamento === cf && i.classeUnidades === cu).length ?? 0)} anúncios</p></button>))}</div>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-muted-foreground">{['Posição / anúncio', 'Classe', 'Valor', 'Participação', 'Acumulado', 'Receita / unidades', 'Perfil'].map(t => <th key={t} className="text-left p-3 whitespace-nowrap">{t}</th>)}</tr></thead>
        <tbody>{lista.map(i => <tr key={i.mlb} className="border-b border-border/50"><td className="p-3 min-w-48 max-w-xs"><p className="font-medium break-words">{i.posicao}. {i.titulo}</p><p className="text-muted-foreground">{i.mlb} · {i.status ? STATUS_ANUNCIO[i.status] ?? i.status : 'Estado atual não confirmado'}</p></td><td className="p-3 font-semibold">{i.classe}</td><td className="p-3 whitespace-nowrap tabular-nums">{valor(i.valorBase)}</td><td className="p-3">{pct(i.participacao * 100)}</td><td className="p-3">{pct(i.acumulado * 100)}</td><td className="p-3">{cruzados.get(i.mlb)?.classeFaturamento ?? '—'} / {cruzados.get(i.mlb)?.classeUnidades ?? '—'}</td><td className="p-3 whitespace-nowrap">{cruzados.get(i.mlb)?.perfil}</td></tr>)}</tbody></table></div>
      {r.itens.length > 10 && <Button variant="outline" size="sm" onClick={() => setExpandido(v => !v)}>{expandido ? 'Mostrar dez anúncios' : `Mostrar todos (${num(r.itens.length)})`}</Button>}
      <div className="space-y-2"><h3 className="font-semibold">Sem vendas pagas no período · {num(semVendas.length)}</h3><p className="text-xs text-muted-foreground">Catálogo atual de ativos e pausados conferido. Ausência de venda nesta janela não determina há quanto tempo o anúncio está parado.</p>
        <details><summary className="cursor-pointer text-sm">Anúncios sem vendas na janela</summary><ul className="text-xs space-y-2 mt-3">{semVendas.map(i => <li key={i.mlb}>{i.titulo} · {i.mlb}</li>)}</ul></details>
        {r.semMovimento.some(i => i.unidades > 0) && <p className="text-xs text-muted-foreground">{num(r.semMovimento.filter(i => i.unidades > 0).length)} anúncios tiveram unidades vendidas sem faturamento positivo; estão fora desta base.</p>}
      </div>
    </>}
    <ListaCruzamentoAbc grupo={grupo} itens={calculo?.cruzado ?? []} periodo={query.data ? `${dataBr(query.data.periodo.inicio)} – ${dataBr(query.data.periodo.fim)}` : ''} onClose={() => setGrupo(null)} />
  </section>;
}