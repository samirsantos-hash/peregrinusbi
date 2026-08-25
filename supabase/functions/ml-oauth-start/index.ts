// ml-oauth-start
// Gera a URL de autorização do Mercado Livre e grava o state em ml_oauth_states.
// Exige JWT; só super_admin conecta contas. PKCE desligado no app do ML.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
  const REDIRECT_URI =
    Deno.env.get("ML_REDIRECT_URI") ?? `${SUPABASE_URL}/functions/v1/ml-oauth-callback`;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: claims, error: errClaims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (errClaims || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = String(claims.claims.sub);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: ehSuper } = await admin.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!ehSuper) return json({ error: "apenas super_admin pode conectar contas" }, 403);

  let corpo: Record<string, unknown> = {};
  try {
    corpo = (await req.json()) as Record<string, unknown>;
  } catch {
    corpo = {};
  }

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

  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("state", state);

  return json({ url: url.toString(), expira_em_min: 10 });
});
