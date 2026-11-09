export type ModoPainel = 'didatico' | 'avancado';
export const chaveModoPainel = (usuarioId: string) => `peregrinus:modo-painel:${usuarioId}`;
export function lerModoPainel(usuarioId: string | undefined): ModoPainel {
  if (!usuarioId) return 'didatico';
  try { return localStorage.getItem(chaveModoPainel(usuarioId)) === 'avancado' ? 'avancado' : 'didatico'; }
  catch { return 'didatico'; }
}
export function salvarModoPainel(usuarioId: string | undefined, modo: ModoPainel) {
  if (!usuarioId) return;
  try { localStorage.setItem(chaveModoPainel(usuarioId), modo); } catch { /* Preferência continua em memória. */ }
}