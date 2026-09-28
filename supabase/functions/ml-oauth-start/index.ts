// ml-oauth-start
// Gera a URL de autorização do Mercado Livre e grava o state em ml_oauth_states.
// Exige JWT; só super_admin conecta contas. PKCE desligado no app do ML.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireEnv } from "../_shared/env.ts";

// ATENÇÃO: autorização usa "mercadolivre.com.br", token usa "mercadolibre.com".
const AUTH_URL = "https://auth.mercadolivre.com.br/authorization";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const gerarState = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); // 96 chars
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "use POST" }, 405);

  const SUPABASE_URL = requireEnv("SUPABASE_URL");
  const ANON = requireEnv("SUPABASE_ANON_KEY");
  const SERVICE_ROLE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const CLIENT_ID = requireEnv("ML_CLIENT_ID");
  const REDIRECT_URI =
    Deno.env.get("ML_REDIRECT_URI") ?? `${SUPABASE_URL}/functions/v1/ml-oauth-callback`;

  let corpo: Record<string, unknown> = {};
  try {
    corpo = (await req.json()) as Record<string, unknown>;
  } catch {
    corpo = {};
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const montarUrl = (state: string) => {
    const url = new URL(AUTH_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("state", state);
    return url.toString();
  };

  // Fluxo público por convite: o lojista não tem login no painel.
  // O token do convite é a credencial; uso único e com validade.
  if (corpo.convite != null) {
    const token = String(corpo.convite);
    if (!/^[0-9a-f]{40,128}$/i.test(token)) return json({ error: "convite inválido" }, 400);
    const { data: conv } = await admin
      .from("ml_convites")
      .select("token, tenant_id, criado_por, rotulo, expires_at, usado_em")
      .eq("token", token)
      .maybeSingle();
    if (!conv) return json({ error: "convite não encontrado" }, 404);
    if (conv.usado_em) return json({ error: "este convite já foi usado", usado: true }, 410);
    if (new Date(conv.expires_at).getTime() <= Date.now()) return json({ error: "convite expirado" }, 410);
    if (corpo.apenas_consultar) return json({ rotulo: conv.rotulo, expira_em: conv.expires_at });

    const state = gerarState();
    const { error } = await admin.from("ml_oauth_states").insert({
      state,
      tenant_id: conv.tenant_id,
      usuario_id: conv.criado_por,
      convite_token: conv.token,
    });
    if (error) return json({ error: "falha ao registrar o pedido de autorização" }, 500);
    return json({ url: montarUrl(state) });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: claims, error: errClaims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (errClaims || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = String(claims.claims.sub);

  const { data: ehSuper } = await admin.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!ehSuper) return json({ error: "apenas super_admin pode conectar contas" }, 403);

  // Nunca confie no body: o tenant é resolvido/validado no servidor.
  const pedido = corpo.tenant_id == null ? null : String(corpo.tenant_id);
  let tenantId: string | null = null;
  if (pedido && /^[0-9a-f-]{36}$/i.test(pedido)) {
    const { data } = await admin.from("tenants").select("id").eq("id", pedido).maybeSingle();
    tenantId = data?.id ?? null;
  } else {
    const { data } = await admin.from("tenants").select("id").order("created_at").limit(1).maybeSingle();
    tenantId = data?.id ?? null;
  }
  if (!tenantId) return json({ error: "tenant não encontrado" }, 404);

  // Gera convite Peregrinus para enviar ao lojista (válido 7 dias, uso único).
  if (corpo.criar_convite) {
    const rotulo = corpo.rotulo == null ? null : String(corpo.rotulo).trim().slice(0, 80) || null;
    const token = gerarState();
    const { data: conv, error } = await admin
      .from("ml_convites")
      .insert({ token, tenant_id: tenantId, criado_por: userId, rotulo })
      .select("token, expires_at")
      .single();
    if (error || !conv) return json({ error: "falha ao criar o convite" }, 500);
    return json({ token: conv.token, expira_em: conv.expires_at });
  }

  const sellerBruto = corpo.seller_id == null ? null : String(corpo.seller_id);
  const seller_id = sellerBruto && /^[0-9a-f-]{36}$/i.test(sellerBruto) ? sellerBruto : null;

  const state = gerarState();
  const { error: errState } = await admin.from("ml_oauth_states").insert({
    state,
    tenant_id: tenantId,
    usuario_id: userId,
    seller_id,
  });
  if (errState) return json({ error: "falha ao registrar o pedido de autorização" }, 500);

  return json({ url: montarUrl(state), expira_em_min: 10 });
});
