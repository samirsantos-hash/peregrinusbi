// Only shipment evidence; never the listing's current shipping configuration.
export type PedidoEnvio = { status?: string; seller?: { id?: number | string }; shipping?: { id?: number | string }; total_amount?: number; currency_id?: string };
export function modalDoEnvio(envio: any, vendedor: string): string {
  if (String(envio?.origin?.sender_id ?? envio?.sender_id ?? '') !== vendedor) return 'sem_info';
  const tipo = envio?.logistic?.type ?? envio?.logistic_type;
  return ['fulfillment', 'self_service', 'cross_docking', 'xd_drop_off', 'drop_off', 'xd_same_day'].includes(tipo) ? tipo : 'sem_info';
}

export async function mixEnvios(pedidos: PedidoEnvio[], vendedor: string, ler: (id: string) => Promise<unknown>, prazo: number, agora = Date.now) {
  const cache = new Map<string, string>();
  const mix: Record<string, { pedidos: number; faturamento: number }> = {};
  let total = 0, identificados = 0, consultas = 0;
  for (const p of pedidos) {
    if (p.status !== 'paid') continue;
    if (String(p.seller?.id) !== vendedor || p.currency_id !== 'BRL' || typeof p.total_amount !== 'number' || !Number.isFinite(p.total_amount) || p.total_amount < 0) throw new Error('Base de pedidos de envio não confirmada.');
    const id = String(p.shipping?.id ?? '');
    let tipo = cache.get(id) ?? 'sem_info';
    if (/^\d+$/.test(id) && !cache.has(id) && consultas < 500 && agora() < prazo) {
      consultas++;
      try { tipo = modalDoEnvio(await ler(id), vendedor); } catch { tipo = 'sem_info'; }
      cache.set(id, tipo);
    }
    mix[tipo] ??= { pedidos: 0, faturamento: 0 };
    mix[tipo].pedidos++;
    mix[tipo].faturamento += p.total_amount;
    total++;
    if (tipo !== 'sem_info') identificados++;
  }
  return { mix, base: 'envios reais dos pedidos pagos dos últimos 30 dias', fonte: 'shipments', cobertura: { pedidos: total, identificados, nao_identificados: total - identificados, consultas, completa: total === identificados } };
}