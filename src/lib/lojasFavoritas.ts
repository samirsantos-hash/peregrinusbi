const CHAVE = "peregrinus:lojas-favoritas";

export function lerFavoritas(): string[] {
  try { const v = JSON.parse(localStorage.getItem(CHAVE) || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
export function salvarFavoritas(ids: string[]) {
  try { localStorage.setItem(CHAVE, JSON.stringify(ids)); } catch { /* sem armazenamento */ }
}
export function alternarFavorita(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
/** Favoritas no topo (ordem original preservada em cada grupo). */
export function ordenarComFavoritas<T extends { id: string }>(lojas: T[], favoritas: string[]): T[] {
  const f = new Set(favoritas);
  return [...lojas.filter((l) => f.has(l.id)), ...lojas.filter((l) => !f.has(l.id))];
}
