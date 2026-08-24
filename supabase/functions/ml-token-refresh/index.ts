// ml-token-refresh
// Renova tokens PROATIVAMENTE (antes de expirar), acionada por cron.
// Refresh token do ML é de USO ÚNICO -> lock por conta evita corrida.
// verify_jwt: FALSE. Protegida por segredo compartilhado no header.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;
  const TRIGGER_SECRET = Deno.env.get("REFRESH_TRIGGER_SECRET")!;

  // 1. Só o cron (que conhece o segredo) pode disparar
  const provided = req.headers.get("x-refresh-secret") ?? "";
  if (!TRIGGER_SECRET || provided.length !== TRIGGER_SECRET.length) {
    return new Response("forbidden", { status: 403 });
  }
  let diff = 0;
  for (let i = 0; i < TRIGGER_SECRET.length; i++) {
    diff |= provided.charCodeAt(i) ^ TRIGGER_SECRET.charCodeAt(i);
  }
  if (diff !== 0) {
    return new Response("forbidden", { status: 403 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 2. Tokens correntes que expiram em menos de 45 min
  const threshold = new Date(Date.now() + 45 * 60 * 1000).toISOString();
  const { data: due, error: dueErr } = await admin
    .from("ml_tokens")
    .select("account_id, refresh_token, expires_at")
    .eq("is_current", true)
    .lt("expires_at", threshold);

  if (dueErr) {
    return new Response(JSON.stringify({ error: dueErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results: unknown[] = [];

  for (const row of due ?? []) {
    // 3. Tenta o lock da conta; se já travada, pula (outra invocação cuida)
    const { data: got } = await admin.rpc("ml_claim_refresh", { p_account_id: row.account_id });
    if (!got) {
      results.push({ account: row.account_id, skipped: "locked" });
      continue;
    }

    try {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: row.refresh_token,
      });

      const res = await fetch(ML_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body,
      });
      const tok = await res.json();

      if (!res.ok) {
        // invalid_grant = refresh token morto -> conta precisa reautorizar.
        // NÃO retentar em loop (a doc é clara: só o último refresh vale).
        if (tok.error === "invalid_grant") {
          await admin.from("ml_accounts")
            .update({ status: "reauth_required" })
            .eq("id", row.account_id);
        }
        results.push({ account: row.account_id, error: tok.error ?? "refresh_failed" });
      } else {
        const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();
        await admin.rpc("ml_store_token", {
          p_account_id: row.account_id,
          p_access: tok.access_token,
          p_refresh: tok.refresh_token,
          p_scope: tok.scope ?? null,
          p_expires_at: expiresAt,
        });
        results.push({ account: row.account_id, ok: true });
      }
    } catch (e) {
      results.push({ account: row.account_id, error: String((e as Error).message ?? e) });
    } finally {
      // 4. Libera o lock sempre, mesmo em erro
      await admin.rpc("ml_release_refresh", { p_account_id: row.account_id });
    }
  }

  return new Response(JSON.stringify({ processed: results }), {
    headers: { "Content-Type": "application/json" },
  });
});
