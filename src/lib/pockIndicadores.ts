import { LIMIARES } from "@/config/limiaresCarteira";

/** Nota 0–100 por nível de reputação/medalha. */
export const NOTA_REPUTACAO: Record<string, number> = {
  green_platinum: 100, green_gold: 90, green_silver: 80, green: 70, light_green: 60,
  yellow: 40, orange: 20, red: 0, newbie: 50,
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Proporção alcançada da meta em 0–100 (meta atingida = 100). */
export const notaMeta = (realizado: number | null, meta: number) =>
  realizado === null ? null : clamp((realizado / meta) * 100);

export interface CriteriosFavorabilidade {
  /** competitividade de preço 0–1 */
  bpc: number | null;
  repLevel: string | null;
  /** investimento em Ads ÷ faturamento */
  ads: number | null;
  /** faturamento Full ÷ faturamento */
  full: number | null;
  /** faturamento com promoção ÷ faturamento */
  promo: number | null;
}

export const PESOS_FAVORABILIDADE = { preco: 0.3, reputacao: 0.25, ads: 0.15, full: 0.15, promo: 0.15 };

/**
 * Favorabilidade (0–100%): média ponderada do cumprimento dos critérios das outras abas.
 * Critérios sem dado saem da conta e os pesos restantes são redistribuídos.
 */
export function calcularFavorabilidade(c: CriteriosFavorabilidade) {
  const itens: { chave: keyof typeof PESOS_FAVORABILIDADE; nota: number | null }[] = [
    { chave: "preco", nota: notaMeta(c.bpc, LIMIARES.competitividade.min) },
    { chave: "reputacao", nota: c.repLevel ? NOTA_REPUTACAO[c.repLevel] ?? null : null },
    { chave: "ads", nota: notaMeta(c.ads, LIMIARES.ads.min) },
    { chave: "full", nota: notaMeta(c.full, LIMIARES.full.min) },
    { chave: "promo", nota: notaMeta(c.promo, LIMIARES.promocao.min) },
  ];
  const validos = itens.filter((i) => i.nota !== null);
  if (validos.length < 2) return { valor: null, itens };
  const peso = validos.reduce((s, i) => s + PESOS_FAVORABILIDADE[i.chave], 0);
  const valor = validos.reduce((s, i) => s + (i.nota as number) * PESOS_FAVORABILIDADE[i.chave], 0) / peso;
  return { valor: Math.round(valor * 10) / 10, itens };
}

/** Crescimento % entre dois valores; null se a base for zero/ausente. */
export const crescimento = (atual: number | null, base: number | null) =>
  atual === null || base === null || base <= 0 ? null : ((atual - base) / base) * 100;

export function mediana(v: number[]) {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Taxa de Venda: crescimento do vendedor no último mês fechado contra o mês anterior,
 * menos a mediana do crescimento das lojas do mesmo mercado (pontos percentuais).
 */
export function calcularTaxaVenda(cresSeller: number | null, cresMercado: number[]) {
  const med = mediana(cresMercado);
  if (cresSeller === null || med === null) return { valor: null, seller: cresSeller, mercado: med };
  return { valor: Math.round((cresSeller - med) * 10) / 10, seller: cresSeller, mercado: med };
}
