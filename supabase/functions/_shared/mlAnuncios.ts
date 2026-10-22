// Regras puras do catálogo de anúncios da loja. Sem I/O.

export const STATUS_BUSCA = ["active", "paused"] as const;

export const CAMPOS_ITEM = [
  "id", "title", "price", "original_price", "currency_id", "available_quantity", "sold_quantity",
  "status", "sub_status", "listing_type_id", "shipping", "catalog_listing", "category_id",
  "thumbnail", "permalink", "health", "seller_custom_field", "attributes", "variations",
  "family_id", "catalog_product_id",
].join(",");

export type Variacao = {
  id: number | null;
  sku: string | null;
  combinacao: string;
  preco: number | null;
  estoque: number | null;
  vendidos: number | null;
};

export type AnuncioLinha = {
  item_id: string;
  titulo: string | null;
  sku: string | null;
  preco: number | null;
  preco_original: number | null;
  moeda: string | null;
  estoque: number | null;
  vendidos: number | null;
  status: string | null;
  sub_status: string[];
  tipo_anuncio: string | null;
  logistica: string | null;
  frete_gratis: boolean | null;
  catalogo: boolean | null;
  categoria_id: string | null;
  thumbnail: string | null;
  link: string | null;
  saude: number | null;
  variacoes: Variacao[];
  skus: string[];
  /** Ligam o anúncio ao Ad Group de Product Ads do tipo FAMILY ou CATALOG. */
  family_id: string | null;
  catalog_product_id: string | null;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function skuDeAtributos(atributos: unknown): string | null {
  if (!Array.isArray(atributos)) return null;
  for (const a of atributos) {
    if (a && typeof a === "object" && (a as { id?: unknown }).id === "SELLER_SKU") {
      return txt((a as { value_name?: unknown }).value_name);
    }
  }
  return null;
}

export function lerAnuncio(json: unknown): AnuncioLinha | null {
  if (!json || typeof json !== "object") return null;
  const b = json as Record<string, unknown>;
  const id = txt(b.id);
  if (!id) return null;
  const envio = b.shipping && typeof b.shipping === "object" ? (b.shipping as Record<string, unknown>) : {};
  const sku = skuDeAtributos(b.attributes) ?? txt(b.seller_custom_field);

  const variacoes: Variacao[] = (Array.isArray(b.variations) ? b.variations : []).flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const x = v as Record<string, unknown>;
    const combinacao = (Array.isArray(x.attribute_combinations) ? x.attribute_combinations : [])
      .map((c) => {
        const a = c as { name?: unknown; value_name?: unknown };
        return [txt(a.name), txt(a.value_name)].filter(Boolean).join(": ");
      })
      .filter(Boolean)
      .join(" · ");
    return [{
      id: num(x.id),
      sku: skuDeAtributos(x.attributes) ?? txt(x.seller_custom_field),
      combinacao,
      preco: num(x.price),
      estoque: num(x.available_quantity),
      vendidos: num(x.sold_quantity),
    }];
  });

  const skus = [...new Set([sku, ...variacoes.map((v) => v.sku)].filter((s): s is string => !!s))];

  return {
    item_id: id,
    titulo: txt(b.title),
    sku,
    preco: num(b.price),
    preco_original: num(b.original_price),
    moeda: txt(b.currency_id),
    estoque: num(b.available_quantity),
    vendidos: num(b.sold_quantity),
    status: txt(b.status),
    sub_status: Array.isArray(b.sub_status) ? b.sub_status.filter((s): s is string => typeof s === "string") : [],
    tipo_anuncio: txt(b.listing_type_id),
    logistica: txt(envio.logistic_type),
    frete_gratis: typeof envio.free_shipping === "boolean" ? envio.free_shipping : null,
    catalogo: typeof b.catalog_listing === "boolean" ? b.catalog_listing : null,
    categoria_id: txt(b.category_id),
    thumbnail: txt(b.thumbnail),
    link: txt(b.permalink),
    saude: num(b.health),
    variacoes,
    skus,
    family_id: txt(b.family_id) ?? (typeof b.family_id === "number" ? String(b.family_id) : null),
    catalog_product_id: txt(b.catalog_product_id),
  };
}

export function entraNaBusca(status: string | null): boolean {
  return status === "active" || status === "paused";
}

/** Ordem de leitura: anúncios nunca lidos primeiro, depois os lidos há mais tempo. */
export function ordemDeLeitura(ids: string[], lidos: Map<string, string>): string[] {
  return [...ids].sort((a, b) => {
    const la = lidos.get(a);
    const lb = lidos.get(b);
    if (!la && !lb) return 0;
    if (!la) return -1;
    if (!lb) return 1;
    return Date.parse(la) - Date.parse(lb);
  });
}
