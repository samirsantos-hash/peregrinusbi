import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { podeExecutar, type EstadoPermissoes } from '@/lib/permissoes';

// RPCs additive to the managed schema; never use a second auth/storage client.
export const rpcPermissoes = async <T,>(nome: string, args: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await (supabase.rpc as unknown as (nome: string, args: Record<string, unknown>) => Promise<{ data: T; error: { message: string } | null }>)(nome, args);
  if (error) throw new Error(error.message);
  return data;
};
export function usePermissoes() {
  const query = useQuery({ queryKey: ['minhas-permissoes'], queryFn: () => rpcPermissoes<EstadoPermissoes>('minhas_permissoes'), staleTime: 0, refetchInterval: 30_000 });
  return { ...query, master: query.data?.master ?? false, pode: (permissao: string) => podeExecutar(query.data, permissao) };
}