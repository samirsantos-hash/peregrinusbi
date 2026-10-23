import { FunctionsHttpError } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { consultaLenta, registrarAviso } from '@/lib/avisosDesenvolvedor';

export type ContaMl = { id: string; ml_user_id: number; nickname: string | null; site_id: string };

/** Chama uma Edge Function e devolve a mensagem em português do servidor quando ela recusa. */
export async function chamarFuncaoMl<T>(nome: string, body: Record<string, unknown>): Promise<T> {
  const inicio = performance.now();
  const { data, error } = await supabase.functions.invoke(nome, { body });
  const duracao = performance.now() - inicio;
  if (consultaLenta(duracao)) void registrarAviso('resposta_lenta', undefined, duracao);
  if (error) {
    void registrarAviso('atualizacao_falhou');
    let msg = "Não foi possível falar com o servidor agora.";
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context.json())?.error ?? msg; } catch { /* sem corpo */ }
    }
    throw new Error(msg);
  }
  return data as T;
}

/** Consultor: super_admin, admin, gerente ou quem tem carteira atribuída (mesma regra do servidor). */
export function useSouConsultor(userId?: string | null) {
  const { data } = useQuery({
    queryKey: ["ml-sou-consultor", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("ml_sou_consultor");
      if (error) throw error;
      return data === true;
    },
  });
  return data === true;
}

/** Contas do Mercado Livre que a pessoa gerencia (allowed_cust_ids + papel de consultor). */
export function useContasMl() {
  return useQuery({
    queryKey: ["ml-contas-gerenciaveis"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("ml_contas_gerenciaveis");
      if (error) throw error;
      return (data ?? []) as ContaMl[];
    },
  });
}

export const dataHoraBr = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
