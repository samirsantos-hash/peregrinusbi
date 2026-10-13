// ml-importar-anuncios
// Importa anúncios das lojas pelo cust_id, sem autorização da loja: usa os MLBs já
// conhecidos (seller_eligibility) e consulta /items em lote com token de aplicativo.
// Só administradores. Até 5 lojas por chamada (o navegador repete em lotes).
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
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const sbUser = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await sbUser.auth.getUser();
    if (!u?.user) return json({ error: "Faça login." }, 401);
    const { data: admin } = await sbUser.rpc("is_admin");
    if (!admin) return json({ error: "Só administradores podem importar." }, 403);

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.cust_ids)
      ? [...new Set(body.cust_ids.map((x: unknown) => String(x).replace(/\D/g, "")).filter(Boolean))].slice(0, 5) as string[]
      : [];
    if (!ids.length) return json({ error: "Informe ao menos um cust_id." }, 400);

    const db = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const token = await appToken();
    const H = () => ({ headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
    const resultado: any[] = [];

    for (const cust of ids) {
      const { data: s } = await db.from("sellers").select("id,nickname").eq("cust_id", cust).maybeSingle();
      if (!s) { resultado.push({ cust_id: cust, erro: "loja não cadastrada" }); continue; }
      const mlbs = new Set<string>();
      for (let off = 0; ; off += 1000) {
        const { data } = await db.from("seller_eligibility").select("item_id").eq("seller_id", s.id)
          .order("item_id").range(off, off + 999);
        (data ?? []).forEach((r: any) => r.item_id && mlbs.add(String(r.item_id).toUpperCase().startsWith("MLB") ? String(r.item_id).toUpperCase() : `MLB${r.item_id}`));
        if (!data || data.length < 1000) break;
      }
      const lista = [...mlbs];
      const linhas: any[] = [];
      let recusados = 0;
      for (let i = 0; i < lista.length; i += 20) {
        const lote = lista.slice(i, i + 20).join(",");
        let r: Response | null = null;
        for (let t = 0; t < 3; t++) {
          r = await fetch(`https://api.mercadolibre.com/items?ids=${lote}&attributes=id,title,price,original_price,available_quantity,sold_quantity,status,shipping,permalink,thumbnail,seller_id`, H());
          if (r.status !== 429) break;
          await espera(500 * (t + 1));
        }
        if (!r || !r.ok) { console.error("items", cust, r?.status, await r?.text()); recusados += 20; continue; }
        for (const it of await r.json() as any[]) {
          const b = it.body;
          if (it.code !== 200 || !b) { if (recusados < 2) console.error("item recusado", it.code, JSON.stringify(b).slice(0, 300)); recusados++; continue; }
          if (String(b.seller_id) !== cust) continue;
          linhas.push({
            item_id: b.id, cust_id: cust, titulo: b.title, preco: b.price, preco_original: b.original_price,
            estoque: b.available_quantity, vendidos: b.sold_quantity, status: b.status,
            is_full: b.shipping?.logistic_type === "fulfillment", frete_gratis: !!b.shipping?.free_shipping,
            link: b.permalink, foto: b.thumbnail, atualizado_em: new Date().toISOString(),
          });
        }
      }
      for (let i = 0; i < linhas.length; i += 500) {
        const { error } = await db.from("ml_anuncios").upsert(linhas.slice(i, i + 500), { onConflict: "item_id" });
        if (error) throw error;
      }
      resultado.push({
        cust_id: cust, nickname: s.nickname, mlbs_conhecidos: lista.length, importados: linhas.length,
        ativos: linhas.filter((l) => l.status === "active").length, full: linhas.filter((l) => l.is_full).length, recusados,
      });
    }
    return json({ resultado });
  } catch (e) {
    console.error("ml-importar-anuncios", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
