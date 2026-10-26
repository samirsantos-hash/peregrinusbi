import { useQuery } from '@tanstack/react-query';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { supabase } from '@/integrations/supabase/client';
export function useAnaliseMl<T>(custId: string | undefined, modo: 'resumo' | 'full') {
  const conexao = useQuery({ queryKey: ['ml-conexao-analise', custId], enabled: !!custId, queryFn: async () => {
    const { data, error } = await supabase.from('ml_sync_tema').select('account_id').eq('cust_id', custId ?? '').limit(1);
    if (error) throw error;
    return Boolean(data?.length);
  } });
  const analise = useQuery({ queryKey: ['ml-analise-loja', custId, modo], enabled: !!custId && conexao.data === true, staleTime: 5 * 60_000, refetchInterval: modo === 'resumo' ? 5 * 60_000 : false, retry: false,
    queryFn: () => chamarFuncaoMl<T>('ml-analise-loja', { cust_id: custId, modo }) });
  return { ...analise, conectada: conexao.data === true, verificandoConexao: conexao.isLoading, erroConexao: conexao.error };
}