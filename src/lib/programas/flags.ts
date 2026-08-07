/**
 * Colunas "SELLERS_*" dos feeds CPP/CDP são SINALIZADORES, não contagens.
 * Quando preenchidas, repetem o próprio CUS_CUST_ID_SEL; vazias quando o
 * atributo não se aplica. Somar essas colunas produz bilhões sem sentido.
 * Regra: converter para booleano e consolidar com contagem (COUNT FILTER).
 */

export const COLUNAS_FLAG = [
  "SELLERS",
  "SELLERS_INTEGRADOR",
  "SELLERS_INVEST_PADS",
  "SELLERS_OPTIN_CDP",
  "SELLERS_MINHA_PAGINA",
  "SELLERS_NOVOS_FULL",
  "SELLERS_NOVOS_PADS",
  "SELLERS_NOVO_OPTIN_CDP",
  "SELLERS_CLIPS_PUBLI",
  "SELLERS_YELLOW",
  "SELLERS_ORANGE",
  "SELLERS_GREEN",
  "SELLERS_RED",
  "SELLERS_LIGHT_GREEN",
  "SELLERS_GREEN_GOLD",
  "SELLERS_GREEN_PLATINUM",
  "SELLERS_GREEN_SILVER",
  "SELLERS_MAIS_5_ITENS_MIN_SUG_PRICE_DP",
  "SELLERS_MAIS_5_ITENS_ELEGIVEL_DP",
  "SUCC_SELLERS_TGMV",
  "SUCC_SELLERS_F_TGMV",
  "SUCC_SELLERS_FULL",
  "SUCC_SELLERS_TGMV_PADS",
  "SUCC_SELLERS_CDP",
  "SUCC_SELLERS_LISTERS_MIP",
  "LISTERS",
  "NEW_LISTERS",
] as const;

/** Contagens reais — podem ser somadas. */
export const COLUNAS_CONTAGEM_REAL = ["NEW_SUCC_SELLER", "SUCC_SELLERS_MINHA_PAGINA"] as const;

/** Redundantes com REP_CURRENT_LEVEL — ignoradas como fonte de nível. */
export const COLUNAS_FLAG_REPUTACAO_IGNORADAS = [
  "SELLERS_YELLOW", "SELLERS_ORANGE", "SELLERS_GREEN", "SELLERS_RED",
  "SELLERS_LIGHT_GREEN", "SELLERS_GREEN_GOLD", "SELLERS_GREEN_PLATINUM",
  "SELLERS_GREEN_SILVER",
] as const;

const SET_FLAG = new Set<string>(COLUNAS_FLAG);
export const ehColunaFlag = (col: string) => SET_FLAG.has(col.trim().toUpperCase());

/** Sinalizador → booleano. Vazio/nulo → null (sem_dado), nunca false. */
export function flag(v: string | number | null | undefined): boolean | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  if (s === "0" || s === "0.0" || s === "0,0") return false;
  return true;
}

/** Consolidação de grupo/carteira: COUNT(*) FILTER (WHERE flag). */
export function contarFlag<T extends Record<string, unknown>>(linhas: T[], coluna: string): number {
  return linhas.reduce((n, l) => n + (flag(l[coluna] as string | null) ? 1 : 0), 0);
}

/** INTEGRADOR é 0/1. */
export type StatusIntegrador = "Utiliza" | "Não utiliza" | "sem_dado";
export function mapIntegrador(v: string | number | null | undefined): StatusIntegrador {
  const b = flag(v);
  if (b == null) return "sem_dado";
  return b ? "Utiliza" : "Não utiliza";
}

/** Cobertura declarada (% de linhas com valor) — para rodapé de card. */
export function cobertura<T extends Record<string, unknown>>(linhas: T[], coluna: string): number | null {
  if (!linhas.length) return null;
  const preenchidas = linhas.filter((l) => {
    const v = l[coluna];
    return v != null && String(v).trim() !== "";
  }).length;
  return (preenchidas / linhas.length) * 100;
}
