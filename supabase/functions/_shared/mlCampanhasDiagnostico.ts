/** Diagnostic sample only; never a complete performance period. */
export function amostraCampanhas(pedidos: { status?: string; id?: unknown }[]) {
  return pedidos.filter(p => p.status === 'paid').slice(0, 20);
}