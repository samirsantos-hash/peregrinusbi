import { useQueries, useQueryClient } from '@tanstack/react-query';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import type { LoteConstrucao } from '@/lib/anuncio/construcao';

/** Sequential batches: no fan-out against the store token; successful batches are reusable. */
export function useConstrucaoAnuncios(custId: string, ids: string[]) {
  const client = useQueryClient();
  const ordenados = [...new Set(ids)].sort();
  const lotes: string[][] = [];
  for (let i = 0; i < ordenados.length; i += 20) lotes.push(ordenados.slice(i, i + 20));
  const chave = (i: number) => ['diag-construcao-v2', custId, lotes[i]];
  const consultas = useQueries({ queries: lotes.map((item_ids, i) => {
    const anterior = i > 0 ? client.getQueryState(chave(i - 1)) : null;
    return {
      queryKey: chave(i), enabled: !!custId && (i === 0 || anterior?.status === 'success' || anterior?.status === 'error'),
      retry: false, staleTime: 864e5,
      queryFn: () => chamarFuncaoMl<LoteConstrucao>('ml-analise-loja', { cust_id: custId, modo: 'diagnosticoConstrucao', item_ids }),
    };
  }) });
  const itens = consultas.flatMap(q => q.data?.itens ?? []);
  return {
    itens, porMlb: new Map(itens.map(i => [i.item_id, i])),
    carregando: consultas.some(q => q.isPending),
    falhas: consultas.filter(q => q.isError).length,
    total: ordenados.length, lidos: itens.length,
    completo: consultas.every(q => q.isSuccess && q.data.coberturaCompleta),
  };
}