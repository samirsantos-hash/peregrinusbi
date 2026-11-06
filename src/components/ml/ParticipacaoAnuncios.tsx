import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Check, X } from 'lucide-react';
import { chamarFuncaoMl, dataHoraBr } from '@/lib/mlFuncoes';
import { filtrarParticipacao, type AnuncioParticipacao } from '@/lib/participacaoAnuncios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { num } from '@/lib/format';
type Resultado = { catalogo: string[]; proximo: number | null; itens: AnuncioParticipacao[]; universo: number; medidos: number; indisponiveis: number; coberturaCompleta: boolean; consultadoEm: string };
export default function ParticipacaoAnuncios({ custId, filtro = 'participacao' }: { custId: string; filtro?: string }) {
  const [busca, setBusca] = useState(''); const [limite, setLimite] = useState(10);
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
  const titulo = filtro === 'fora' ? 'Anúncios fora de promoções' : filtro === 'multiplas' ? 'Duas ou mais promoções' : 'Participação dos anúncios';
  const lista = filtrarParticipacao(q.data?.itens ?? [], filtro, q.data?.coberturaCompleta ?? false).filter(i => `${i.titulo} ${i.item_id}`.toLocaleLowerCase().includes(busca.toLocaleLowerCase()));
  return <section className="min-w-0 space-y-4" aria-label={titulo}>
    <header className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">{titulo}</h2><Button variant="outline" size="sm" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} />Atualizar leitura</Button></header>
    <p className="text-sm text-muted-foreground">Participação atual ativa ou programada · anúncios ativos e pausados. Convites não contam; duas promoções não comprovam descontos acumulados nem vendas atribuídas.</p>
    {q.isFetching && <p role="status" className="text-sm text-muted-foreground">Conferindo catálogo e promoções de cada anúncio…</p>}
    {q.error && <p role="alert" className="text-sm text-destructive">Não foi possível conferir todos os dados. Atualize a leitura; ausência de resposta não significa ausência de promoção.</p>}
    {q.data && <>
      <p className="text-xs text-muted-foreground">{num(q.data.medidos)} de {num(q.data.universo)} anúncios conferidos · {dataHoraBr(q.data.consultadoEm)}{!q.data.coberturaCompleta ? ' · leitura incompleta; resultados observados não representam toda a loja' : ' · catálogo completo nesta consulta'}</p>
      {!q.data.coberturaCompleta && filtro === 'fora' ? <p className="text-sm text-muted-foreground">Lista suspensa: {num(q.data.indisponiveis)} anúncios sem participação confirmada. Não é possível afirmar quais estão fora de promoções.</p> : <>
        <Input aria-label="Buscar na participação de promoções" placeholder="Buscar por título ou MLB" value={busca} onChange={e => { setBusca(e.target.value); setLimite(10); }} />
        <p className="text-sm text-muted-foreground">{num(lista.length)} anúncios{q.data.coberturaCompleta ? '' : ' observados'} nesta seleção.</p>
        <div className="max-w-full overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-muted-foreground"><tr><th className="p-3">Anúncio</th><th className="p-3">Situação</th><th className="p-3">Promoções</th></tr></thead><tbody>{lista.slice(0, limite).map(i => <tr key={i.item_id} className="border-t border-border"><td className="p-3 min-w-48"><p>{i.titulo}</p><span className="text-xs text-muted-foreground">{i.item_id}</span></td><td className="p-3">{i.status === 'paused' ? 'Pausado' : 'Ativo'}</td><td className="p-3 min-w-48">{i.promocoes.length ? i.promocoes.map(p => <div key={p.id} className="flex gap-2 items-start"><Check className="h-4 w-4 shrink-0 text-primary" /><span>{p.nome} · {['active','started'].includes(p.status) ? 'Ativa' : 'Programada'}</span></div>) : <span className="flex gap-2"><X className="h-4 w-4 text-destructive" />Sem participação confirmada</span>}</td></tr>)}</tbody></table></div>
        {lista.length > limite && <Button variant="outline" size="sm" onClick={() => setLimite(n => n + 10)}>Mostrar mais 10</Button>}
      </>}
    </>}
  </section>;
}