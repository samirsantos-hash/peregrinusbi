import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcularBbf } from "@/lib/qualityIndex";

export interface QualityCarteira {
  /** distribuição de SCORE_FINAL_BBF por loja no período mais recente com dado */
  scores: number[];
  melhor: number | null;
  mes: number | null;
}

/**
 * Distribuição do Quality Index (BBF) na carteira visível ao usuário.
 * A RLS de sellers_kpi já limita as lojas ao escopo do usuário.
 */
export function useQualityCarteira() {
  return useQuery<QualityCarteira>({
    queryKey: ["quality-carteira-bbf"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers_kpi")
        .select("seller_id, tim_month_id, score_caracteristica_final, score_oferta_final, score_qualidade_final")
        .not("score_qualidade_final", "is", null)
        .gt("score_qualidade_final", 0)
        .order("tim_month_id", { ascending: false })
        .limit(3000);

      if (error) throw error;
      const linhas = data || [];
      if (linhas.length === 0) return { scores: [], melhor: null, mes: null };

      const mes = Number(linhas[0].tim_month_id) || null;
      const porLoja = new Map<string, number>();
      for (const l of linhas) {
        if (Number(l.tim_month_id) !== mes) continue;
        const bbf = calcularBbf(l as any);
        if (bbf == null) continue;
        const atual = porLoja.get(l.seller_id);
        if (atual == null || bbf > atual) porLoja.set(l.seller_id, bbf);
      }
      const scores = [...porLoja.values()];
      return { scores, melhor: scores.length ? Math.max(...scores) : null, mes };
    },
  });
}
