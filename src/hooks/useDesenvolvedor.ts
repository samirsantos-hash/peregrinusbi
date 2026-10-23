import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useDesenvolvedor() {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ['sou-desenvolvedor', user?.id], enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('sou_desenvolvedor');
      if (error) throw error;
      return data === true;
    },
  });
  return { autorizado: !!user && query.data === true, loading: authLoading || (!!user && query.isLoading) };
}