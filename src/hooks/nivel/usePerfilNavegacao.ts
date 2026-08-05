import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolverEntrada, type Perfil } from "@/lib/navegacao/perfis";

export interface PerfilNavegacao {
  perfil: Perfil;
  grupoIds: string[];
  lojaIds: string[];
  entrada: string | null;
  /** true quando há mais de um vínculo no nível de entrada. */
  precisaSeletor: boolean;
}

export function usePerfilNavegacao() {
  const { user, isAdmin, isGerente, loading: authLoading } = useAuth();

  const query = useQuery<PerfilNavegacao>({
    queryKey: ["perfil-navegacao", user?.id, isAdmin, isGerente],
    enabled: !authLoading && !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: grupos }, { data: lojas }] = await Promise.all([
        supabase.from("grupos").select("id, dono_user_id, ativo").eq("ativo", true),
        supabase.from("sellers").select("id").order("nickname"),
      ]);

      const meusGrupos = (grupos || []).filter((g) => g.dono_user_id === user!.id).map((g) => g.id);
      const lojaIds = (lojas || []).map((l) => l.id);

      const perfil: Perfil = isAdmin || isGerente ? "consultor" : meusGrupos.length ? "dono_grupo" : "gestor_loja";

      const grupoIds = perfil === "dono_grupo" ? meusGrupos : (grupos || []).map((g) => g.id);
      const entrada = resolverEntrada(perfil, {
        grupoId: grupoIds.length === 1 ? grupoIds[0] : null,
        lojaId: lojaIds.length === 1 ? lojaIds[0] : null,
      });

      const precisaSeletor =
        (perfil === "dono_grupo" && grupoIds.length !== 1) || (perfil === "gestor_loja" && lojaIds.length !== 1);

      return { perfil, grupoIds, lojaIds, entrada, precisaSeletor };
    },
  });

  return {
    perfil: query.data?.perfil ?? ("consultor" as Perfil),
    grupoIds: query.data?.grupoIds ?? [],
    lojaIds: query.data?.lojaIds ?? [],
    entrada: query.data?.entrada ?? null,
    precisaSeletor: query.data?.precisaSeletor ?? false,
    loading: authLoading || query.isLoading,
  };
}
