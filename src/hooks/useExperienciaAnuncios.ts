import { useQueries, useQueryClient } from '@tanstack/react-query';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import type { LoteExperiencia } from '@/lib/anuncio/experiencia';

export function useExperienciaAnuncios(custId: string, ids: string[], periodo?: { inicio: string; fim: string }, enabled = true) {
  const client = useQueryClient();
  const ordenados = [...new Set(ids)].sort();
  const lotes: string[][] = [];
  for (let i = 0; i < ordenados.length; i += 5) lotes.push(ordenados.slice(i, i + 5));
  const chave = (i: number) => ['diag-experiencia-v1', custId, periodo?.inicio, periodo?.fim, lotes[i]];
  const consultas = useQueries({ queries: lotes.map((item_ids, i) => {
    const anterior = i > 0 ? client.getQueryState(chave(i - 1)) : null;
    return { queryKey: chave(i), enabled: enabled && !!custId && !!periodo && (i === 0 || anterior?.status === 'success' || anterior?.status === 'error'), retry: false, staleTime: 864e5,
      queryFn: async () => {
        if (!periodo) throw new Error('Período não confirmado.');
        const data = await chamarFuncaoMl<LoteExperiencia>('ml-analise-loja', { cust_id: custId, modo: 'diagnosticoExperiencia', item_ids, ...periodo });
        if (data.periodo.inicio !== periodo.inicio || data.periodo.fim !== periodo.fim) throw new Error('Experiência com datas diferentes.');
        return data;
      },
    };
  }) });
  const itens = consultas.flatMap(q => q.data?.itens ?? []);
  return { porMlb: new Map(itens.map(i => [i.item_id, i])), consultados: itens.length, total: ordenados.length, carregando: enabled && consultas.some(q => q.isPending) };
}