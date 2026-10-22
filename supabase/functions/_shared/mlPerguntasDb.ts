import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buscarMl } from "./mlHttp.ts";
import type { PerguntaLinha } from "./mlPerguntas.ts";

const API = "https://api.mercadolibre.com";

function linhaBanco(accountId: string, p: PerguntaLinha) {
  return {
    question_id: p.question_id,
    account_id: accountId,
    item_id: p.item_id,
    texto: p.texto,
    status: p.status,
    data_criacao: p.data_criacao,
    from_id: p.from_id,
    resposta_texto: p.resposta_texto,
    resposta_status: p.resposta_status,
    resposta_data: p.resposta_data,
    synced_at: new Date().toISOString(),
  };
}

export async function gravarPerguntas(admin: SupabaseClient, accountId: string, perguntas: PerguntaLinha[]) {
  if (!perguntas.length) return;
  const { error } = await admin.from("ml_questions").upsert(perguntas.map((p) => linhaBanco(accountId, p)));
  if (error) throw new Error(`falha ao gravar perguntas: ${error.message}`);
}

/** Título, foto e link do anúncio via multiget (/items?ids=, até 20 por chamada). */
export async function completarAnuncios(admin: SupabaseClient, accountId: string, token: string, itemIds: string[]) {
  const unicos = [...new Set(itemIds.filter(Boolean))];
  if (!unicos.length) return;
  const { data: conhecidos } = await admin.from("ml_questions").select("item_id")
    .eq("account_id", accountId).in("item_id", unicos).not("item_titulo", "is", null);
  const jaTem = new Set((conhecidos ?? []).map((r) => r.item_id as string));
  const faltam = unicos.filter((id) => !jaTem.has(id));
  for (let i = 0; i < faltam.length; i += 20) {
    const lote = faltam.slice(i, i + 20);
    const r = await buscarMl(`${API}/items?ids=${lote.join(",")}&attributes=id,title,thumbnail,permalink`, token);
    if (!r.ok || !Array.isArray(r.json)) continue;
    for (const item of r.json as { code?: number; body?: Record<string, unknown> }[]) {
      if (item.code !== 200 || !item.body) continue;
      const id = typeof item.body.id === "string" ? item.body.id : null;
      if (!id) continue;
      await admin.from("ml_questions").update({
        item_titulo: typeof item.body.title === "string" ? item.body.title : null,
        item_thumbnail: typeof item.body.thumbnail === "string" ? item.body.thumbnail : null,
        item_link: typeof item.body.permalink === "string" ? item.body.permalink : null,
      }).eq("account_id", accountId).eq("item_id", id);
    }
  }
}
