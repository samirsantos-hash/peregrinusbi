import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { compararPromocoes, type MetricaPromocao } from '@/lib/comparacaoPromocoes';
import type { linhasVinculo, VendasPromocao } from '@/lib/vinculoPromocao';
import { brl, num } from '@/lib/format';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const METRICAS = { faturamento: 'Faturamento', pedidos: 'Pedidos', unidades: 'Unidades', ticket: 'Ticket por pedido' };
export function ComparacaoCampanhasPromocao({ linhas, vendas }: { linhas: ReturnType<typeof linhasVinculo>; vendas: VendasPromocao | null | undefined }) {
  const [metrica, setMetrica] = useState<MetricaPromocao>('faturamento');
  const ranking = compararPromocoes(linhas, metrica);
  const formatar = (valor: number) => metrica === 'faturamento' || metrica === 'ticket' ? brl(valor, true) : num(valor);
  const primeira = ranking[0];
  return <section aria-label="Comparação das campanhas promocionais" className="min-w-0 space-y-4 border-y border-border py-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-semibold"><BarChart3 className="h-4 w-4 text-primary" />Diagnóstico das vendas por campanha</h3>
      <Select value={metrica} onValueChange={v => { if (v in METRICAS) setMetrica(v as MetricaPromocao); }}><SelectTrigger aria-label="Métrica das campanhas" className="w-full sm:w-52"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(METRICAS).map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}</SelectContent></Select>
    </div>
    {primeira ? <>
      <p className="text-sm"><span className="font-semibold text-primary">Maior {METRICAS[metrica].toLowerCase()} observado:</span> {primeira.nome} · <span className="tabular-nums">{formatar(primeira.valor)}</span>{vendas?.completo ? '.' : ' entre as vendas lidas.'}</p>
      <div className="max-h-96 overflow-y-auto">
        <ChartContainer config={{ valor: { label: METRICAS[metrica], color: 'hsl(var(--chart-1))' } }} className="aspect-auto h-80 w-full min-w-0">
          <BarChart accessibilityLayer data={ranking.slice(0, 10).map((r, i) => ({ ...r, posicao: `${i + 1}` }))} layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" tickFormatter={formatar} axisLine={false} tickLine={false} />
            <YAxis dataKey="posicao" type="category" width={28} axisLine={false} tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.nome ?? ''} formatter={value => formatar(Number(value))} />} />
            <Bar dataKey="valor" fill="var(--color-valor)" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm [&_th]:p-3 [&_td]:p-3"><thead className="text-left text-muted-foreground"><tr><th>#</th><th>Campanha</th><th>Pedidos</th><th>Unidades</th><th>Faturamento</th><th>Ticket por pedido</th></tr></thead><tbody className="divide-y divide-border">{ranking.map((r, i) => <tr key={r.chave}><td className="tabular-nums text-muted-foreground">{i + 1}</td><td className="min-w-48 font-medium">{r.nome}</td><td className="tabular-nums">{num(r.pedidos)}</td><td className="tabular-nums">{num(r.unidades)}</td><td className="tabular-nums whitespace-nowrap">{brl(r.faturamento, true)}</td><td className="tabular-nums whitespace-nowrap">{r.ticket == null ? '—' : brl(r.ticket, true)}</td></tr>)}</tbody></table></div>
    </> : <p className="text-sm text-muted-foreground">Ainda não há vendas com promoção identificada neste filtro para traçar uma comparação. Participação atual e descontos sem identidade não entram no gráfico.</p>}
    <p className="text-xs text-muted-foreground">Totais do período deste anúncio, não evolução diária. {ranking.length > 10 ? 'O gráfico mostra as 10 primeiras; a lista inclui todas. ' : ''}{vendas && (!vendas.completo || vendas.descontoSemPromocao.pedidos > 0) ? `Comparação limitada: ${num(vendas.naoLidos)} pedidos sem leitura e ${num(vendas.descontoSemPromocao.pedidos)} com desconto sem promoção identificada. ` : ''}Maior faturamento não comprova maior lucro ou ganho causado pela campanha. ROAS e ROI promocionais permanecem indisponíveis sem custos e atribuição comprovados.</p>
  </section>;
}