import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { chamarFuncaoMl, dataHoraBr } from '@/lib/mlFuncoes';
import { filtrarParticipacao, type AnuncioParticipacao } from '@/lib/participacaoAnuncios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { num } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ResumoPromocoesAnuncio from './ResumoPromocoesAnuncio';
type Resultado = { catalogo: string[]; proximo: number | null; itens: AnuncioParticipacao[]; universo: number; medidos: number; indisponiveis: number; coberturaCompleta: boolean; consultadoEm: string };
export default function ParticipacaoAnuncios({ custId, filtro = 'participacao', aoSelecionar }: { custId: string; filtro?: string; aoSelecionar?: (item: AnuncioParticipacao) => void }) {
  const [busca, setBusca] = useState(''); const [limite, setLimite] = useState(10);
  const [selecao, setSelecao] = useState(filtro === 'fora' || filtro === 'multiplas' ? filtro : 'com');
  const [vencimento, setVencimento] = useState('0');
  const q = useQuery({ queryKey: ['ml-participacao-completa', custId], enabled: !!custId, retry: false, staleTime: 300_000,
    queryFn: async () => {
      let offset = 0; let catalogo: string[] | null = null; const itens: AnuncioParticipacao[] = []; let indisponiveis = 0; let ultima: Resultado | null = null;
      do {
        const r = await chamarFuncaoMl<Resultado>('ml-analise-loja', { cust_id: custId, modo: 'participacaoPromocoes', offset });
        if (catalogo && JSON.stringify(catalogo) !== JSON.stringify(r.catalogo)) throw new Error('Catálogo mudou durante a leitura.');
        catalogo = r.catalogo; itens.push(...r.itens); indisponiveis += r.indisponiveis; ultima = r;
        if (r.proximo == null) break; if (r.proximo <= offset) throw new Error('Paginação inválida.'); offset = r.proximo;
      } while (offset <= 20000);
      if (!ultima) throw new Error('Leitura indisponível.');
      return { ...ultima, itens, medidos: itens.length, indisponiveis, coberturaCompleta: indisponiveis === 0 && itens.length === ultima.universo };
    } });
  const titulo = 'Anúncios em promoções';
  const lista = filtrarParticipacao(q.data?.itens ?? [], selecao, q.data?.coberturaCompleta ?? false, Number(vencimento)).filter(i => `${i.titulo} ${i.item_id}`.toLocaleLowerCase().includes(busca.toLocaleLowerCase()));
  return <section className="min-w-0 space-y-4" aria-label={titulo}>
    <header className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">{titulo}</h2><Button variant="outline" size="sm" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} />Atualizar leitura</Button></header>
    <div className="flex flex-wrap gap-2">
      <Input className="min-w-0 flex-1 basis-56" aria-label="Buscar na participação de promoções" placeholder="Buscar por título ou MLB" value={busca} onChange={e => { setBusca(e.target.value); setLimite(10); }} />
      <Select value={selecao} onValueChange={v => { setSelecao(v); setLimite(10); }}><SelectTrigger className="w-56 max-w-full" aria-label="Filtrar promoções"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="participacao">Todos os anúncios</SelectItem><SelectItem value="com">Com promoção</SelectItem><SelectItem value="1">Exatamente 1 promoção</SelectItem><SelectItem value="2">Exatamente 2 promoções</SelectItem><SelectItem value="3">Exatamente 3 promoções</SelectItem><SelectItem value="fora">Sem promoção</SelectItem><SelectItem value="multiplas">Duas ou mais promoções</SelectItem></SelectContent></Select>
      <Select value={vencimento} onValueChange={v => { setVencimento(v); setLimite(10); }}><SelectTrigger className="w-56 max-w-full" aria-label="Filtrar vencimento das promoções"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Qualquer vencimento</SelectItem><SelectItem value="3">Vencem em até 3 dias</SelectItem><SelectItem value="7">Vencem em até 7 dias</SelectItem><SelectItem value="15">Vencem em até 15 dias</SelectItem></SelectContent></Select>
    </div>
    <p className="text-sm text-muted-foreground">Participação atual ativa ou programada · anúncios ativos e pausados. Convites não contam; duas promoções não comprovam descontos acumulados nem vendas atribuídas.</p>
    {vencimento !== '0' && <p className="text-xs text-muted-foreground">Inclui anúncios com pelo menos uma participação que termina nos próximos {vencimento} dias. Datas ausentes, inválidas e promoções já vencidas não entram.</p>}
    {q.isFetching && <p role="status" className="text-sm text-muted-foreground">Conferindo catálogo e promoções de cada anúncio…</p>}
    {q.error && <p role="alert" className="text-sm text-destructive">Não foi possível conferir todos os dados. Atualize a leitura; ausência de resposta não significa ausência de promoção.</p>}
    {q.data && <>
      <p className="text-xs text-muted-foreground">{num(q.data.medidos)} de {num(q.data.universo)} anúncios conferidos · {dataHoraBr(q.data.consultadoEm)}{!q.data.coberturaCompleta ? ' · leitura incompleta; resultados observados não representam toda a loja' : ' · catálogo completo nesta consulta'}</p>
      {!q.data.coberturaCompleta && selecao === 'fora' ? <p className="text-sm text-muted-foreground">Lista suspensa: {num(q.data.indisponiveis)} anúncios sem participação confirmada. Não é possível afirmar quais estão fora de promoções.</p> : <>
        <p className="text-sm text-muted-foreground">{num(lista.length)} anúncios{q.data.coberturaCompleta ? '' : ' observados'} nesta seleção.</p>
        <div className="max-w-full overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-muted-foreground"><tr><th className="p-3">Anúncio</th><th className="p-3">Situação</th><th className="p-3 text-center">Promoções</th></tr></thead><tbody>{lista.slice(0, limite).map(i => <tr key={i.item_id} className="border-t border-border"><td className="p-3 min-w-48">{aoSelecionar ? <Button variant="ghost" className="h-auto min-w-0 whitespace-normal text-left justify-start px-0" onClick={() => aoSelecionar(i)}><span className="break-words">{i.titulo}<span className="block text-xs text-muted-foreground">{i.item_id}</span></span></Button> : <><p>{i.titulo}</p><span className="text-xs text-muted-foreground">{i.item_id}</span></>}</td><td className="p-3">{i.status === 'paused' ? 'Pausado' : 'Ativo'}</td><td className="p-3 text-center"><ResumoPromocoesAnuncio itemId={i.item_id} promocoes={[...new Map(i.promocoes.map(p => [p.id, p])).values()]} /></td></tr>)}</tbody></table></div>
        {lista.length > limite && <Button variant="outline" size="sm" onClick={() => setLimite(n => n + 10)}>Mostrar mais 10</Button>}
      </>}
    </>}
  </section>;
}