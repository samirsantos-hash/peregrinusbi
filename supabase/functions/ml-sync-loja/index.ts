// ml-sync-loja
// Busca no Mercado Livre, com o token da própria loja conectada, os dados de cada
// tema (reputação, anúncios, vendas, visitas, envios, perguntas, promoções, Ads)
// e grava um resumo por tema em ml_sync_tema. Só leitura no ML; uma falha num tema
// fica registrada nele sem derrubar os outros.
// Acesso: administrador (JWT) ou x-refresh-secret (rotinas).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-refresh-secret",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const API = "https://api.mercadolibre.com";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dia = (iso: string) => iso.slice(0, 10);

function segredoOk(a: string, b: string) {
  if (!b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < b.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const URL_ = requireEnv("SUPABASE_URL");
  const db = createClient(URL_, requireEnv("SUPABASE_SERVICE_ROLE_KEY"));

  const segredo = req.headers.get("x-refresh-secret") ?? "";
  if (!segredoOk(segredo, Deno.env.get("REFRESH_TRIGGER_SECRET") ?? "")) {
    const sbUser = createClient(URL_, requireEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await sbUser.auth.getUser();
    if (!u?.user) return json({ error: "Faça login." }, 401);
    const { data: adm } = await sbUser.rpc("is_admin");
    if (!adm) return json({ error: "Só administradores podem atualizar." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const rotina = segredoOk(segredo, Deno.env.get("REFRESH_TRIGGER_SECRET") ?? "");

  // Rotina programada sem loja: atualiza cada loja conectada, uma por vez
  // (chamadas paralelas ao ML dão 429). Limitado às lojas ativas.
  if (rotina && !body.account_id && !body.cust_id) {
    const { data: contas } = await db.from("ml_accounts").select("id, nickname").eq("status", "active").limit(200);
    const resumo: { loja: string; status: number }[] = [];
    for (const c of contas ?? []) {
      const r = await fetch(`${URL_}/functions/v1/ml-sync-loja`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-refresh-secret": segredo },
        body: JSON.stringify({ account_id: c.id }),
      }).catch(() => null);
      await r?.text();
      resumo.push({ loja: c.nickname, status: r?.status ?? 0 });
      await espera(2000);
    }
    return json({ rotina: true, lojas: resumo });
  }

  let q = db.from("ml_accounts").select("id, ml_user_id, nickname, status").eq("status", "active");
  if (body.account_id) q = q.eq("id", String(body.account_id));
  else if (body.cust_id) q = q.eq("ml_user_id", Number(String(body.cust_id).replace(/\D/g, "")));
  else return json({ error: "Informe account_id ou cust_id." }, 400);
  const { data: conta } = await q.maybeSingle();
  if (!conta) return json({ error: "Loja não conectada ao Mercado Livre." }, 404);

  const { data: tok } = await db.from("ml_tokens").select("access_token, expires_at")
    .eq("account_id", conta.id).eq("is_current", true).maybeSingle();
  if (!tok?.access_token || Date.parse(tok.expires_at) <= Date.now()) {
    return json({ error: "Acesso da loja vencido; aguarde a renovação automática." }, 409);
  }
  const uid = String(conta.ml_user_id);
  const cust = uid;

  async function get(path: string, extra: Record<string, string> = {}) {
    for (let t = 0; t < 3; t++) {
      const r = await fetch(API + path, {
        headers: { Authorization: `Bearer ${tok!.access_token}`, ...extra },
        signal: AbortSignal.timeout(20_000),
      });
      if (r.status === 429) { await espera(1500 * (t + 1)); continue; }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`${r.status} ${j?.message ?? j?.error ?? ""}`.trim());
      return j;
    }
    throw new Error("limite de consultas do ML; tente de novo");
  }
  async function salvar(tema: string, fn: () => Promise<unknown>) {
    let dados: unknown = null, erro: string | null = null;
    try { dados = await fn(); } catch (e) { erro = String((e as Error).message ?? e).replace(/https?:\/\/\S+/g, "").replace(/APP_USR-\S+/g, "").slice(0, 200); }
    await db.from("ml_sync_tema").upsert({ account_id: conta!.id, cust_id: cust, tema, dados, erro, atualizado_em: new Date().toISOString() });
    return { tema, ok: !erro, erro };
  }

  const hoje = new Date();
  const desde = new Date(hoje.getTime() - 30 * 864e5);
  const res: unknown[] = [];

  // 1. Reputação
  res.push(await salvar("reputacao", async () => {
    const u = await get(`/users/${uid}`);
    const r = u.seller_reputation ?? {};
    const m = r.metrics ?? {};
    return {
      nivel: r.level_id ?? null,
      medalha: r.power_seller_status ?? null,
      vendas_concluidas_60d: m.sales?.completed ?? null,
      reclamacoes: m.claims?.rate ?? null,
      atrasos: m.delayed_handling_time?.rate ?? null,
      cancelamentos: m.cancellations?.rate ?? null,
      periodo: m.sales?.period ?? null,
      transacoes_total: r.transactions?.total ?? null,
      avaliacoes: r.transactions?.ratings ?? null,
    };
  }));

  // 2. Anúncios (até 500 ativos)
  const anuncioPorId = new Map<string, any>();
  res.push(await salvar("anuncios", async () => {
    const ids: string[] = [];
    for (let off = 0; off < 500; off += 50) {
      const s = await get(`/users/${uid}/items/search?status=active&limit=50&offset=${off}`);
      ids.push(...(s.results ?? []));
      if ((s.results ?? []).length < 50) break;
    }
    const lista: any[] = [];
    for (let i = 0; i < ids.length; i += 20) {
      const lote = await get(`/items?ids=${ids.slice(i, i + 20).join(",")}&attributes=id,title,price,available_quantity,sold_quantity,status,shipping,listing_type_id,pictures,permalink,health,catalog_listing`);
      for (const x of lote) if (x.code === 200) lista.push(x.body);
    }
    const out = lista.map((b) => ({
      id: b.id, titulo: b.title, preco: b.price, estoque: b.available_quantity, vendidos: b.sold_quantity,
      envio: b.shipping?.logistic_type ?? null, gratis: !!b.shipping?.free_shipping,
      tipo: b.listing_type_id, fotos: (b.pictures ?? []).length, saude: b.health ?? null, link: b.permalink,
    }));
    out.forEach((a) => anuncioPorId.set(a.id, a));
    return {
      total_ativos: ids.length,
      sem_estoque: out.filter((a) => !a.estoque).length,
      poucas_fotos: out.filter((a) => a.fotos < 3).length,
      itens: out.sort((a, b) => (b.vendidos ?? 0) - (a.vendidos ?? 0)).slice(0, 200),
    };
  }));

  // 3. Vendas (30 dias) + 4. Envios por modalidade
  let pedidos: any[] = [];
  res.push(await salvar("vendas", async () => {
    for (let off = 0; off < 5000; off += 50) {
      const s = await get(`/orders/search?seller=${uid}&order.date_created.from=${desde.toISOString()}&sort=date_desc&limit=50&offset=${off}`);
      pedidos.push(...(s.results ?? []));
      if ((s.results ?? []).length < 50) break;
    }
    const porDia: Record<string, { faturamento: number; pedidos: number; cancelados: number }> = {};
    for (let d = new Date(desde); d <= hoje; d = new Date(d.getTime() + 864e5)) porDia[dia(d.toISOString())] = { faturamento: 0, pedidos: 0, cancelados: 0 };
    for (const p of pedidos) {
      const k = dia(p.date_created ?? "");
      if (!porDia[k]) continue;
      if (p.status === "cancelled") porDia[k].cancelados++;
      else { porDia[k].pedidos++; porDia[k].faturamento += Number(p.total_amount) || 0; }
    }
    const serie = Object.entries(porDia).map(([data, v]) => ({ data, ...v }));
    const fat = serie.reduce((s, x) => s + x.faturamento, 0);
    const ped = serie.reduce((s, x) => s + x.pedidos, 0);
    return { faturamento_30d: fat, pedidos_30d: ped, ticket_medio: ped ? fat / ped : null, cancelados_30d: serie.reduce((s, x) => s + x.cancelados, 0), serie };
  }));

  res.push(await salvar("envios", async () => {
    const mix: Record<string, { pedidos: number; faturamento: number }> = {};
    for (const p of pedidos) {
      if (p.status === "cancelled") continue;
      const item = p.order_items?.[0]?.item?.id;
      const tipo = anuncioPorId.get(item)?.envio ?? "sem_info";
      mix[tipo] ??= { pedidos: 0, faturamento: 0 };
      mix[tipo].pedidos++; mix[tipo].faturamento += Number(p.total_amount) || 0;
    }
    return { mix, base: "pedidos dos últimos 30 dias pela modalidade do anúncio" };
  }));

  // 5. Visitas (30 dias)
  res.push(await salvar("visitas", async () => {
    const v = await get(`/users/${uid}/items_visits/time_window?last=30&unit=day`);
    const serie = (v.results ?? []).map((r: any) => ({ data: dia(r.date), visitas: r.total ?? 0 }));
    return { total_30d: v.total_visits ?? serie.reduce((s: number, x: any) => s + x.visitas, 0), serie };
  }));

  // 6. Perguntas
  res.push(await salvar("perguntas", async () => {
    const pend = await get(`/questions/search?seller_id=${uid}&status=UNANSWERED&api_version=4&limit=20`);
    const todas = await get(`/questions/search?seller_id=${uid}&api_version=4&limit=50&sort_fields=date_created&sort_types=DESC`);
    const resp = (todas.questions ?? []).filter((q: any) => q.answer?.date_created);
    const horas = resp.map((q: any) => (Date.parse(q.answer.date_created) - Date.parse(q.date_created)) / 36e5).filter((h: number) => h >= 0).sort((a: number, b: number) => a - b);
    return {
      sem_resposta: pend.total ?? (pend.questions ?? []).length,
      total: todas.total ?? null,
      mediana_horas_resposta: horas.length ? horas[Math.floor(horas.length / 2)] : null,
      pendentes: (pend.questions ?? []).slice(0, 10).map((q: any) => ({ item: q.item_id, texto: q.text, data: q.date_created })),
    };
  }));

  // 7. Promoções
  res.push(await salvar("promocoes", async () => {
    const p = await get(`/seller-promotions/users/${uid}?app_version=v2`);
    const lista = (p.results ?? []).map((x: any) => ({ id: x.id, tipo: x.type, nome: x.name, status: x.status, inicio: x.start_date, fim: x.finish_date }));
    return { total: lista.length, ativas: lista.filter((x: any) => x.status === "started").length, lista: lista.slice(0, 50) };
  }));

  // 8. Product Ads (30 dias)
  res.push(await salvar("ads", async () => {
    const adv = await get(`/advertising/advertisers?product_id=PADS`, { "Api-Version": "1" });
    const a = (adv.advertisers ?? []).find((x: any) => x.site_id === "MLB") ?? adv.advertisers?.[0];
    if (!a) return { usa_ads: false };
    const de = dia(desde.toISOString()), ate = dia(hoje.toISOString());
    const c = await get(`/advertising/MLB/advertisers/${a.advertiser_id}/product_ads/campaigns/search?limit=50&date_from=${de}&date_to=${ate}&metrics=clicks,prints,cost,acos,direct_amount,indirect_amount,total_amount,units_quantity&metrics_summary=true`, { "Api-Version": "2" });
    const s = c.metrics_summary ?? {};
    return {
      usa_ads: true,
      investimento: s.cost ?? null, cliques: s.clicks ?? null, impressoes: s.prints ?? null,
      vendas_ads: s.total_amount ?? null, unidades: s.units_quantity ?? null,
      campanhas: (c.results ?? []).map((x: any) => ({ nome: x.name, status: x.status, investimento: x.metrics?.cost ?? 0, vendas: x.metrics?.total_amount ?? 0, cliques: x.metrics?.clicks ?? 0 })),
    };
  }));

  await db.from("ml_accounts").update({ last_sync_daily_at: new Date().toISOString() }).eq("id", conta.id);
  return json({ loja: conta.nickname, temas: res });
});
