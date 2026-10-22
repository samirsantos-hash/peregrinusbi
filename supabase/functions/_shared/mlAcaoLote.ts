// Prévia → confirmação em lote, com chave de idempotência, reserva, resultado por item e auditoria.
//
// Contrato comum (POST com JWT de quem gerencia a conta):
//   previa     { account_id, etapa: "previa", idempotency_key, ...dados da ação }
//              → 200 { etapa: "previa", idempotency_key, linhas: LinhaPublica[] }
//   confirmar  { account_id, etapa: "confirmar", idempotency_key }
//              → 200 { etapa: "confirmar", status: "concluido" | "ja_feito", resultados: Resultado[] }
// A confirmação usa só o que foi gravado na prévia; o cliente não reenvia os dados.
// Cada linha relê o estado no ML e compara com o da prévia antes de escrever.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "./env.ts";
import { type Conta, contaComToken, cors, exigirGestor, resposta } from "./mlConta.ts";

const ORCAMENTO_MS = 110_000;

export type Contexto = { admin: SupabaseClient; conta: Conta; token: string; userId: string; accountId: string };

export type Linha = {
  chave: string;
  item_id: string | null;
  titulo: string | null;
  antes: string;
  depois: string;
  aviso?: string | null;
  bloqueio?: string | null;
  /** Estado do ML lido na prévia; a confirmação recusa se mudou. */
  hash: string;
  /** O que a confirmação precisa para executar. Não vai para o cliente. `acao_log` detalha a ação no ml_audit_log. */
  dados: Record<string, unknown>;
};

export type Resultado = {
  chave: string;
  item_id: string | null;
  status: "feito" | "ja_feito" | "conflito" | "recusado" | "bloqueado" | "nao_enviado";
  mensagem: string | null;
  codigo_ml?: string | null;
};

export type Execucao = {
  resultado: Resultado;
  /** Chamada enviada ao ML e resposta, para ml_audit_log. Ausente quando nada foi enviado. */
  auditoria?: { payload: unknown; resposta: unknown; codigo: string | null };
};

type Opcoes = {
  acao: string;
  previa: (ctx: Contexto, body: Record<string, unknown>) => Promise<{ ok: true; linhas: Linha[] } | { ok: false; erro: string; status: number }>;
  executar: (ctx: Contexto, linha: Linha) => Promise<Execucao>;
};

const publica = (l: Linha) => ({
  chave: l.chave,
  item_id: l.item_id,
  titulo: l.titulo,
  antes: l.antes,
  depois: l.depois,
  aviso: l.aviso ?? null,
  bloqueio: l.bloqueio ?? null,
});

export function servirAcaoEmLote(opcoes: Opcoes) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return resposta({ error: "use POST" }, 405);

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return resposta({ error: "Corpo inválido." }, 400);
    const acesso = await exigirGestor(req, body.account_id);
    if (!acesso.ok) return acesso.res;
    const accountId = body.account_id as string;
    const userId = acesso.userId;

    const chave = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";
    if (chave.length < 8 || chave.length > 100) return resposta({ error: "Chave de envio inválida." }, 400);
    const etapa = body.etapa;
    if (etapa !== "previa" && etapa !== "confirmar") return resposta({ error: "Etapa deve ser previa ou confirmar." }, 400);

    const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const alvo = await contaComToken(admin, accountId);
    if (!alvo.ok) return resposta({ error: alvo.erro }, 409);
    const ctx: Contexto = { admin, conta: alvo.conta, token: alvo.token, userId, accountId };

    const { data: existente } = await admin.from("ml_action_requests")
      .select("id, acao, status, antes, resposta_ml")
      .eq("account_id", accountId).eq("usuario_id", userId).eq("idempotency_key", chave).maybeSingle();
    if (existente && existente.acao !== opcoes.acao) return resposta({ error: "Esta chave de envio já foi usada em outra ação." }, 409);
    if (existente?.status === "committed") {
      const resultados = (existente.resposta_ml as { resultados?: Resultado[] } | null)?.resultados ?? [];
      return resposta({ etapa: "confirmar", status: "ja_feito", resultados });
    }
    if (existente?.status === "processing") return resposta({ error: "Este envio já está em andamento." }, 409);

    if (etapa === "previa") {
      if (existente) return resposta({ error: "Esta chave de envio já tem prévia. Gere outra prévia." }, 409);
      const p = await opcoes.previa(ctx, body);
      if (!p.ok) return resposta({ error: p.erro }, p.status);
      if (!p.linhas.length) return resposta({ error: "Nada para revisar." }, 400);
      const { error } = await admin.from("ml_action_requests").insert({
        account_id: accountId,
        usuario_id: userId,
        acao: opcoes.acao,
        idempotency_key: chave,
        status: "preview",
        antes: { linhas: p.linhas },
        depois: { linhas: p.linhas.map((l) => ({ chave: l.chave, depois: l.depois })) },
        payload: { itens: p.linhas.map((l) => l.chave) },
        estado_ml_hash: null,
      });
      if (error) return resposta({ error: "Não foi possível registrar a prévia." }, 500);
      return resposta({ etapa: "previa", idempotency_key: chave, linhas: p.linhas.map(publica) });
    }

    if (!existente) return resposta({ error: "Gere a prévia antes de confirmar." }, 409);
    const { data: reservado } = await admin.from("ml_action_requests")
      .update({ status: "processing", atualizado_em: new Date().toISOString() })
      .eq("id", existente.id).in("status", ["preview", "failed"]).select("id").maybeSingle();
    if (!reservado) return resposta({ error: "Este envio já está em andamento." }, 409);

    const linhas = ((existente.antes as { linhas?: Linha[] } | null)?.linhas ?? []);
    const inicio = Date.now();
    const resultados: Resultado[] = [];
    for (const linha of linhas) {
      if (linha.bloqueio) {
        resultados.push({ chave: linha.chave, item_id: linha.item_id, status: "bloqueado", mensagem: linha.bloqueio });
        continue;
      }
      if (Date.now() - inicio > ORCAMENTO_MS) {
        resultados.push({ chave: linha.chave, item_id: linha.item_id, status: "nao_enviado", mensagem: "Tempo esgotado antes deste item. Gere nova prévia para ele." });
        continue;
      }
      let ex: Execucao;
      try {
        ex = await opcoes.executar(ctx, linha);
      } catch (e) {
        console.error(opcoes.acao, linha.chave, e);
        ex = { resultado: { chave: linha.chave, item_id: linha.item_id, status: "recusado", mensagem: "Erro interno ao processar este item." } };
      }
      resultados.push(ex.resultado);
      if (ex.auditoria) {
        await admin.from("ml_audit_log").insert({
          usuario_id: userId,
          account_id: accountId,
          acao: typeof linha.dados.acao_log === "string" ? linha.dados.acao_log : opcoes.acao,
          payload: { item: linha.chave, chamada: ex.auditoria.payload, antes: linha.antes, depois: linha.depois },
          resposta_ml: ex.auditoria.resposta,
          codigo_ml: ex.auditoria.codigo,
        });
      }
    }

    const algumFeito = resultados.some((r) => r.status === "feito" || r.status === "ja_feito");
    await admin.from("ml_action_requests").update({
      status: algumFeito ? "committed" : "failed",
      resposta_ml: { resultados },
      erro: algumFeito ? null : resultados.find((r) => r.mensagem)?.mensagem ?? null,
      atualizado_em: new Date().toISOString(),
    }).eq("id", existente.id);

    return resposta({ etapa: "confirmar", status: "concluido", resultados });
  });
}
