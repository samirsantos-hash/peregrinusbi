// ml-notificacoes
// Recebe as notificações (webhooks) do Mercado Livre e guarda cada aviso.
// O ML exige resposta 200 rápida; o processamento acontece depois.
// verify_jwt: FALSE (o ML não envia token). Valida o application_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const TOPICOS = new Set([
  "orders_v2", "orders", "items", "questions", "payments", "shipments",
  "messages", "claims", "item_competition", "price_suggestion",
  "stock-locations", "fbm_stock_operations", "public_offers", "public_candidates",
]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  let body: any = null;
  try { body = await req.json(); } catch { return new Response("invalid", { status: 400 }); }

  const topic = typeof body?.topic === "string" ? body.topic.slice(0, 60) : "";
  const resource = typeof body?.resource === "string" ? body.resource.slice(0, 300) : "";
  if (!topic || !resource) return new Response("invalid", { status: 400 });

  const clientId = requireEnv("ML_CLIENT_ID");
  if (body?.application_id != null && String(body.application_id) !== clientId) {
    return new Response("forbidden", { status: 403 });
  }

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const linha = {
    topic: TOPICOS.has(topic) ? topic : `outro:${topic}`,
    resource,
    ml_user_id: Number.isFinite(Number(body.user_id)) ? Number(body.user_id) : null,
    application_id: Number.isFinite(Number(body.application_id)) ? Number(body.application_id) : null,
    attempts: Number.isFinite(Number(body.attempts)) ? Number(body.attempts) : null,
    enviado_em: typeof body.sent === "string" ? body.sent : null,
    payload: body,
  };

  // Grava em segundo plano para responder dentro do prazo do ML.
  const tarefa = admin.from("ml_notificacoes").insert(linha).then(({ error }) => {
    if (error) console.error("ml-notificacoes insert", error.message);
  });
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil?.(tarefa) ?? (await tarefa);

  return new Response("ok", { status: 200 });
});
