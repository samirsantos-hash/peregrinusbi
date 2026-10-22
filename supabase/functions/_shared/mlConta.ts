import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "./env.ts";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-refresh-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

export type Conta = { id: string; ml_user_id: number; site_id: string; nickname: string | null };

/** Login + acesso à conta pelo mesmo critério da RLS (ml_pode_gerir_conta). */
export async function exigirGestor(
  req: Request,
  accountId: unknown,
): Promise<{ ok: true; userId: string } | { ok: false; res: Response }> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return { ok: false, res: resposta({ error: "Faça login." }, 401) };
  const cliente = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await cliente.auth.getUser();
  if (error || !data.user) return { ok: false, res: resposta({ error: "Faça login." }, 401) };
  if (typeof accountId !== "string" || !accountId) return { ok: false, res: resposta({ error: "Informe account_id." }, 400) };
  const { data: pode } = await cliente.rpc("ml_pode_gerir_conta", { p_account_id: accountId });
  if (!pode) return { ok: false, res: resposta({ error: "Você não gerencia esta conta." }, 403) };
  return { ok: true, userId: data.user.id };
}

export async function contaComToken(
  admin: SupabaseClient,
  accountId: string,
): Promise<{ ok: true; conta: Conta; token: string } | { ok: false; erro: string }> {
  const { data: conta } = await admin.from("ml_accounts").select("id, ml_user_id, site_id, nickname, status")
    .eq("id", accountId).maybeSingle();
  if (!conta || conta.status !== "active") return { ok: false, erro: "Conta do Mercado Livre não conectada." };
  const { data: tok } = await admin.from("ml_tokens").select("access_token, expires_at")
    .eq("account_id", accountId).eq("is_current", true).maybeSingle();
  if (!tok?.access_token || Date.parse(tok.expires_at) <= Date.now()) {
    return { ok: false, erro: "A autorização da conta expirou. Conecte de novo." };
  }
  return { ok: true, conta: conta as Conta, token: tok.access_token as string };
}
