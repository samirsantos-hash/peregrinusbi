// ml-settings
// Lê e altera os parâmetros da conta. Não chama o Mercado Livre.
// Quem pode: super_admin, admin ou gerente, e só se o cust_id da conta
// estiver em user_access_control.allowed_cust_ids da pessoa.
//
// Contrato
// GET  /ml-settings?account_id=<uuid>
//   200 { account_id, meta_investimento_ads, acos_alvo, margem_minima,
//         alerta_acos, alerta_roas, alerta_ctr, alerta_cpc, alerta_tacos, atualizado_em }
// PATCH body { account_id, ...campos }
//   Frações entre 0 e 1: 3% = 0.03. acos_alvo e margem_minima aceitam null.
//   200 o mesmo objeto, já gravado
// Erros:
//   401 Faça login.
//   403 Você não gerencia esta conta.
//   404 Conta não encontrada.
//   400 { erros: string[] }
//   405 use GET ou PATCH

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { validarSettings } from "../_shared/mlGestao.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const COLUNAS = "account_id, meta_investimento_ads, acos_alvo, margem_minima, alerta_acos, alerta_roas, alerta_ctr, alerta_cpc, alerta_tacos, atualizado_em";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "PATCH") return json({ error: "use GET ou PATCH" }, 405);

  const url = requireEnv("SUPABASE_URL");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Faça login." }, 401);

  const userClient = createClient(url, requireEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Faça login." }, 401);

  const body = req.method === "PATCH" ? await req.json().catch(() => null) : null;
  const accountId = req.method === "GET"
    ? new URL(req.url).searchParams.get("account_id")
    : (body as { account_id?: string } | null)?.account_id;
  if (!accountId || !/^[0-9a-f-]{36}$/i.test(accountId)) return json({ error: "Informe account_id." }, 400);

  const { data: pode } = await userClient.rpc("ml_pode_gerir_conta", { p_account_id: accountId });
  if (!pode) return json({ error: "Você não gerencia esta conta." }, 403);

  const admin = createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: atual, error: errLeitura } = await admin.from("ml_settings").select(COLUNAS).eq("account_id", accountId).maybeSingle();
  if (errLeitura) return json({ error: "Não foi possível ler a configuração." }, 500);
  if (!atual) return json({ error: "Conta não encontrada." }, 404);

  if (req.method === "GET") return json(atual);

  const validado = validarSettings(body);
  if (!validado.ok) return json({ erros: validado.erros }, 400);
  if (!Object.keys(validado.valores).length) return json({ erros: ["Nenhum parâmetro para alterar."] }, 400);

  const { data: gravado, error: errGrava } = await admin
    .from("ml_settings")
    .update({ ...validado.valores, atualizado_em: new Date().toISOString(), atualizado_por: userData.user.id })
    .eq("account_id", accountId)
    .select(COLUNAS)
    .single();
  if (errGrava || !gravado) return json({ error: "Não foi possível gravar a configuração." }, 500);

  await admin.from("ml_audit_log").insert({
    usuario_id: userData.user.id,
    account_id: accountId,
    acao: "settings.atualizar",
    payload: { antes: atual, depois: gravado },
  });

  return json(gravado);
});
