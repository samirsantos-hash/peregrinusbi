import { tokenAtual } from "../_shared/mlTokenAtual.ts";
// ml-buscar-produtos
// Busca anúncios da própria loja conectada por título, SKU ou código MLB.
// Só leitura no ML. Acesso: quem enxerga a loja na carteira (RLS de ml_sync_tema).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireEnv } from "../_shared/env.ts";
import { aggregateItemOrders, itemConversion, parseItemVisits } from "../_shared/mlItemStats.ts";
import { z } from "npm:zod@3";

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

  const parsed = z.object({ cust_id: z.string().regex(/^\d+$/), termo: z.string().trim().min(2).max(120).optional(), item_id: z.string().regex(/^MLB\d+$/).optional() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || (!parsed.data.termo && !parsed.data.item_id)) return json({ error: "Informe uma loja e uma busca válida." }, 400);
  const { cust_id: cust, termo = "", item_id: itemId } = parsed.data;

  // Permissão: a pessoa precisa enxergar esta loja.
  const { data: vis } = await sbUser.from("ml_sync_tema").select("cust_id").eq("cust_id", cust).limit(1);
  if (!vis?.length) return json({ error: "Loja fora da sua carteira." }, 403);

  const { data: conta } = await db.from("ml_accounts").select("id").eq("status", "active").eq("ml_user_id", Number(cust)).maybeSingle();
  if (!conta) return json({ error: "Loja não conectada ao Mercado Livre." }, 404);
  const tok = await tokenAtual(db, conta.id);
  if (!tok?.access_token || Date.parse(tok.expires_at) <= Date.now()) return json({ error: "Acesso da loja vencido; aguarde a renovação automática." }, 409);
  const get = async (path: string) => {
    try {
      const r = await fetch(API + path, { headers: { Authorization: `Bearer ${tok.access_token}` }, signal: AbortSignal.timeout(15_000) });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  };

  if (itemId) {
    const item = await get(`/items/${itemId}`);
    if (!item || String(item.seller_id) !== cust) return json({ error: "Anúncio não encontrado nesta loja." }, 404);
    const end = new Date(); end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - 30 * 864e5);
    const from = start.toISOString(), to = new Date(end.getTime() - 1).toISOString();
    // Documented endpoint: /items/visits?ids=…&date_from=…&date_to=… (array with total_visits).
    let visitas = parseItemVisits(await get(`/items/visits?ids=${itemId}&date_from=${from.slice(0, 10)}&date_to=${to.slice(0, 10)}`), itemId);
    if (visitas == null) visitas = parseItemVisits(await get(`/items/${itemId}/visits/time_window?last=30&unit=day&ending=${to.slice(0, 10)}`), itemId);
    const orders: any[] = [];
    let completo = true;
    for (let offset = 0; offset < 1000; offset += 50) {
      const page = await get(`/orders/search?seller=${cust}&item=${itemId}&order.date_created.from=${encodeURIComponent(from)}&order.date_created.to=${encodeURIComponent(to)}&limit=50&offset=${offset}`);
      if (!Array.isArray(page?.results)) { completo = false; break; }
      orders.push(...page.results);
      if (offset + page.results.length >= (page.paging?.total ?? Infinity) || page.results.length < 50) break;
      if (offset === 950) completo = false;
    }
    const totals = aggregateItemOrders(orders, itemId);
    const promotions = await get(`/seller-promotions/items/${itemId}?app_version=v2`);
    const list = Array.isArray(promotions) ? promotions : Array.isArray(promotions?.results) ? promotions.results : null;
    return json({ estatisticas: {
      id: item.id, titulo: item.title, tipo: item.listing_type_id ?? null, preco: item.price, link: item.permalink,
      visitas, cliques: null, pedidos: completo ? totals.pedidos : null,
      unidades: completo ? totals.unidades : null, faturamento: completo ? totals.faturamento : null,
      cancelados: completo ? totals.cancelados : null,
      conversao: itemConversion(completo ? totals.pedidos : null, visitas),
      promocao: list ? list.some((p: any) => p.status === "started") : null, completo,
    }, periodo: { inicio: from.slice(0, 10), fim: to.slice(0, 10) } });
  }

  const ids = new Set<string>();
  const mlb = termo.toUpperCase().replace(/[\s-]/g, "").match(/^MLB?(\d{6,})$/) ?? termo.match(/^(\d{8,})$/);
  if (mlb) ids.add(`MLB${mlb[1]}`);
  const enc = encodeURIComponent(termo);
  for (const p of [`seller_sku=${enc}`, `sku=${enc}`, `q=${enc}`]) {
    if (ids.size >= 20) break;
    const s = await get(`/users/${cust}/items/search?${p}&limit=20`);
    for (const id of s?.results ?? []) ids.add(String(id));
  }
  const lista = [...ids].slice(0, 20);
  if (!lista.length) return json({ itens: [] });

  const det = await get(`/items?ids=${lista.join(",")}&attributes=id,seller_id,title,price,original_price,available_quantity,sold_quantity,status,permalink,seller_custom_field,attributes,shipping,health,thumbnail,listing_type_id`);
  const itens = (det ?? [])
    .filter((x: any) => x.code === 200 && String(x.body?.seller_id) === cust)
    .map(({ body: b }: any) => ({
      id: b.id, titulo: b.title, preco: b.price, preco_original: b.original_price ?? null,
      estoque: b.available_quantity, vendidos: b.sold_quantity, status: b.status, link: b.permalink,
      sku: b.seller_custom_field ?? (b.attributes ?? []).find((a: any) => a.id === "SELLER_SKU")?.value_name ?? null,
      full: b.shipping?.logistic_type === "fulfillment", saude: b.health ?? null, foto: b.thumbnail ?? null,
      tipo: b.listing_type_id ?? null,
    }));
  return json({ itens });
});
