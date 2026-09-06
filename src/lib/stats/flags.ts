/**
 * Flags de reversão das ordens de serviço estatísticas.
 * Desligar a flag restaura o comportamento anterior sem migração de dados.
 */

type Flag = "ALERTS_USE_ROBUST_Z" | "RANKINGS_USE_SHRINKAGE";

const PADRAO: Record<Flag, boolean> = {
  ALERTS_USE_ROBUST_Z: true,
  RANKINGS_USE_SHRINKAGE: true,
};

export function flagAtiva(flag: Flag): boolean {
  try {
    const raw = localStorage.getItem(`peregrinus_flag_${flag}`);
    if (raw === "on") return true;
    if (raw === "off") return false;
  } catch {
    // localStorage indisponível (SSR/teste): usa o padrão
  }
  return PADRAO[flag];
}
