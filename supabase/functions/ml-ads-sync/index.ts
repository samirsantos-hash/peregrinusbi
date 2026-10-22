// ml-ads-sync
// Lê Product Ads de cada conta conectada. Não escreve no Mercado Livre.
//
// Contrato
// POST header x-refresh-secret (cron) ou JWT de quem gerencia a conta.
//   Corpo opcional: { account_id?: uuid }  (obrigatório com JWT)
// 200 { janela, contas: [{ account_id, ml_user_id, status, anunciantes, campanhas, anuncios, dias_lidos, dias_pendentes, erros }] }
//   status: ativo | sem_product_ads | sem_token | erro
//   dias_pendentes > 0: o limite de tempo acabou; a próxima execução continua de onde parou.
// 401 segredo ou login inválido
// 403 a pessoa não gerencia a conta pedida
// 405 use POST
//
// Janela: 90 dias, o máximo da API de métricas. Todos os sites do anunciante.
// CTR, CPC, ACOS, ROAS e CVR só entram se a resposta trouxer o campo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { buscarMl } from "../_shared/mlHttp.ts";
import { segredoConfere } from "../_shared/mlGestao.ts";
import { cors, resposta } from "../_shared/mlConta.ts";
import {
  METRICAS,
  type MetricasAds,
  diasPendentes,
  janelaMetricasAds,
  lerAnunciantes,
  metricasPorGrupo,
  serieDiaria,
} from "../_shared/mlAds.ts";

const API = "https://api.mercadolibre.com";
const V1 = { "Api-Version": "1" };
const V2 = { "api-version": "2" };
const ORCAMENTO_MS = 110_000;
const CAMPANHAS_A_CADA_MS = 20 * 3_600_000;

type Conta = { id: string; ml_user_id: number };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const txt = (v: unknown) => (typeof v === "string" && v ? v : null);
const agoraIso = () => new Date().toISOString();

async function paginar(token: string, url: string) {
  const items: Record<string, unknown>[] = [];
  for (let offset = 0; offset < 10_000; offset += 50) {
    const sep = url.includes("?") ? "&" : "?";
    const resposta = await buscarMl(`${url}${sep}limit=50&offset=${offset}`, token, fetch, V2);
    if (!resposta.ok) return { ok: false as const, erro: resposta.erro, items };
    const corpo = resposta.json as { results?: unknown; paging?: { total?: number } };
    const lista = Array.isArray(corpo.results) ? corpo.results as Record<string, unknown>[] : [];
    items.push(...lista);
    const total = corpo.paging?.total ?? lista.length;
    if (lista.length < 50 || offset + 50 >= total) break;
  }
  return { ok: true as const, items };
}

function linhaMetrica(accountId: string, nivel: "campanha" | "anuncio", campaignId: number, adGroupId: number, dia: string, m: MetricasAds) {
  return {
    account_id: accountId,
    nivel,
    campaign_id: campaignId,
    ad_group_id: adGroupId,
    dia,
    prints: m.prints,
    clicks: m.clicks,
    ctr: m.ctr,
    cpc: m.cpc,
    cost: m.cost,
    direct_amount: m.direct_amount,
    indirect_amount: m.indirect_amount,
    total_amount: m.total_amount,
    units_quantity: m.units_quantity,
    acos: m.acos,
    roas: m.roas,
    cvr: m.cvr,
    synced_at: agoraIso(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return resposta({ error: "use POST" }, 405);
  const inicio = Date.now();

  const url = requireEnv("SUPABASE_URL");
  const admin = createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const body = await req.json().catch(() => ({})) as { account_id?: string };
  const cron = segredoConfere(req.headers.get("x-refresh-secret") ?? "", requireEnv("REFRESH_TRIGGER_SECRET"));

  if (!cron) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return resposta({ error: "Faça login." }, 401);
    const userClient = createClient(url, requireEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return resposta({ error: "Faça login." }, 401);
    if (!body.account_id) return resposta({ error: "Informe account_id." }, 400);
    const { data: pode } = await userClient.rpc("ml_pode_gerir_conta", { p_account_id: body.account_id });
    if (!pode) return resposta({ error: "Você não gerencia esta conta." }, 403);
  }

  let q = admin.from("ml_accounts").select("id, ml_user_id").eq("status", "active");
  if (body.account_id) q = q.eq("id", body.account_id);
  const { data: contas, error } = await q;
  if (error) return resposta({ error: "Não foi possível listar as contas." }, 500);

  const janela = janelaMetricasAds(new Date());
  const resumo = [];
  const semTempo = () => Date.now() - inicio > ORCAMENTO_MS;

  for (const conta of (contas ?? []) as Conta[]) {
    const base = { account_id: conta.id, ml_user_id: conta.ml_user_id, anunciantes: 0, campanhas: 0, anuncios: 0, dias_lidos: 0, dias_pendentes: 0 };
    if (semTempo()) {
      resumo.push({ ...base, status: "adiado", erros: ["limite de tempo; segue na próxima execução"] });
      continue;
    }
    const erros: string[] = [];
    const { data: tok } = await admin.from("ml_tokens").select("access_token, expires_at")
      .eq("account_id", conta.id).eq("is_current", true).maybeSingle();
    if (!tok?.access_token || Date.parse(tok.expires_at) <= Date.now()) {
      resumo.push({ ...base, status: "sem_token", erros: ["autorização vencida"] });
      continue;
    }
    const token = tok.access_token as string;

    const adv = await buscarMl(`${API}/advertising/advertisers?product_id=PADS`, token, fetch, V1);
    if (!adv.ok) {
      resumo.push({ ...base, status: "erro", erros: [`${adv.codigo ?? adv.status}: ${adv.erro}`] });
      continue;
    }
    const anunciantes = lerAnunciantes(adv.json);
    const { data: estado } = await admin.from("ml_ads_estado").select("metricas_campanha_em").eq("account_id", conta.id).maybeSingle();
    if (!anunciantes.length) {
      await admin.from("ml_ads_estado").upsert({ account_id: conta.id, status: "sem_product_ads", synced_at: agoraIso() });
      resumo.push({ ...base, status: "sem_product_ads", erros });
      continue;
    }

    await admin.from("ml_ads_advertisers").upsert(anunciantes.map((a) => ({
      account_id: conta.id,
      advertiser_id: a.advertiser_id,
      site_id: a.site_id,
      advertiser_name: a.advertiser_name,
      account_name: a.account_name,
      synced_at: agoraIso(),
    })));

    const lerCampanhas = !estado?.metricas_campanha_em || Date.now() - Date.parse(estado.metricas_campanha_em) > CAMPANHAS_A_CADA_MS;
    let campanhas = 0;
    let anuncios = 0;
    let diasLidos = 0;
    let pendentes = 0;
    let campanhasCompletas = true;

    for (const a of anunciantes) {
      const vistas = new Map<number, Record<string, unknown>>();
      for (const status of ["active", "paused"]) {
        const lote = await paginar(token, `${API}/advertising/${a.site_id}/advertisers/${a.advertiser_id}/product_ads/campaigns/search?filters[status]=${status}`);
        if (!lote.ok) erros.push(lote.erro);
        for (const c of lote.items) {
          const id = num(c.id);
          if (id != null) vistas.set(id, c);
        }
      }
      const linhasCampanha = [...vistas.entries()].map(([id, c]) => ({
        account_id: conta.id,
        campaign_id: id,
        advertiser_id: a.advertiser_id,
        site_id: a.site_id,
        name: txt(c.name),
        status: txt(c.status),
        channel: txt(c.channel),
        strategy: txt(c.strategy),
        daily_budget: num(c.daily_budget),
        budget: num(c.budget),
        currency_id: txt(c.currency_id),
        acos_target: num(c.acos_target),
        roas_target: num(c.roas_target),
        automatic_budget: typeof c.automatic_budget === "boolean" ? c.automatic_budget : null,
        date_created: txt(c.date_created),
        last_updated: txt(c.last_updated),
        synced_at: agoraIso(),
      }));
      if (linhasCampanha.length) await admin.from("ml_ads_campaigns").upsert(linhasCampanha);
      campanhas += linhasCampanha.length;

      const grupos = await paginar(token, `${API}/advertising/${a.site_id}/advertisers/${a.advertiser_id}/product_ads/ad_groups/search`);
      if (!grupos.ok) erros.push(grupos.erro);
      const linhasGrupo = grupos.items.flatMap((g) => {
        const id = num(g.id);
        if (id == null) return [];
        return [{
          account_id: conta.id,
          ad_group_id: id,
          advertiser_id: a.advertiser_id,
          site_id: a.site_id,
          campaign_id: num(g.campaign_id),
          ad_group_type: txt(g.ad_group_type),
          external_id: txt(g.ad_group_external_id),
          status: txt(g.status),
          title: txt(g.title),
          catalog_listing: typeof g.catalog_listing === "boolean" ? g.catalog_listing : null,
          channel: txt(g.channel),
          synced_at: agoraIso(),
        }];
      });
      if (linhasGrupo.length) await admin.from("ml_ads_ads").upsert(linhasGrupo);
      anuncios += linhasGrupo.length;

      for (const campanha of linhasCampanha) {
        if (lerCampanhas) {
          if (semTempo()) { campanhasCompletas = false; break; }
          const detalhe = await buscarMl(
            `${API}/advertising/${a.site_id}/product_ads/campaigns/${campanha.campaign_id}?date_from=${janela.date_from}&date_to=${janela.date_to}&metrics=${METRICAS}&aggregation_type=DAILY`,
            token, fetch, V2,
          );
          if (!detalhe.ok) {
            erros.push(detalhe.erro);
            campanhasCompletas = false;
          } else {
            const pontos = serieDiaria(detalhe.json).map((p) => linhaMetrica(conta.id, "campanha", campanha.campaign_id, 0, p.dia, p.metricas));
            if (pontos.length) await admin.from("ml_ads_metrics_daily").upsert(pontos);
          }
        }

        const { data: lidosRows } = await admin.from("ml_ads_dias_sync").select("dia, synced_at")
          .eq("account_id", conta.id).eq("campaign_id", campanha.campaign_id).gte("dia", janela.date_from);
        const lidos = new Map<string, string>((lidosRows ?? []).map((r) => [r.dia as string, r.synced_at as string]));
        const faltam = diasPendentes(janela, lidos);
        for (let i = 0; i < faltam.length; i++) {
          if (semTempo()) { pendentes += faltam.length - i; break; }
          const dia = faltam[i];
          const lote = await paginar(
            token,
            `${API}/advertising/${a.site_id}/product_ads/campaigns/${campanha.campaign_id}/ad_groups/metrics?date_from=${dia}&date_to=${dia}&metrics=${METRICAS}`,
          );
          if (!lote.ok) { erros.push(lote.erro); pendentes++; continue; }
          const linhas = metricasPorGrupo({ results: lote.items })
            .map((g) => linhaMetrica(conta.id, "anuncio", campanha.campaign_id, g.ad_group_id, dia, g.metricas));
          if (linhas.length) await admin.from("ml_ads_metrics_daily").upsert(linhas);
          await admin.from("ml_ads_dias_sync").upsert({ account_id: conta.id, campaign_id: campanha.campaign_id, dia, synced_at: agoraIso() });
          diasLidos++;
        }
      }
    }

    await admin.from("ml_ads_estado").upsert({
      account_id: conta.id,
      status: "ativo",
      synced_at: agoraIso(),
      metricas_campanha_em: lerCampanhas && campanhasCompletas ? agoraIso() : estado?.metricas_campanha_em ?? null,
    });
    resumo.push({ ...base, status: "ativo", anunciantes: anunciantes.length, campanhas, anuncios, dias_lidos: diasLidos, dias_pendentes: pendentes, erros: erros.slice(0, 20) });
  }

  return resposta({ janela, contas: resumo });
});
