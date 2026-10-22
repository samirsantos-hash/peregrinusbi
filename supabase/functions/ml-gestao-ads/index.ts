import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { requireEnv } from "../_shared/env.ts";
import { adsNumber, adsPeriod, adsRatios, canManageAds } from "../_shared/mlAdsRules.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const url = requireEnv("SUPABASE_URL");
  const userClient = createClient(url, requireEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json({ error: "Faça login." }, 401);
  const parsed = z.object({ cust_id: z.string().regex(/^\d+$/), dias: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(60), z.literal(90)]).default(30) }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Informe a loja e um período válido. Esta consulta não altera campanhas." }, 400);
  const { cust_id: cust, dias } = parsed.data;
  const { data: visible, error: permissionError } = await userClient.from("ml_sync_tema").select("cust_id").eq("cust_id", cust).limit(1);
  if (permissionError || !visible?.length) return json({ error: "Loja fora da sua carteira." }, 403);
  const db = createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: account } = await db.from("ml_accounts").select("id,nickname").eq("status", "active").eq("ml_user_id", Number(cust)).maybeSingle();
  if (!account) return json({ error: "Loja não conectada ao Mercado Livre." }, 404);
  const { data: token } = await db.from("ml_tokens").select("access_token,expires_at").eq("account_id", account.id).eq("is_current", true).maybeSingle();
  if (!token?.access_token || Date.parse(token.expires_at) <= Date.now()) return json({ error: "Acesso da loja vencido; aguarde a renovação automática ou reconecte a loja em Integrações." }, 409);
  const [{ data: sa }, { data: perfil }] = await Promise.all([userClient.rpc("is_super_admin"), userClient.rpc("get_perfil")]);
  const periodo = adsPeriod(dias);
  const base = { periodo, loja: account.nickname, pode_gerenciar: canManageAds(sa, perfil), atualizado_em: new Date().toISOString() };
  try {
    const get = async (path: string, version: string) => {
      const response = await fetch("https://api.mercadolibre.com" + path, {
        headers: { Authorization: `Bearer ${token.access_token}`, "Api-Version": version }, signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error("Limite de consultas do Mercado Livre atingido. Tente novamente em alguns minutos.");
        if ([401, 403].includes(response.status)) throw new Error("O Mercado Livre não liberou a consulta de Product Ads para esta conta. Confira a conexão e as permissões de Publicidade.");
        throw new Error(`O Mercado Livre não retornou as campanhas (código ${response.status}).`);
      }
      return response.json();
    };
    const advertisers = await get("/advertising/advertisers?product_id=PADS", "1");
    // Never select a foreign site or a different account's advertiser supplied by the caller.
    const advertiser = (advertisers.advertisers ?? []).find((a: any) => a.site_id === "MLB");
    if (!advertiser) return json({ ...base, usa_ads: false, campanhas: [], resumo: null });
    const path = `/advertising/MLB/advertisers/${encodeURIComponent(String(advertiser.advertiser_id))}/product_ads/campaigns/search`;
    const params = new URLSearchParams({ limit: "50", date_from: periodo.inicio, date_to: periodo.fim,
      metrics: "clicks,prints,cost,acos,direct_amount,indirect_amount,total_amount,units_quantity", metrics_summary: "true" });
    const campaigns: any[] = [];
    let summary: any = null;
    let complete = false;
    for (let offset = 0; offset < 1000; offset += 50) {
      params.set("offset", String(offset));
      const page = await get(`${path}?${params}`, "2");
      if (!Array.isArray(page.results)) throw new Error("O Mercado Livre retornou campanhas em formato inesperado.");
      if (offset === 0) summary = page.metrics_summary ?? null;
      campaigns.push(...page.results);
      const total = page.paging?.total ?? page.pagination?.total;
      if (page.results.length < 50 || (typeof total === "number" && offset + page.results.length >= total)) { complete = true; break; }
    }
    const metric = (m: any) => {
      const investimento = adsNumber(m?.cost), vendas = adsNumber(m?.total_amount), cliques = adsNumber(m?.clicks), impressoes = adsNumber(m?.prints);
      return { investimento, vendas, cliques, impressoes, unidades: adsNumber(m?.units_quantity), ...adsRatios(investimento, vendas, cliques, impressoes) };
    };
    return json({ ...base, usa_ads: true, completo: complete, resumo: summary ? metric(summary) : null,
      campanhas: campaigns.map((c) => ({
        id: String(c.id ?? c.campaign_id), nome: String(c.name ?? "Campanha sem nome"), status: c.status ?? null,
        orcamento_diario: adsNumber(c.budget), meta_acos: adsNumber(c.acos_target), meta_roas: adsNumber(c.roas_target),
        ...metric(c.metrics),
      })),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não foi possível consultar as campanhas agora." }, 502);
  }
});