// ml-oauth-start
// Gera a URL de autorização do Mercado Livre com um state assinado.
// Exige JWT de um super_admin — só quem carrega dados conecta contas.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { assinarState } from "../_shared/mlOauthState.ts";

const AUTH_URL: Record<string, string> = {
  MLB: "https://auth.mercadolivre.com.br/authorization",
  MLA: "https://auth.mercadolibre.com.ar/authorization",
  MLM: "https://auth.mercadolibre.com.mx/authorization",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "use POST" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
  const STATE_SECRET = Deno.env.get("REFRESH_TRIGGER_SECRET")!;

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

  const site_id = String(corpo.site_id ?? "MLB").toUpperCase();
  if (!AUTH_URL[site_id]) return json({ error: `site_id não suportado: ${site_id}` }, 400);

  const tenant_id = String(corpo.tenant_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(tenant_id)) return json({ error: "tenant_id (uuid) obrigatório" }, 400);
  const { data: tenant } = await admin.from("tenants").select("id").eq("id", tenant_id).maybeSingle();
  if (!tenant) return json({ error: "tenant não encontrado" }, 404);

  // Retorno pós-conexão: só caminho relativo, nunca origem externa
  const bruto = corpo.redirect == null ? null : String(corpo.redirect);
  const redirect = bruto && /^\/[A-Za-z0-9\-_/?=&.]*$/.test(bruto) ? bruto : null;

  const state = await assinarState(
    { tenant_id, site_id, redirect, exp: Date.now() + 10 * 60 * 1000, nonce: crypto.randomUUID() },
    STATE_SECRET,
  );

  const url = new URL(AUTH_URL[site_id]);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", `${SUPABASE_URL}/functions/v1/ml-oauth-callback`);
  url.searchParams.set("state", state);

  return json({ authorize_url: url.toString(), expira_em_min: 10 });
});
