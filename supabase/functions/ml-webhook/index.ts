// ml-webhook
// URL no DevCenter: https://<project>.supabase.co/functions/v1/ml-webhook
// Pública (verify_jwt = false). O Mercado Livre não envia JWT.
//
// Contrato
// Entrada: POST JSON no formato oficial de notificação
//   { resource, user_id, topic, application_id, attempts, sent, _id? }
// Saída:
//   200 "ok" — aviso aceito (ou ignorado de propósito) em menos de 500 ms
//   400 "invalid" — corpo sem tópico, recurso, application_id ou user_id
//   405 — qualquer método que não seja POST
// Erros do ML na busca do recurso ficam em ml_webhook_events (status, erro, codigo_ml),
// nunca no HTTP de volta, para o tópico não ser desativado.
//
// ml-notificacoes continua no ar só como histórico. Esta é a URL que deve ficar no DevCenter.

import { requireEnv } from "../_shared/env.ts";
import { aplicacaoConfere, jsonMl, lerAviso, topicoAceito } from "../_shared/mlGestao.ts";
import { adminClient, persistirEProcessar } from "../_shared/mlProcessarAviso.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("use POST", { status: 405 });

  const bruto = await req.text();
  let body: unknown;
  try {
    body = jsonMl(bruto);
  } catch {
    return new Response("invalid", { status: 400 });
  }

  const lido = lerAviso(body);
  if (!lido.ok) return new Response("invalid", { status: 400 });

  const clientId = requireEnv("ML_CLIENT_ID");
  if (!aplicacaoConfere(lido.aviso.applicationId, clientId) || !topicoAceito(lido.aviso.topic)) {
    return new Response("ok", { status: 200 });
  }

  const admin = adminClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const tarefa = persistirEProcessar(admin, lido.aviso, body).catch((error) => {
    console.error("ml-webhook", error instanceof Error ? error.message : "falha");
  });
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void } }).EdgeRuntime;
  if (runtime) runtime.waitUntil(tarefa);

  return new Response("ok", { status: 200 });
});
