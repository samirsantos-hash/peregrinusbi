// ml-promotions-action
// Central de Promoções: entrar, alterar o preço da oferta e sair (um ou vários anúncios),
// criar e excluir cupom do vendedor. Sempre em duas etapas (prévia → confirmação).
//
// previa: { account_id, etapa: "previa", idempotency_key, acao, ... }
//   acao "aderir" | "alterar" | "sair":
//     itens: [{ item_id, promotion_type, promotion_id?, offer_id?, deal_price?, top_deal_price?,
//               stock?, start_date?, finish_date? }]   (até 50; datas em YYYY-MM-DD)
//   acao "cupom_criar":  cupom: { name, sub_type, fixed_percentage | fixed_amount, min_purchase_amount,
//                                 max_purchase_amount?, start_date, finish_date, budget, partial_coupon_code? }
//   acao "cupom_excluir": promotion_id
// confirmar: { account_id, etapa: "confirmar", idempotency_key }
// Contrato de resposta em _shared/mlAcaoLote.ts.
//
// Regras por tipo em _shared/mlPromocoes.ts. Alterar oferta: campanha tradicional usa PUT; desconto
// individual sai e entra de novo (o ML não edita). Oferta do dia e relâmpago não saem depois de começar.

import { buscarMl, enviarMl } from "../_shared/mlHttp.ts";
import { type Contexto, type Execucao, type Linha, servirAcaoEmLote } from "../_shared/mlAcaoLote.ts";
import {
  acharPromo,
  candidato,
  corpoAdesao,
  type EntradaPromo,
  estadoPromo,
  hojeSaoPaulo,
  lerEntrada,
  lerPromocao,
  lerPromosDoItem,
  motivoSemSaida,
  nomeTipo,
  participa,
  type PromoDoItem,
  type Promocao,
  querySaida,
  resultados,
  TIPOS_PROMO,
  totalPaginas,
  validarCupom,
} from "../_shared/mlPromocoes.ts";

const API = "https://api.mercadolibre.com";
const MAX_ITENS = 50;
const ACOES_ITEM = ["aderir", "alterar", "sair"] as const;
type AcaoItem = typeof ACOES_ITEM[number];

const brl = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const dia = (s: string) => s.split("-").reverse().join("/");

async function promosDoItem(token: string, itemId: string): Promise<{ ok: true; lista: PromoDoItem[] } | { ok: false; erro: string }> {
  const r = await buscarMl(`${API}/seller-promotions/items/${itemId}?app_version=v2`, token);
  if (r.ok) return { ok: true, lista: lerPromosDoItem(r.json) };
  if (r.status === 404) return { ok: true, lista: [] };
  return { ok: false, erro: r.erro };
}

async function donoDoItem(ctx: Contexto, itemId: string): Promise<{ ok: true; titulo: string | null } | { ok: false; erro: string }> {
  const r = await buscarMl(`${API}/items/${itemId}?attributes=id,seller_id,title`, ctx.token);
  if (!r.ok) return { ok: false, erro: r.erro };
  const b = r.json as { seller_id?: unknown; title?: unknown };
  if (typeof b.seller_id === "number" && b.seller_id !== Number(ctx.conta.ml_user_id)) return { ok: false, erro: "Este anúncio não é desta conta." };
  return { ok: true, titulo: typeof b.title === "string" ? b.title : null };
}

function textoNaPromo(tipo: string, preco: number | null | undefined, original: number | null | undefined) {
  const t = TIPOS_PROMO[tipo];
  if (t?.preco === "cupom") return "No cupom (desconto no carrinho)";
  if (preco == null) return "Na promoção (preço definido pelo Mercado Livre)";
  const desconto = original ? ` (−${((1 - preco / original) * 100).toFixed(1).replace(".", ",")}%)` : "";
  return `Na promoção por ${brl(preco)}${desconto}`;
}

/** Espelha o estado do anúncio em ml_promotion_items para as promoções já sincronizadas. */
async function atualizarLocal(ctx: Contexto, itemId: string) {
  const lido = await promosDoItem(ctx.token, itemId);
  if (!lido.ok) return;
  const { data: conhecidas } = await ctx.admin.from("ml_promotions").select("promotion_id").eq("account_id", ctx.accountId);
  const ids = new Set((conhecidas ?? []).map((c) => c.promotion_id as string));
  const presentes = lido.lista.filter((p) => p.promotion_id && ids.has(p.promotion_id));
  const agora = new Date().toISOString();
  if (presentes.length) {
    await ctx.admin.from("ml_promotion_items").upsert(presentes.map((p) => ({
      account_id: ctx.accountId,
      promotion_id: p.promotion_id,
      item_id: itemId,
      tipo: p.tipo,
      status: p.status,
      preco: p.preco,
      preco_original: p.preco_original,
      offer_id: p.offer_id,
      preco_min: p.min,
      preco_max: p.max,
      preco_sugerido: p.sugerido,
      meli_pct: p.meli_pct,
      vendedor_pct: p.vendedor_pct,
      inicio: p.inicio,
      fim: p.fim,
      synced_at: agora,
    })));
  }
  const manter = presentes.map((p) => p.promotion_id as string);
  let q = ctx.admin.from("ml_promotion_items").delete().eq("account_id", ctx.accountId).eq("item_id", itemId);
  if (manter.length) q = q.not("promotion_id", "in", `(${manter.map((m) => `"${m}"`).join(",")})`);
  await q;
}

// ── Anúncios em promoções ───────────────────────────────────────────────────

async function previaItem(ctx: Contexto, acao: AcaoItem, e: EntradaPromo, hoje: string): Promise<Linha> {
  const linha: Linha = {
    chave: `${e.item_id}:${e.promotion_type}:${e.promotion_id ?? ""}`,
    item_id: e.item_id,
    titulo: null,
    antes: "—",
    depois: "—",
    hash: "",
    dados: { acao, acao_log: `promocao.${acao}`, entrada: e },
  };
  const tipo = TIPOS_PROMO[e.promotion_type];
  if (!tipo) return { ...linha, bloqueio: `O painel ainda não opera ${e.promotion_type}. Use o Mercado Livre.` };
  const dono = await donoDoItem(ctx, e.item_id);
  if (!dono.ok) return { ...linha, bloqueio: dono.erro };
  linha.titulo = dono.titulo;
  const lido = await promosDoItem(ctx.token, e.item_id);
  if (!lido.ok) return { ...linha, bloqueio: lido.erro };
  const atual = acharPromo(lido.lista, e.promotion_type, e.promotion_id ?? null);
  linha.hash = estadoPromo(atual);
  const nome = atual?.nome ? `${nomeTipo(e.promotion_type)} · ${atual.nome}` : nomeTipo(e.promotion_type);
  linha.titulo = `${dono.titulo ?? e.item_id} — ${nome}`;
  const avisos: string[] = [];

  if (acao === "aderir") {
    if (!atual || !candidato(atual.status)) {
      return { ...linha, bloqueio: atual && participa(atual.status) ? "O anúncio já participa desta promoção." : "O anúncio não está convidado para esta promoção." };
    }
    const entrada = { ...e };
    if (tipo.preco === "vendedor" && entrada.deal_price == null && atual.sugerido != null) {
      entrada.deal_price = atual.sugerido;
      avisos.push("Usado o preço sugerido pelo Mercado Livre.");
    }
    const corpo = corpoAdesao(entrada, atual, hoje);
    if (!corpo.ok) return { ...linha, bloqueio: corpo.erro };
    linha.antes = `Fora da promoção · ${brl(atual.preco_original)}`;
    linha.depois = textoNaPromo(e.promotion_type, tipo.preco === "vendedor" ? entrada.deal_price : atual.preco, atual.preco_original);
    if (tipo.datas) linha.depois += ` · ${dia(entrada.start_date!)} a ${dia(entrada.finish_date!)}`;
    if (tipo.estoque) linha.depois += ` · ${entrada.stock} un. reservadas`;
    if (atual.meli_pct != null || atual.vendedor_pct != null) avisos.push(`Desconto: Mercado Livre ${atual.meli_pct ?? 0}% · vendedor ${atual.vendedor_pct ?? 0}%.`);
    if (e.promotion_type === "PRICE_DISCOUNT") avisos.push("Se o preço do anúncio subir, o Mercado Livre retira o desconto.");
    linha.dados = { ...linha.dados, metodo: "POST", corpo: corpo.corpo, alvo: entrada.deal_price ?? null };
  }

  if (acao === "alterar") {
    if (!atual || !participa(atual.status)) return { ...linha, bloqueio: "O anúncio não participa desta promoção." };
    if (!tipo.alterar) return { ...linha, bloqueio: `${tipo.nome} não permite alterar o preço pela API.` };
    const entrada = e.promotion_type === "PRICE_DISCOUNT" ? e : { ...e, start_date: null, finish_date: null };
    const corpo = corpoAdesao(entrada, { ...atual, min: null, max: null }, hoje);
    if (!corpo.ok) return { ...linha, bloqueio: corpo.erro };
    if (entrada.deal_price === atual.preco && tipo.alterar === "put") return { ...linha, bloqueio: "O preço novo é igual ao atual." };
    linha.antes = textoNaPromo(e.promotion_type, atual.preco, atual.preco_original);
    linha.depois = textoNaPromo(e.promotion_type, entrada.deal_price, atual.preco_original);
    if (tipo.alterar === "recriar") {
      linha.depois += ` · ${dia(entrada.start_date!)} a ${dia(entrada.finish_date!)}`;
      avisos.push("O desconto atual sai e um novo entra. Se o Mercado Livre recusar o novo, o anúncio fica sem desconto.");
    }
    linha.dados = {
      ...linha.dados,
      metodo: tipo.alterar === "put" ? "PUT" : "RECRIAR",
      corpo: corpo.corpo,
      query: querySaida(e, atual),
      alvo: entrada.deal_price,
    };
  }

  if (acao === "sair") {
    const motivo = motivoSemSaida(e, atual);
    if (motivo) return { ...linha, bloqueio: motivo };
    linha.antes = textoNaPromo(e.promotion_type, atual!.preco, atual!.preco_original);
    linha.depois = `Fora da promoção · volta a ${brl(atual!.preco_original)}`;
    linha.dados = { ...linha.dados, metodo: "DELETE", query: querySaida(e, atual) };
  }

  linha.aviso = avisos.join(" ") || null;
  return linha;
}

function concluido(acao: AcaoItem, p: PromoDoItem | null, alvo: number | null): boolean {
  if (acao === "sair") return !p || !participa(p.status);
  if (!p || !participa(p.status)) return false;
  return acao === "aderir" || alvo == null || p.preco === alvo;
}

async function executarItem(ctx: Contexto, linha: Linha): Promise<Execucao> {
  const acao = linha.dados.acao as AcaoItem;
  const e = linha.dados.entrada as EntradaPromo;
  const alvo = (linha.dados.alvo as number | null | undefined) ?? null;
  const r = (status: Execucao["resultado"]["status"], mensagem: string | null, codigo_ml: string | null = null) =>
    ({ chave: linha.chave, item_id: linha.item_id, status, mensagem, codigo_ml });

  const lido = await promosDoItem(ctx.token, e.item_id);
  if (!lido.ok) return { resultado: r("recusado", lido.erro) };
  const agora = acharPromo(lido.lista, e.promotion_type, e.promotion_id ?? null);
  if (estadoPromo(agora) !== linha.hash) {
    if (concluido(acao, agora, alvo)) return { resultado: r("ja_feito", "Já estava assim no Mercado Livre.") };
    return { resultado: r("conflito", "A promoção mudou no Mercado Livre desde a prévia. Gere nova prévia.") };
  }

  const urlItem = `${API}/seller-promotions/items/${e.item_id}`;
  const metodo = linha.dados.metodo as string;
  const chamadas: unknown[] = [];
  let envio: Awaited<ReturnType<typeof enviarMl>>;
  if (metodo === "DELETE" || metodo === "RECRIAR") {
    const url = `${urlItem}?${linha.dados.query}`;
    envio = await enviarMl("DELETE", url, ctx.token, null);
    chamadas.push({ metodo: "DELETE", url, status: envio.status });
    if (metodo === "RECRIAR" && (envio.ok || envio.incerto)) {
      if (!envio.ok) {
        const relido = await promosDoItem(ctx.token, e.item_id);
        const p = relido.ok ? acharPromo(relido.lista, e.promotion_type, e.promotion_id ?? null) : agora;
        if (p && participa(p.status)) {
          const auditoria = { payload: chamadas, resposta: { status: envio.status, erro: envio.erro }, codigo: envio.codigo };
          return { resultado: r("recusado", envio.erro, envio.codigo), auditoria };
        }
      }
      const url2 = `${urlItem}?app_version=v2`;
      envio = await enviarMl("POST", url2, ctx.token, linha.dados.corpo);
      chamadas.push({ metodo: "POST", url: url2, corpo: linha.dados.corpo, status: envio.status });
      if (!envio.ok && !envio.incerto) {
        envio = { ...envio, erro: `O desconto antigo foi removido, mas o Mercado Livre recusou o novo: ${envio.erro}` };
      }
    }
  } else {
    const url = `${urlItem}?app_version=v2`;
    envio = await enviarMl(metodo === "PUT" ? "PUT" : "POST", url, ctx.token, linha.dados.corpo);
    chamadas.push({ metodo, url, corpo: linha.dados.corpo, status: envio.status });
  }

  let ok = envio.ok;
  if (!envio.ok && envio.incerto) {
    const relido = await promosDoItem(ctx.token, e.item_id);
    ok = relido.ok && concluido(acao, acharPromo(relido.lista, e.promotion_type, e.promotion_id ?? null), alvo);
  }
  const auditoria = { payload: chamadas, resposta: envio.ok ? envio.json : { status: envio.status, erro: envio.erro }, codigo: envio.ok ? null : envio.codigo };
  if (!ok) return { resultado: r("recusado", envio.ok ? null : envio.erro, envio.ok ? null : envio.codigo), auditoria };
  await atualizarLocal(ctx, e.item_id);
  return { resultado: r("feito", null), auditoria };
}

// ── Cupom do vendedor ───────────────────────────────────────────────────────

async function cuponsDaConta(ctx: Contexto) {
  const lista: Promocao[] = [];
  let lidas = 0;
  for (let pagina = 0; pagina < 100; pagina++) {
    const r = await buscarMl(`${API}/seller-promotions/users/${ctx.conta.ml_user_id}?app_version=v2${lidas ? `&offset=${lidas}` : ""}`, ctx.token);
    if (!r.ok) return { ok: false as const, erro: r.erro };
    const brutos = resultados(r.json);
    lista.push(...brutos.map(lerPromocao).filter((p): p is Promocao => p?.tipo === "SELLER_COUPON_CAMPAIGN"));
    lidas += brutos.length;
    const total = totalPaginas(r.json);
    if (!brutos.length || total === null || lidas >= total) break;
  }
  return { ok: true as const, lista };
}

const nomeIgual = (a: string | null, b: string) => (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();

async function gravarPromocaoLocal(ctx: Contexto, json: unknown) {
  const p = lerPromocao(json);
  if (!p) return;
  await ctx.admin.from("ml_promotions").upsert({
    account_id: ctx.accountId,
    promotion_id: p.promotion_id,
    tipo: p.tipo,
    sub_tipo: p.sub_tipo,
    status: p.status,
    nome: p.nome,
    inicio: p.inicio,
    fim: p.fim,
    prazo: p.prazo,
    beneficios: p.beneficios,
    extras: p.extras,
    synced_at: new Date().toISOString(),
  });
}

async function previaCupomCriar(ctx: Contexto, bruto: unknown, hoje: string): Promise<Linha | { erro: string }> {
  const v = validarCupom(bruto, hoje);
  if (!v.ok) return { erro: v.erros.join(" ") };
  const c = v.cupom;
  const existentes = await cuponsDaConta(ctx);
  if (!existentes.ok) return { erro: existentes.erro };
  const desconto = c.sub_type === "FIXED_PERCENTAGE"
    ? `${c.fixed_percentage}% (até ${brl(c.max_purchase_amount)} por compra)`
    : brl(c.fixed_amount);
  return {
    chave: "cupom",
    item_id: null,
    titulo: `Cupom «${c.name}»`,
    antes: "Sem este cupom",
    depois: `${desconto} em compras a partir de ${brl(c.min_purchase_amount)} · ${dia(c.start_date)} a ${dia(c.finish_date)} · orçamento ${brl(c.budget)}${c.partial_coupon_code ? ` · código ${c.partial_coupon_code}` : " · sem código (vale para todos)"}`,
    aviso: c.partial_coupon_code ? "O Mercado Livre põe as 5 primeiras letras do apelido da loja antes do código." : null,
    bloqueio: existentes.lista.some((p) => nomeIgual(p.nome, c.name)) ? "Já existe um cupom com este nome." : null,
    hash: "novo",
    dados: { acao_log: "promocao.cupom_criar", tipo: "cupom_criar", nome: c.name, corpo: v.corpo },
  };
}

async function executarCupomCriar(ctx: Contexto, linha: Linha): Promise<Execucao> {
  const r = (status: Execucao["resultado"]["status"], mensagem: string | null, codigo_ml: string | null = null) =>
    ({ chave: linha.chave, item_id: null, status, mensagem, codigo_ml });
  const nome = linha.dados.nome as string;
  const antes = await cuponsDaConta(ctx);
  if (!antes.ok) return { resultado: r("recusado", antes.erro) };
  if (antes.lista.some((p) => nomeIgual(p.nome, nome))) return { resultado: r("conflito", "Já existe um cupom com este nome.") };

  const url = `${API}/seller-promotions/promotions?app_version=v2`;
  const envio = await enviarMl("POST", url, ctx.token, linha.dados.corpo);
  let ok = envio.ok;
  if (envio.ok) await gravarPromocaoLocal(ctx, envio.json);
  if (!envio.ok && envio.incerto) {
    const depois = await cuponsDaConta(ctx);
    ok = depois.ok && depois.lista.some((p) => nomeIgual(p.nome, nome));
  }
  const auditoria = { payload: { metodo: "POST", url, corpo: linha.dados.corpo }, resposta: envio.ok ? envio.json : { status: envio.status, erro: envio.erro }, codigo: envio.ok ? null : envio.codigo };
  return { resultado: ok ? r("feito", null) : r("recusado", envio.ok ? null : envio.erro, envio.ok ? null : envio.codigo), auditoria };
}

async function lerCupom(ctx: Contexto, id: string) {
  const r = await buscarMl(`${API}/seller-promotions/promotions/${encodeURIComponent(id)}?promotion_type=SELLER_COUPON_CAMPAIGN&app_version=v2`, ctx.token);
  if (r.status === 404) return { ok: true as const, cupom: null };
  if (!r.ok) return { ok: false as const, erro: r.erro };
  return { ok: true as const, cupom: lerPromocao(r.json) };
}

const estadoCupom = (c: ReturnType<typeof lerPromocao>) => (c ? `${c.status}|${c.fim}|${c.extras.budget ?? ""}` : "ausente");

async function previaCupomExcluir(ctx: Contexto, id: unknown): Promise<Linha | { erro: string; status?: number }> {
  if (typeof id !== "string" || !id) return { erro: "Informe o cupom." };
  const { data: local } = await ctx.admin.from("ml_promotions").select("promotion_id")
    .eq("account_id", ctx.accountId).eq("promotion_id", id).eq("tipo", "SELLER_COUPON_CAMPAIGN").maybeSingle();
  if (!local) return { erro: "Este cupom não é desta conta. Atualize as promoções.", status: 403 };
  const lido = await lerCupom(ctx, id);
  if (!lido.ok) return { erro: lido.erro, status: 502 };
  if (!lido.cupom || lido.cupom.status === "deleted") return { erro: "O cupom já não existe no Mercado Livre." };
  const c = lido.cupom;
  return {
    chave: id,
    item_id: null,
    titulo: `Cupom «${c.nome ?? id}»`,
    antes: `Cupom ${c.status === "started" ? "ativo" : c.status === "pending" ? "programado" : c.status ?? ""}`.trim(),
    depois: "Cupom excluído",
    aviso: c.status === "started" ? "O cupom está ativo: compradores deixam de usá-lo na hora." : null,
    hash: estadoCupom(c),
    dados: { acao_log: "promocao.cupom_excluir", tipo: "cupom_excluir", promotion_id: id },
  };
}

async function executarCupomExcluir(ctx: Contexto, linha: Linha): Promise<Execucao> {
  const id = linha.dados.promotion_id as string;
  const r = (status: Execucao["resultado"]["status"], mensagem: string | null, codigo_ml: string | null = null) =>
    ({ chave: linha.chave, item_id: null, status, mensagem, codigo_ml });
  const lido = await lerCupom(ctx, id);
  if (!lido.ok) return { resultado: r("recusado", lido.erro) };
  if (!lido.cupom || lido.cupom.status === "deleted") {
    await ctx.admin.from("ml_promotions").delete().eq("account_id", ctx.accountId).eq("promotion_id", id);
    return { resultado: r("ja_feito", "O cupom já tinha sido excluído.") };
  }
  if (estadoCupom(lido.cupom) !== linha.hash) return { resultado: r("conflito", "O cupom mudou no Mercado Livre desde a prévia. Gere nova prévia.") };

  const url = `${API}/seller-promotions/promotions/${encodeURIComponent(id)}?promotion_type=SELLER_COUPON_CAMPAIGN&app_version=v2`;
  const envio = await enviarMl("DELETE", url, ctx.token, null);
  let ok = envio.ok;
  if (!envio.ok && envio.incerto) {
    const relido = await lerCupom(ctx, id);
    ok = relido.ok && (!relido.cupom || relido.cupom.status === "deleted");
  }
  if (ok) await ctx.admin.from("ml_promotions").delete().eq("account_id", ctx.accountId).eq("promotion_id", id);
  const auditoria = { payload: { metodo: "DELETE", url }, resposta: envio.ok ? envio.json : { status: envio.status, erro: envio.erro }, codigo: envio.ok ? null : envio.codigo };
  return { resultado: ok ? r("feito", null) : r("recusado", envio.ok ? null : envio.erro, envio.ok ? null : envio.codigo), auditoria };
}

// ── Roteamento ──────────────────────────────────────────────────────────────

async function previa(ctx: Contexto, body: Record<string, unknown>) {
  const hoje = hojeSaoPaulo();
  const acao = body.acao;
  if (acao === "cupom_criar" || acao === "cupom_excluir") {
    const l = acao === "cupom_criar" ? await previaCupomCriar(ctx, body.cupom, hoje) : await previaCupomExcluir(ctx, body.promotion_id);
    if ("erro" in l) return { ok: false as const, erro: l.erro, status: ("status" in l && l.status) || 400 };
    return { ok: true as const, linhas: [l] };
  }
  if (!ACOES_ITEM.includes(acao as AcaoItem)) return { ok: false as const, erro: "Ação inválida.", status: 400 };
  const brutos = Array.isArray(body.itens) ? body.itens : [];
  const entradas = brutos.map(lerEntrada).filter((x): x is EntradaPromo => x !== null);
  if (!entradas.length || entradas.length !== brutos.length) return { ok: false as const, erro: "Lista de anúncios inválida.", status: 400 };
  if (entradas.length > MAX_ITENS) return { ok: false as const, erro: `No máximo ${MAX_ITENS} anúncios por vez.`, status: 400 };
  const linhas: Linha[] = [];
  const vistas = new Set<string>();
  for (const e of entradas) {
    const linha = await previaItem(ctx, acao as AcaoItem, e, hoje);
    if (vistas.has(linha.chave)) continue;
    vistas.add(linha.chave);
    linhas.push(linha);
  }
  return { ok: true as const, linhas };
}

function executar(ctx: Contexto, linha: Linha): Promise<Execucao> {
  if (linha.dados.tipo === "cupom_criar") return executarCupomCriar(ctx, linha);
  if (linha.dados.tipo === "cupom_excluir") return executarCupomExcluir(ctx, linha);
  return executarItem(ctx, linha);
}

servirAcaoEmLote({ acao: "promocao", previa, executar });
