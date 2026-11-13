import { useMemo, useState } from 'react';
import { useAnaliseMl } from '@/hooks/useAnaliseMl';
import { balancearFull, alertasFull, type FullProduto } from '@/lib/fullBalanceamento';
import { planejarReposicao } from '@/lib/fullReposicao';
import { brl, num, pctFracao } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ds';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw, Package, CheckCircle2 } from 'lucide-react';
type Resposta = { periodo: { inicio: string; fim: string }; candidatos: FullProduto[]; universoVendido: number; consultadoEm: string; limite: number };
export default function FullProdutosApi({ custId }: { custId?: string }) {
  const q = useAnaliseMl<Resposta>(custId, 'full');
  const [busca, setBusca] = useState('');
  const carteira = useMemo(() => balancearFull(q.data?.candidatos ?? [], 5), [q.data]);
  if (!custId) return null;
  if (q.verificandoConexao || q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!q.conectada && !q.erroConexao) return <p className="text-sm text-muted-foreground py-4">Recomendação por produto indisponível: loja sem conexão Mercado Livre.</p>;
  const linhas = (q.data?.candidatos ?? []).filter(p => `${p.titulo} ${p.id} ${p.sku ?? ''}`.toLowerCase().includes(busca.toLowerCase()));
  return <section className="space-y-4 border-t border-border pt-6">
    <div className="flex flex-wrap justify-between items-center gap-3"><h3 className="flex items-center gap-2 text-base font-semibold"><Package className="h-4 w-4 text-primary" /> Produtos e reposição Full</h3><Button variant="outline" size="icon" aria-label="Consultar produtos Full novamente" disabled={q.isFetching} onClick={() => q.refetch()}><RefreshCw className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} /></Button></div>
    {q.error || q.erroConexao ? <p className="text-sm text-muted-foreground">{q.error?.message ?? 'Não foi possível confirmar a conexão.'}</p> : q.data ? <>
      <p className="text-xs text-muted-foreground">Mercado Livre · {q.data.periodo.inicio.split('-').reverse().join('/')} a {q.data.periodo.fim.split('-').reverse().join('/')} · amostra de até {q.data.limite} anúncios com vendas, dentro e fora do Full · {num(q.data.universoVendido)} anúncios vendidos na loja · consultado em {new Date(q.data.consultadoEm).toLocaleString('pt-BR')}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3"><KpiCard rotulo="Produtos analisados" valor={num(q.data.candidatos.length)} referencia="Comparação anterior indisponível" /><KpiCard rotulo="Já no Full" valor={num(q.data.candidatos.filter(p => p.logistica === 'fulfillment').length)} referencia="Nesta amostra; comparação anterior indisponível" /><KpiCard rotulo="Balanceamento da demanda" valor={carteira ? 'Calculado' : 'Base insuficiente'} referencia="Não representa quantidade de envio; sem comparação anterior" /></div>
      <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
        <Input aria-label="Buscar produto para Full" placeholder="Título, SKU ou MLB" value={busca} onChange={e => setBusca(e.target.value)} className="lg:max-w-xs" />
      </div>
      <p className="text-xs text-muted-foreground">Ritmo de vendas, cobertura e estoque recomendado são calculados automaticamente pelo histórico de 30 dias, com margem de segurança pela oscilação diária da demanda.</p>
      <div className="divide-y divide-border border-y border-border">
        {linhas.map(p => {
          const full = p.logistica === 'fulfillment';
          const stock = full ? p.estoqueFull ?? null : p.estoque;
          const plano = planejarReposicao(p.unidades, 30, stock, p.diario.map(d => d.faturamento));
          const peso = carteira?.find(c => c.id === p.id)?.peso;
          const alertas = [...new Set(alertasFull(p))];
          const risco = !!plano?.risco || stock === 0;
          return <article key={p.id} className="py-5 space-y-3">
            <div className="flex gap-3 items-start">{p.foto && <img src={p.foto} alt="" className="w-14 h-14 object-contain rounded shrink-0" />}<div className="min-w-0"><a href={p.link} target="_blank" rel="noreferrer" className="text-foreground font-medium text-sm hover:underline break-words">{p.titulo}</a><p className="text-xs text-muted-foreground mt-1 break-words">{p.id} · {p.sku ?? 'SKU sem dado'}</p><p className="text-xs mt-1 flex items-center gap-1.5">{full ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Package className="h-3.5 w-3.5 text-muted-foreground" />}{full ? 'Já opera no Full' : p.logistica ? 'Fora do Full · elegibilidade não confirmada' : 'Modalidade não confirmada'}</p></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-border rounded-md overflow-hidden bg-muted/10">
              <div className="p-3 border-b sm:border-r xl:border-b-0 border-border space-y-2"><h4 className="text-xs font-semibold">Vendas e balanceamento</h4><dl className="text-xs space-y-2"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Receita paga · 30 dias</dt><dd>{brl(p.faturamento)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Unidades vendidas</dt><dd>{num(p.unidades)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Peso da demanda</dt><dd>{peso == null ? 'Sem base' : pctFracao(peso, 1)}</dd></div></dl></div>
              <div className="p-3 border-b xl:border-b-0 xl:border-r border-border space-y-2"><div className="grid grid-cols-2 gap-2"><div><h4 className="text-xs font-semibold">Estoque atual</h4><p className="text-lg font-semibold tabular-nums">{stock == null ? '—' : `${num(stock)} un.`}</p></div><div className="text-right"><h4 className="text-xs font-semibold">Estoque recomendado</h4><p className="text-lg font-semibold tabular-nums">{plano ? `${num(plano.recomendado)} un.` : '—'}</p></div></div><p className="text-xs text-muted-foreground">{full ? 'Disponível para venda no Full.' : 'Disponível no anúncio; estoque físico não confirmado.'} Recomendado cobre 28 dias{plano?.seguranca ? `, com ${num(plano.seguranca)} un. de segurança` : ''}.</p><p className="text-xs">{plano?.cobertura == null ? 'Sem giro para estimar duração' : `Ritmo ${num(plano.diaria, 1)} un./dia · estoque dura ~${num(Math.floor(plano.cobertura))} dias`}</p>{risco && <p className="text-xs font-medium flex items-center gap-1.5 text-warning bg-warning/10 rounded px-2 py-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Risco de ruptura{plano && plano.envio > 0 ? ` · enviar ${num(plano.envio)} un.` : ''}</p>}</div>
              <div className="p-3 border-b sm:border-b-0 sm:border-r border-border space-y-2"><h4 className="text-xs font-semibold">{full ? 'Reposição no Full' : 'Envio inicial ao Full'}</h4><div className="grid grid-cols-3 gap-1 text-center">{[7, 10, 15].map(d => <div key={d} className="border border-border rounded p-2"><p className="text-muted-foreground text-xs">{d} dias</p><p className="text-sm font-semibold">{plano ? `${num(plano.cenarios.find(c => c.dias === d)?.unidades ?? 0)} un.` : '—'}</p></div>)}</div><p className="text-xs text-muted-foreground">Quantidade adicional para cada horizonte, descontando o disponível.</p>{plano && <p className="text-xs font-medium">{plano.cobertura == null ? 'Sem giro observado para prever reposição' : plano.risco ? 'Repor agora' : `Repor em até ${num(Math.floor(plano.cobertura - 15))} dias`}</p>}</div>
              <div className="p-3 space-y-2"><h4 className="text-xs font-semibold">Anúncio completo</h4><Checklist p={p} full={full} /><h4 className="text-xs font-semibold pt-1">Melhorias do anúncio</h4><ul className="space-y-2">{alertas.map(a => <li key={a} className="flex gap-2 text-xs text-foreground leading-relaxed"><AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${a === 'Sem estoque disponível' ? 'text-destructive' : 'text-muted-foreground'}`} />{a}</li>)}</ul>{!alertas.length && <p className="text-xs text-muted-foreground">Sem pendências nas medições disponíveis.</p>}{(!p.qualidade || p.fotos.some(f => f.largura == null || f.altura == null)) && <p className="text-xs text-muted-foreground">Qualidade ou resolução não confirmada.</p>}</div>
            </div>
          </article>;
        })}
      </div>
      {!linhas.length && <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
      <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Critérios e limites da recomendação</summary><p className="mt-2 leading-relaxed">Balanceamento da demanda por média e covariância da receita diária paga, sem pesos negativos. Cobertura = estoque disponível ÷ média diária de unidades pagas. Estoque recomendado = 28 dias de vendas + segurança (1,65 × oscilação diária × √28). Risco de ruptura quando a cobertura fica abaixo de 15 dias. Quantidades são estimativas lineares, não previsão garantida de vendas. Para produtos fora do Full, os cenários pressupõem que o estoque disponível seja transferível; confirme o estoque físico. Reservas, trânsito, variações de demanda, capacidade, custos e elegibilidade exigem conferência antes de enviar. Nenhum envio é realizado pelo painel.</p></details>
    </> : null}
  </section>;
}

function Ok({ rotulo, n, estado }: { rotulo: string; n?: number; estado: boolean | null }) {
  return <span className={`inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs ${estado ? 'text-foreground' : 'text-muted-foreground'}`} title={estado == null ? 'Não confirmado' : estado ? 'OK' : 'Pendente'}>{rotulo}{estado ? Array.from({ length: Math.max(1, n ?? 1) }, (_, i) => <CheckCircle2 key={i} className="h-3.5 w-3.5 text-primary" />) : <span>{estado == null ? '?' : '—'}</span>}</span>;
}
function Checklist({ p, full }: { p: FullProduto; full: boolean }) {
  const promos = p.promocoes;
  const fotosOk = p.fotos.length ? p.fotos.every(f => f.largura != null && f.altura != null && Math.min(f.largura, f.altura) >= 1200) : null;
  const qualidadeOk = p.qualidade?.score == null ? null : p.qualidade.score >= 80;
  return <div className="flex flex-wrap gap-1.5"><Ok rotulo="Full" estado={full} /><Ok rotulo="CPP" n={promos?.length} estado={promos == null ? null : promos.length > 0} /><Ok rotulo="Ads" estado={p.ads ?? null} /><Ok rotulo="Flex" estado={p.flex ?? null} /><Ok rotulo="Fotos" estado={fotosOk} /><Ok rotulo="Qualidade" estado={qualidadeOk} /><Ok rotulo="Ativo" estado={p.status === 'active'} /></div>;
}
