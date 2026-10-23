import { tokenAtual } from "../_shared/mlTokenAtual.ts";
// ml-webhook-reconcile
// Recupera notificações que o Mercado Livre já desistiu de entregar.
// Documentação: GET /missed_feeds?app_id={APP_ID}. O histórico dura 2 dias.
// O tópico items exige site_id. Os demais não.
//
// Contrato
// Entrada: POST com header x-refresh-secret (o mesmo REFRESH_TRIGGER_SECRET do cron).
//   Corpo opcional: { account_id?: uuid }
// Saída 200:
//   { contas: [{ account_id, ml_user_id, novas, duplicadas, erros }] }
// Erros:
//   401 segredo ausente ou diferente
//   405 método diferente de POST
// Não devolve token nem o corpo cru das notificações.

import { requireEnv } from "../_shared/env.ts";
import { buscarMl } from "../_shared/mlHttp.ts";
import { aplicacaoConfere, lerAviso, segredoConfere, topicoAceito, TOPICOS_GESTAO } from "../_shared/mlGestao.ts";
import { adminClient, persistirEProcessar } from "../_shared/mlProcessarAviso.ts";

const API = "https://api.mercadolibre.com";
const LIMITE = 50;
const TETO = 500;

type Conta = { id: string; ml_user_id: number; site_id: string | null };

async function pagina(
  token: string,
  appId: string,
  extra: string,
) {
  const achados: unknown[] = [];
  for (let offset = 0; offset < TETO; offset += LIMITE) {
    const url = `${API}/missed_feeds?app_id=${encodeURIComponent(appId)}&limit=${LIMITE}&offset=${offset}${extra}`;
    const resposta = await buscarMl(url, token);
    if (!resposta.ok) return { ok: false as const, erro: resposta.erro, codigo: resposta.codigo, achados };
    const messages = (resposta.json as { messages?: unknown[] } | null)?.messages;
    const lista = Array.isArray(messages) ? messages : [];
    achados.push(...lista);
    if (lista.length < LIMITE) break;
  }
  return { ok: true as const, achados };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("use POST", { status: 405 });
  if (!segredoConfere(req.headers.get("x-refresh-secret") ?? "", requireEnv("REFRESH_TRIGGER_SECRET"))) {
    return new Response("forbidden", { status: 401 });
  }

  const admin = adminClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const appId = requireEnv("ML_CLIENT_ID");
  const body = await req.json().catch(() => ({})) as { account_id?: string };

  let q = admin.from("ml_accounts").select("id, ml_user_id, site_id").eq("status", "active");
  if (body.account_id) q = q.eq("id", body.account_id);
  const { data: contas, error } = await q;
  if (error) return Response.json({ error: "Não foi possível listar as contas." }, { status: 500 });

  const resumo: unknown[] = [];
  for (const conta of (contas ?? []) as Conta[]) {
    const { data: tok } = await admin
      .from("ml_tokens")
      .select("access_token, expires_at")
      .eq("account_id", conta.id)
      .eq("is_current", true)
      .maybeSingle();
    if (!tok?.access_token || Date.parse(tok.expires_at) <= Date.now()) {
      resumo.push({ account_id: conta.id, ml_user_id: conta.ml_user_id, novas: 0, duplicadas: 0, erros: ["autorização vencida"] });
      continue;
    }

    const consultas = [pagina(tok.access_token, appId, "")];
    for (const topic of TOPICOS_GESTAO) {
      if (topic === "items") {
        consultas.push(pagina(tok.access_token, appId, `&topic=items&site_id=${encodeURIComponent(conta.site_id || "MLB")}`));
      } else {
        consultas.push(pagina(tok.access_token, appId, `&topic=${topic}`));
      }
    }

    let novas = 0;
    let duplicadas = 0;
    const erros: string[] = [];
    const vistos = new Set<string>();
    for (const lote of await Promise.all(consultas)) {
      if (!lote.ok && lote.erro) erros.push(lote.erro);
      for (const item of lote.achados) {
        const lido = lerAviso(item);
        if (!lido.ok || !topicoAceito(lido.aviso.topic) || lido.aviso.userId !== Number(conta.ml_user_id)) continue;
        if (!aplicacaoConfere(lido.aviso.applicationId, appId)) continue;
        const marca = `${lido.aviso.topic}:${lido.aviso.resource}:${lido.aviso.sent ?? ""}`;
        if (vistos.has(marca)) continue;
        vistos.add(marca);
        try {
          const r = await persistirEProcessar(admin, lido.aviso, item);
          if (r === "novo") novas += 1;
          else duplicadas += 1;
        } catch (e) {
          erros.push(e instanceof Error ? e.message : "falha ao gravar");
        }
      }
    }
    resumo.push({ account_id: conta.id, ml_user_id: conta.ml_user_id, novas, duplicadas, erros });
  }

  return Response.json({ contas: resumo });
});
