// Paid orders only; multi-unit orders count once per listing for conversion.
export function aggregateItemOrders(orders: any[], itemId: string) {
  let pedidos = 0, unidades = 0, faturamento = 0, cancelados = 0;
  const seen = new Set<string>();
  for (const order of orders) {
    const key = String(order.id);
    if (seen.has(key)) continue;
    seen.add(key);
    const lines = (order.order_items ?? []).filter((line: any) => line.item?.id === itemId);
    if (!lines.length) continue;
    if (order.status === "cancelled") { cancelados++; continue; }
    if (order.status !== "paid") continue;
    pedidos++;
    for (const line of lines) {
      const quantity = Number(line.quantity) || 0;
      unidades += quantity;
      faturamento += quantity * (Number(line.unit_price) || 0);
    }
  }
  return { pedidos, unidades, faturamento, cancelados };
}

export function itemConversion(pedidos: number | null, visitas: number | null) {
  return pedidos != null && visitas != null && visitas > 0 ? pedidos / visitas : null;
}

export function parseItemVisits(response: any, itemId: string): number | null {
  const row = Array.isArray(response) ? response.find((r: any) => r.item_id === itemId || r.id === itemId) : response;
  const value = row?.total_visits ?? row?.[itemId];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}