export const codigos = ["anuncio_proprio", "catalogo_busca", "catalogo_ofertas", "busca_geral", "categoria_termo", "tendencias", "mais_vendidos", "concorrente_item", "concorrente_lote", "concorrente_bulk", "concorrente_reputacao", "concorrente_visitas", "visitas_proprias", "tarifas", "price_to_win", "sugestoes", "frete", "limite_app"] as const;
export type Codigo = typeof codigos[number];

export function entradaValida(body: unknown): body is { account_id: string; grupo: "catalogo" | "concorrente" | "proprio" } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const b = body as Record<string, unknown>;
  return Object.keys(b).every((k) => k === "account_id" || k === "grupo") &&
    typeof b.account_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.account_id) &&
    ["catalogo", "concorrente", "proprio"].includes(String(b.grupo));
}

export const objeto = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** Only field presence/counts leave the diagnostic; upstream values never do. */
export function evidencias(codigo: Codigo, valor: unknown): { campos: string[]; registros: number | null; precisao: string } {
  const raiz = objeto(valor);
  const lista = Array.isArray(valor) ? valor : Array.isArray(raiz.results) ? raiz.results : null;
  const primeiro = lista?.[0];
  const item = primeiro ? objeto(objeto(primeiro).body ?? primeiro) : raiz;
  const campos: string[] = [];
  for (const k of ["id", "price", "sold_quantity", "available_quantity", "listing_type_id", "category_id", "catalog_product_id", "total_visits", "sale_fee_amount", "price_to_win", "status", "nickname", "max_requests_per_hour"]) {
    if (item[k] !== null && item[k] !== undefined) campos.push(k);
  }
  for (const [pai, filhos] of Object.entries({ shipping: ["logistic_type", "free_shipping"], seller_reputation: ["level_id", "power_seller_status"] })) {
    const o = objeto(item[pai]);
    for (const k of filhos) if (o[k] !== null && o[k] !== undefined) campos.push(`${pai}.${k}`);
  }
  return { campos, registros: lista ? lista.length : null, precisao: codigo.startsWith("concorrente") ? "Presença de campos não comprova precisão dos vendidos, estoque ou visitas." : "Disponibilidade pontual; não comprova cobertura histórica." };
}

export function situacao(status: number, interno?: number): "disponivel" | "restrito" | "nao_confirmado" {
  const efetivo = interno ?? status;
  return efetivo === 401 || efetivo === 403 ? "restrito" : efetivo >= 200 && efetivo < 300 ? "disponivel" : "nao_confirmado";
}