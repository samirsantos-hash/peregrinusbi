const PREFIXO = "peregrinus:paleta-alquimia:";

export function lerPaletaAlquimia(userId: string | null | undefined): boolean {
  if (!userId) return true;
  try { return localStorage.getItem(PREFIXO + userId) !== "0"; } catch { return true; }
}

export function salvarPaletaAlquimia(userId: string | null | undefined, ligada: boolean) {
  if (!userId) return;
  try {
    if (ligada) localStorage.removeItem(PREFIXO + userId);
    else localStorage.setItem(PREFIXO + userId, "0");
  } catch { /* armazenamento indisponível */ }
}

export function apagarPaletasAlquimia() {
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIXO)).forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
}
