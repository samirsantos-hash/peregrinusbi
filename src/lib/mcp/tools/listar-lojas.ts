import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "listar_lojas",
  title: "Listar lojas",
  description: "Lista as lojas que o usuário conectado pode ver na carteira, com busca opcional por apelido ou Cust ID.",
  inputSchema: {
    busca: z.string().max(100).optional().describe("Trecho do apelido ou do Cust ID."),
    limite: z.number().int().min(1).max(200).optional().describe("Máximo de lojas (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("sellers")
      .select("id, nickname, cust_id, vertical_dominant, cluster_seller, sub_cluster_seller")
      .order("nickname")
      .limit(limite ?? 50);
    if (busca) {
      const s = busca.replace(/[%,()]/g, "");
      q = q.or(`nickname.ilike.%${s}%,cust_id.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const lojas = (data ?? []).map((l) => ({
      id: l.id, apelido: l.nickname, cust_id: l.cust_id,
      vertical: l.vertical_dominant, cluster: l.cluster_seller, subcluster: l.sub_cluster_seller,
    }));
    return { content: [{ type: "text", text: JSON.stringify(lojas) }], structuredContent: { lojas } };
  },
});
