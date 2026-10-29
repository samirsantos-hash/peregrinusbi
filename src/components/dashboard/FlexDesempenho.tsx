import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { capitalPaulista, mesAnterior, resumoFlex, type FlexCidade, type FlexLoja, type FlexMes } from '@/lib/flexDesempenho';
import { brl, delta, num, pct } from '@/lib/format';
import { KpiCard } from '@/components/ds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const nomeMes = (mes: number) => new Date(Math.floor(mes / 100), mes % 100 - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
const mesHoje = () => { const d = new Date(); return d.getUTCFullYear() * 100 + d.getUTCMonth() + 1; };

export default function FlexDesempenho({ lojas }: { lojas: FlexLoja[] }) {
  const [escopo, setEscopo] = useState('capital');
  const [mes, setMes] = useState(() => mesAnterior(mesHoje()));
  const [busca, setBusca] = useState('');
  const cadastro = useQuery({
    queryKey: ['flex-cidades'], staleTime: 300000,
    queryFn: async () => {
      const r = await fetchAllRows<FlexCidade>((de, ate) => supabase.from('gm_concessionarias').select('cust_id,nome,cidade,uf').order('cust_id').order('id').range(de, ate));
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const selecionadas = useMemo(() => {
    const capital = new Map((cadastro.data ?? []).filter(c => capitalPaulista(c.cidade, c.uf)).map(c => [String(c.cust_id), c.nome]));
    return lojas.filter(l => escopo === 'todas' || capital.has(l.custId)).map(l => ({ ...l, nickname: capital.get(l.custId) ?? l.nickname }));
  }, [lojas, cadastro.data, escopo]);
  const meses = useMemo(() => {
    const result = [mes];
    for (let i = 0; i < 6; i++) result.unshift(mesAnterior(result[0]));
    return result;
  }, [mes]);
  const ids = selecionadas.map(l => l.id).sort();
  const consulta = useQuery({
    queryKey: ['flex-desempenho', ids, mes], enabled: ids.length > 0 && !cadastro.isPending,
    staleTime: 120000,
    queryFn: async () => {
      const resultado: FlexMes[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const r = await fetchAllRows<FlexMes>((de, ate) => supabase.from('sellers_kpi').select('seller_id,tim_month_id,tgmv_lc,tgmv_lc_flex,tsi_flex')
          .in('seller_id', ids.slice(i, i + 100)).in('tim_month_id', meses).order('seller_id').order('tim_month_id').order('id').range(de, ate));
        if (r.error) throw r.error;
        resultado.push(...r.data);
      }
      return resultado;
    },
  });
  const resumo = resumoFlex(selecionadas, consulta.data ?? [], mes);
  const serie = meses.slice(1).map(m => {
    const r = resumoFlex(selecionadas, consulta.data ?? [], m);
    return { mes: nomeMes(m), faturamento: r.faturamento.completa ? r.faturamento.valor : null };
  });
  const linhas = resumo.linhas.filter(l => `${l.nickname} ${l.custId}`.toLowerCase().includes(busca.toLowerCase()));
  const carregando = cadastro.isPending || (ids.length > 0 && consulta.isPending);
  const erro = cadastro.isError || consulta.isError;
  const referencia = (v: number | null) => v === null ? 'Comparação indisponível vs. mês anterior' : `${delta(v)} vs. ${nomeMes(mesAnterior(mes))}`;
  return <section aria-label="Desempenho Flex" className="space-y-6 min-w-0">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="ds-titulo-bloco">Flex</h2><p className="ds-nota mt-1">Histórico mensal importado · {nomeMes(mes)}{mes >= mesHoje() ? ' · mês em andamento' : ''}</p></div>
      <div className="flex flex-wrap items-end gap-3">
        <Tabs value={escopo} onValueChange={setEscopo}><TabsList aria-label="Lojas do Flex"><TabsTrigger value="capital">São Paulo · capital</TabsTrigger><TabsTrigger value="todas">Todas as lojas</TabsTrigger></TabsList></Tabs>
        <div className="space-y-1"><Label htmlFor="flex-mes">Mês</Label><Input id="flex-mes" type="month" className="w-44" value={`${Math.floor(mes / 100)}-${String(mes % 100).padStart(2, '0')}`} max={`${Math.floor(mesHoje() / 100)}-${String(mesHoje() % 100).padStart(2, '0')}`} onChange={e => { const [a, m] = e.target.value.split('-').map(Number); if (a && m) setMes(a * 100 + m); }} /></div>
      </div>
    </div>
    {erro ? <div role="alert" className="space-y-3"><p className="text-destructive">Não foi possível carregar o desempenho Flex.</p><Button variant="outline" onClick={() => { void cadastro.refetch(); void consulta.refetch(); }}><RefreshCw className="h-4 w-4 mr-2" />Tentar novamente</Button></div>
      : carregando ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Carregando Flex">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>
      : !selecionadas.length ? <p className="text-muted-foreground">Nenhuma loja acessível{escopo === 'capital' ? ' com município confirmado na capital paulista' : ''}.</p>
      : <>
        <p className="text-sm text-muted-foreground">{num(selecionadas.length)} lojas no recorte · {num(resumo.faturamento.cobertura)} com faturamento medido{escopo === 'capital' ? ' · município confirmado no cadastro; não inclui lojas identificadas apenas pelo estado' : ''}.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard rotulo={`Faturamento Flex${resumo.faturamento.completa ? '' : ' · parcial'}`} valor={resumo.faturamento.valor === null ? 'Sem dado' : brl(resumo.faturamento.valor, true)} referencia={referencia(resumo.variacaoFaturamento)} variacao={resumo.variacaoFaturamento} />
          <KpiCard rotulo={`Unidades Flex${resumo.unidades.completa ? '' : ' · parcial'}`} valor={resumo.unidades.valor === null ? 'Sem dado' : num(resumo.unidades.valor)} referencia={referencia(resumo.variacaoUnidades)} variacao={resumo.variacaoUnidades} />
          <KpiCard rotulo="Participação no faturamento" valor={resumo.participacao === null ? 'Sem dado' : pct(resumo.participacao, 2)} referencia="Faturamento Flex ÷ faturamento total das mesmas lojas" />
        </div>
        <div className="space-y-3 min-w-0"><h3 className="ds-titulo-bloco">Evolução do faturamento Flex</h3><p className="ds-nota">Meses sem cobertura de todas as lojas ficam sem barra.</p>
          <div className="h-72 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={serie} margin={{ top: 12, right: 12, bottom: 12, left: 8 }} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="mes" minTickGap={24} tick={{ fontSize: 12 }} /><YAxis width={82} tickFormatter={v => num(v)} tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => [brl(Number(v), true), 'Faturamento Flex']} /><Bar dataKey="faturamento" name="Faturamento Flex" fill="hsl(var(--ec-verde))" maxBarSize={20} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart></ResponsiveContainer></div>
        </div>
        <div className="space-y-4"><div className="flex flex-wrap justify-between items-center gap-3"><h3 className="ds-titulo-bloco">Faturamento por loja</h3><Input aria-label="Buscar loja no Flex" placeholder="Buscar loja ou Cust ID" value={busca} onChange={e => setBusca(e.target.value)} className="w-full sm:w-64" /></div>
          <div className="overflow-x-auto"><table className="w-full text-sm tabular-nums"><thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-3 pr-4 font-medium">Loja</th><th className="text-right py-3 px-3 font-medium whitespace-nowrap">Faturamento Flex</th><th className="text-right py-3 px-3 font-medium">Unidades</th><th className="text-right py-3 px-3 font-medium">Participação</th><th className="text-right py-3 pl-3 font-medium whitespace-nowrap">Vs. mês anterior</th></tr></thead>
            <tbody>{linhas.map(l => <tr key={l.id} className="border-b border-border"><td className="py-4 pr-4 min-w-48"><span className="font-medium">{l.nickname}</span><span className="block text-xs text-muted-foreground">{l.custId}</span></td><td className="text-right px-3 whitespace-nowrap">{l.faturamento === null ? 'Sem dado' : brl(l.faturamento, true)}</td><td className="text-right px-3">{l.unidades === null ? 'Sem dado' : num(l.unidades)}</td><td className="text-right px-3">{pct(l.participacao, 2)}</td><td className={`text-right pl-3 whitespace-nowrap ${l.variacao !== null && l.variacao < 0 ? 'text-destructive' : l.variacao !== null && l.variacao > 0 ? 'text-emerald' : 'text-muted-foreground'}`}>{delta(l.variacao)}</td></tr>)}</tbody>
          </table></div>{!linhas.length && <p className="text-muted-foreground">Nenhuma loja encontrada.</p>}
        </div>
      </>}
  </section>;
}