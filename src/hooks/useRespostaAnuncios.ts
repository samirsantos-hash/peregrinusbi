import { useQueries, useQueryClient } from '@tanstack/react-query';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import type { LoteResposta } from '@/lib/anuncio/resposta';

export function useRespostaAnuncios(custId: string, ids: string[], periodo?: { inicio: string; fim: string }) {
  const client = useQueryClient();
  const ordenados = [...new Set(ids)].sort();
  const lotes: string[][] = [];
  for (let i = 0; i < ordenados.length; i += 20) lotes.push(ordenados.slice(i, i + 20));
  const chave = (i: number) => ['diag-resposta-v1', custId, periodo?.inicio, periodo?.fim, lotes[i]];
  const consultas = useQueries({ queries: lotes.map((item_ids, i) => {
    const anterior = i > 0 ? client.getQueryState(chave(i - 1)) : null;
    return { queryKey: chave(i), enabled: !!custId && !!periodo && (i === 0 || anterior?.status === 'success' || anterior?.status === 'error'), retry: false, staleTime: 864e5,
      queryFn: async () => {
        if (!periodo) throw new Error('Período não confirmado.');
        const data = await chamarFuncaoMl<LoteResposta>('ml-analise-loja', { cust_id: custId, modo: 'diagnosticoResposta', item_ids, inicio: periodo.inicio, fim: periodo.fim });
        if (data.periodo.inicio !== periodo.inicio || data.periodo.fim !== periodo.fim) throw new Error('Visitas e vendas com datas diferentes.');
        return data;
      },
    };
  }) });
  const itens = consultas.flatMap(q => q.data?.itens ?? []);
  return { porMlb: new Map(itens.map(i => [i.item_id, i.visitas])), medidos: itens.filter(i => i.visitas !== null).length, total: ordenados.length, carregando: consultas.some(q => q.isPending), completo: consultas.every(q => q.isSuccess && q.data.coberturaCompleta) };
}