// Regras puras da Central de Promoções (seller-promotions, app_version=v2). Sem I/O.

export type ComoDefinePreco = "vendedor" | "ml" | "cupom";

export type TipoPromo = {
  nome: string;
  preco: ComoDefinePreco;
  /** Adesão exige o offer_id do candidato. */
  offerId: boolean;
  /** Adesão exige estoque reservado. */
  estoque: boolean;
  /** Adesão exige data de início e fim. */
  datas: boolean;
  /** Como alterar a oferta já criada: PUT, sair e entrar de novo, ou não dá. */
  alterar: "put" | "recriar" | null;
  /** Depois de começar, a oferta não pode ser removida. */
  travadaAoComecar: boolean;
  /** Corpo da adesão leva promotion_id. */
  enviaPromotionId: boolean;
};

export const TIPOS_PROMO: Record<string, TipoPromo> = {
  DEAL: { nome: "Campanha tradicional", preco: "vendedor", offerId: false, estoque: false, datas: false, alterar: "put", travadaAoComecar: false, enviaPromotionId: true },
  MARKETPLACE_CAMPAIGN: { nome: "Campanha cofinanciada", preco: "ml", offerId: false, estoque: false, datas: false, alterar: null, travadaAoComecar: false, enviaPromotionId: true },
  VOLUME: { nome: "Desconto por quantidade", preco: "ml", offerId: false, estoque: false, datas: false, alterar: null, travadaAoComecar: false, enviaPromotionId: true },
  PRE_NEGOTIATED: { nome: "Desconto pré-acordado", preco: "ml", offerId: true, estoque: false, datas: false, alterar: null, travadaAoComecar: false, enviaPromotionId: true },
  UNHEALTHY_STOCK: { nome: "Liquidação de estoque Full", preco: "ml", offerId: true, estoque: false, datas: false, alterar: null, travadaAoComecar: false, enviaPromotionId: true },
  SMART: { nome: "Cofinanciada automatizada", preco: "ml", offerId: true, estoque: false, datas: false, alterar: null, travadaAoComecar: false, enviaPromotionId: true },
  PRICE_MATCHING: { nome: "Preços competitivos", preco: "ml", offerId: true, estoque: false, datas: false, alterar: null, travadaAoComecar: false, enviaPromotionId: true },
  DOD: { nome: "Oferta do dia", preco: "vendedor", offerId: false, estoque: false, datas: false, alterar: null, travadaAoComecar: true, enviaPromotionId: false },
  LIGHTNING: { nome: "Oferta relâmpago", preco: "vendedor", offerId: false, estoque: true, datas: false, alterar: null, travadaAoComecar: true, enviaPromotionId: false },
  SELLER_CAMPAIGN: { nome: "Campanha do vendedor", preco: "vendedor", offerId: false, estoque: false, datas: false, alterar: null, travadaAoComecar: false, enviaPromotionId: true },
  PRICE_DISCOUNT: { nome: "Desconto individual", preco: "vendedor", offerId: false, estoque: false, datas: true, alterar: "recriar", travadaAoComecar: false, enviaPromotionId: false },
  SELLER_COUPON_CAMPAIGN: { nome: "Cupom do vendedor", preco: "cupom", offerId: false, estoque: false, datas: false, alterar: null, travadaAoComecar: false, enviaPromotionId: true },
};

export const nomeTipo = (tipo: string) => TIPOS_PROMO[tipo]?.nome ?? tipo;

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Data local YYYY-MM-DD; o ML considera só o dia (início 00:00, fim 23:59:59). */
export function lerDia(v: unknown): string | null {
  const s = txt(v);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T00:00:00Z`)) ? s : null;
}

const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function hojeSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

// ── Promoção do item (GET /seller-promotions/items/{id}) ────────────────────

export type PromoDoItem = {
  promotion_id: string | null;
  tipo: string;
  status: string;
  preco: number | null;
  preco_original: number | null;
  offer_id: string | null;
  min: number | null;
  max: number | null;
  sugerido: number | null;
  nome: string | null;
  inicio: string | null;
  fim: string | null;
  meli_pct: number | null;
  vendedor_pct: number | null;
  estoque_min: number | null;
  estoque_max: number | null;
};

export function lerPromoDoItem(json: unknown): PromoDoItem | null {
  if (!json || typeof json !== "object") return null;
  const p = json as Record<string, unknown>;
  const tipo = txt(p.type);
  const status = txt(p.status);
  if (!tipo || !status) return null;
  const estoque = p.stock && typeof p.stock === "object" ? (p.stock as Record<string, unknown>) : {};
  return {
    promotion_id: txt(p.id),
    tipo,
    status,
    preco: num(p.price),
    preco_original: num(p.original_price),
    offer_id: txt(p.offer_id) ?? txt(p.ref_id),
    min: num(p.min_discounted_price),
    max: num(p.max_discounted_price),
    sugerido: num(p.suggested_discounted_price),
    nome: txt(p.name),
    inicio: txt(p.start_date),
    fim: txt(p.finish_date) ?? txt(p.end_date),
    meli_pct: num(p.meli_percentage),
    vendedor_pct: num(p.seller_percentage),
    estoque_min: num(estoque.min),
    estoque_max: num(estoque.max),
  };
}

export function lerPromosDoItem(json: unknown): PromoDoItem[] {
  return (Array.isArray(json) ? json : []).map(lerPromoDoItem).filter((p): p is PromoDoItem => p !== null);
}

/** Desconto individual candidato não tem id: casa só pelo tipo. */
export function acharPromo(lista: PromoDoItem[], tipo: string, promotionId: string | null): PromoDoItem | null {
  if (!promotionId) return lista.find((p) => p.tipo === tipo) ?? null;
  return lista.find((p) => p.promotion_id === promotionId && p.tipo === tipo)
    ?? (tipo === "PRICE_DISCOUNT" ? lista.find((p) => p.tipo === tipo) ?? null : null);
}

export function estadoPromo(p: PromoDoItem | null): string {
  return p ? `${p.status}|${p.preco ?? ""}|${p.offer_id ?? ""}` : "ausente";
}

export const participa = (status: string) => status === "started" || status === "pending" || status === "programmed" || status === "active";
export const candidato = (status: string) => status === "candidate" || status === "candidated";

// ── Montagem das chamadas ───────────────────────────────────────────────────

export type EntradaPromo = {
  item_id: string;
  promotion_type: string;
  promotion_id?: string | null;
  offer_id?: string | null;
  deal_price?: number | null;
  top_deal_price?: number | null;
  stock?: number | null;
  start_date?: string | null;
  finish_date?: string | null;
};

export function lerEntrada(bruto: unknown): EntradaPromo | null {
  if (!bruto || typeof bruto !== "object") return null;
  const e = bruto as Record<string, unknown>;
  const itemId = txt(e.item_id);
  const tipo = txt(e.promotion_type);
  if (!itemId || !/^[A-Z]{3}\d+$/.test(itemId) || !tipo) return null;
  return {
    item_id: itemId,
    promotion_type: tipo,
    promotion_id: txt(e.promotion_id),
    offer_id: txt(e.offer_id),
    deal_price: num(e.deal_price),
    top_deal_price: num(e.top_deal_price),
    stock: num(e.stock),
    start_date: lerDia(e.start_date),
    finish_date: lerDia(e.finish_date),
  };
}

/** Corpo do POST/PUT de adesão conforme o tipo, com as regras da documentação. */
export function corpoAdesao(
  e: EntradaPromo,
  atual: PromoDoItem | null,
  hoje: string,
): { ok: true; corpo: Record<string, unknown> } | { ok: false; erro: string } {
  const tipo = TIPOS_PROMO[e.promotion_type];
  if (!tipo) return { ok: false, erro: `O painel ainda não opera ${e.promotion_type}. Use o Mercado Livre.` };
  const corpo: Record<string, unknown> = { promotion_type: e.promotion_type };
  const promotionId = e.promotion_id ?? atual?.promotion_id ?? null;
  if (tipo.enviaPromotionId) {
    if (!promotionId) return { ok: false, erro: "Promoção não informada." };
    corpo.promotion_id = promotionId;
  }
  if (tipo.offerId) {
    const offer = e.offer_id ?? atual?.offer_id ?? null;
    if (!offer) return { ok: false, erro: "O Mercado Livre não informou a oferta deste convite." };
    corpo.offer_id = offer;
  }
  if (tipo.preco === "vendedor") {
    if (e.deal_price == null || e.deal_price <= 0) return { ok: false, erro: "Informe o preço na promoção." };
    if (atual?.min != null && e.deal_price < atual.min) return { ok: false, erro: `O preço mínimo aceito pelo Mercado Livre é ${atual.min}.` };
    if (atual?.max != null && e.deal_price > atual.max) return { ok: false, erro: `O preço máximo aceito pelo Mercado Livre é ${atual.max}.` };
    corpo.deal_price = e.deal_price;
    if (e.top_deal_price != null) {
      if (e.top_deal_price <= 0 || e.top_deal_price >= e.deal_price) return { ok: false, erro: "O preço para compradores fiéis precisa ser menor que o preço da promoção." };
      corpo.top_deal_price = e.top_deal_price;
    }
  }
  if (tipo.estoque) {
    if (e.stock == null || !Number.isInteger(e.stock) || e.stock <= 0) return { ok: false, erro: "Informe o estoque reservado para a oferta." };
    if (atual?.estoque_min != null && e.stock < atual.estoque_min) return { ok: false, erro: `Estoque mínimo da oferta: ${atual.estoque_min}.` };
    if (atual?.estoque_max != null && e.stock > atual.estoque_max) return { ok: false, erro: `Estoque máximo da oferta: ${atual.estoque_max}.` };
    corpo.stock = e.stock;
  }
  if (tipo.datas) {
    if (!e.start_date || !e.finish_date) return { ok: false, erro: "Informe as datas de início e fim." };
    if (e.start_date < hoje) return { ok: false, erro: "A data de início não pode ser anterior a hoje." };
    const dias = diasEntre(e.start_date, e.finish_date);
    if (dias < 0) return { ok: false, erro: "A data de fim é anterior à de início." };
    if (dias > 13) return { ok: false, erro: "O desconto individual dura no máximo 14 dias." };
    const original = atual?.preco_original ?? null;
    if (original && e.deal_price != null) {
      const desconto = 1 - e.deal_price / original;
      if (desconto < 0.05) return { ok: false, erro: "O desconto individual precisa ser de pelo menos 5%." };
      if (desconto >= 0.8) return { ok: false, erro: "O desconto individual precisa ser menor que 80%." };
    }
    corpo.start_date = `${e.start_date}T00:00:00`;
    corpo.finish_date = `${e.finish_date}T23:59:59`;
  }
  return { ok: true, corpo };
}

/** Query do DELETE de saída. */
export function querySaida(e: EntradaPromo, atual: PromoDoItem | null): string {
  const q = new URLSearchParams({ promotion_type: e.promotion_type, app_version: "v2" });
  const promotionId = e.promotion_id ?? atual?.promotion_id ?? null;
  if (promotionId && e.promotion_type !== "PRICE_DISCOUNT") q.set("promotion_id", promotionId);
  const tipo = TIPOS_PROMO[e.promotion_type];
  const offer = e.offer_id ?? atual?.offer_id ?? null;
  if (tipo?.offerId && offer) q.set("offer_id", offer);
  return q.toString();
}

export function motivoSemSaida(e: EntradaPromo, atual: PromoDoItem | null): string | null {
  if (!atual || !participa(atual.status)) return "O anúncio não participa desta promoção.";
  const tipo = TIPOS_PROMO[e.promotion_type];
  if (tipo?.travadaAoComecar && atual.status === "started") return `${tipo.nome} já começou e não pode ser removida. Pause o anúncio se precisar.`;
  return null;
}

// ── Cupom do vendedor ───────────────────────────────────────────────────────

export type CupomEntrada = {
  name: string;
  sub_type: "FIXED_PERCENTAGE" | "FIXED_AMOUNT";
  fixed_percentage?: number;
  fixed_amount?: number;
  min_purchase_amount: number;
  max_purchase_amount?: number;
  start_date: string;
  finish_date: string;
  budget: number;
  partial_coupon_code?: string;
};

export function validarCupom(bruto: unknown, hoje: string): { ok: true; corpo: Record<string, unknown>; cupom: CupomEntrada } | { ok: false; erros: string[] } {
  const c = bruto && typeof bruto === "object" ? (bruto as Record<string, unknown>) : {};
  const erros: string[] = [];
  const name = txt(c.name);
  const sub = c.sub_type === "FIXED_PERCENTAGE" || c.sub_type === "FIXED_AMOUNT" ? c.sub_type : null;
  const inicio = lerDia(c.start_date);
  const fim = lerDia(c.finish_date);
  const minCompra = num(c.min_purchase_amount);
  const maxReembolso = num(c.max_purchase_amount);
  const orcamento = num(c.budget);
  const pct = num(c.fixed_percentage);
  const valor = num(c.fixed_amount);
  const codigo = txt(c.partial_coupon_code);

  if (!name) erros.push("Dê um nome ao cupom.");
  if (!sub) erros.push("Escolha desconto em % ou em valor.");
  if (!inicio || !fim) erros.push("Informe as datas de início e fim.");
  if (inicio && inicio < hoje) erros.push("A data de início não pode ser anterior a hoje.");
  if (inicio && fim) {
    const dias = diasEntre(inicio, fim);
    if (dias < 1) erros.push("O cupom precisa durar pelo menos 1 dia.");
    if (dias > 31) erros.push("O cupom dura no máximo 31 dias.");
  }
  if (minCompra == null || minCompra <= 0) erros.push("Informe o valor mínimo de compra.");
  if (orcamento == null || orcamento <= 0) erros.push("Informe o orçamento do cupom.");
  if (sub === "FIXED_PERCENTAGE") {
    if (pct == null || pct < 5 || pct > 80) erros.push("O desconto em % fica entre 5% e 80%.");
    if (maxReembolso == null || maxReembolso <= 0) erros.push("Informe o desconto máximo por compra.");
    if (orcamento != null && maxReembolso != null && orcamento <= maxReembolso) erros.push("O orçamento precisa ser maior que o desconto máximo por compra.");
    if (pct != null && minCompra != null && maxReembolso != null && (minCompra * pct) / 100 >= maxReembolso) {
      erros.push("O desconto sobre a compra mínima precisa ser menor que o desconto máximo por compra.");
    }
  }
  if (sub === "FIXED_AMOUNT") {
    if (valor == null || valor <= 0) erros.push("Informe o valor do desconto.");
    if (valor != null && minCompra != null && valor >= minCompra) erros.push("O desconto precisa ser menor que a compra mínima.");
  }
  if (codigo && !/^[A-Za-z0-9]{1,10}$/.test(codigo)) erros.push("O código do cupom usa só letras e números, até 10.");
  if (erros.length) return { ok: false, erros };

  const cupom: CupomEntrada = {
    name: name!,
    sub_type: sub!,
    min_purchase_amount: minCompra!,
    start_date: inicio!,
    finish_date: fim!,
    budget: orcamento!,
    ...(sub === "FIXED_PERCENTAGE" ? { fixed_percentage: pct!, max_purchase_amount: maxReembolso! } : { fixed_amount: valor! }),
    ...(codigo ? { partial_coupon_code: codigo } : {}),
  };
  return {
    ok: true,
    cupom,
    corpo: {
      promotion_type: "SELLER_COUPON_CAMPAIGN",
      ...cupom,
      start_date: `${cupom.start_date}T00:00:00`,
      finish_date: `${cupom.finish_date}T00:00:00`,
    },
  };
}

// ── Listas da sincronização ─────────────────────────────────────────────────

export type Promocao = {
  promotion_id: string;
  tipo: string;
  sub_tipo: string | null;
  status: string | null;
  nome: string | null;
  inicio: string | null;
  fim: string | null;
  prazo: string | null;
  beneficios: unknown;
  extras: Record<string, unknown>;
};

export function lerPromocao(json: unknown): Promocao | null {
  if (!json || typeof json !== "object") return null;
  const p = json as Record<string, unknown>;
  const id = txt(p.id);
  const tipo = txt(p.type);
  if (!id || !tipo) return null;
  const extras: Record<string, unknown> = {};
  for (const k of ["fixed_percentage", "fixed_amount", "min_purchase_amount", "max_purchase_amount", "budget", "remaining_budget", "used_coupons", "coupon_code"]) {
    if (p[k] !== undefined) extras[k] = p[k];
  }
  return {
    promotion_id: id,
    tipo,
    sub_tipo: txt(p.sub_type),
    status: txt(p.status),
    nome: txt(p.name),
    inicio: txt(p.start_date),
    fim: txt(p.finish_date),
    prazo: txt(p.deadline_date),
    beneficios: p.benefits ?? null,
    extras,
  };
}

/** O cursor vem como searchAfter (nome antigo) ou search_after, no topo ou em paging; some na última página. */
export function cursorSeguinte(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const b = json as Record<string, unknown>;
  const paging = b.paging && typeof b.paging === "object" && !Array.isArray(b.paging) ? (b.paging as Record<string, unknown>) : {};
  for (const v of [paging.searchAfter, paging.search_after, b.searchAfter, b.search_after]) {
    if (typeof v === "string" && v) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

export function resultados(json: unknown): unknown[] {
  const r = json && typeof json === "object" ? (json as { results?: unknown }).results : null;
  return Array.isArray(r) ? r : [];
}

export function totalPaginas(json: unknown): number | null {
  const p = json && typeof json === "object" ? (json as { paging?: unknown }).paging : null;
  const total = p && typeof p === "object" ? (p as { total?: unknown }).total : null;
  return typeof total === "number" ? total : null;
}

export function lerItemDaPromocao(json: unknown): PromoDoItem & { item_id: string } | null {
  if (!json || typeof json !== "object") return null;
  const p = json as Record<string, unknown>;
  const itemId = txt(p.id);
  const status = txt(p.status);
  if (!itemId || !status) return null;
  const base = lerPromoDoItem({ ...p, type: "ITEM", id: null });
  if (!base) return null;
  return { ...base, item_id: itemId, promotion_id: null };
}
