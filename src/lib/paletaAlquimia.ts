const PREFIXO = "peregrinus:paleta-alquimia:";

export function lerPaletaAlquimia(userId: string | null | undefined): boolean {
  if (!userId) return false;
  try { return localStorage.getItem(PREFIXO + userId) === "1"; } catch { return false; }
}

export function salvarPaletaAlquimia(userId: string | null | undefined, ligada: boolean) {
  if (!userId) return;
  try {
    if (ligada) localStorage.setItem(PREFIXO + userId, "1");
    else localStorage.removeItem(PREFIXO + userId);
  } catch { /* armazenamento indisponível */ }
}

export function apagarPaletasAlquimia() {
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIXO)).forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
}
