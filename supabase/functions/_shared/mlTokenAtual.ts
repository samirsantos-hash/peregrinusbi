// Devolve o acesso atual da loja; se venceu ou vence em até 5 min, renova na hora
// (mesmo lock por conta da ml-token-refresh, pois o refresh token do ML é de uso único).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type Tok = { access_token: string; expires_at: string };
const MARGEM_MS = 5 * 60 * 1000;

async function ler(admin: SupabaseClient, accountId: string) {
  const { data } = await admin.from("ml_tokens").select("access_token, expires_at, refresh_token")
    .eq("account_id", accountId).eq("is_current", true).maybeSingle();
  return data as (Tok & { refresh_token: string }) | null;
}

export async function tokenAtual(admin: SupabaseClient, accountId: string): Promise<Tok | null> {
  let tok = await ler(admin, accountId);
  if (!tok?.access_token) return null;
  if (Date.parse(tok.expires_at) - Date.now() > MARGEM_MS) return tok;

  const { data: got } = await admin.rpc("ml_claim_refresh", { p_account_id: accountId });
  if (!got) {
    // Outra rotina está renovando: espera e relê.
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      tok = await ler(admin, accountId);
      if (tok && Date.parse(tok.expires_at) > Date.now()) return tok;
    }
    return null;
  }
  try {
    tok = await ler(admin, accountId); // pode ter sido renovado enquanto pegávamos o lock
    if (tok && Date.parse(tok.expires_at) - Date.now() > MARGEM_MS) return tok;
    if (!tok?.refresh_token) return null;
    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: Deno.env.get("ML_CLIENT_ID") ?? "",
        client_secret: Deno.env.get("ML_CLIENT_SECRET") ?? "",
        refresh_token: tok.refresh_token,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const novo = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (novo.error === "invalid_grant") {
        await admin.from("ml_accounts").update({ status: "reauth_required" }).eq("id", accountId);
      }
      return Date.parse(tok.expires_at) > Date.now() ? tok : null;
    }
    const expiresAt = new Date(Date.now() + novo.expires_in * 1000).toISOString();
    await admin.rpc("ml_store_token", {
      p_account_id: accountId, p_access: novo.access_token, p_refresh: novo.refresh_token,
      p_scope: novo.scope ?? null, p_expires_at: expiresAt,
    });
    return { access_token: novo.access_token, expires_at: expiresAt };
  } catch {
    return tok && Date.parse(tok.expires_at) > Date.now() ? tok : null;
  } finally {
    await admin.rpc("ml_release_refresh", { p_account_id: accountId });
  }
}
