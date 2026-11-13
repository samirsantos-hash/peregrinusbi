import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { REFERENCIAS_ESTUDO, mesesFechados, fracaoMedida, comparacaoMensal, type MesReputacao } from '@/lib/estudoReputacao';
import { num, pctFracao } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Snapshot = { dados: unknown; erro: string | null; atualizado_em: string };
const objeto = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' ? v as Record<string, unknown> : {};
const mes = (iso?: string) => iso ? new Date(`${iso.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Sem mês medido';
const janelaLegivel = (v: string) => v.replace(/^(\d+)\s+days?$/i, '$1 dias');
const pp = (v: number | null) => v === null ? 'Comparação indisponível' : `${v > 0 ? '+' : ''}${num(v, 2)} p.p. vs. mês anterior`;

export default function EstudoReputacao({ sellerId, custId, pagina, de, ate }: {
  sellerId?: string; custId?: string; pagina: string; de?: string; ate?: string;
}) {
  const atual = useQuery({ queryKey: ['ml-sync-tema', custId, 'reputacao'], enabled: !!custId, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('ml_sync_tema').select('dados, erro, atualizado_em').eq('cust_id', custId ?? '').eq('tema', 'reputacao').maybeSingle();
      if (error) throw error;
      return data as Snapshot | null;
    } });
  const mensal = useQuery({ queryKey: ['reputacao-mensal-medida', sellerId], enabled: !!sellerId, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await fetchAllRows<MesReputacao>((from, to) => supabase.from('sellers_kpi')
        .select('id,seller_id,data,rep_claims_rate,rep_delayed_ht_rate,rep_cancellations_rate')
        .eq('seller_id', sellerId ?? '').order('data').order('id').range(from, to));
      if (error) throw error;
      return data;
    } });
  if (!sellerId) return <section className="border-y border-border py-5 space-y-2"><h3 className="text-base font-semibold">Reputação por loja</h3><p className="text-sm text-muted-foreground">As taxas da carteira não são somadas nem calculadas por média simples. Selecione uma loja para ver as medições e suas janelas.</p></section>;
  if (mensal.isLoading || atual.isLoading) return <Skeleton className="h-44 w-full" />;
  const rows = mesesFechados(mensal.data ?? [], new Date().toISOString().slice(0, 10), de, ate);
  const ultimo = rows.at(-1);
  const r = atual.isError || atual.data?.erro ? {} : objeto(atual.data?.dados);
  const janela = typeof r.periodo === 'string' ? janelaLegivel(r.periodo) : null;
  const periodoApi = janela ? `Janela declarada: ${janela}` : 'Janela não informada';
  const vendas = typeof r.vendas_concluidas_60d === 'number' ? r.vendas_concluidas_60d : null;
  const taxas = REFERENCIAS_ESTUDO.map(ref => ({ ...ref, mensal: fracaoMedida(ultimo?.[ref.key]), atual: fracaoMedida(r[ref.api]), delta: comparacaoMensal(rows, ref.key) }));
  const leitura = taxas.filter(t => t.mensal !== null);
  const maior = [...leitura].sort((a, b) => ((b.mensal ?? 0) / b.limite) - ((a.mensal ?? 0) / a.limite))[0];
  const avaliacoes = objeto(r.avaliacoes);
  return <section className="space-y-5" aria-label="Leitura confiável da reputação">
    {pagina === 'resumo' && <>
      <div className="glass-card p-5 space-y-3"><h3 className="text-base font-semibold">Leitura da reputação</h3>
        <p className="text-sm leading-relaxed">{maior ? `${maior.nome} apresenta a maior taxa em relação à referência do estudo no último mês selecionado (${mes(ultimo?.data)}): ${pctFracao(maior.mensal, 2)}. Sem contagem de ocorrências e base de apuração, isso não comprova risco nem perda de medalha.` : 'Sem taxas mensais medidas no período selecionado. Ausência não significa desempenho saudável.'}</p>
        <p className="text-xs text-muted-foreground">Estado observado e mês fechado são leituras independentes. O nível disponível é um retrato, não um histórico de medalhas.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{taxas.map(t => <article key={t.key} className="glass-card p-5 space-y-2"><h4 className="text-sm font-medium">{t.nome} · última atualização</h4><p className="text-3xl font-semibold tabular-nums">{t.atual === null ? 'Sem dado' : pctFracao(t.atual, 2)}</p><p className="text-xs text-muted-foreground">{periodoApi}</p><p className="text-xs text-muted-foreground">Comparação anterior indisponível · sem fotografias comparáveis.</p></article>)}</div>
      <div className="border-y border-border py-4 space-y-2"><h3 className="text-base font-semibold">Avaliações da loja</h3><dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[['positive','Positivas'],['neutral','Neutras'],['negative','Negativas']].map(([key,label]) => <div key={key}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-xl font-semibold tabular-nums">{pctFracao(fracaoMedida(avaliacoes[key]), 2)}</dd></div>)}</dl><p className="text-xs text-muted-foreground">Proporções de avaliações, não contagens de reclamações. Período próprio não confirmado nesta leitura.</p></div>
    </>}
    {pagina === 'analise' && <>
      <div className="space-y-2"><h3 className="text-lg font-semibold">Evolução mensal das taxas</h3><p className="text-sm text-muted-foreground">Somente meses fechados. Não há série diária de reputação nem histórico confirmado de nível e medalha nesta leitura.</p></div>
      {mensal.isError ? <p className="text-sm text-destructive">Não foi possível ler o histórico mensal.</p> : !rows.length ? <p className="text-sm text-muted-foreground">Sem meses fechados no período selecionado.</p> : <>
        <div className="glass-card p-4 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows.map(row => ({ mes: mes(row.data), ...Object.fromEntries(REFERENCIAS_ESTUDO.map(t => [t.key, fracaoMedida(row[t.key])])) }))} margin={{ top: 12, right: 16, bottom: 12, left: 4 }}><CartesianGrid vertical={false} stroke="hsl(var(--grid))"/><XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'hsl(var(--axis))' }} minTickGap={25}/><YAxis tickFormatter={v => pctFracao(v, 1)} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--axis))' }}/><Tooltip formatter={(v: number) => pctFracao(v, 2)} contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}/><Legend/>{REFERENCIAS_ESTUDO.map((t, i) => <Line key={t.key} dataKey={t.key} name={t.nome} stroke={['hsl(var(--primary))','hsl(var(--foreground))','hsl(var(--destructive))'][i]} type="linear" connectNulls={false} dot={{ r: 3 }} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer></div>
        <div className="overflow-x-auto"><table className="w-full text-sm tabular-nums"><thead className="text-left text-muted-foreground"><tr><th className="p-3">Mês</th>{taxas.map(t => <th className="p-3" key={t.key}>{t.nome}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map(row => <tr key={row.id}><td className="p-3 whitespace-nowrap">{mes(row.data)}</td>{taxas.map(t => <td className="p-3" key={t.key}>{pctFracao(fracaoMedida(row[t.key]),2)}</td>)}</tr>)}</tbody></table></div>
      </>}
      <p className="text-sm text-muted-foreground">Diferenças entre mês fechado e janela móvel não provam melhora ou piora recente. Não há percentil da vertical sem pares comparáveis, nem relação causal entre taxa e faturamento.</p>
    </>}
    {pagina === 'requisitos' && <section className="space-y-5 border-t border-border pt-5" aria-label="Como ler o estudo de reputação">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Como ler este estudo</p><h3 className="text-2xl font-semibold">Do dado à conclusão: o que vale e o que não vale</h3></div>
      <ol className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch" aria-label="Diagrama do estudo">
        {[
          { n: "1", t: "Dado da loja", d: "Medalha e nível na última atualização" },
          { n: "2", t: "Volume mínimo", d: "Piso de 20 a 50 pedidos, ainda em definição" },
          { n: "3", t: "Comparação justa", d: "Mesma vertical, mês e volume parecido" },
          { n: "4", t: "Leitura", d: "Referência de apoio, não requisito oficial" },
        ].map((e, k, arr) => <li key={e.n} className="relative rounded-xl border border-border p-4 liquid-card">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">{e.n}</span>
          <p className="mt-3 font-semibold">{e.t}</p><p className="text-sm text-muted-foreground">{e.d}</p>
          {k < arr.length - 1 && <span className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 items-center justify-center rounded-full bg-background border border-border text-primary" aria-hidden>→</span>}
        </li>)}
      </ol>
      <div className="rounded-xl border border-border p-4 liquid-card">
        <p className="text-sm font-semibold mb-3">Referências do estudo (em validação)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 tabular-nums">
          {[["Reclamações","2%"],["Atrasos","5%"],["Cancelamentos","3%"],["Disputas","1%"]].map(([a,b]) => <div key={a}><p className="text-3xl font-semibold">{b}</p><p className="text-xs text-muted-foreground">{a}</p></div>)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border p-4 liquid-card"><p className="font-semibold text-primary mb-2">O estudo mostra</p><ul className="space-y-1 list-disc pl-4">
          <li>Medalha e nível atuais da loja</li><li>Base do estudo: 96,9% de cobertura</li><li>12,7% da base acima da referência de atrasos</li></ul></div>
        <div className="rounded-xl border border-border p-4 liquid-card"><p className="font-semibold text-destructive mb-2">O estudo não mostra</p><ul className="space-y-1 list-disc pl-4">
          <li>Subida, queda ou perda de medalha ao longo dos meses</li><li>Alerta de risco para lojas de baixo volume</li><li>Histórico de nível e experiência por anúncio</li></ul></div>
      </div>
      <p className="text-xs text-muted-foreground">As referências não substituem a régua de tier nem as regras do Mercado Livre. Os percentuais da base descrevem o estudo, não a carteira atual.</p>
    </section>}
    {atual.isError || atual.data?.erro ? <p className="text-sm text-destructive">A leitura atual da reputação está indisponível; o histórico não a substitui.</p> : atual.data && <p className="text-xs text-muted-foreground">Última atualização em {new Date(atual.data.atualizado_em).toLocaleString('pt-BR')} · não é atualização em tempo real.</p>}
    {mensal.isError && pagina !== 'analise' && <p className="text-sm text-destructive">Histórico mensal indisponível nesta leitura.</p>}
  </section>;
}