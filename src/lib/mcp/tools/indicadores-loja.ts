import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "indicadores_mensais_loja",
  title: "Indicadores mensais da loja",
  description: "Retorna faturamento, pedidos, visitas, investimento em Ads e notas de qualidade por mês de uma loja da carteira do usuário.",
  inputSchema: {
    loja_id: z.string().uuid().describe("ID da loja, obtido em listar_lojas."),
    meses: z.number().int().min(1).max(24).optional().describe("Quantidade de meses mais recentes (padrão 6)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ loja_id, meses }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sellers_kpi")
      .select("data, tgmv_lc, tgmv_orders, tsi, visits, inv_pads, tgmv_lc_pads, tgmv_lc_full, score_qualidade_final, rep_current_level, rep_claims_rate, rep_delayed_ht_rate")
      .eq("seller_id", loja_id)
      .order("data", { ascending: false })
      .limit(meses ?? 6);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const indicadores = (data ?? []).map((r) => ({
      mes: r.data, faturamento: r.tgmv_lc, pedidos: r.tgmv_orders, unidades: r.tsi, visitas: r.visits,
      investimento_ads: r.inv_pads, faturamento_ads: r.tgmv_lc_pads, faturamento_full: r.tgmv_lc_full,
      score_qualidade: r.score_qualidade_final, reputacao: r.rep_current_level,
      taxa_reclamacoes: r.rep_claims_rate, taxa_atrasos: r.rep_delayed_ht_rate,
    }));
    return { content: [{ type: "text", text: JSON.stringify(indicadores) }], structuredContent: { indicadores } };
  },
});
