import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MetaLoja {
  id: string;
  sellerId: string;
  mes: string; // YYYY-MM
  metaFaturamento: number | null;
  metaClips: number | null;
  metaReposicao: number | null;
  observacao: string | null;
}

export interface MetaInput {
  sellerId: string;
  mes: string;
  metaFaturamento: number | null;
  metaClips: number | null;
  metaReposicao: number | null;
  observacao?: string | null;
}

function mapRow(row: any): MetaLoja {
  return {
    id: row.id,
    sellerId: row.seller_id,
    mes: row.mes,
    metaFaturamento: row.meta_faturamento === null ? null : Number(row.meta_faturamento),
    metaClips: row.meta_clips === null ? null : Number(row.meta_clips),
    metaReposicao: row.meta_reposicao === null ? null : Number(row.meta_reposicao),
    observacao: row.observacao ?? null,
  };
}

export function useMetasLoja(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["metas-loja", sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<MetaLoja[]> => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from("metas_loja" as any)
        .select("*")
        .eq("seller_id", sellerId)
        .order("mes", { ascending: false });
      if (error) throw error;
      return ((data as any[]) || []).map(mapRow);
    },
  });
}

export function useSalvarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MetaInput) => {
      const { data: sessao } = await supabase.auth.getUser();
      const { error } = await supabase.from("metas_loja" as any).upsert(
        {
          seller_id: input.sellerId,
          mes: input.mes,
          meta_faturamento: input.metaFaturamento,
          meta_clips: input.metaClips,
          meta_reposicao: input.metaReposicao,
          observacao: input.observacao ?? null,
          created_by: sessao?.user?.id ?? null,
        } as any,
        { onConflict: "seller_id,mes" },
      );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["metas-loja", vars.sellerId] });
    },
  });
}

export function useRemoverMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; sellerId: string }) => {
      const { error } = await supabase.from("metas_loja" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["metas-loja", vars.sellerId] });
    },
  });
}
