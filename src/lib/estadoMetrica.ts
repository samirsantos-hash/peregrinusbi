/**
 * Tri-estado de métricas de Ads / investimento.
 *
 * REGRA visual:
 *   valor          → número real (cor cheia)
 *   nao_participa  → investimento zero real (cinza, rótulo)
 *   sem_dado       → null/ausente (traço / hachura semântica)
 *
 * Nunca pintar "sem dado" ou "não participa" com a mesma tinta de um valor zero.
 */

export type EstadoMetrica = "valor" | "nao_participa" | "sem_dado";

/** Classifica investimento em Ads (INV_PADS). */
export function classificarInvestimento(
  inv: number | null | undefined,
): EstadoMetrica {
  if (inv === null || inv === undefined) return "sem_dado";
  const n = Number(inv);
  if (!Number.isFinite(n)) return "sem_dado";
  if (n === 0) return "nao_participa";
  return "valor";
}

/**
 * Classifica uma razão já calculada (ROAS/ACOS/TACOS).
 * Preferir classificarInvestimento quando o denominador/numerador bruto estiver disponível.
 */
export function classificarRazao(
  value: number | null | undefined,
  investment: number | null | undefined,
): EstadoMetrica {
  const estadoInv = classificarInvestimento(investment);
  if (estadoInv !== "valor") return estadoInv;
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "sem_dado";
  }
  return "valor";
}

export function rotuloEstado(estado: EstadoMetrica): string {
  switch (estado) {
    case "nao_participa":
      return "Não participa";
    case "sem_dado":
      return "Sem dado";
    default:
      return "";
  }
}

/** Classes Tailwind para o valor exibido conforme o estado. */
export function classNameEstado(estado: EstadoMetrica): string {
  switch (estado) {
    case "nao_participa":
      return "text-muted-foreground/70";
    case "sem_dado":
      return "text-muted-foreground/50 italic";
    default:
      return "";
  }
}

/** Formata valor ou devolve o rótulo do estado. */
export function formatarComEstado(
  estado: EstadoMetrica,
  valorFormatado: string,
): string {
  if (estado === "valor") return valorFormatado;
  return rotuloEstado(estado);
}
