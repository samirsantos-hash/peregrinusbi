// ml-listings-sync
// Lê os anúncios ativos e pausados da conta e grava em ml_listings para a busca do painel. Não escreve no ML.
//
// Contrato
// POST header x-refresh-secret (cron, todas as contas) ou JWT de quem gerencia a conta.
//   Corpo: { account_id: uuid }  (obrigatório com JWT)
// 200 { contas: [{ account_id, total_ml, lidos, pendentes, removidos, erro }] }
//   pendentes > 0: o limite de tempo acabou; a próxima execução continua pelos que faltam.
// 401 login ou segredo inválido · 403 a pessoa não gerencia a conta · 405 use POST
//
// Fonte: /users/{id}/items/search?search_type=scan&status=active|paused (ids, 100 por página)
// e /items?ids= (20 por chamada) com include_attributes=all para o SKU das variações.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { buscarMl } from "../_shared/mlHttp.ts";
import { segredoConfere } from "../_shared/mlGestao.ts";
import { contaComToken, cors, exigirGestor, resposta } from "../_shared/mlConta.ts";
import { CAMPOS_ITEM, STATUS_BUSCA, entraNaBusca, lerAnuncio, ordemDeLeitura } from "../_shared/mlAnuncios.ts";

const API = "https://api.mercadolibre.com";
const ORCAMENTO_MS = 110_000;

async function idsDaConta(token: string, userId: number): Promise<{ ok: true; ids: string[] } | { ok: false; erro: string }> {
  const ids = new Set<string>();
  for (const status of STATUS_BUSCA) {
    let scroll: string | null = null;
    for (let pagina = 0; pagina < 2000; pagina++) {
      const url = `${API}/users/${userId}/items/search?search_type=scan&status=${status}&limit=100${scroll ? `&scroll_id=${encodeURIComponent(scroll)}` : ""}`;
      const r = await buscarMl(url, token);
      if (!r.ok) return { ok: false, erro: r.erro };
      const corpo = r.json as { results?: unknown; scroll_id?: unknown };
      const lista = Array.isArray(corpo.results) ? corpo.results.filter((x): x is string => typeof x === "string") : [];
      lista.forEach((id) => ids.add(id));
      scroll = typeof corpo.scroll_id === "string" ? corpo.scroll_id : null;
      if (!lista.length || !scroll) break;
    }
  }
  return { ok: true, ids: [...ids] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return resposta({ error: "use POST" }, 405);
  const inicio = Date.now();
  const semTempo = () => Date.now() - inicio > ORCAMENTO_MS;

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const body = await req.json().catch(() => ({})) as { account_id?: string };
  const cron = segredoConfere(req.headers.get("x-refresh-secret") ?? "", requireEnv("REFRESH_TRIGGER_SECRET"));

  let contasIds: string[];
  if (cron) {
    let q = admin.from("ml_accounts").select("id").eq("status", "active");
    if (body.account_id) q = q.eq("id", body.account_id);
    const { data } = await q;
    contasIds = (data ?? []).map((c) => c.id as string);
  } else {
    const acesso = await exigirGestor(req, body.account_id);
    if (!acesso.ok) return acesso.res;
    contasIds = [body.account_id as string];
  }

  const contas = [];
  for (const accountId of contasIds) {
    const base = { account_id: accountId, total_ml: 0, lidos: 0, pendentes: 0, removidos: 0 };
    if (semTempo()) { contas.push({ ...base, erro: "Limite de tempo; segue na próxima execução." }); continue; }
    const alvo = await contaComToken(admin, accountId);
    if (!alvo.ok) { contas.push({ ...base, erro: alvo.erro }); continue; }
    const { conta, token } = alvo;

    const lista = await idsDaConta(token, conta.ml_user_id);
    if (!lista.ok) { contas.push({ ...base, erro: lista.erro }); continue; }
    const doMl = new Set(lista.ids);

    const lidosEm = new Map<string, string>();
    for (let de = 0; ; de += 1000) {
      const { data: pagina } = await admin.from("ml_listings").select("item_id, synced_at")
        .eq("account_id", accountId).order("item_id").range(de, de + 999);
      (pagina ?? []).forEach((r) => lidosEm.set(r.item_id as string, r.synced_at as string));
      if (!pagina || pagina.length < 1000) break;
    }

    const fora = [...lidosEm.keys()].filter((id) => !doMl.has(id));
    for (let i = 0; i < fora.length; i += 200) {
      await admin.from("ml_listings").delete().eq("account_id", accountId).in("item_id", fora.slice(i, i + 200));
    }

    const fila = ordemDeLeitura(lista.ids, lidosEm);
    let lidos = 0;
    let erro: string | null = null;
    let i = 0;
    for (; i < fila.length; i += 20) {
      if (semTempo()) break;
      const lote = fila.slice(i, i + 20);
      const r = await buscarMl(`${API}/items?ids=${lote.join(",")}&attributes=${CAMPOS_ITEM}&include_attributes=all`, token);
      if (!r.ok) { erro = r.erro; continue; }
      const linhas = [];
      const sairam: string[] = [];
      for (const item of (Array.isArray(r.json) ? r.json : []) as { code?: number; body?: unknown }[]) {
        if (item.code !== 200) continue;
        const a = lerAnuncio(item.body);
        if (!a) continue;
        if (!entraNaBusca(a.status)) { sairam.push(a.item_id); continue; }
        linhas.push({ ...a, account_id: accountId, synced_at: new Date().toISOString() });
      }
      if (linhas.length) {
        const { error } = await admin.from("ml_listings").upsert(linhas);
        if (error) { erro = "Falha ao gravar anúncios."; console.error("ml-listings-sync", error.message); continue; }
      }
      if (sairam.length) await admin.from("ml_listings").delete().eq("account_id", accountId).in("item_id", sairam);
      lidos += linhas.length;
    }
    const pendentes = Math.max(fila.length - i, 0);

    await admin.from("ml_listings_estado").upsert({
      account_id: accountId,
      total_ml: lista.ids.length,
      lidos,
      pendentes,
      completo_em: pendentes === 0 && !erro ? new Date().toISOString() : undefined,
      synced_at: new Date().toISOString(),
    });
    contas.push({ account_id: accountId, total_ml: lista.ids.length, lidos, pendentes, removidos: fora.length, erro });
  }

  return resposta({ contas });
});
