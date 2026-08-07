import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  resolverEntrada,
  ESCOPO_POR_PAPEL,
  NAVEGACAO_POR_ESCOPO,
  type Escopo,
  type Perfil,
} from "@/lib/navegacao/perfis";

export interface PerfilNavegacao {
  perfil: Perfil;
  escopo: Escopo;
  grupoIds: string[];
  lojaIds: string[];
  entrada: string | null;
  /** true quando há mais de um vínculo no nível de entrada. */
  precisaSeletor: boolean;
  /** true quando a conta não tem nenhum vínculo visível. */
  semVinculo: boolean;
}

export function usePerfilNavegacao() {
  const { user, isAdmin, isGerente, loading: authLoading } = useAuth();

  const query = useQuery<PerfilNavegacao>({
    queryKey: ["perfil-navegacao", user?.id, isAdmin, isGerente],
    enabled: !authLoading && !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: grupos }, { data: lojas }, { data: carteiras }] = await Promise.all([
        supabase.from("grupos").select("id, dono_user_id, ativo").eq("ativo", true),
        supabase.from("sellers").select("id").order("nickname"),
        supabase.from("portfolios").select("id").eq("assigned_to", user!.id),
      ]);

      const meusGrupos = (grupos || []).filter((g) => g.dono_user_id === user!.id).map((g) => g.id);
      const lojaIds = (lojas || []).map((l) => l.id);
      const temCarteira = (carteiras || []).length > 0;

      const perfil: Perfil =
        isAdmin || isGerente || temCarteira ? "consultor" : meusGrupos.length ? "dono_grupo" : "gestor_loja";
      const escopo = ESCOPO_POR_PAPEL[perfil];

      const grupoIds = perfil === "dono_grupo" ? meusGrupos : (grupos || []).map((g) => g.id);

      // Escopo 'global' sempre entra pela carteira (L0), independentemente de
      // quantas lojas o usuário enxerga — o nível acima já agrupa os vínculos.
      const entrada =
        escopo === "global"
          ? NAVEGACAO_POR_ESCOPO.global.entrada
          : resolverEntrada(perfil, {
              grupoId: grupoIds.length === 1 ? grupoIds[0] : null,
              lojaId: lojaIds.length === 1 ? lojaIds[0] : null,
            });

      const vinculos = escopo === "grupo" ? grupoIds : lojaIds;
      const semVinculo = escopo !== "global" && vinculos.length === 0;
      // Seletor só quando não existe nível acima que agrupe os vínculos.
      const precisaSeletor = escopo !== "global" && vinculos.length > 1;

      return { perfil, escopo, grupoIds, lojaIds, entrada, precisaSeletor, semVinculo };
    },
  });

  return {
    perfil: query.data?.perfil ?? ("consultor" as Perfil),
    escopo: query.data?.escopo ?? ("global" as Escopo),
    grupoIds: query.data?.grupoIds ?? [],
    lojaIds: query.data?.lojaIds ?? [],
    entrada: query.data?.entrada ?? null,
    precisaSeletor: query.data?.precisaSeletor ?? false,
    semVinculo: query.data?.semVinculo ?? false,
    loading: authLoading || query.isLoading,
  };
}
