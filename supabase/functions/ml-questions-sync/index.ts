// ml-questions-sync
// Lê as perguntas recebidas pela conta no Mercado Livre e grava em ml_questions. Não escreve no ML.
//
// Contrato
// POST header x-refresh-secret (cron, todas as contas) ou JWT de quem gerencia a conta.
//   Corpo: { account_id: uuid }  (obrigatório com JWT)
// 200 { contas: [{ account_id, sem_resposta, recentes, revistas, erro }] }
// 401 login ou segredo inválido · 403 a pessoa não gerencia a conta · 405 use POST
//
// Fonte: GET /questions/search?seller_id=…&api_version=4 (sem resposta, todas as páginas até 1.000,
// mais as 50 mais recentes de qualquer status). Perguntas que estavam sem resposta e sumiram
// da lista são relidas uma a uma em /questions/{id}.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { buscarMl } from "../_shared/mlHttp.ts";
import { segredoConfere } from "../_shared/mlGestao.ts";
import { contaComToken, cors, exigirGestor, resposta } from "../_shared/mlConta.ts";
import { lerListaPerguntas, lerPergunta, type PerguntaLinha } from "../_shared/mlPerguntas.ts";
import { completarAnuncios, gravarPerguntas } from "../_shared/mlPerguntasDb.ts";

const API = "https://api.mercadolibre.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return resposta({ error: "use POST" }, 405);

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const body = await req.json().catch(() => ({})) as { account_id?: string };
  const cron = segredoConfere(req.headers.get("x-refresh-secret") ?? "", requireEnv("REFRESH_TRIGGER_SECRET"));

  let ids: string[];
  if (cron) {
    let q = admin.from("ml_accounts").select("id").eq("status", "active");
    if (body.account_id) q = q.eq("id", body.account_id);
    const { data } = await q;
    ids = (data ?? []).map((c) => c.id as string);
  } else {
    const acesso = await exigirGestor(req, body.account_id);
    if (!acesso.ok) return acesso.res;
    ids = [body.account_id as string];
  }

  const contas = [];
  for (const accountId of ids) {
    const alvo = await contaComToken(admin, accountId);
    if (!alvo.ok) {
      contas.push({ account_id: accountId, sem_resposta: 0, recentes: 0, revistas: 0, erro: alvo.erro });
      continue;
    }
    const { conta, token } = alvo;
    const base = `${API}/questions/search?seller_id=${conta.ml_user_id}&api_version=4&sort_fields=date_created&sort_types=DESC&limit=50`;

    try {
      const semResposta: PerguntaLinha[] = [];
      let erro: string | null = null;
      for (let offset = 0; offset < 1000; offset += 50) {
        const r = await buscarMl(`${base}&status=UNANSWERED&offset=${offset}`, token);
        if (!r.ok) { erro = r.erro; break; }
        const { perguntas, total } = lerListaPerguntas(r.json);
        semResposta.push(...perguntas);
        if (perguntas.length < 50 || offset + 50 >= total) break;
      }

      const recentes = await buscarMl(`${base}&offset=0`, token);
      const ultimas = recentes.ok ? lerListaPerguntas(recentes.json).perguntas : [];
      if (!recentes.ok && !erro) erro = recentes.erro;

      await gravarPerguntas(admin, accountId, [...ultimas, ...semResposta]);

      const vistas = new Set([...semResposta, ...ultimas].map((p) => p.question_id));
      const { data: locais } = await admin.from("ml_questions").select("question_id")
        .eq("account_id", accountId).eq("status", "UNANSWERED").limit(500);
      const sumidas = (locais ?? []).map((r) => Number(r.question_id)).filter((id) => !vistas.has(id)).slice(0, 50);
      const revistas: PerguntaLinha[] = [];
      for (const id of sumidas) {
        const r = await buscarMl(`${API}/questions/${id}?api_version=4`, token);
        const p = r.ok ? lerPergunta(r.json) : null;
        if (p) revistas.push(p);
      }
      await gravarPerguntas(admin, accountId, revistas);

      await completarAnuncios(admin, accountId, token, [...semResposta, ...ultimas, ...revistas].map((p) => p.item_id ?? ""));
      contas.push({ account_id: accountId, sem_resposta: semResposta.length, recentes: ultimas.length, revistas: revistas.length, erro });
    } catch (e) {
      console.error("ml-questions-sync", accountId, e instanceof Error ? e.message : e);
      contas.push({ account_id: accountId, sem_resposta: 0, recentes: 0, revistas: 0, erro: "Falha ao gravar as perguntas." });
    }
  }

  return resposta({ contas });
});
