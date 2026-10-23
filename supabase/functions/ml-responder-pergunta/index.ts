import { tokenAtual } from "../_shared/mlTokenAtual.ts";
// ml-responder-pergunta
// Aba Perguntas: "sugerir" pede à IA um rascunho (não envia nada ao ML);
// "responder" envia a resposta revisada ao ML com o token da própria loja.
// Escrita no ML só para super_admin ou consultor.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireEnv } from "../_shared/env.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const API = "https://api.mercadolibre.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const URL_ = requireEnv("SUPABASE_URL");
  const db = createClient(URL_, requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const sbUser = createClient(URL_, requireEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: u } = await sbUser.auth.getUser();
  if (!u?.user) return json({ error: "Faça login." }, 401);
  const [{ data: sa }, { data: perfil }] = await Promise.all([sbUser.rpc("is_super_admin"), sbUser.rpc("get_perfil")]);
  if (!sa && perfil !== "consultor") return json({ error: "Só o consultor pode responder perguntas." }, 403);

  const body = await req.json().catch(() => ({}));
  const acao = body?.acao;
  const cust = String(body?.cust_id ?? "").replace(/\D/g, "");
  const qid = String(body?.question_id ?? "").replace(/\D/g, "");
  if (!cust || !qid || (acao !== "sugerir" && acao !== "responder")) return json({ error: "Pedido inválido." }, 400);

  const { data: conta } = await db.from("ml_accounts").select("id").eq("status", "active").eq("ml_user_id", Number(cust)).maybeSingle();
  if (!conta) return json({ error: "Loja não conectada ao Mercado Livre." }, 404);
  const tok = await tokenAtual(db, conta.id);
  if (!tok?.access_token || Date.parse(tok.expires_at) <= Date.now()) return json({ error: "Acesso da loja vencido; aguarde a renovação automática." }, 409);
  const ml = (path: string, init: RequestInit = {}) => fetch(API + path, {
    ...init, headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });

  const qr = await ml(`/questions/${qid}?api_version=4`);
  const q = await qr.json().catch(() => ({}));
  if (!qr.ok || String(q.seller_id) !== cust) return json({ error: "Pergunta não encontrada nesta loja." }, 404);

  if (acao === "sugerir") {
    const ir = await ml(`/items/${q.item_id}?attributes=title,price,available_quantity,shipping,attributes`);
    const it = ir.ok ? await ir.json() : {};
    const ficha = (it.attributes ?? []).slice(0, 25).map((a: any) => `${a.name}: ${a.value_name}`).join("; ");
    const prompt = `Você responde perguntas de compradores no Mercado Livre em nome do vendedor.
Escreva uma resposta curta (até 350 caracteres), cordial, em português do Brasil, sem saudação longa.
Use apenas os dados do anúncio abaixo. Se a informação não estiver neles, diga que vai verificar e não invente.
Não inclua telefone, e-mail, links, redes sociais nem peça contato fora do Mercado Livre (é proibido).
Anúncio: ${it.title ?? q.item_id}. Preço: ${it.price ?? "sem dado"}. Estoque: ${it.available_quantity ?? "sem dado"}. Frete grátis: ${it.shipping?.free_shipping ? "sim" : "não informado"}.
Ficha técnica: ${ficha || "sem dado"}
Pergunta: ${String(q.text ?? "").slice(0, 800)}
Responda só com o texto da resposta.`;
    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": requireEnv("LOVABLE_API_KEY"), "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: "openai/gpt-6-astra", input: prompt, stream: true, store: false, reasoning: { effort: "low" } }),
    });
    if (!r.ok) {
      const t = await r.text();
      let msg = "Falha no serviço de IA.";
      try { msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? msg; } catch { /* texto */ }
      if (r.status === 402) msg = "Créditos de IA esgotados. Adicione créditos em Configurações → Planos e créditos.";
      if (r.status === 429) msg = "Muitas solicitações agora. Tente de novo em alguns minutos.";
      return json({ error: msg }, r.status);
    }
    let texto = "", buf = "";
    const rd = r.body!.getReader(); const dec = new TextDecoder();
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const linhas = buf.split("\n"); buf = linhas.pop() ?? "";
      for (const l of linhas) {
        if (!l.startsWith("data:")) continue;
        try { const ev = JSON.parse(l.slice(5)); if (ev.type === "response.output_text.delta") texto += ev.delta ?? ""; } catch { /* parcial */ }
      }
    }
    texto = texto.trim().slice(0, 2000);
    if (!texto) return json({ error: "A IA não sugeriu uma resposta para esta pergunta." }, 422);
    return json({ sugestao: texto });
  }

  // responder
  const texto = String(body?.texto ?? "").trim();
  if (texto.length < 2 || texto.length > 2000) return json({ error: "A resposta precisa ter entre 2 e 2.000 caracteres." }, 400);
  if (q.status !== "UNANSWERED") return json({ error: "Esta pergunta já foi respondida ou fechada no Mercado Livre." }, 409);
  const ar = await ml(`/answers`, { method: "POST", body: JSON.stringify({ question_id: Number(qid), text: texto }) });
  const aj = await ar.json().catch(() => ({}));
  if (!ar.ok) return json({ error: `O Mercado Livre recusou a resposta: ${aj?.message ?? aj?.error ?? ar.status}` }, ar.status === 429 ? 429 : 400);

  // Atualiza o resumo guardado para a aba já mostrar como respondida.
  const { data: tema } = await db.from("ml_sync_tema").select("dados").eq("account_id", conta.id).eq("tema", "perguntas").maybeSingle();
  if (tema?.dados) {
    const d: any = tema.dados; const agora = new Date().toISOString();
    d.historico = (d.historico ?? []).map((h: any) => String(h.id) === qid
      ? { ...h, status: "ANSWERED", resposta: texto.slice(0, 500), respondida_em: agora, horas: (Date.parse(agora) - Date.parse(h.data)) / 36e5 } : h);
    d.pendentes = (d.pendentes ?? []).filter((p: any) => !(p.item === q.item_id && p.data === q.date_created));
    d.sem_resposta = Math.max(0, (d.sem_resposta ?? 1) - 1);
    await db.from("ml_sync_tema").update({ dados: d }).eq("account_id", conta.id).eq("tema", "perguntas");
  }
  return json({ ok: true });
});
