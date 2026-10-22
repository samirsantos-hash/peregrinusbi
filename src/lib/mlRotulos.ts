export const LOGISTICA: Record<string, string> = {
  fulfillment: "Full",
  self_service: "Flex",
  xd_drop_off: "Agência",
  cross_docking: "Coleta",
  drop_off: "Correios",
  sem_info: "Sem informação",
};

export const TIPO_ANUNCIO: Record<string, string> = {
  gold_pro: "Premium",
  gold_special: "Clássico",
  gold_premium: "Diamante",
  free: "Grátis",
};

export const STATUS_ANUNCIO: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
};

/** Situação do anúncio numa promoção (seller-promotions). */
export const STATUS_PROMO_ITEM: Record<string, string> = {
  candidate: "Convite",
  candidated: "Convite",
  pending: "Programada",
  programmed: "Programada",
  started: "Ativa",
  active: "Ativa",
  finished: "Encerrada",
};

/** Situação da promoção ou campanha. */
export const STATUS_PROMOCAO: Record<string, string> = {
  pending: "Programada",
  started: "Em andamento",
  finished: "Encerrada",
  deleted: "Excluída",
};

export const TIPO_PROMOCAO: Record<string, string> = {
  DEAL: "Campanha tradicional",
  MARKETPLACE_CAMPAIGN: "Campanha cofinanciada",
  VOLUME: "Desconto por quantidade",
  PRE_NEGOTIATED: "Desconto pré-acordado",
  UNHEALTHY_STOCK: "Liquidação de estoque Full",
  SMART: "Cofinanciada automatizada",
  PRICE_MATCHING: "Preços competitivos",
  DOD: "Oferta do dia",
  LIGHTNING: "Oferta relâmpago",
  SELLER_CAMPAIGN: "Campanha do vendedor",
  PRICE_DISCOUNT: "Desconto individual",
  SELLER_COUPON_CAMPAIGN: "Cupom do vendedor",
};

/** Tipos em que o vendedor define o preço da oferta. */
export const PROMO_PRECO_VENDEDOR = new Set(["DEAL", "DOD", "LIGHTNING", "SELLER_CAMPAIGN", "PRICE_DISCOUNT"]);
/** Tipos que aceitam preço para compradores fiéis (top_deal_price). */
export const PROMO_PRECO_FIEL = new Set(["DEAL", "SELLER_CAMPAIGN", "PRICE_DISCOUNT"]);
