// ml-ads-action
// Gestão de Product Ads com prévia → confirmação (contrato comum em _shared/mlAcaoLote.ts).
//
// tipo (no corpo da prévia):
//   campanha_criar   { campanha: { name, budget, strategy, status, roas_target } }
//   campanha_editar  { campaign_id, campanha: { name?, budget?, strategy?, status?, roas_target? } }
//   grupos_incluir   { campaign_id, ad_group_ids: number[] }   inclui ou move para a campanha, ativo
//   grupos_status    { ad_group_ids: number[], status: "active" | "paused" }
//   grupos_remover   { ad_group_ids: number[] }                tira da campanha atual
// Até 50 anúncios (Ad Groups) por vez, um a um, com resultado por item.
// A prévia avisa (não bloqueia): orçamento mensal projetado acima da meta da conta sobre o faturamento
// de 30 dias, ACOS/ROAS/CTR/CPC/TACOS dos últimos 30 dias fora dos limites da ml_settings,
// anúncio sem estoque ou pausado.
// Erros: 400 dados inválidos · 404 campanha ou anunciante não encontrado · 409 conta sem Product Ads ou sem autorização
//
// Fonte: Product Ads (api-version 2). A leitura brasileira usa /advertising/...; a documentação de escrita
// (Global Selling) usa /marketplace/advertising/.... Tenta o primeiro e, só em 404, o segundo.

import { buscarMl, enviarMl, type RespostaMl } from "../_shared/mlHttp.ts";
import { type Contexto, type Execucao, type Linha, servirAcaoEmLote } from "../_shared/mlAcaoLote.ts";
import {
  alertaOrcamento,
  alertasDesempenho,
  type CampanhaMl,
  type DadosCampanha,
  estadoCampanha,
  estadoGrupo,
  type GrupoMl,
  indicadores,
  lerCampanhaMl,
  lerDadosCampanha,
  lerGrupoMl,
  lerLimites,
  MAX_GRUPOS_LOTE,
  mudancasCampanha,
  somar,
  textoCampanha,
} from "../_shared/mlAdsGestao.ts";
import { hojeSaoPaulo } from "../_shared/mlPromocoes.ts";

const API = "https://api.mercadolibre.com";
const V2 = { "api-version": "2" };
const TIPOS = ["campanha_criar", "campanha_editar", "grupos_incluir", "grupos_status", "grupos_remover"] as const;
type Tipo = typeof TIPOS[number];

const rotas = (caminho: string) => [`${API}/advertising${caminho}`, `${API}/marketplace/advertising${caminho}`];

async function lerAds(caminho: string, token: string, extra: Record<string, string> = {}): Promise<RespostaMl> {
  const [a, b] = rotas(caminho);
  const r = await buscarMl(a, token, fetch, extra);
  return !r.ok && r.status === 404 ? buscarMl(b, token, fetch, extra) : r;
}

async function escreverAds(metodo: "POST" | "PUT" | "DELETE", caminho: string, token: string, corpo: unknown, extra: Record<string, string> = {}) {
  const [a, b] = rotas(caminho);
  const r = await enviarMl(metodo, a, token, corpo, fetch, extra);
  return !r.ok && r.status === 404 && !r.incerto ? enviarMl(metodo, b, token, corpo, fetch, extra) : r;
}

const hoje = () => hojeSaoPaulo();
const lerCampanha = (site: string, id: number, token: string) =>
  lerAds(`/${site}/product_ads/campaigns/${id}?date_from=${hoje()}&date_to=${hoje()}&metrics=clicks`, token, V2);
const lerGrupo = (site: string, id: number, token: string) =>
  lerAds(`/${site}/product_ads/ad_groups/${id}?date_from=${hoje()}&date_to=${hoje()}&metrics=CLICKS`, token);

type CampanhaLocal = { campaign_id: number; name: string | null; status: string | null; budget: number | null; daily_budget: number | null; advertiser_id: number; site_id: string };

async function contexto(ctx: Contexto) {
  const { admin, accountId, conta } = ctx;
  const [adv, cfg, vendas, camps] = await Promise.all([
    admin.from("ml_ads_advertisers").select("advertiser_id, site_id").eq("account_id", accountId),
    admin.from("ml_settings").select("*").eq("account_id", accountId).maybeSingle(),
    admin.from("ml_sync_tema").select("dados").eq("account_id", accountId).eq("tema", "vendas").maybeSingle(),
    admin.from("ml_ads_campaigns").select("campaign_id, name, status, budget, daily_budget, advertiser_id, site_id").eq("account_id", accountId),
  ]);
  const anunciantes = (adv.data ?? []) as { advertiser_id: number; site_id: string }[];
  const anunciante = anunciantes.find((a) => a.site_id === conta.site_id) ?? anunciantes[0] ?? null;
  const fat = (vendas.data?.dados as { faturamento_30d?: unknown } | null)?.faturamento_30d;
  return {
    anunciante,
    limites: lerLimites(cfg.data as Record<string, unknown> | null),
    faturamento: typeof fat === "number" && Number.isFinite(fat) ? fat : null,
    campanhas: (camps.data ?? []) as CampanhaLocal[],
  };
}

const orcamentoDe = (c: { budget: number | null; daily_budget?: number | null }) => c.budget ?? c.daily_budget ?? 0;
const ativa = (s: string | null) => (s ?? "").toLowerCase() === "active";

async function metricas30d(ctx: Contexto, campaignId: number) {
  const desde = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const { data } = await ctx.admin.from("ml_ads_metrics_daily").select("cost, total_amount, clicks, prints, units_quantity")
    .eq("account_id", ctx.accountId).eq("nivel", "campanha").eq("campaign_id", campaignId).gte("dia", desde);
  return somar(data ?? []);
}

async function gravarCampanha(ctx: Contexto, c: CampanhaMl, advertiserId: number, site: string) {
  await ctx.admin.from("ml_ads_campaigns").upsert({
    account_id: ctx.accountId,
    campaign_id: c.id,
    advertiser_id: advertiserId,
    site_id: site,
    name: c.name,
    status: c.status,
    strategy: c.strategy,
    budget: c.budget,
    roas_target: c.roas_target,
    synced_at: new Date().toISOString(),
  });
}

const descreverGrupo = (g: GrupoMl, nomes: Map<number, string>) =>
  g.campaign_id ? `${nomes.get(g.campaign_id) ?? `Campanha ${g.campaign_id}`} · ${g.status === "paused" ? "Pausado" : "Ativo"}` : "Sem campanha";

/** Avisos do anúncio ligado ao Ad Group (item, família de variações ou produto de catálogo). */
async function avisosDosAnuncios(ctx: Contexto, grupos: { id: number; external_id: string | null }[]) {
  const ext = [...new Set(grupos.map((g) => g.external_id).filter((e): e is string => !!e && /^[A-Z0-9]+$/.test(e)))];
  const porExt = new Map<string, { estoque: number | null; status: string | null }[]>();
  if (ext.length) {
    const lista = ext.join(",");
    const { data } = await ctx.admin.from("ml_listings").select("item_id, family_id, catalog_product_id, estoque, status")
      .eq("account_id", ctx.accountId).or(`item_id.in.(${lista}),family_id.in.(${lista}),catalog_product_id.in.(${lista})`);
    for (const l of data ?? []) {
      for (const k of [l.item_id, l.family_id, l.catalog_product_id]) {
        if (k && ext.includes(k)) porExt.set(k, [...(porExt.get(k) ?? []), { estoque: l.estoque, status: l.status }]);
      }
    }
  }
  return (externalId: string | null): string[] => {
    const ls = externalId ? porExt.get(externalId) ?? [] : [];
    if (!ls.length) return [];
    const a: string[] = [];
    if (ls.every((l) => (l.estoque ?? 0) <= 0)) a.push("Anúncio sem estoque");
    if (ls.every((l) => l.status === "paused")) a.push("Anúncio pausado no Mercado Livre");
    return a;
  };
}

async function previa(ctx: Contexto, body: Record<string, unknown>) {
  const tipo = body.tipo as Tipo;
  if (!TIPOS.includes(tipo)) return { ok: false as const, status: 400, erro: "Ação de Ads inválida." };
  const c = await contexto(ctx);
  if (!c.anunciante) return { ok: false as const, status: 409, erro: "Esta conta não tem Product Ads ativo. O vendedor ativa em Mercado Livre > Meu perfil > Publicidade; depois use Atualizar." };
  const site = c.anunciante.site_id;
  const nomes = new Map(c.campanhas.map((x) => [x.campaign_id, x.name ?? `Campanha ${x.campaign_id}`]));

  if (tipo === "campanha_criar") {
    const d = lerDadosCampanha(body.campanha, true);
    if (!d.ok) return { ok: false as const, status: 400, erro: d.erro };
    const dados = d.dados as Required<DadosCampanha>;
    const repetida = c.campanhas.some((x) => (x.name ?? "").trim().toLowerCase() === dados.name.toLowerCase());
    const soma = c.campanhas.filter((x) => ativa(x.status)).reduce((s, x) => s + orcamentoDe(x), 0) + (dados.status === "active" ? dados.budget : 0);
    const linha: Linha = {
      chave: "campanha:nova",
      item_id: null,
      titulo: dados.name,
      antes: "Não existe",
      depois: textoCampanha(dados),
      aviso: [alertaOrcamento(soma, c.faturamento, c.limites.meta_investimento_ads), "A campanha nasce sem anúncios; inclua depois."].filter(Boolean).join(" "),
      bloqueio: repetida ? "Já existe campanha com este nome nesta conta." : null,
      hash: "nova",
      dados: { tipo, site, advertiser_id: c.anunciante.advertiser_id, campanha: dados, acao_log: "ads.campanha_criar" },
    };
    return { ok: true as const, linhas: [linha] };
  }

  if (tipo === "campanha_editar") {
    const id = Number(body.campaign_id);
    if (!Number.isSafeInteger(id) || !nomes.has(id)) return { ok: false as const, status: 404, erro: "Campanha não encontrada nesta conta. Use Atualizar." };
    const d = lerDadosCampanha(body.campanha, false);
    if (!d.ok) return { ok: false as const, status: 400, erro: d.erro };
    const r = await lerCampanha(site, id, ctx.token);
    if (!r.ok) return { ok: false as const, status: 502, erro: r.erro };
    const atual = lerCampanhaMl(r.json);
    if (!atual) return { ok: false as const, status: 502, erro: "O Mercado Livre devolveu a campanha sem dados." };
    const m = mudancasCampanha(atual, d.dados);
    const depois = { ...atual, ...m };
    const outras = c.campanhas.filter((x) => x.campaign_id !== id && ativa(x.status)).reduce((s, x) => s + orcamentoDe(x), 0);
    const sobe = depois.status === "active" && (atual.status !== "active" || (depois.budget ?? 0) > (atual.budget ?? 0));
    const avisos = [
      sobe ? alertaOrcamento(outras + (depois.budget ?? 0), c.faturamento, c.limites.meta_investimento_ads) : null,
      ...alertasDesempenho(indicadores(await metricas30d(ctx, id), c.faturamento), c.limites).map((a) => `${a} nos últimos 30 dias`),
    ].filter(Boolean);
    const linha: Linha = {
      chave: `campanha:${id}`,
      item_id: null,
      titulo: atual.name ?? `Campanha ${id}`,
      antes: textoCampanha(atual),
      depois: textoCampanha(depois),
      aviso: avisos.length ? `${avisos.join(". ")}.` : null,
      bloqueio: Object.keys(m).length ? null : "Nada muda nesta campanha.",
      hash: estadoCampanha(atual),
      dados: { tipo, site, advertiser_id: c.anunciante.advertiser_id, campaign_id: id, mudancas: m, acao_log: "ads.campanha_editar" },
    };
    return { ok: true as const, linhas: [linha] };
  }

  const ids = [...new Set((Array.isArray(body.ad_group_ids) ? body.ad_group_ids : []).map(Number).filter(Number.isSafeInteger))];
  if (!ids.length) return { ok: false as const, status: 400, erro: "Escolha ao menos um anúncio." };
  if (ids.length > MAX_GRUPOS_LOTE) return { ok: false as const, status: 400, erro: `No máximo ${MAX_GRUPOS_LOTE} anúncios por vez.` };
  const destino = tipo === "grupos_incluir" ? Number(body.campaign_id) : null;
  if (tipo === "grupos_incluir" && (!Number.isSafeInteger(destino) || !nomes.has(destino!))) {
    return { ok: false as const, status: 404, erro: "Campanha de destino não encontrada nesta conta. Use Atualizar." };
  }
  const status = body.status;
  if (tipo === "grupos_status" && status !== "active" && status !== "paused") return { ok: false as const, status: 400, erro: "Status deve ser ativo ou pausado." };

  const { data: locais } = await ctx.admin.from("ml_ads_ads").select("ad_group_id, external_id, title").eq("account_id", ctx.accountId).in("ad_group_id", ids);
  const local = new Map((locais ?? []).map((l) => [Number(l.ad_group_id), l as { external_id: string | null; title: string | null }]));
  const avisosDe = await avisosDosAnuncios(ctx, ids.map((id) => ({ id, external_id: local.get(id)?.external_id ?? null })));

  const linhas: Linha[] = [];
  for (const id of ids) {
    const base = { chave: `grupo:${id}`, item_id: local.get(id)?.external_id ?? null, titulo: local.get(id)?.title ?? `Anúncio ${id}` };
    if (!local.has(id)) {
      linhas.push({ ...base, antes: "—", depois: "—", bloqueio: "Anúncio não encontrado nesta conta. Use Atualizar.", hash: "", dados: {} });
      continue;
    }
    const r = await lerGrupo(site, id, ctx.token);
    const g = r.ok ? lerGrupoMl(r.json) : null;
    if (!g) {
      linhas.push({ ...base, antes: "—", depois: "—", bloqueio: r.ok ? "O Mercado Livre devolveu o anúncio sem dados." : r.erro, hash: "", dados: {} });
      continue;
    }
    const antes = descreverGrupo(g, nomes);
    const avisosAnuncio = avisosDe(g.external_id ?? base.item_id);
    let depois: string;
    let bloqueio: string | null = null;
    let envio: Record<string, unknown>;
    const aviso: string[] = [];
    if (tipo === "grupos_incluir") {
      depois = `${nomes.get(destino!)} · Ativo`;
      if (g.campaign_id === destino && g.status === "active") bloqueio = "Já está ativo nesta campanha.";
      if (g.campaign_id && g.campaign_id !== destino) aviso.push(`Sai de ${nomes.get(g.campaign_id) ?? `Campanha ${g.campaign_id}`}`);
      aviso.push(...avisosAnuncio);
      envio = { metodo: "PUT", corpo: { status: "active", campaign_id: destino }, esperado: { campaign_id: destino, status: "active" }, acao_log: g.campaign_id && g.campaign_id !== destino ? "ads.anuncio_mover" : "ads.anuncio_incluir" };
    } else if (tipo === "grupos_status") {
      depois = g.campaign_id ? `${nomes.get(g.campaign_id) ?? `Campanha ${g.campaign_id}`} · ${status === "paused" ? "Pausado" : "Ativo"}` : "Sem campanha";
      if (!g.campaign_id) bloqueio = "Fora de campanha. Inclua numa campanha antes.";
      else if (g.status === status) bloqueio = status === "active" ? "Já está ativo." : "Já está pausado.";
      if (status === "active") aviso.push(...avisosAnuncio);
      envio = { metodo: "PUT", corpo: { status, campaign_id: g.campaign_id }, esperado: { campaign_id: g.campaign_id, status }, acao_log: status === "active" ? "ads.anuncio_ativar" : "ads.anuncio_pausar" };
    } else {
      depois = "Sem campanha";
      if (!g.campaign_id) bloqueio = "Já está fora de campanha.";
      envio = { metodo: "DELETE", campanha: g.campaign_id, esperado: { campaign_id: null }, acao_log: "ads.anuncio_remover" };
    }
    linhas.push({
      ...base,
      titulo: g.titulo ?? base.titulo,
      antes,
      depois,
      aviso: aviso.length ? aviso.join(". ") + "." : null,
      bloqueio,
      hash: estadoGrupo(g),
      dados: { tipo, site, ad_group_id: id, ...envio },
    });
  }
  return { ok: true as const, linhas };
}

async function executar(ctx: Contexto, linha: Linha): Promise<Execucao> {
  const d = linha.dados as Record<string, unknown>;
  const site = d.site as string;
  const base = { chave: linha.chave, item_id: linha.item_id };
  const recusa = (mensagem: string, codigo: string | null = null, auditoria?: Execucao["auditoria"]): Execucao =>
    ({ resultado: { ...base, status: "recusado", mensagem, codigo_ml: codigo }, auditoria });

  if (d.tipo === "campanha_criar") {
    const corpo = { ...(d.campanha as DadosCampanha), channel: "marketplace" };
    const adv = d.advertiser_id as number;
    const r = await escreverAds("POST", `/${site}/advertisers/${adv}/product_ads/campaigns`, ctx.token, corpo, V2);
    const auditoria = { payload: corpo, resposta: r.ok ? r.json : { status: r.status, erro: r.erro }, codigo: r.ok ? null : r.codigo };
    if (r.ok) {
      const criada = lerCampanhaMl(r.json);
      if (criada) await gravarCampanha(ctx, criada, adv, site);
      return { resultado: { ...base, status: "feito", mensagem: criada ? `Campanha ${criada.id} criada.` : null }, auditoria };
    }
    if (r.incerto) {
      const busca = await lerAds(`/${site}/advertisers/${adv}/product_ads/campaigns/search?limit=50&offset=0`, ctx.token, V2);
      const lista = busca.ok ? ((busca.json as { results?: unknown[] }).results ?? []) : [];
      const achada = lista.map(lerCampanhaMl).find((x) => x?.name === corpo.name);
      if (achada) {
        await gravarCampanha(ctx, achada, adv, site);
        return { resultado: { ...base, status: "feito", mensagem: "Confirmado relendo o Mercado Livre." }, auditoria };
      }
      return recusa("O Mercado Livre não confirmou a criação. Confira a lista de campanhas antes de tentar de novo.", r.codigo, auditoria);
    }
    return recusa(r.erro, r.codigo, auditoria);
  }

  if (d.tipo === "campanha_editar") {
    const id = d.campaign_id as number;
    const atual = await lerCampanha(site, id, ctx.token);
    const c = atual.ok ? lerCampanhaMl(atual.json) : null;
    if (!c) return recusa(atual.ok ? "O Mercado Livre devolveu a campanha sem dados." : atual.erro);
    if (estadoCampanha(c) !== linha.hash) return { resultado: { ...base, status: "conflito", mensagem: "A campanha mudou desde a prévia. Gere outra prévia." } };
    const m = d.mudancas as DadosCampanha;
    const r = await escreverAds("PUT", `/${site}/product_ads/campaigns/${id}`, ctx.token, m, V2);
    const auditoria = { payload: m, resposta: r.ok ? r.json : { status: r.status, erro: r.erro }, codigo: r.ok ? null : r.codigo };
    const confere = (x: CampanhaMl | null) => !!x && Object.entries(m).every(([k, v]) => x[k as keyof CampanhaMl] === v);
    let final = r.ok ? lerCampanhaMl(r.json) : null;
    if (!r.ok && r.incerto) {
      const de = await lerCampanha(site, id, ctx.token);
      final = de.ok ? lerCampanhaMl(de.json) : null;
      if (!confere(final)) return recusa("O Mercado Livre não confirmou a alteração. Confira a campanha antes de tentar de novo.", r.codigo, auditoria);
    } else if (!r.ok) return recusa(r.erro, r.codigo, auditoria);
    await gravarCampanha(ctx, final && final.name != null ? final : { ...c, ...m }, d.advertiser_id as number, site);
    return { resultado: { ...base, status: "feito", mensagem: null }, auditoria };
  }

  const id = d.ad_group_id as number;
  const atual = await lerGrupo(site, id, ctx.token);
  const g = atual.ok ? lerGrupoMl(atual.json) : null;
  if (!g) return recusa(atual.ok ? "O Mercado Livre devolveu o anúncio sem dados." : atual.erro);
  if (estadoGrupo(g) !== linha.hash) return { resultado: { ...base, status: "conflito", mensagem: "O anúncio mudou na campanha desde a prévia. Gere outra prévia." } };

  const esperado = d.esperado as { campaign_id: number | null; status?: string };
  const r = d.metodo === "DELETE"
    ? await escreverAds("DELETE", `/${site}/product_ads/campaigns/${d.campanha}/ad_groups/${id}`, ctx.token, null)
    : await escreverAds("PUT", `/${site}/product_ads/ad_groups/${id}`, ctx.token, d.corpo);
  const auditoria = { payload: { metodo: d.metodo, ad_group_id: id, corpo: d.corpo ?? null }, resposta: r.ok ? r.json : { status: r.status, erro: r.erro }, codigo: r.ok ? null : r.codigo };
  if (!r.ok && !r.incerto) return recusa(r.erro, r.codigo, auditoria);

  const depois = await lerGrupo(site, id, ctx.token);
  const gd = depois.ok ? lerGrupoMl(depois.json) : null;
  const aplicado = !!gd && gd.campaign_id === esperado.campaign_id && (esperado.status === undefined || gd.status === esperado.status);
  if (!r.ok && !aplicado) return recusa("O Mercado Livre não confirmou a alteração. Confira o anúncio antes de tentar de novo.", r.codigo, auditoria);
  await ctx.admin.from("ml_ads_ads").update({
    campaign_id: gd?.campaign_id ?? esperado.campaign_id,
    status: gd?.status ?? esperado.status ?? null,
    synced_at: new Date().toISOString(),
  }).eq("account_id", ctx.accountId).eq("ad_group_id", id);
  return { resultado: { ...base, status: "feito", mensagem: r.ok && gd && !aplicado ? "Enviado; o Mercado Livre ainda mostra o estado anterior." : null }, auditoria };
}

servirAcaoEmLote({ acao: "ads", previa, executar });
