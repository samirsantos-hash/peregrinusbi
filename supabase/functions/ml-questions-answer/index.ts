// ml-questions-answer
// Responde uma pergunta do comprador no Mercado Livre em duas etapas: prévia e confirmação.
//
// Contrato
// POST JWT de quem gerencia a conta (ml_pode_gerir_conta).
//   { account_id: uuid, question_id: number, texto: string (1–2000), idempotency_key: string, etapa: "previa" | "confirmar" }
// 200 previa     { etapa: "previa", idempotency_key, antes: { status, resposta, pergunta, item_id }, depois: { status, resposta } }
// 200 confirmar  { etapa: "confirmar", status: "respondida" | "ja_feito", pergunta }
// 400 dados inválidos · 401 sem login · 403 conta ou pergunta de outra pessoa
// 409 já respondida, pergunta mudou no ML desde a prévia, texto mudou, envio em andamento ou prévia ausente
// 422 o ML recusou (mensagem em português e codigo_ml original) · 502 o ML não respondeu
//
// Mesma idempotency_key confirmada duas vezes não envia de novo. Toda confirmação grava ml_audit_log.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { buscarMl, enviarMl } from "../_shared/mlHttp.ts";
import { decidirIdempotencia } from "../_shared/mlGestao.ts";
import { contaComToken, cors, exigirGestor, resposta } from "../_shared/mlConta.ts";
import { estadoPergunta, lerPergunta, motivoSemResposta, type PerguntaLinha, validarResposta } from "../_shared/mlPerguntas.ts";
import { gravarPerguntas } from "../_shared/mlPerguntasDb.ts";

const API = "https://api.mercadolibre.com";
const ACAO = "pergunta.responder";

async function lerNoMl(token: string, questionId: number) {
  const r = await buscarMl(`${API}/questions/${questionId}?api_version=4`, token);
  if (!r.ok) return { ok: false as const, status: r.status, erro: r.erro, codigo: r.codigo };
  const p = lerPergunta(r.json);
  if (!p) return { ok: false as const, status: 502, erro: "Resposta do Mercado Livre sem a pergunta.", codigo: null };
  return { ok: true as const, pergunta: p };
}

async function auditar(admin: SupabaseClient, userId: string, accountId: string, payload: unknown, respostaMl: unknown, codigo: string | null) {
  await admin.from("ml_audit_log").insert({ usuario_id: userId, account_id: accountId, acao: ACAO, payload, resposta_ml: respostaMl, codigo_ml: codigo });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return resposta({ error: "use POST" }, 405);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return resposta({ error: "Corpo inválido." }, 400);
  const acesso = await exigirGestor(req, body.account_id);
  if (!acesso.ok) return acesso.res;
  const accountId = body.account_id as string;
  const userId = acesso.userId;

  const questionId = Number(body.question_id);
  if (!Number.isSafeInteger(questionId) || questionId <= 0) return resposta({ error: "Pergunta inválida." }, 400);
  const chave = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";
  if (chave.length < 8 || chave.length > 100) return resposta({ error: "Chave de envio inválida." }, 400);
  const etapa = body.etapa;
  if (etapa !== "previa" && etapa !== "confirmar") return resposta({ error: "Etapa deve ser previa ou confirmar." }, 400);
  const valido = validarResposta(body.texto);
  if (!valido.ok) return resposta({ error: valido.erro }, 400);
  const texto = valido.texto;

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const alvo = await contaComToken(admin, accountId);
  if (!alvo.ok) return resposta({ error: alvo.erro }, 409);
  const { conta, token } = alvo;

  const atual = await lerNoMl(token, questionId);
  if (!atual.ok) return resposta({ error: atual.erro, codigo_ml: atual.codigo }, atual.status === 404 ? 404 : 502);
  if (atual.pergunta.seller_id !== null && atual.pergunta.seller_id !== Number(conta.ml_user_id)) {
    return resposta({ error: "Esta pergunta não é desta conta." }, 403);
  }
  await gravarPerguntas(admin, accountId, [atual.pergunta]);
  const hashAtual = estadoPergunta(atual.pergunta);

  const { data: existente } = await admin.from("ml_action_requests")
    .select("id, acao, status, payload, depois, estado_ml_hash")
    .eq("account_id", accountId).eq("usuario_id", userId).eq("idempotency_key", chave).maybeSingle();
  const payloadExistente = existente?.payload as { question_id?: number; texto?: string } | null;
  if (existente && (existente.acao !== ACAO || payloadExistente?.question_id !== questionId)) {
    return resposta({ error: "Esta chave de envio já foi usada em outra ação." }, 409);
  }
  if (existente?.status === "committed") {
    return resposta({ etapa: "confirmar", status: "ja_feito", pergunta: atual.pergunta });
  }
  if (existente?.status === "processing") return resposta({ error: "O envio desta resposta já está em andamento." }, 409);

  if (etapa === "previa") {
    const motivo = motivoSemResposta(atual.pergunta.status);
    if (motivo) return resposta({ error: motivo }, 409);
    const antes = { status: atual.pergunta.status, resposta: atual.pergunta.resposta_texto, pergunta: atual.pergunta.texto, item_id: atual.pergunta.item_id };
    const depois = { status: "ANSWERED", resposta: texto };
    const { error } = await admin.from("ml_action_requests").upsert({
      account_id: accountId,
      usuario_id: userId,
      acao: ACAO,
      idempotency_key: chave,
      status: "preview",
      antes,
      depois,
      payload: { question_id: questionId, texto },
      estado_ml_hash: hashAtual,
      erro: null,
      codigo_ml: null,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "account_id,usuario_id,idempotency_key" });
    if (error) return resposta({ error: "Não foi possível registrar a prévia." }, 500);
    return resposta({ etapa: "previa", idempotency_key: chave, antes, depois });
  }

  if (!existente) return resposta({ error: "Gere a prévia antes de enviar." }, 409);
  if (payloadExistente?.texto !== texto) return resposta({ error: "O texto mudou desde a prévia. Revise de novo." }, 409);

  const decisao = decidirIdempotencia({ status: existente.status, estadoHash: existente.estado_ml_hash }, hashAtual);
  if (decisao === "conflito") {
    await admin.from("ml_action_requests").update({ status: "conflict", atualizado_em: new Date().toISOString() }).eq("id", existente.id);
    return resposta({ error: "A pergunta mudou no Mercado Livre desde a prévia. Atualize e revise." }, 409);
  }

  const { data: reservado } = await admin.from("ml_action_requests")
    .update({ status: "processing", atualizado_em: new Date().toISOString() })
    .eq("id", existente.id).in("status", ["preview", "failed"]).select("id").maybeSingle();
  if (!reservado) return resposta({ error: "O envio desta resposta já está em andamento." }, 409);

  const payload = { question_id: questionId, text: texto };
  let envio = await enviarMl("POST", `${API}/answers`, token, payload);
  let final: PerguntaLinha | null = envio.ok ? lerPergunta(envio.json) : null;

  if (!envio.ok && envio.incerto) {
    const relida = await lerNoMl(token, questionId);
    if (relida.ok && relida.pergunta.status === "ANSWERED" && relida.pergunta.resposta_texto?.trim() === texto) {
      envio = { ok: true, status: 200, json: { relida: true } };
      final = relida.pergunta;
    }
  }

  if (!envio.ok) {
    await admin.from("ml_action_requests").update({
      status: "failed",
      resposta_ml: { status: envio.status },
      codigo_ml: envio.codigo,
      erro: envio.erro,
      atualizado_em: new Date().toISOString(),
    }).eq("id", existente.id);
    await auditar(admin, userId, accountId, payload, { status: envio.status, erro: envio.erro }, envio.codigo);
    return resposta({ error: envio.erro, codigo_ml: envio.codigo }, envio.incerto ? 502 : 422);
  }

  if (!final) {
    const relida = await lerNoMl(token, questionId);
    final = relida.ok ? relida.pergunta : { ...atual.pergunta, status: "ANSWERED", resposta_texto: texto };
  }
  await gravarPerguntas(admin, accountId, [final]);
  await admin.from("ml_questions").update({ respondida_por: userId }).eq("question_id", questionId);
  await admin.from("ml_action_requests").update({
    status: "committed",
    resposta_ml: envio.json,
    erro: null,
    codigo_ml: null,
    atualizado_em: new Date().toISOString(),
  }).eq("id", existente.id);
  await auditar(admin, userId, accountId, payload, envio.json, null);

  return resposta({ etapa: "confirmar", status: "respondida", pergunta: final });
});
