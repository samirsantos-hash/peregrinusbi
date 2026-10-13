// ml-busca-concorrentes
// Busca pública de anúncios no Mercado Livre (Brasil) para comparar concorrentes.
// A API de busca exige token: usa token de aplicativo (client_credentials), nunca token de loja.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

let cache: { token: string; exp: number } | null = null;

async function appToken(): Promise<string> {
  if (cache && cache.exp > Date.now() + 60_000) return cache.token;
  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: requireEnv("ML_CLIENT_ID"),
      client_secret: requireEnv("ML_CLIENT_SECRET"),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const t = await res.json();
  if (!res.ok || !t.access_token) throw new Error(`token do aplicativo recusado: ${t.error ?? res.status}`);
  cache = { token: t.access_token, exp: Date.now() + (t.expires_in ?? 3600) * 1000 };
  return cache.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Faça login para buscar." }, 401);

    const { q } = await req.json().catch(() => ({}));
    const termo = String(q ?? "").trim().slice(0, 120);
    if (termo.length < 2) return json({ error: "Digite ao menos 2 letras." }, 400);

    const token = await appToken();
    if ((await req.clone().json().catch(()=>({}))).probe) {
      const out: Record<string, unknown> = {};
      for (const p of [`/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=2`, `/products/search?status=active&site_id=MLB&q=${encodeURIComponent(termo)}&limit=2`]) {
        const r = await fetch(`https://api.mercadolibre.com${p}`, { headers: { Authorization: `Bearer ${token}` } });
        out[p] = { s: r.status, b: (await r.text()).slice(0, 600) };
      }
      return json(out);
    }
    const res = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=50`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) },
    );
    const d = await res.json();
    if (!res.ok) {
      console.error("busca ML falhou", res.status, d);
      return json({ error: `O Mercado Livre recusou a busca (${res.status}).` }, 502);
    }
    const itens = (d.results ?? []).map((r: any) => ({
      id: r.id, titulo: r.title, preco: r.price, preco_original: r.original_price ?? null,
      vendidos: r.sold_quantity ?? null, link: r.permalink, foto: r.thumbnail,
      vendedor: r.seller?.nickname ?? null, vendedor_id: r.seller?.id ?? null,
      full: r.shipping?.logistic_type === "fulfillment", frete_gratis: !!r.shipping?.free_shipping,
      condicao: r.condition,
    }));
    return json({ total: d.paging?.total ?? itens.length, itens });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
