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

    const body = await req.json().catch(() => ({}));
    const q = body.q;
    const termo = String(q ?? "").trim().slice(0, 120);
    if (termo.length < 2) return json({ error: "Digite ao menos 2 letras." }, 400);

    const token = await appToken();
    const H = { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) };
    // A busca de anúncios (/sites/MLB/search) é bloqueada para aplicativos; usa o catálogo.
    const res = await fetch(
      `https://api.mercadolibre.com/products/search?status=active&site_id=MLB&q=${encodeURIComponent(termo)}&limit=12`, H);
    const d = await res.json();
    if (!res.ok) {
      console.error("busca catálogo ML falhou", res.status, d);
      return json({ error: res.status === 429 ? "Muitas buscas seguidas no Mercado Livre. Tente em alguns segundos." : `O Mercado Livre recusou a busca (${res.status}).` }, 502);
    }
    const produtos = (d.results ?? []) as any[];
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const pegar = async (url: string) => {
      for (let t = 0; t < 3; t++) {
        const r = await fetch(url, H);
        if (r.status !== 429) return r;
        await espera(400 * (t + 1));
      }
      return await fetch(url, H);
    };
    // Sequencial: chamadas em paralelo esbarram no limite de requisições do ML (429).
    const ofertas: { produto: any; itens: any[] }[] = [];
    for (const p of produtos) {
      const r = await pegar(`https://api.mercadolibre.com/products/${p.id}/items?limit=10`);
      if (!r.ok) { if (r.status !== 404) console.error("ofertas", p.id, r.status); ofertas.push({ produto: p, itens: [] }); continue; }
      const j = await r.json();
      ofertas.push({ produto: p, itens: j.results ?? [] });
    }
    const vend = new Set<number>();
    ofertas.forEach((o) => o.itens.forEach((i) => i.seller_id && vend.add(i.seller_id)));
    const apelidos = new Map<number, string>();
    for (const id of [...vend].slice(0, 40)) {
      const r = await pegar(`https://api.mercadolibre.com/users/${id}`);
      if (r.ok) { const u = await r.json(); if (u.nickname) apelidos.set(id, u.nickname); }
    }
    const itens = ofertas.flatMap((o) => o.itens.map((i) => ({
      id: i.item_id, produto_id: o.produto.id, titulo: o.produto.name,
      foto: o.produto.pictures?.[0]?.url ?? null,
      preco: i.price, preco_original: i.original_price ?? null,
      vendedor: apelidos.get(i.seller_id) ?? null, vendedor_id: i.seller_id ?? null,
      full: i.shipping?.logistic_type === "fulfillment", frete_gratis: !!i.shipping?.free_shipping,
      condicao: i.condition ?? null, link: `https://produto.mercadolivre.com.br/${String(i.item_id).replace(/^MLB/, "MLB-")}`,
    })));
    const semOferta = ofertas.filter((o) => o.itens.length === 0).length;
    return json({ total_catalogo: d.paging?.total ?? produtos.length, produtos: produtos.length, sem_oferta: semOferta, itens });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
