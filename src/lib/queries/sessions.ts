import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UsuarioComSessoes {
  user_id: string;
  email: string;
  total_sessoes: number;
  ultimo_acesso: string | null;
  segundos_online: number | null;
  sessoes_ativas: number;
}

export function useUsuariosComSessoes() {
  return useQuery({
    queryKey: ["usuarios-sessoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_usuarios_sessoes" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as UsuarioComSessoes[];
    },
    refetchInterval: 30_000,
  });
}

export interface SessaoUsuario {
  id: string;
  session_token: string;
  login_at: string;
  logout_at: string | null;
  last_seen_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export function useSessoesDoUsuario(userId: string | null) {
  return useQuery({
    queryKey: ["sessoes-usuario", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_sessions")
        .select("id, session_token, login_at, logout_at, last_seen_at, ip_address, user_agent")
        .eq("user_id", userId)
        .order("login_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as SessaoUsuario[];
    },
    enabled: !!userId,
  });
}

export function useEncerrarSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("user_sessions")
        .update({ logout_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessoes-usuario"] });
      qc.invalidateQueries({ queryKey: ["usuarios-sessoes"] });
    },
  });
}