// Período escolhido no painel, salvo por usuário no aparelho.
const PREFIXO = "peregrinus:periodo:";
const GRANULARIDADES = ["consolidated", "daily"];

export type PeriodoSalvo = { periodo: string; granularidade: string };

/** Intervalos personalizados dependem das datas da loja, por isso nunca são restaurados. */
export function validarPeriodoSalvo(bruto: unknown): PeriodoSalvo | null {
  if (!bruto || typeof bruto !== "object") return null;
  const { periodo, granularidade } = bruto as Record<string, unknown>;
  if (typeof periodo !== "string" || !/^[a-z0-9_-]{1,20}$/i.test(periodo) || periodo.startsWith("custom")) return null;
  if (typeof granularidade !== "string" || !GRANULARIDADES.includes(granularidade)) return null;
  return { periodo, granularidade };
}

export function lerPeriodoSalvo(userId?: string | null): PeriodoSalvo | null {
  if (!userId) return null;
  try { return validarPeriodoSalvo(JSON.parse(localStorage.getItem(PREFIXO + userId) ?? "null")); } catch { return null; }
}

export function salvarPeriodo(userId: string | null | undefined, valor: PeriodoSalvo) {
  if (!userId || !validarPeriodoSalvo(valor)) return;
  try { localStorage.setItem(PREFIXO + userId, JSON.stringify(valor)); } catch { /* armazenamento indisponível */ }
}

export function apagarPeriodosSalvos() {
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIXO)).forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
}
