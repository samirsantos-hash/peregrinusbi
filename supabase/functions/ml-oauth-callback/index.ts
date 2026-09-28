// ml-oauth-callback
// Redirect URI registrado no app do Mercado Livre:
//   https://<project>.supabase.co/functions/v1/ml-oauth-callback
// Público por natureza (o navegador do usuário chega aqui). A proteção é o
// state de uso único gravado em ml_oauth_states pela ml-oauth-start.
// NUNCA logar code, access_token, refresh_token ou client_secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

// ATENÇÃO: autorização é "mercadolivre.com.br"; token é "mercadolibre.com".
const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const ML_ME_URL = "https://api.mercadolibre.com/users/me";
const ML_REQUEST_TIMEOUT_MS = 10_000;

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const fetchMercadoLivre = (url: string, init: RequestInit) =>
  fetch(url, { ...init, signal: AbortSignal.timeout(ML_REQUEST_TIMEOUT_MS) });

Deno.serve(async (req) => {
  const SUPABASE_URL = requireEnv("SUPABASE_URL");
  const SERVICE_ROLE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const CLIENT_ID = requireEnv("ML_CLIENT_ID");
  const CLIENT_SECRET = requireEnv("ML_CLIENT_SECRET");
  const REDIRECT_URI =
    Deno.env.get("ML_REDIRECT_URI") ?? `${SUPABASE_URL}/functions/v1/ml-oauth-callback`;
  const APP_URL = (requireEnv("APP_URL")).replace(/\/+$/, "");

  const volta = (status: "ok" | "erro", msg?: string) => {
    const destino = new URL(`${APP_URL || SUPABASE_URL}/integracoes`);
    destino.searchParams.set("status", status);
    if (msg) destino.searchParams.set("msg", msg);
    return new Response(null, { status: 302, headers: { Location: destino.toString() } });
  };

  const url = new URL(req.url);
  // Só os NOMES dos parâmetros — `code` é credencial e nunca pode ser logado.
  console.log("callback params:", [...url.searchParams.keys()]);

  const erroML = url.searchParams.get("error");
  if (erroML) return volta("erro", `erro_ml_${erroML.replace(/[^a-z0-9_-]/gi, "")}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return volta("erro", "sem_code");
  if (!state) return volta("erro", "sem_state");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Valida primeiro, mas só consome depois que o Mercado Livre troca o code.
  // Assim, uma indisponibilidade externa não inutiliza o state antes da hora.
  const { data: stateInicial } = await admin
    .from("ml_oauth_states")
    .select("consumed_at, expires_at")
    .eq("state", state)
    .maybeSingle();
  if (!stateInicial) return volta("erro", "state_desconhecido");
  if (stateInicial.consumed_at) return volta("erro", "state_ja_usado");
  if (new Date(stateInicial.expires_at).getTime() <= Date.now()) return volta("erro", "state_expirado");


  try {
    const res = await fetchMercadoLivre(ML_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tok = await res.json();
    if (!res.ok) {
      // Só status e o campo `error` do ML — nunca o corpo inteiro (pode conter tokens).
      console.log("token exchange falhou:", res.status, String(tok?.error ?? "").slice(0, 40));
      return volta("erro", `token_${res.status}`);
    }

    // Consumo atômico depois da troca bem-sucedida; impede processamento duplo.
    const { data: st } = await admin
      .from("ml_oauth_states")
      .update({ consumed_at: new Date().toISOString() })
      .eq("state", state)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("tenant_id, usuario_id, seller_id")
      .maybeSingle();
    if (!st) return volta("erro", "state_ja_usado");


    const me = await fetchMercadoLivre(ML_ME_URL, {
      headers: { Authorization: `Bearer ${tok.access_token}`, Accept: "application/json" },
    });
    const perfil = me.ok ? await me.json() : {};
    const mlUserId = Number(tok.user_id ?? perfil.id);
    if (!Number.isFinite(mlUserId)) return volta("erro", "conta nao identificada");

    const { data: conta, error: errConta } = await admin
      .from("ml_accounts")
      .upsert(
        {
          tenant_id: st.tenant_id,
          ml_user_id: mlUserId,
          nickname: perfil.nickname ?? null,
          site_id: perfil.site_id ?? "MLB",
          status: "active",
        },
        { onConflict: "ml_user_id" },
      )
      .select("id")
      .single();
    if (errConta || !conta) return volta("erro", "falha ao cadastrar a conta");

    const expiresAt = new Date(Date.now() + Number(tok.expires_in ?? 21600) * 1000).toISOString();
    const { error: errTok } = await admin.rpc("ml_token_rotacionar", {
      p_account_id: conta.id,
      p_access: tok.access_token,
      p_refresh: tok.refresh_token,
      p_scope: tok.scope ?? null,
      p_expires_at: expiresAt,
    });
    if (errTok) return volta("erro", "falha ao gravar a autorizacao");

    // O histórico não faz parte da autorização: agenda em segundo plano para
    // que o navegador receba o redirect antes do limite do gateway.
    EdgeRuntime.waitUntil(
      admin
        .rpc("ml_agendar_backfill", { p_account_id: conta.id, p_meses: 12 })
        .then(({ error }) => {
          if (error) console.error("falha ao agendar backfill:", error.message);
        }),
    );

    return volta("ok");
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return volta("erro", "mercado livre demorou para responder");
    }
    return volta("erro", "erro inesperado ao conectar");
  }
});
