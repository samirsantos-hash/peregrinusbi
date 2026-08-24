// ml-oauth-callback
// Redirect URI registrado no app do Mercado Livre:
//   https://<project>.supabase.co/functions/v1/ml-oauth-callback
// Recebe o ?code do ML (navegador), troca por tokens e cadastra a conta.
// Público por natureza (verify_jwt = false) — a proteção é o state assinado
// emitido pela ml-oauth-start, com validade de 10 minutos e uso de sessão.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lerState } from "../_shared/mlOauthState.ts";

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const ML_ME_URL = "https://api.mercadolibre.com/users/me";

const pagina = (titulo: string, mensagem: string, ok: boolean, voltar: string | null) =>
  new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1220;color:#e6edf7;
font:15px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.card{max-width:420px;padding:28px;border:1px solid #1e2a44;border-radius:14px;background:#101a2e}
h1{margin:0 0 10px;font-size:17px;color:${ok ? "#4ade80" : "#f87171"}}
p{margin:0;color:#9fb0cc}
a{display:inline-block;margin-top:18px;color:#60a5fa;text-decoration:none;font-size:13px}
</style></head><body><div class="card"><h1>${titulo}</h1><p>${mensagem}</p>
${voltar ? `<a href="${voltar}">Voltar ao painel</a>` : ""}</div></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;
  const STATE_SECRET = Deno.env.get("REFRESH_TRIGGER_SECRET")!;

  const url = new URL(req.url);
  const erroML = url.searchParams.get("error");
  if (erroML) {
    return pagina("Autorização recusada", `O Mercado Livre retornou: ${erroML}`, false, null);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return pagina("Requisição inválida", "Faltam os parâmetros code/state do Mercado Livre.", false, null);
  }

  const p = await lerState(state, STATE_SECRET);
  if (!p) {
    return pagina(
      "Sessão de autorização inválida",
      "O link expirou ou não foi iniciado por este painel. Comece a conexão novamente.",
      false,
      null,
    );
  }

  try {
    const res = await fetch(ML_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: `${SUPABASE_URL}/functions/v1/ml-oauth-callback`,
      }),
    });
    const tok = await res.json();
    if (!res.ok) {
      return pagina("Falha na troca do código", `Mercado Livre: ${tok.error ?? res.status}`, false, p.redirect);
    }

    const me = await fetch(ML_ME_URL, {
      headers: { Authorization: `Bearer ${tok.access_token}`, Accept: "application/json" },
    });
    const perfil = me.ok ? await me.json() : {};
    const mlUserId = Number(tok.user_id ?? perfil.id);
    if (!Number.isFinite(mlUserId)) {
      return pagina("Conta não identificada", "Não foi possível ler o usuário do Mercado Livre.", false, p.redirect);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: conta, error: errConta } = await admin
      .from("ml_accounts")
      .upsert(
        {
          tenant_id: p.tenant_id,
          ml_user_id: mlUserId,
          nickname: perfil.nickname ?? null,
          site_id: perfil.site_id ?? p.site_id,
          status: "active",
        },
        { onConflict: "ml_user_id" },
      )
      .select("id, nickname")
      .single();
    if (errConta) throw new Error(errConta.message);

    const expiresAt = new Date(Date.now() + Number(tok.expires_in ?? 21600) * 1000).toISOString();
    const { error: errTok } = await admin.rpc("ml_store_token", {
      p_account_id: conta.id,
      p_access: tok.access_token,
      p_refresh: tok.refresh_token,
      p_scope: tok.scope ?? null,
      p_expires_at: expiresAt,
    });
    if (errTok) throw new Error(errTok.message);

    return pagina(
      "Conta conectada",
      `${conta.nickname ?? mlUserId} autorizada com sucesso. A renovação de token passa a ser automática.`,
      true,
      p.redirect,
    );
  } catch (e) {
    return pagina("Erro ao conectar", String((e as Error).message ?? e), false, p.redirect);
  }
});
