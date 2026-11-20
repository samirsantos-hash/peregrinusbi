import { useInvestimentoAdsResumo, notaCoberturaAds } from './InvestimentoAdsResumo';
import { variacaoIndicador } from '@/lib/resumoIndicadores';
import { brl, num } from '@/lib/format';
type Totais = { faturamento: number; pedidos: number; ticket: number | null; unidades: number; serie: { data: string; faturamento: number }[] };
type Periodo = { inicio: string; fim: string };
function leitura(nome: string, atual: number | null, anterior: number | null) {
  const v = variacaoIndicador(atual, anterior);
  if (v == null) return `${nome}: sem base comparável.`;
  if (Math.abs(v) < 0.05) return `${nome}: estável em relação ao período anterior.`;
  return `${nome}: ${v < 0 ? 'queda' : 'alta'} de ${num(Math.abs(v), 1)}%.`;
}
export default function SinteseIndicadores({ custId, atual, anterior, periodo, anteriorPeriodo }: { custId: string; atual: Totais; anterior: Totais; periodo: Periodo; anteriorPeriodo: Periodo }) {
  const ads = useInvestimentoAdsResumo({ custId, periodo, anteriorPeriodo, faturamento: atual.faturamento, faturamentoAnterior: anterior.faturamento, serie: atual.serie, serieAnterior: anterior.serie });
  const linhas = [leitura('Faturamento pago', atual.faturamento, anterior.faturamento), leitura('Pedidos pagos', atual.pedidos, anterior.pedidos), leitura('Ticket médio', atual.ticket, anterior.ticket), leitura('Unidades vendidas', atual.unidades, anterior.unidades)];
  return <section aria-label="Resumo dos indicadores" className="noite-vidro min-w-0 rounded-xl border border-border bg-card p-5">
    <h3 className="text-sm font-semibold text-foreground">Resumo dos indicadores</h3>
    <p className="mt-2 text-xs text-muted-foreground">No período analisado, em comparação aos 30 dias anteriores:</p>
    <ul className="mt-3 space-y-2 text-sm leading-5 text-foreground">
      {linhas.map(l => <li key={l}>{l}</li>)}
      <li>{ads.isLoading ? 'Investimento em Ads: consultando.' : ads.atual && !ads.comparavel ? `Investimento em Ads: ${brl(ads.atual.investimento)} · ${notaCoberturaAds(ads.atual)}. Sem base completa para comparação.` : leitura('Investimento em Ads', ads.atual?.investimento ?? null, ads.anterior?.investimento ?? null)}</li>
      <li>{ads.atual ? `Meta interna de Ads${ads.atual.parcial ? ' nos dias medidos' : ''}: ${num(ads.atual.atingimento, 1)}% atingida (${brl(ads.atual.investimento)} de ${brl(ads.atual.meta)}). ${ads.atual.falta > 0 ? `Faltam ${brl(ads.atual.falta)}${ads.atual.parcial ? ' neste recorte' : ''}.` : `Meta atingida${ads.atual.parcial ? ' neste recorte' : ''}.`}` : ads.error ? 'Meta de Ads: leitura indisponível.' : 'Meta de Ads: sem investimento e faturamento medidos nas mesmas datas.'}</li>
    </ul>
  </section>;
}