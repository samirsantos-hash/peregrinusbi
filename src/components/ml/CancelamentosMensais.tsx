import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { compararCancelamentos, mesesDoPeriodo, mesAnterior, type CancelamentoMensal } from '@/lib/cancelamentosMensais';
import { brl, num, pctFracao } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

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
  return <section aria-label="Cancelamentos reais por mês" className="space-y-3 border-t border-border/50 pt-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h4 className="text-sm font-semibold">Pedidos cancelados · valor mensal</h4>
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
        <p className="text-xs text-muted-foreground">Mercado Livre · {r.periodo.inicio.split('-').reverse().join('/')} a {r.periodo.fim.split('-').reverse().join('/')} · {r.periodo.parcial ? 'mês parcial, até ontem' : 'mês completo'} · por criação do pedido e situação atual</p>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">Valor dos pedidos cancelados</dt><dd className="text-xl font-semibold tabular-nums">{r.valorCancelado != null ? brl(r.valorCancelado) : 'Valor não informado'}</dd><p className="text-xs text-muted-foreground">{num(r.cancelados)} pedidos cancelados</p></div>
          <div><dt className="text-xs text-muted-foreground">Faturamento dos pedidos pagos</dt><dd className="text-xl font-semibold tabular-nums">{r.faturamento != null ? brl(r.faturamento) : 'Valor não informado'}</dd><p className="text-xs text-muted-foreground">{num(r.pedidosPagos)} pedidos pagos</p></div>
          <div><dt className="text-xs text-muted-foreground">Valor cancelado ÷ faturamento pago</dt><dd className="text-xl font-semibold tabular-nums">{r.proporcao != null ? pctFracao(r.proporcao, 2) : r.faturamento === 0 ? 'Sem faturamento para comparação' : 'Valores incompletos'}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">{comparacao ? `Anterior: ${brl(comparacao.valorAnterior)}${comparacao.dias ? ` · mesmos ${comparacao.dias} dias` : ' · mês completo'}${comparacao.variacao != null ? ` · variação ${pctFracao(comparacao.variacao, 1)}` : ' · sem base positiva para variação'}` : anterior.isFetching ? 'Consultando mês anterior…' : 'Comparação anterior indisponível.'}</p>
        {!r.valoresCompletos && <p className="text-xs text-destructive">A consulta confirmou os pedidos, mas há valores ou moeda não informados; não foram substituídos por zero.</p>}
        <p className="text-xs text-muted-foreground">Valor do pedido cancelado não é prejuízo líquido nem estorno confirmado. Esta proporção não é a taxa oficial de reputação.</p>
      </> : null}
  </section>;
}