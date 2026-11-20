import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { exigirGestor, contaComToken } from "../_shared/mlConta.ts";
import { requireEnv } from "../_shared/env.ts";
import { entradaValida, evidencias, objeto, situacao, type Codigo } from "./regras.ts";

const API = "https://api.mercadolibre.com";
const resposta = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Developer-only, bounded fixed GETs. No client paths, raw payloads, ML writes or business persistence.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return resposta({ error: "Use POST." }, 405);
  try {
    const body = await req.json().catch(() => null);
    if (!entradaValida(body)) return resposta({ error: "Informe account_id válido e grupo catalogo, concorrente, concorrente_app ou proprio." }, 400);
    const acesso = await exigirGestor(req, body.account_id);
    if (!acesso.ok) return resposta({ error: "Acesso à conta não autorizado." }, acesso.res.status);
    const cliente = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: master } = await cliente.rpc("has_role", { _user_id: acesso.userId, _role: "super_admin" });
    const { data: dev } = await cliente.rpc("has_role", { _user_id: acesso.userId, _role: "desenvolvedor" });
    if (!master && !dev) return resposta({ error: "Diagnóstico exclusivo do desenvolvedor ou conta master." }, 403);
    const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const conta = await contaComToken(admin, body.account_id);
    if (!conta.ok) return resposta({ error: "Conta sem autorização ativa." }, 409);
    if (conta.conta.site_id !== "MLB") return resposta({ error: "Esta validação está limitada ao Brasil." }, 400);
    const { data: local } = await admin.from("ml_listings").select("item_id").eq("account_id", body.account_id).eq("status", "active").order("item_id").limit(1).maybeSingle();
    if (!local?.item_id || !/^MLB\d+$/.test(local.item_id)) return resposta({ error: "Nenhum anúncio ativo sincronizado para a amostra." }, 409);
    const inicio = Date.now();
    let limitado = false;
    const resultados: unknown[] = [];
    let tokenLeitura = conta.token;
    if (body.grupo === "concorrente_app") {
      const r = await fetch(`${API}/oauth/token`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: requireEnv("ML_CLIENT_ID"), client_secret: requireEnv("ML_CLIENT_SECRET") }),
        signal: AbortSignal.timeout(6_000),
      });
      const t = objeto(await r.json().catch(() => null));
      if (!r.ok || typeof t.access_token !== "string") return resposta({ error: "Autorização de aplicativo indisponível." }, 502);
      tokenLeitura = t.access_token;
    }
    const ler = async (codigo: Codigo, caminho: string): Promise<unknown> => {
      if (limitado || Date.now() - inicio > 45_000) {
        resultados.push({ codigo, caminho, status: null, situacao: "nao_confirmado", motivo: "limite_da_execucao" });
        return null;
      }
      const t = Date.now();
      try {
        const r = await fetch(`${API}${caminho}`, { method: "GET", headers: { Authorization: `Bearer ${tokenLeitura}`, Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(6_000) });
        const json: unknown = await r.json().catch(() => null);
        const wrapper = Array.isArray(json) ? objeto(json[0]) : {};
        const interno = typeof wrapper.code === "number" ? wrapper.code : undefined;
        resultados.push({ codigo, caminho, status: r.status, status_item: interno ?? null, situacao: situacao(r.status, interno), ms: Date.now() - t, ...((r.ok && (interno === undefined || interno === 200)) ? evidencias(codigo, json) : { campos: [], registros: null }) });
        if (r.status === 429) limitado = true;
        await new Promise((resolve) => setTimeout(resolve, 650));
        return r.ok ? json : null;
      } catch {
        resultados.push({ codigo, caminho, status: 0, situacao: "nao_confirmado", motivo: "rede_ou_timeout", ms: Date.now() - t });
        return null;
      }
    };
    if (body.grupo === "concorrente_app") {
      // Fixed known search sample; no arbitrary client item, path or seller ID.
      const busca = objeto(await ler("catalogo_busca", "/products/search?status=active&site_id=MLB&q=pneu%20aro%2015&limit=3"));
      let id: string | null = null;
      for (const p of (Array.isArray(busca.results) ? busca.results : []).slice(0, 3)) {
        const produto = objeto(p).id;
        if (typeof produto !== "string" || !/^MLB\d+$/.test(produto)) continue;
        const ofertas = objeto(await ler("catalogo_ofertas", `/products/${produto}/items?limit=10`));
        const oferta = (Array.isArray(ofertas.results) ? ofertas.results : []).map(objeto).find((i) => typeof i.item_id === "string" && /^MLB\d+$/.test(i.item_id) && String(i.seller_id) !== String(conta.conta.ml_user_id));
        if (typeof oferta?.item_id === "string") { id = oferta.item_id; break; }
      }
      const fim = new Date(); fim.setUTCHours(0, 0, 0, 0);
      const ultimo = new Date(fim.getTime() - 86400000);
      const primeiro = new Date(fim.getTime() - 30 * 86400000);
      if (id) {
        await ler("concorrente_visitas", `/items/${id}/visits/time_window?last=30&unit=day&ending=${ultimo.toISOString().slice(0, 10)}`);
        await ler("concorrente_visitas", `/items/visits?ids=${id}&date_from=${primeiro.toISOString().slice(0, 10)}&date_to=${ultimo.toISOString().slice(0, 10)}`);
      }
      return resposta({ verificado_em: new Date().toISOString(), grupo: body.grupo, amostra: { concorrente: id }, periodo: { inicio: primeiro.toISOString().slice(0, 10), fim: ultimo.toISOString().slice(0, 10) }, resultados, conclusao: "Sonda de visitas com token de aplicativo; não fornece pedidos pagos nem autoriza cálculo de conversão." });
    }
    const proprio = objeto(await ler("anuncio_proprio", `/items/${local.item_id}?include_attributes=all`));
    if (String(proprio.seller_id) !== String(conta.conta.ml_user_id)) return resposta({ error: "Não foi possível confirmar a propriedade da amostra.", resultados }, 409);
    const termo = String(proprio.title ?? "").slice(0, 90);
    const cat = typeof proprio.category_id === "string" && /^MLB\d+$/.test(proprio.category_id) ? proprio.category_id : null;
    const p = await ler("catalogo_busca", `/products/search?status=active&site_id=MLB&q=${encodeURIComponent(termo)}&limit=3`);
    const produtos = objeto(p).results;
    const candidatos = [...new Set([proprio.catalog_product_id, ...(Array.isArray(produtos) ? produtos.map((p) => objeto(p).id) : [])])].filter((v): v is string => typeof v === "string" && /^MLB\d+$/.test(v)).slice(0, 4);
    let produto: string | null = null;
    let outro: Record<string, unknown> | undefined;
    for (const id of candidatos) {
      produto = id;
      const ofertas = objeto(await ler("catalogo_ofertas", `/products/${id}/items?limit=10`)).results;
      outro = Array.isArray(ofertas) ? ofertas.map(objeto).find((i) => String(i.seller_id) !== String(conta.conta.ml_user_id) && typeof i.item_id === "string" && /^MLB\d+$/.test(i.item_id)) : undefined;
      if (outro || limitado) break;
    }
    const pendente = (codigo: Codigo) => resultados.push({ codigo, status: null, situacao: "nao_confirmado", motivo: "amostra_necessaria_ausente" });
    if (body.grupo === "catalogo") {
      await ler("busca_geral", `/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=1`);
      await ler("categoria_termo", `/sites/MLB/domain_discovery/search?q=${encodeURIComponent(termo)}&limit=1`);
      if (cat) {
        await ler("tendencias", `/trends/MLB/${cat}`);
        await ler("mais_vendidos", `/highlights/MLB/category/${cat}`);
      }
    } else if (body.grupo === "concorrente") {
      const id = outro?.item_id;
      if (typeof id === "string") {
        await ler("concorrente_item", `/items/${id}`);
        await ler("concorrente_lote", `/items?ids=${id}`);
        await ler("concorrente_bulk", `/items/bulk?ids=${id}`);
        if (/^\d+$/.test(String(outro?.seller_id))) await ler("concorrente_reputacao", `/users/${outro?.seller_id}`);
        await ler("concorrente_visitas", `/items/${id}/visits/time_window?last=2&unit=day`);
      } else for (const codigo of ["concorrente_item", "concorrente_lote", "concorrente_bulk", "concorrente_reputacao", "concorrente_visitas"] as const) pendente(codigo);
    } else {
      await ler("visitas_proprias", `/items/${local.item_id}/visits/time_window?last=2&unit=day`);
      if (cat && typeof proprio.price === "number" && typeof proprio.listing_type_id === "string") await ler("tarifas", `/sites/MLB/listing_prices?price=${proprio.price}&category_id=${cat}&listing_type_id=${encodeURIComponent(proprio.listing_type_id)}&currency_id=BRL`);
      if (proprio.catalog_listing) await ler("price_to_win", `/items/${local.item_id}/price_to_win?siteId=MLB&version=v2`); else pendente("price_to_win");
      await ler("sugestoes", `/suggestions/items/${local.item_id}/details`);
      await ler("frete", `/items/${local.item_id}/shipping_options?zip_code=01001000`);
      const appId = Deno.env.get("ML_APP_ID") ?? Deno.env.get("ML_CLIENT_ID");
      if (appId && /^\d+$/.test(appId)) await ler("limite_app", `/applications/${appId}`); else pendente("limite_app");
    }
    return resposta({ verificado_em: new Date().toISOString(), grupo: body.grupo, amostra: { proprio: local.item_id, concorrente: outro?.item_id ?? null, produto: produto ?? null, categoria: cat }, resultados, chamadas: resultados.filter((r) => objeto(r).status !== null).length, duracao_ms: Date.now() - inicio, limite_atingido: limitado, conclusao: "Teste pontual de disponibilidade; não valida precisão de vendas/estoque, custo de frete, volume de busca ou cobertura de mercado. Nenhuma escrita no Mercado Livre." });
  } catch {
    return resposta({ error: "Não foi possível concluir a validação de leitura." }, 500);
  }
});