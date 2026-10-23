import { tokenAtual } from "./mlTokenAtual.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buscarMl } from "./mlHttp.ts";
import { lerPergunta } from "./mlPerguntas.ts";
import { entraNaBusca, lerAnuncio } from "./mlAnuncios.ts";
import { completarAnuncios, gravarPerguntas } from "./mlPerguntasDb.ts";
import {
  AVISO_POR_TOPICO,
  type AvisoMl,
  caminhoRecurso,
  chaveDedupe,
  topicoAceito,
} from "./mlGestao.ts";

type Admin = SupabaseClient;

export async function persistirEProcessar(admin: Admin, aviso: AvisoMl, payload: unknown): Promise<"novo" | "duplicado"> {
  const dedupe = chaveDedupe(aviso);
  const { data, error } = await admin
    .from("ml_webhook_events")
    .insert({
      dedupe_key: dedupe,
      topic: aviso.topic,
      resource: aviso.resource,
      ml_user_id: aviso.userId,
      application_id: aviso.applicationId,
      payload,
      status: "recebido",
    })
    .select("id")
    .maybeSingle();

  if (error?.code === "23505") return "duplicado";
  if (error || !data) throw new Error(error?.message ?? "falha ao gravar o aviso");
  await processarEvento(admin, data.id);
  return "novo";
}

async function marcar(
  admin: Admin,
  id: string,
  campos: Record<string, unknown>,
) {
  await admin.from("ml_webhook_events").update({ ...campos, processado_em: new Date().toISOString() }).eq("id", id);
}

export async function processarEvento(admin: Admin, eventId: string) {
  const { data: ev } = await admin
    .from("ml_webhook_events")
    .select("id, topic, resource, ml_user_id, status")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev || ev.status !== "recebido") return;

  const { data: conta } = await admin
    .from("ml_accounts")
    .select("id, status")
    .eq("ml_user_id", ev.ml_user_id)
    .eq("status", "active")
    .maybeSingle();
  if (!conta) {
    await marcar(admin, ev.id, { status: "ignorado", erro: "Conta não conectada." });
    return;
  }

  const caminho = caminhoRecurso(ev.resource);
  if (!caminho || !topicoAceito(ev.topic)) {
    await marcar(admin, ev.id, { status: "ignorado", account_id: conta.id, erro: "Recurso fora dos tópicos desta etapa." });
    return;
  }

  const { data: tok } = await admin
    .from("ml_tokens")
    .select("access_token, expires_at")
    .eq("account_id", conta.id)
    .eq("is_current", true)
    .maybeSingle();
  if (!tok?.access_token || Date.parse(tok.expires_at) <= Date.now()) {
    await marcar(admin, ev.id, { status: "erro", account_id: conta.id, codigo_ml: "invalid_token", erro: "A autorização da conta expirou. Conecte de novo." });
    return;
  }

  const sep = caminho.includes("?") ? "&" : "?";
  const sufixo = ev.topic === "questions" ? `${sep}api_version=4`
    : ev.topic === "items" ? `${sep}include_attributes=all`
    : caminho.startsWith("/seller-promotions/") && !caminho.includes("app_version") ? `${sep}app_version=v2`
    : "";
  const resposta = await buscarMl(`https://api.mercadolibre.com${caminho}${sufixo}`, tok.access_token);
  if (!resposta.ok) {
    await marcar(admin, ev.id, { status: "erro", account_id: conta.id, codigo_ml: resposta.codigo, erro: resposta.erro });
    return;
  }

  if (ev.topic === "questions") {
    const pergunta = lerPergunta(resposta.json);
    if (pergunta) {
      try {
        await gravarPerguntas(admin, conta.id, [pergunta]);
        if (pergunta.item_id) await completarAnuncios(admin, conta.id, tok.access_token, [pergunta.item_id]);
      } catch (e) {
        console.error("pergunta do aviso não gravada", e instanceof Error ? e.message : e);
      }
    }
  }

  if (ev.topic === "items") {
    const anuncio = lerAnuncio(resposta.json);
    if (anuncio) {
      const { error } = entraNaBusca(anuncio.status)
        ? await admin.from("ml_listings").upsert({ ...anuncio, account_id: conta.id, synced_at: new Date().toISOString() })
        : await admin.from("ml_listings").delete().eq("item_id", anuncio.item_id).eq("account_id", conta.id);
      if (error) console.error("anúncio do aviso não gravado", error.message);
    }
  }

  await marcar(admin, ev.id, { status: "processado", account_id: conta.id, recurso: resposta.json, erro: null, codigo_ml: null });

  if (!topicoAceito(ev.topic) || ev.topic === "items" || ev.topic === "price_suggestion") return;
  const aviso = AVISO_POR_TOPICO[ev.topic];
  const { data: destinos } = await admin.rpc("ml_destinatarios_conta", { p_account_id: conta.id });
  const linhas = (destinos ?? []).map((d: { user_id: string }) => ({
    user_id: d.user_id,
    account_id: conta.id,
    tipo: aviso.tipo,
    titulo: aviso.titulo,
    corpo: aviso.titulo,
    payload: { topic: ev.topic, resource: ev.resource },
  }));
  if (linhas.length) await admin.from("notifications").insert(linhas);
}

export function adminClient(url: string, key: string) {
  return createClient(url, key);
}
