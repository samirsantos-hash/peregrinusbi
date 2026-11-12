import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { compararCancelamentos, mesesDoPeriodo, mesAnterior, type CancelamentoMensal } from '@/lib/cancelamentosMensais';
import { brl, num, pctFracao } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, XCircle, Info } from 'lucide-react';

export default function CancelamentosMensais({ custId, de, ate }: { custId?: string; de?: string; ate?: string }) {
  const meses = useMemo(() => mesesDoPeriodo(de, ate), [de, ate]);
  const [escolhido, setEscolhido] = useState('');
  const mes = meses.includes(escolhido) ? escolhido : meses[0];
  const conexao = useQuery({ queryKey: ['ml-conexao-cancelamentos', custId], enabled: !!custId, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('ml_sync_tema').select('account_id').eq('cust_id', custId ?? '').limit(1);
      if (error) throw error;
      return Boolean(data?.length);
    } });
  const atual = useQuery({ queryKey: ['ml-cancelamentos-mensais', custId, mes], enabled: !!custId && !!mes && conexao.data === true, staleTime: 5 * 60_000, retry: false,
    queryFn: () => chamarFuncaoMl<CancelamentoMensal>('ml-analise-loja', { cust_id: custId, modo: 'cancelamentosMensais', mes }) });
  const anteriorMes = mes ? mesAnterior(mes) : undefined;
  const anterior = useQuery({ queryKey: ['ml-cancelamentos-mensais', custId, anteriorMes], enabled: !!custId && !!anteriorMes && !!atual.data, staleTime: 5 * 60_000, retry: false,
    queryFn: () => chamarFuncaoMl<CancelamentoMensal>('ml-analise-loja', { cust_id: custId, modo: 'cancelamentosMensais', mes: anteriorMes }) });
  const r = atual.data;
  const comparacao = r && anterior.data ? compararCancelamentos(r, anterior.data) : null;
  const rotuloMes = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;
  const erro = atual.error ?? conexao.error;
  return <section aria-label="Cancelamentos reais por mês" className="resumo-cancelamentos liquid-card noite-vidro min-w-0 space-y-5 rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"><XCircle className="h-5 w-5 text-destructive" aria-hidden />Pedidos cancelados</h4>
        {r && <p className="mt-1 text-xs text-muted-foreground">{r.periodo.inicio.split('-').reverse().join('/')} a {r.periodo.fim.split('-').reverse().join('/')} · {r.periodo.parcial ? 'mês parcial, até ontem' : 'mês completo'} · por criação do pedido e situação atual</p>}
      </div>
      <div className="flex items-center gap-2">
        {mes && <Select value={mes} onValueChange={setEscolhido}><SelectTrigger aria-label="Mês dos cancelamentos" className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{rotuloMes(m)}</SelectItem>)}</SelectContent></Select>}
        <Button variant="ghost" size="icon" aria-label="Atualizar cancelamentos" title="Atualizar cancelamentos" disabled={atual.isFetching || conexao.isFetching} onClick={() => { void conexao.refetch(); if (conexao.data) { void atual.refetch(); void anterior.refetch(); } }}><RefreshCw className="h-4 w-4" /></Button>
      </div>
    </div>
    {erro ? <p role="alert" className="text-sm text-destructive">{erro.message}</p>
      : conexao.isLoading || atual.isLoading ? <p className="text-sm text-muted-foreground">Consultando pedidos do mês…</p>
      : !custId || conexao.data !== true ? <p className="text-sm text-muted-foreground">Conecte a loja para consultar cancelamentos reais.</p>
      : !mes ? <p className="text-sm text-muted-foreground">Período sem dias completos disponíveis.</p>
      : r ? <>
        <dl className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div><dt className="text-xs font-medium text-muted-foreground">Valor dos pedidos cancelados</dt><dd className="text-3xl font-bold tracking-tight tabular-nums">{r.valorCancelado != null ? brl(r.valorCancelado, true) : 'Valor não informado'}</dd><p className="text-xs text-muted-foreground">{num(r.cancelados)} {r.cancelados === 1 ? 'pedido cancelado' : 'pedidos cancelados'}</p>
            <p className="mt-3 w-fit rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">{comparacao ? `Anterior: ${brl(comparacao.valorAnterior, true)}${comparacao.dias ? ` · mesmos ${comparacao.dias} dias` : ' · mês completo'}${comparacao.variacao != null ? ` (${pctFracao(comparacao.variacao, 1)})` : ' · sem base para variação'}` : anterior.isFetching ? 'Consultando mês anterior…' : 'Comparação anterior indisponível.'}</p></div>
          <div><dt className="text-xs font-medium text-muted-foreground">Faturamento dos pedidos pagos</dt><dd className="text-3xl font-bold tracking-tight tabular-nums">{r.faturamento != null ? brl(r.faturamento, true) : 'Valor não informado'}</dd><p className="text-xs text-muted-foreground">{num(r.pedidosPagos)} {r.pedidosPagos === 1 ? 'pedido pago' : 'pedidos pagos'}</p></div>
          <div className="flex flex-col justify-center rounded-xl border border-border/40 bg-background/30 p-4"><dt className="text-xs font-medium text-muted-foreground">Proporção (cancelado ÷ pago)</dt><dd className="text-4xl font-bold tracking-tighter tabular-nums text-destructive">{r.proporcao != null ? pctFracao(r.proporcao, 2) : r.faturamento === 0 ? 'Sem faturamento para comparação' : 'Valores incompletos'}</dd></div>
        </dl>
        {!r.valoresCompletos && <p className="text-xs text-destructive">A consulta confirmou os pedidos, mas há valores ou moeda não informados; não foram substituídos por zero.</p>}
        <p className="flex gap-2 border-t border-border/40 pt-4 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />Valor do pedido cancelado não é prejuízo líquido nem estorno confirmado. Esta proporção não é a taxa oficial de reputação.</p>
      </> : null}
  </section>;
}