import { useMemo, useState } from 'react';
import { useAnaliseMl } from '@/hooks/useAnaliseMl';
import { balancearFull, alertasFull, type FullProduto } from '@/lib/fullBalanceamento';
import { planejarReposicao } from '@/lib/fullReposicao';
import { brl, num, pctFracao } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { KpiCard } from '@/components/ds';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw, Package, CheckCircle2 } from 'lucide-react';
type Resposta = { periodo: { inicio: string; fim: string }; candidatos: FullProduto[]; universoVendido: number; consultadoEm: string; limite: number };
export default function FullProdutosApi({ custId }: { custId?: string }) {
  const q = useAnaliseMl<Resposta>(custId, 'full');
  const [risco, setRisco] = useState(5), [busca, setBusca] = useState('');
  const [prazo, setPrazo] = useState('');
  const carteira = useMemo(() => balancearFull(q.data?.candidatos ?? [], risco), [q.data, risco]);
  if (!custId) return null;
  if (q.verificandoConexao || q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!q.conectada && !q.erroConexao) return <p className="text-sm text-muted-foreground py-4">Recomendação por produto indisponível: loja sem conexão Mercado Livre.</p>;
  const linhas = (q.data?.candidatos ?? []).filter(p => `${p.titulo} ${p.id} ${p.sku ?? ''}`.toLowerCase().includes(busca.toLowerCase()));
  const prazoValido = prazo.trim() !== '' && Number.isInteger(Number(prazo)) && Number(prazo) >= 0 && Number(prazo) <= 90;
  return <section className="space-y-4 border-t border-border pt-6">
    <div className="flex flex-wrap justify-between items-center gap-3"><h3 className="flex items-center gap-2 text-base font-semibold"><Package className="h-4 w-4 text-primary" /> Produtos e reposição Full</h3><Button variant="outline" size="icon" aria-label="Consultar produtos Full novamente" disabled={q.isFetching} onClick={() => q.refetch()}><RefreshCw className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} /></Button></div>
    {q.error || q.erroConexao ? <p className="text-sm text-muted-foreground">{q.error?.message ?? 'Não foi possível confirmar a conexão.'}</p> : q.data ? <>
      <p className="text-xs text-muted-foreground">Mercado Livre · {q.data.periodo.inicio.split('-').reverse().join('/')} a {q.data.periodo.fim.split('-').reverse().join('/')} · amostra de até {q.data.limite} anúncios com vendas, dentro e fora do Full · {num(q.data.universoVendido)} anúncios vendidos na loja · consultado em {new Date(q.data.consultadoEm).toLocaleString('pt-BR')}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3"><KpiCard rotulo="Produtos analisados" valor={num(q.data.candidatos.length)} referencia="Comparação anterior indisponível" /><KpiCard rotulo="Já no Full" valor={num(q.data.candidatos.filter(p => p.logistica === 'fulfillment').length)} referencia="Nesta amostra; comparação anterior indisponível" /><KpiCard rotulo="Balanceamento da demanda" valor={carteira ? 'Calculado' : 'Base insuficiente'} referencia="Não representa quantidade de envio; sem comparação anterior" /></div>
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
        <Input aria-label="Buscar produto para Full" placeholder="Título, SKU ou MLB" value={busca} onChange={e => setBusca(e.target.value)} className="lg:max-w-xs" />
        <div className="w-full lg:max-w-xs space-y-2"><label className="text-xs">Proteção contra oscilação da demanda · {risco}/10</label><Slider aria-label="Proteção contra oscilação da demanda" min={1} max={10} step={1} value={[risco]} onValueChange={v => setRisco(v[0] ?? 5)} /></div>
        <div className="space-y-1"><label htmlFor="full-prazo" className="text-xs text-muted-foreground">Prazo até ficar disponível no Full (dias)</label><Input id="full-prazo" type="number" min={0} max={90} step={1} placeholder="Informe o prazo" value={prazo} onChange={e => setPrazo(e.target.value)} className="w-full lg:w-56" /></div>
      </div>
      <p className="text-xs text-muted-foreground">Cenários de 7, 10 e 15 dias usam o ritmo de vendas medido. O prazo informado inclui transporte e recebimento; não é uma agenda confirmada.</p>
      <div className="divide-y divide-border border-y border-border">
        {linhas.map(p => {
          const full = p.logistica === 'fulfillment';
          const stock = full ? p.estoqueFull ?? null : p.estoque;
          const plano = planejarReposicao(p.unidades, 30, stock, prazoValido ? Number(prazo) : 0);
          const peso = carteira?.find(c => c.id === p.id)?.peso;
          const alertas = [...new Set(alertasFull(p))];
          const critico = plano?.cobertura != null && plano.cobertura < 7;
          return <article key={p.id} className="py-5 space-y-3">
            <div className="flex gap-3 items-start">{p.foto && <img src={p.foto} alt="" className="w-14 h-14 object-contain rounded shrink-0" />}<div className="min-w-0"><a href={p.link} target="_blank" rel="noreferrer" className="text-foreground font-medium text-sm hover:underline break-words">{p.titulo}</a><p className="text-xs text-muted-foreground mt-1 break-words">{p.id} · {p.sku ?? 'SKU sem dado'}</p><p className="text-xs mt-1 flex items-center gap-1.5">{full ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Package className="h-3.5 w-3.5 text-muted-foreground" />}{full ? 'Já opera no Full' : p.logistica ? 'Fora do Full · elegibilidade não confirmada' : 'Modalidade não confirmada'}</p></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-border rounded-md overflow-hidden bg-muted/10">
              <div className="p-3 border-b sm:border-r xl:border-b-0 border-border space-y-2"><h4 className="text-xs font-semibold">Vendas e balanceamento</h4><dl className="text-xs space-y-2"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Receita paga · 30 dias</dt><dd>{brl(p.faturamento)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Unidades vendidas</dt><dd>{num(p.unidades)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Peso da demanda</dt><dd>{peso == null ? 'Sem base' : pctFracao(peso, 1)}</dd></div></dl></div>
              <div className="p-3 border-b xl:border-b-0 xl:border-r border-border space-y-2"><h4 className="text-xs font-semibold">Estoque atual</h4><p className="text-lg font-semibold tabular-nums">{stock == null ? 'Não confirmado' : `${num(stock)} un.`}</p><p className="text-xs text-muted-foreground">{full ? 'Disponível para venda no Full; não é o total físico do depósito.' : 'Disponível no anúncio; estoque físico próprio não confirmado.'}</p><p className={`text-xs ${critico ? 'text-destructive' : 'text-foreground'}`}>{plano?.cobertura == null ? 'Cobertura não calculável' : `Cobertura estimada: ${num(plano.cobertura, 1)} dias`}</p></div>
              <div className="p-3 border-b sm:border-b-0 sm:border-r border-border space-y-2"><h4 className="text-xs font-semibold">{full ? 'Reposição no Full' : 'Envio inicial ao Full'}</h4><div className="grid grid-cols-3 gap-1 text-center">{[7, 10, 15].map(d => <div key={d} className="border border-border rounded p-2"><p className="text-muted-foreground text-xs">{d} dias</p><p className="text-sm font-semibold">{plano ? `${num(plano.cenarios.find(c => c.dias === d)?.unidades ?? 0)} un.` : '—'}</p></div>)}</div><p className="text-xs text-muted-foreground">Quantidade adicional para cada horizonte, descontando o disponível.</p>{prazoValido && plano ? <><p className="text-xs font-medium">{plano.iniciarEm == null ? 'Sem giro observado para prever reposição' : plano.iniciarEm === 0 ? 'Iniciar reposição agora' : `Iniciar reposição em até ${num(plano.iniciarEm)} dias`}</p><p className="text-xs">{num(plano.envio)} un. para cobrir 28 dias após chegada estimada</p></> : <p className="text-xs text-muted-foreground">Informe o prazo para estimar quando iniciar e quanto enviar.</p>}</div>
              <div className="p-3 space-y-2"><h4 className="text-xs font-semibold">Melhorias do anúncio</h4><ul className="space-y-2">{alertas.map(a => <li key={a} className="flex gap-2 text-xs text-foreground leading-relaxed"><AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${a === 'Sem estoque disponível' ? 'text-destructive' : 'text-muted-foreground'}`} />{a}</li>)}</ul>{!alertas.length && <p className="text-xs text-muted-foreground">Sem pendências nas medições disponíveis.</p>}{(!p.qualidade || p.fotos.some(f => f.largura == null || f.altura == null)) && <p className="text-xs text-muted-foreground">Qualidade ou resolução não confirmada.</p>}</div>
            </div>
          </article>;
        })}
      </div>
      {!linhas.length && <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
      <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Critérios e limites da recomendação</summary><p className="mt-2 leading-relaxed">Balanceamento da demanda por média e covariância da receita diária paga, sem pesos negativos. Cobertura = estoque disponível ÷ média diária de unidades pagas. Quantidades são estimativas lineares, não previsão garantida de vendas. Para produtos fora do Full, os cenários pressupõem que o estoque disponível seja transferível; confirme o estoque físico. Reservas, trânsito, variações de demanda, capacidade, custos e elegibilidade exigem conferência antes de enviar. Nenhum envio é realizado pelo painel.</p></details>
    </> : null}
  </section>;
}
