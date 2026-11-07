import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ds';
import DetalheAnuncioAbc from '@/components/ml/DetalheAnuncioAbc';
import { useListingsQuality } from '@/hooks/useListingsQuality';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { brl, num, pct } from '@/lib/format';
import type { ItemVendas } from '@/lib/anuncio/curvaAbc';
import {
  CORTES_PADRAO, QUADRANTES, ROTULO_DIMENSAO, ROTULO_QUADRANTE, diagnosticar, filaDeAcao, lotesDeCorrecao,
  mediana, montarDimensoes, notaGiro, SEM_PROMOCAO, perfilarCatalogo, type Dimensao, type Diagnostico, type Quadrante,
} from '@/lib/anuncio/diagnostico';

type Dados = { periodo: { inicio: string; fim: string }; itens: ItemVendas[]; coberturaCompleta: boolean; catalogoCompleto: boolean };
const dataBr = (s: string) => s.split('-').reverse().join('/');
const ind = (v: number | null) => v == null ? '—' : num(Math.round(v));
const POS: Record<Quadrante, string> = { falha_dupla: 'col-start-1 row-start-2', potencial_reprimido: 'col-start-2 row-start-2', produto_ou_demanda: 'col-start-1 row-start-1', saudavel: 'col-start-2 row-start-1' };
const TOM: Record<Quadrante, string> = { saudavel: 'text-emerald', potencial_reprimido: 'text-primary', produto_ou_demanda: 'text-foreground', falha_dupla: 'text-destructive' };

export default function DiagnosticoDoisEixos({ custId, contaId }: { custId: string; contaId: string }) {
  const catalogo = useQuery({
    queryKey: ['diag-catalogo', contaId], enabled: !!contaId,
    queryFn: async () => {
      const sb = supabase as any;
      const est = await sb.from('ml_listings_estado').select('pendentes, completo_em').eq('account_id', contaId).maybeSingle();
      if (est.error) throw est.error;
      const tipos = await fetchAllRows((de: number, ate: number) => sb.from('ml_listings').select('item_id, tipo_anuncio, logistica, frete_gratis, preco').eq('account_id', contaId).order('item_id').range(de, ate));
      if (tipos.error) throw tipos.error;
      const promo = await fetchAllRows((de: number, ate: number) => sb.from('ml_promotion_items').select('item_id').eq('account_id', contaId).in('status', ['started', 'pending', 'programmed', 'active']).order('item_id').range(de, ate));
      if (promo.error) throw promo.error;
      const completo = !!est.data?.completo_em && (est.data?.pendentes ?? 1) === 0;
      return { completo, tipos: new Map<string, any>(((tipos.data ?? []) as any[]).map(r => [r.item_id, r])), promo: new Set<string>(((promo.data ?? []) as any[]).map(r => r.item_id)) };
    },
  });
  const [lote, setLote] = useState<ReturnType<typeof lotesDeCorrecao>[number] | null>(null);
  const [mlb, setMlb] = useState<string | null>(null);
  const seller = useQuery({
    queryKey: ['seller-por-cust', custId], enabled: !!custId,
    queryFn: async () => { const { data, error } = await supabase.from('sellers').select('id').eq('cust_id', custId as any).maybeSingle(); if (error) throw error; return data?.id ?? null; },
  });
  const qualidade = useListingsQuality(seller.data ?? undefined);
  const vendas = useQuery({
    queryKey: ['ml-curva-abc', custId, 30], enabled: !!custId, retry: false,
    queryFn: async () => {
      const d = await chamarFuncaoMl<Dados>('ml-analise-loja', { cust_id: custId, modo: 'curvaABC', dias: 30 });
      if (!d.coberturaCompleta || !d.catalogoCompleto) throw new Error('Cobertura incompleta; classificação suspensa.');
      return d;
    },
  });

  const calc = useMemo(() => {
    if (!vendas.data) return null;
    const qMap = new Map((qualidade.data ?? []).map(q => [q.itemId.replace(/\D/g, ''), q]));
    const med = mediana(vendas.data.itens.map(i => i.unidades));
    const fat = new Map<string, number>();
    const titulos = new Map<string, string>();
    const ds: Diagnostico[] = vendas.data.itens.map(i => {
      fat.set(i.mlb, i.faturamentoCents); titulos.set(i.mlb, i.titulo);
      const q = qMap.get(i.mlb.replace(/\D/g, ''));
      const cat = catalogo.data;
      const promoAtual = cat?.completo ? (cat.promo.has(i.mlb) ? 100 : SEM_PROMOCAO) : null;
      return diagnosticar(i.mlb, montarDimensoes({
        envio: (() => { const r = cat?.tipos.get(i.mlb); return r ? { envio: r.logistica ? { free_shipping: !!r.frete_gratis, logistic_type: r.logistica } : null, tipo: r.tipo_anuncio ?? null, precoCents: Math.round(Number(r.preco ?? 0) * 100) } : null; })(),
        promocoes: promoAtual ?? q?.llPromotionsScore, preco: q?.llPriceScore, fotos: q?.llPicturesScore, titulo: q?.llTitleScore, descricao: q?.llDescriptionScore,
      }, notaGiro(i.unidades, med)));
    });
    let perfil = null;
    try { perfil = perfilarCatalogo(ds, fat); } catch { perfil = null; }
    const fila = filaDeAcao(ds, fat);
    return { ds, perfil, fila, lotes: lotesDeCorrecao(fila), titulos, porMlb: new Map(ds.map(d => [d.mlb, d])) };
  }, [vendas.data, qualidade.data, catalogo.data]);

  if (!custId) return <EmptyState falta="Selecione uma loja." acao="Escolha a loja no seletor acima." />;
  if (vendas.isPending || catalogo.isPending || seller.isPending || (!!seller.data && qualidade.isPending)) return <div role="status" className="flex gap-2 items-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Montando o diagnóstico…</div>;
  if (vendas.isError) return <EmptyState falta={vendas.error.message} acao="Tente atualizar em instantes." />;
  if (catalogo.isError || seller.isError || qualidade.isError) return <EmptyState falta="Não foi possível ler as notas de qualidade." acao="Tente atualizar em instantes." />;
  if (!calc) return null;
  const { perfil, fila, lotes, titulos, porMlb } = calc;
  const detalhe = mlb ? porMlb.get(mlb) : null;

  return <section className="space-y-5 min-w-0">
    <div>
      <h2 className="text-xl font-semibold">Diagnóstico em dois eixos</h2>
      <p className="text-xs text-muted-foreground mt-1">{dataBr(vendas.data!.periodo.inicio)} – {dataBr(vendas.data!.periodo.fim)} · Construção (o que o anúncio é) × Resposta (como o mercado reage). Não é a pontuação oficial do Mercado Livre.</p>
    </div>

    {!perfil ? <EmptyState falta="Nenhum anúncio pôde ser diagnosticado nos dois eixos." acao="As notas de construção ainda não estão disponíveis para estes anúncios." /> : <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="grid grid-cols-[auto_1fr_1fr] grid-rows-[1fr_1fr_auto] gap-2 text-xs">
            <span className="row-span-2 [writing-mode:vertical-rl] rotate-180 text-center text-muted-foreground">Construção ↑</span>
            <div className="col-start-2 col-span-2 row-start-1 row-span-2 grid grid-cols-2 grid-rows-2 gap-2">
              {QUADRANTES.map(q => { const d = perfil.distribuicao[q]; return <div key={q} className={`${POS[q]} rounded-lg border bg-card p-3 ${perfil.quadranteDominante === q ? 'ring-1 ring-primary' : ''}`}>
                <p className={`font-semibold ${TOM[q]}`}>{ROTULO_QUADRANTE[q]}</p>
                <p className="text-2xl font-semibold tabular-nums">{num(d.itens)}</p>
                <p className="text-muted-foreground tabular-nums">{pct(d.participacao * 100)} · {brl(d.faturamentoCents / 100)}</p>
              </div>; })}
            </div>
            <span className="col-start-2 col-span-2 text-center text-muted-foreground">Resposta →</span>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <p><span className="font-semibold">{ROTULO_QUADRANTE[perfil.quadranteDominante]} domina.</span> {perfil.leitura}</p>
          {perfil.gargaloRecorrente && <p>Gargalo recorrente: <b>{ROTULO_DIMENSAO[perfil.gargaloRecorrente.dimensao]}</b> em {pct(perfil.gargaloRecorrente.participacao * 100)} dos anúncios diagnosticados.</p>}
          <p className="text-xs text-muted-foreground">{num(perfil.diagnosticados)} de {num(perfil.anuncios)} anúncios diagnosticados; Construção usa as dimensões disponíveis (tipo de anúncio, participação atual em promoções{calc && !catalogo.data?.completo ? ' — suspensa: catálogo ainda não lido por inteiro' : ''} e notas de fotos, título, descrição e preço quando registradas). Resposta medida hoje só pelo giro (unidades vs mediana da loja); experiência, conversão e visitas por anúncio ainda não entram, por isso a confiança é baixa.</p>
          <p className="text-xs text-muted-foreground">Cortes provisórios: Construção {CORTES_PADRAO.construcao}, Resposta {CORTES_PADRAO.resposta}.{perfil.corteSemSeparacao && ' Atenção: mais de 90% dos anúncios ficam do mesmo lado de um corte — ele ainda não separa bem este catálogo.'}</p>
        </div>
      </div>

      {lotes.length > 0 && <div className="space-y-2">
        <h3 className="font-semibold">Lotes de correção</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {lotes.map(l => <button key={l.gargalo} type="button" onClick={() => setLote(l)} className="text-left rounded-lg border bg-card p-3 hover:border-primary">
            <p className="font-semibold">{l.gargalo === 'indefinido' ? 'Sem gargalo definido' : ROTULO_DIMENSAO[l.gargalo as Dimensao]}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{num(l.itens.length)} anúncios · {brl(l.faturamentoEmJogo / 100)} em jogo</p>
            {l.acaoComum && <p className="text-xs mt-1">{l.acaoComum}</p>}
          </button>)}
        </div>
      </div>}

      <div className="space-y-2">
        <h3 className="font-semibold">Fila de ação</h3>
        {fila.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum anúncio em Potencial reprimido ou Falha dupla.</p> :
          <div className="overflow-auto max-h-[480px] rounded-lg border"><table className="w-full text-xs">
            <thead className="sticky top-0 bg-card"><tr className="text-left text-muted-foreground"><th className="p-2">Anúncio</th><th className="p-2">Quadrante</th><th className="p-2 text-right">Constr.</th><th className="p-2 text-right">Resp.</th><th className="p-2">Gargalo</th><th className="p-2 text-right">Faturamento</th><th className="p-2">Confiança</th></tr></thead>
            <tbody>{fila.map(f => <tr key={f.mlb} className="border-t">
              <td className="p-2 max-w-[260px]"><button type="button" className="text-left hover:underline" onClick={() => setMlb(f.mlb)}><span className="line-clamp-2">{titulos.get(f.mlb)}</span><span className="text-muted-foreground">{f.mlb}</span></button>{f.acao && <p className="text-muted-foreground">{f.acao}</p>}</td>
              <td className={`p-2 ${TOM[f.quadrante]}`}>{ROTULO_QUADRANTE[f.quadrante]}</td>
              <td className="p-2 text-right tabular-nums">{ind(f.construcao)}</td><td className="p-2 text-right tabular-nums">{ind(f.resposta)}</td>
              <td className="p-2">{f.gargalo ? ROTULO_DIMENSAO[f.gargalo] : '—'}</td>
              <td className="p-2 text-right tabular-nums">{brl(f.faturamentoCents / 100)}</td><td className="p-2">{f.confianca}</td>
            </tr>)}</tbody>
          </table></div>}
      </div>
    </>}

    <Sheet open={!!lote} onOpenChange={o => !o && setLote(null)}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>{lote && (lote.gargalo === 'indefinido' ? 'Sem gargalo definido' : ROTULO_DIMENSAO[lote.gargalo as Dimensao])}</SheetTitle><SheetDescription>{lote && `${num(lote.itens.length)} anúncios com o mesmo gargalo`}</SheetDescription></SheetHeader>
        <ul className="mt-4 space-y-2 text-sm">{lote?.itens.map(i => <li key={i.mlb}><button type="button" className="text-left hover:underline" onClick={() => setMlb(i.mlb)}>{titulos.get(i.mlb)} <span className="text-xs text-muted-foreground">{i.mlb} · {brl(i.faturamentoCents / 100)}</span></button></li>)}</ul>
      </SheetContent>
    </Sheet>

    {detalhe && <div className="sr-only" aria-live="polite">{detalhe.leitura}</div>}
    <DetalheAnuncioAbc custId={custId} mlb={mlb} onClose={() => setMlb(null)} extra={detalhe ? <div className="space-y-2 rounded-lg border p-3 text-sm">
      <p className="font-semibold">{detalhe.quadrante ? ROTULO_QUADRANTE[detalhe.quadrante] : 'Diagnóstico indisponível'} <span className="text-xs text-muted-foreground font-normal">· confiança {detalhe.confianca}</span></p>
      {[detalhe.construcao, detalhe.resposta].map(e => <div key={e.eixo}>
        <div className="flex justify-between text-xs"><span>{e.eixo === 'construcao' ? 'Construção' : 'Resposta'}</span><span className="tabular-nums">{ind(e.indice)} · cobertura {pct(e.cobertura * 100)}</span></div>
        <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${e.indice ?? 0}%` }} /></div>
      </div>)}
      <p className="text-xs">{detalhe.leitura}</p>
      {detalhe.acaoPrincipal && <p className="text-xs font-semibold">{detalhe.acaoPrincipal}</p>}
    </div> : null} />
  </section>;
}
