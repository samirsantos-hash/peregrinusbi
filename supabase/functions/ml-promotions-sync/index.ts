// ml-promotions-sync
// Lê os convites e campanhas da conta e a situação de cada anúncio nelas. Não escreve no ML.
//
// Contrato
// POST header x-refresh-secret (cron, todas as contas) ou JWT de quem gerencia a conta.
//   Corpo: { account_id: uuid, promotion_id?: string }  (account_id obrigatório com JWT;
//   promotion_id relê só os anúncios daquela promoção)
// 200 { contas: [{ account_id, promocoes, itens, pendentes, erro }] }
//   pendentes: promoções cujos anúncios ficaram para a próxima execução por limite de tempo.
// 401 login ou segredo inválido · 403 a pessoa não gerencia a conta · 405 use POST
//
// Fonte: /seller-promotions/users/{id} (offset, 50 por página) e
// /seller-promotions/promotions/{id}/items (search_after, 50 por página, status_item active e paused).

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { buscarMl } from "../_shared/mlHttp.ts";
import { segredoConfere } from "../_shared/mlGestao.ts";
import { contaComToken, cors, exigirGestor, resposta } from "../_shared/mlConta.ts";
import { candidato, cursorSeguinte, lerItemDaPromocao, lerPromocao, participa, type Promocao, resultados, totalPaginas } from "../_shared/mlPromocoes.ts";

const API = "https://api.mercadolibre.com";
const ORCAMENTO_MS = 110_000;

async function promocoesDaConta(token: string, userId: number): Promise<{ ok: true; lista: Promocao[] } | { ok: false; erro: string }> {
  const lista: Promocao[] = [];
  let lidas = 0;
  for (let pagina = 0; pagina < 100; pagina++) {
    const r = await buscarMl(`${API}/seller-promotions/users/${userId}?app_version=v2${lidas ? `&offset=${lidas}` : ""}`, token);
    if (!r.ok) return { ok: false, erro: r.erro };
    const brutos = resultados(r.json);
    lista.push(...brutos.map(lerPromocao).filter((p): p is Promocao => p !== null));
    lidas += brutos.length;
    const total = totalPaginas(r.json);
    if (!brutos.length || total === null || lidas >= total) break;
  }
  return { ok: true, lista: [...new Map(lista.map((p) => [p.promotion_id, p])).values()] };
}

/** Lê todos os anúncios de uma promoção. Devolve null se o tempo acabar no meio. */
async function itensDaPromocao(
  admin: SupabaseClient,
  accountId: string,
  token: string,
  p: Promocao,
  semTempo: () => boolean,
): Promise<{ ok: true; itens: number; candidatos: number; participando: number } | { ok: false; erro: string | null }> {
  const inicio = new Date().toISOString();
  let itens = 0, candidatos = 0, participando = 0;
  for (const statusItem of ["active", "paused"]) {
    let cursor: string | null = null;
    for (let pagina = 0; pagina < 400; pagina++) {
      if (semTempo()) return { ok: false, erro: null };
      const q = new URLSearchParams({ promotion_type: p.tipo, app_version: "v2", limit: "50", status_item: statusItem });
      if (cursor) q.set("search_after", cursor);
      const r = await buscarMl(`${API}/seller-promotions/promotions/${encodeURIComponent(p.promotion_id)}/items?${q}`, token);
      if (!r.ok) return { ok: false, erro: r.erro };
      const linhas = resultados(r.json).map(lerItemDaPromocao).filter((x) => x !== null).map((x) => ({
        account_id: accountId,
        promotion_id: p.promotion_id,
        item_id: x!.item_id,
        tipo: p.tipo,
        status: x!.status,
        status_item: statusItem,
        preco: x!.preco,
        preco_original: x!.preco_original,
        offer_id: x!.offer_id,
        preco_min: x!.min,
        preco_max: x!.max,
        preco_sugerido: x!.sugerido,
        meli_pct: x!.meli_pct,
        vendedor_pct: x!.vendedor_pct,
        estoque_min: x!.estoque_min,
        estoque_max: x!.estoque_max,
        inicio: x!.inicio,
        fim: x!.fim,
        synced_at: new Date().toISOString(),
      }));
      if (linhas.length) {
        const { error } = await admin.from("ml_promotion_items").upsert(linhas);
        if (error) {
          console.error("ml-promotions-sync", error.message);
          return { ok: false, erro: "Falha ao gravar anúncios da promoção." };
        }
      }
      itens += linhas.length;
      candidatos += linhas.filter((l) => candidato(l.status)).length;
      participando += linhas.filter((l) => participa(l.status)).length;
      cursor = cursorSeguinte(r.json);
      if (!linhas.length || !cursor) break;
    }
  }
  await admin.from("ml_promotion_items").delete()
    .eq("account_id", accountId).eq("promotion_id", p.promotion_id).lt("synced_at", inicio);
  return { ok: true, itens, candidatos, participando };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return resposta({ error: "use POST" }, 405);
  const inicio = Date.now();
  const semTempo = () => Date.now() - inicio > ORCAMENTO_MS;

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const body = await req.json().catch(() => ({})) as { account_id?: string; promotion_id?: string };
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
  const soPromocao = typeof body.promotion_id === "string" && body.promotion_id ? body.promotion_id : null;

  const contas = [];
  for (const accountId of contasIds) {
    const base = { account_id: accountId, promocoes: 0, itens: 0, pendentes: 0 };
    if (semTempo()) { contas.push({ ...base, erro: "Limite de tempo; segue na próxima execução." }); continue; }
    const alvo = await contaComToken(admin, accountId);
    if (!alvo.ok) { contas.push({ ...base, erro: alvo.erro }); continue; }
    const { conta, token } = alvo;

    const lidas = await promocoesDaConta(token, conta.ml_user_id);
    if (!lidas.ok) { contas.push({ ...base, erro: lidas.erro }); continue; }
    const agora = new Date().toISOString();
    const { error: erroGravar } = await admin.from("ml_promotions").upsert(lidas.lista.map((p) => ({
      account_id: accountId,
      promotion_id: p.promotion_id,
      tipo: p.tipo,
      sub_tipo: p.sub_tipo,
      status: p.status,
      nome: p.nome,
      inicio: p.inicio,
      fim: p.fim,
      prazo: p.prazo,
      beneficios: p.beneficios,
      extras: p.extras,
      synced_at: agora,
    })));
    if (erroGravar) {
      console.error("ml-promotions-sync", erroGravar.message);
      contas.push({ ...base, erro: "Falha ao gravar promoções." });
      continue;
    }
    const ids = new Set(lidas.lista.map((p) => p.promotion_id));
    const { data: locais } = await admin.from("ml_promotions").select("promotion_id, itens_sync_em").eq("account_id", accountId);
    const fora = (locais ?? []).map((l) => l.promotion_id as string).filter((id) => !ids.has(id));
    if (fora.length) await admin.from("ml_promotions").delete().eq("account_id", accountId).in("promotion_id", fora);

    const sincEm = new Map((locais ?? []).map((l) => [l.promotion_id as string, l.itens_sync_em as string | null]));
    const fila = lidas.lista
      .filter((p) => (soPromocao ? p.promotion_id === soPromocao : true))
      .sort((a, b) => (sincEm.get(a.promotion_id) ?? "").localeCompare(sincEm.get(b.promotion_id) ?? ""));

    let itens = 0, pendentes = 0;
    let erro: string | null = null;
    for (const p of fila) {
      if (semTempo()) { pendentes++; continue; }
      const r = await itensDaPromocao(admin, accountId, token, p, semTempo);
      if (!r.ok) {
        if (r.erro) erro = r.erro; else pendentes++;
        await admin.from("ml_promotions").update({ itens_completo: false }).eq("account_id", accountId).eq("promotion_id", p.promotion_id);
        continue;
      }
      itens += r.itens;
      await admin.from("ml_promotions").update({
        candidatos: r.candidatos,
        participando: r.participando,
        itens_sync_em: new Date().toISOString(),
        itens_completo: true,
      }).eq("account_id", accountId).eq("promotion_id", p.promotion_id);
    }
    contas.push({ account_id: accountId, promocoes: lidas.lista.length, itens, pendentes, erro });
  }

  return resposta({ contas });
});
