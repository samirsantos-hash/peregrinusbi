import { describe, expect, it } from "vitest";
import { aggregateItemOrders, itemConversion, parseItemVisits } from "../../supabase/functions/_shared/mlItemStats";
import { ordenarAnuncios, type AnuncioComparavel } from "../lib/mlComparacaoAnuncios";

describe("estatísticas reais por anúncio", () => {
  it("lê visitas do anúncio correto no relatório e preserva ausência", () => {
    expect(parseItemVisits([{ item_id: "MLB1", total_visits: 100 }, { item_id: "MLB2", total_visits: 200 }], "MLB1")).toBe(100);
    expect(parseItemVisits({ MLB1: 0 }, "MLB1")).toBe(0);
    expect(parseItemVisits(null, "MLB1")).toBeNull();
  });
  it("conta pedidos pagos uma vez, separa unidades e ignora outros anúncios", () => {
    const paid = { id: 1, status: "paid", order_items: [{ item: { id: "MLB1" }, quantity: 3, unit_price: 20 }, { item: { id: "MLB2" }, quantity: 2, unit_price: 99 }] };
    expect(aggregateItemOrders([paid, paid, { id: 2, status: "cancelled", order_items: paid.order_items }, { id: 3, status: "confirmed", order_items: paid.order_items }], "MLB1"))
      .toEqual({ pedidos: 1, unidades: 3, faturamento: 60, cancelados: 1 });
  });
  it("conversão usa pedidos e visitas, sem fabricar dados ausentes", () => {
    expect(itemConversion(5, 100)).toBe(0.05);
    expect(itemConversion(0, 100)).toBe(0);
    expect(itemConversion(5, 0)).toBeNull();
    expect(itemConversion(null, 100)).toBeNull();
  });
  it("compara por conversão real e coloca valores ausentes no fim", () => {
    const rows = [{ id: "A", conversao: null }, { id: "B", conversao: 0.05 }, { id: "C", conversao: 0.1 }] as AnuncioComparavel[];
    expect(ordenarAnuncios(rows, "conversao").map(x => x.id)).toEqual(["C", "B", "A"]);
    expect(rows[0].id).toBe("A");
  });
});