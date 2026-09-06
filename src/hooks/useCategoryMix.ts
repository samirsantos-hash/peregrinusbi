import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CategoryShare {
  categoria: string;
  itens: number;
  pct: number;
}

/**
 * Mix percentual de categorias do seller, a partir do snapshot mais recente
 * de `live_listings` (itens ativos por categoria).
 */
export function useCategoryMix(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["category-mix", sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<{ categorias: CategoryShare[]; data: string | null; totalItens: number }> => {
      if (!sellerId) return { categorias: [], data: null, totalItens: 0 };

      const { data, error } = await supabase
        .from("live_listings")
        .select("data, itens, categoria, dom_domain_agg1, vertical")
        .eq("seller_id", sellerId);

      if (error) throw error;
      if (!data?.length) return { categorias: [], data: null, totalItens: 0 };

      const maxData = data.reduce((mx, r) => (r.data && r.data > mx ? r.data : mx), "");
      const snapshot = data.filter((r) => r.data === maxData);

      const map = new Map<string, number>();
      for (const r of snapshot) {
        const nome =
          (r.categoria || r.dom_domain_agg1 || r.vertical || "").toString().trim() || "Não classificada";
        const itens = Number(r.itens) || 0;
        if (itens <= 0) continue;
        map.set(nome, (map.get(nome) || 0) + itens);
      }

      const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
      const categorias = Array.from(map.entries())
        .map(([categoria, itens]) => ({
          categoria,
          itens,
          pct: total > 0 ? (itens / total) * 100 : 0,
        }))
        .sort((a, b) => b.itens - a.itens);

      return { categorias, data: maxData || null, totalItens: total };
    },
  });
}
