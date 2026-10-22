// Regras puras de alteração de preço. Sem I/O.

/** Queda a partir da qual a prévia destaca o item. Só aviso: não bloqueia. */
export const ALERTA_QUEDA = 0.2;
export const MAX_ITENS_LOTE = 50;

export type RegraLote =
  | { tipo: "valor"; valor: number }
  | { tipo: "percentual"; valor: number }
  | { tipo: "soma"; valor: number };

export const centavos = (n: number) => Math.round(n * 100) / 100;

export function lerRegra(bruto: unknown): RegraLote | null {
  if (!bruto || typeof bruto !== "object") return null;
  const r = bruto as { tipo?: unknown; valor?: unknown };
  const valor = Number(r.valor);
  if (!Number.isFinite(valor)) return null;
  if (r.tipo === "valor" || r.tipo === "percentual" || r.tipo === "soma") return { tipo: r.tipo, valor };
  return null;
}

export function aplicarRegra(atual: number, regra: RegraLote): number {
  if (regra.tipo === "valor") return centavos(regra.valor);
  if (regra.tipo === "percentual") return centavos(atual * (1 + regra.valor / 100));
  return centavos(atual + regra.valor);
}

export function erroPreco(preco: number): string | null {
  if (!Number.isFinite(preco) || preco <= 0) return "O novo preço precisa ser maior que zero.";
  if (preco > 99_999_999) return "Preço acima do permitido.";
  return null;
}

export function variacao(antes: number, depois: number): number | null {
  return antes > 0 ? (depois - antes) / antes : null;
}

export function quedaGrande(antes: number, depois: number): boolean {
  const v = variacao(antes, depois);
  return v !== null && v <= -ALERTA_QUEDA;
}

export type ItemPreco = {
  item_id: string;
  seller_id: number | null;
  status: string | null;
  titulo: string | null;
  preco: number | null;
  moeda: string | null;
  variacoes: { id: number; preco: number | null }[];
};

export function lerItemPreco(json: unknown): ItemPreco | null {
  if (!json || typeof json !== "object") return null;
  const b = json as Record<string, unknown>;
  if (typeof b.id !== "string") return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    item_id: b.id,
    seller_id: num(b.seller_id),
    status: typeof b.status === "string" ? b.status : null,
    titulo: typeof b.title === "string" ? b.title : null,
    preco: num(b.price),
    moeda: typeof b.currency_id === "string" ? b.currency_id : null,
    variacoes: (Array.isArray(b.variations) ? b.variations : []).flatMap((v) => {
      const x = v as { id?: unknown; price?: unknown };
      const id = num(x?.id);
      return id == null ? [] : [{ id, preco: num(x.price) }];
    }),
  };
}

/** O ML exige o mesmo preço em todas as variações e apaga as que não forem enviadas. */
export function corpoPreco(item: ItemPreco, preco: number): Record<string, unknown> {
  if (item.variacoes.length) return { variations: item.variacoes.map((v) => ({ id: v.id, price: preco })) };
  return { price: preco };
}

export function estadoPreco(item: ItemPreco): string {
  return [item.preco ?? "", ...item.variacoes.map((v) => `${v.id}:${v.preco ?? ""}`)].join("|");
}

/** Resposta 200 do PUT pode trazer aviso de que o preço foi ignorado (automação ativa). */
export function precoIgnorado(json: unknown): boolean {
  const avisos = json && typeof json === "object" ? (json as { warnings?: unknown }).warnings : null;
  return Array.isArray(avisos) && avisos.some((w) => (w as { code?: unknown })?.code === "item.price.not_modifiable");
}
