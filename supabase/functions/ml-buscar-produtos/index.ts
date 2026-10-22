// ml-buscar-produtos
// Busca anúncios da própria loja conectada por título, SKU ou código MLB.
// Só leitura no ML. Acesso: quem enxerga a loja na carteira (RLS de ml_sync_tema).
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

  const body = await req.json().catch(() => ({}));
  const cust = String(body?.cust_id ?? "").replace(/\D/g, "");
  const termo = String(body?.termo ?? "").trim().slice(0, 120);
  if (!cust || termo.length < 2) return json({ error: "Digite ao menos 2 caracteres." }, 400);

  // Permissão: a pessoa precisa enxergar esta loja.
  const { data: vis } = await sbUser.from("ml_sync_tema").select("cust_id").eq("cust_id", cust).limit(1);
  if (!vis?.length) return json({ error: "Loja fora da sua carteira." }, 403);

  const { data: conta } = await db.from("ml_accounts").select("id").eq("status", "active").eq("ml_user_id", Number(cust)).maybeSingle();
  if (!conta) return json({ error: "Loja não conectada ao Mercado Livre." }, 404);
  const { data: tok } = await db.from("ml_tokens").select("access_token, expires_at")
    .eq("account_id", conta.id).eq("is_current", true).maybeSingle();
  if (!tok?.access_token || Date.parse(tok.expires_at) <= Date.now()) return json({ error: "Acesso da loja vencido; aguarde a renovação automática." }, 409);
  const get = async (path: string) => {
    const r = await fetch(API + path, { headers: { Authorization: `Bearer ${tok.access_token}` }, signal: AbortSignal.timeout(20_000) });
    return r.ok ? await r.json() : null;
  };

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

  const det = await get(`/items?ids=${lista.join(",")}&attributes=id,seller_id,title,price,original_price,available_quantity,sold_quantity,status,permalink,seller_custom_field,attributes,shipping,health,thumbnail`);
  const itens = (det ?? [])
    .filter((x: any) => x.code === 200 && String(x.body?.seller_id) === cust)
    .map(({ body: b }: any) => ({
      id: b.id, titulo: b.title, preco: b.price, preco_original: b.original_price ?? null,
      estoque: b.available_quantity, vendidos: b.sold_quantity, status: b.status, link: b.permalink,
      sku: b.seller_custom_field ?? (b.attributes ?? []).find((a: any) => a.id === "SELLER_SKU")?.value_name ?? null,
      full: b.shipping?.logistic_type === "fulfillment", saude: b.health ?? null, foto: b.thumbnail ?? null,
    }));
  return json({ itens });
});
