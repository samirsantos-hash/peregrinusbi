import { describe, it, expect, vi, beforeEach } from "vitest";

type CppRow = {
  tgmv_lc: number;
  tgmv_lc_fbm: number;
  tgmv_lc_flex?: number;
  tsi: number;
  visitas?: number;
  f_tgmv_lc?: number;
  f_tsi?: number;
  tim_month_id?: string;
} | null;

type ElegRow = {
  item_id: string;
  item_name?: string;
  vertical_item?: string;
  pedidos_7d: number;
  estoque_medio_7d: number;
  flag_item_s_optin?: boolean;
  discount_seller_percentage?: number;
};

let mockCpp: CppRow = null;
let mockEleg: ElegRow[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const chain = (resolver: () => any) => {
    const thenable: any = {
      select: () => thenable,
      eq: () => thenable,
      order: () => thenable,
      limit: () => thenable,
      maybeSingle: () => Promise.resolve(resolver()),
      then: (onfulfilled: any) => Promise.resolve(resolver()).then(onfulfilled),
    };
    return thenable;
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === "cpp_mensal") return chain(() => ({ data: mockCpp, error: null }));
        if (table === "seller_eligibility")
          return chain(() => ({ data: mockEleg, error: null }));
        return chain(() => ({ data: null, error: null }));
      },
    },
  };
});

import {
  getFullRecommendations,
  FULL_ESTOQUE_MINIMO_DIAS,
} from "./fullRecommendations";

beforeEach(() => {
  mockCpp = null;
  mockEleg = [];
});

describe("getFullRecommendations - Markowitz model", () => {
  it("returns empty portfolio when no eligibility items", async () => {
    const r = await getFullRecommendations("seller-1", "100");
    expect(r.candidatos).toEqual([]);
    expect(r.totalGMVGanho).toBe(0);
    expect(r.indiceEficiencia).toBe(0);
  });

  it("skips items with zero pedidos and zero estoque", async () => {
    mockEleg = [
      { item_id: "MLB1", pedidos_7d: 0, estoque_medio_7d: 0 },
      { item_id: "MLB2", pedidos_7d: 7, estoque_medio_7d: 100 },
    ];
    const r = await getFullRecommendations("s", "100");
    expect(r.candidatos).toHaveLength(1);
    expect(r.candidatos[0].item_id).toBe("MLB2");
  });

  it("handles zero velocity (only stock, no orders) with stock_gap=0 and high stockout risk fallback", async () => {
    mockEleg = [
      { item_id: "MLB1", pedidos_7d: 0, estoque_medio_7d: 5 },
    ];
    const r = await getFullRecommendations("s", "100");
    expect(r.candidatos).toHaveLength(1);
    const c = r.candidatos[0];
    expect(c.velocity).toBe(0);
    expect(c.days_of_stock).toBe(999);
    expect(c.stock_gap).toBe(0);
    expect(c.mu).toBe(0);
    expect(c.stockout_risk).toBeCloseTo(0.9, 5);
  });

  it("computes mu, sigma, sharpe and stock_gap with fallback GMV/order (no CPP)", async () => {
    mockEleg = [
      {
        item_id: "MLB1",
        item_name: "Item A",
        vertical_item: "Eletrônicos",
        pedidos_7d: 14, // velocity = 2/day
        estoque_medio_7d: 200, // days_of_stock = 100
        flag_item_s_optin: true,
      },
    ];
    const r = await getFullRecommendations("s");
    const c = r.candidatos[0];
    const velocity = 2;
    const days = 100;
    const gmvAtual = velocity * 30 * 50; // fallback gmv/pedido = 50
    const muExpected = gmvAtual * 0.28;
    expect(c.velocity).toBe(velocity);
    expect(c.days_of_stock).toBe(days);
    expect(c.gmv_atual_estimado).toBeCloseTo(gmvAtual, 5);
    expect(c.mu).toBeCloseTo(muExpected, 5);
    expect(c.stockout_risk).toBeCloseTo(Math.exp(-days / FULL_ESTOQUE_MINIMO_DIAS), 6);
    const demand = 1 / Math.sqrt(14 + 1);
    expect(c.demand_uncertainty).toBeCloseTo(demand, 6);
    expect(c.sigma).toBeCloseTo(c.stockout_risk * 0.6 + demand * 0.4, 6);
    expect(c.sharpe).toBeCloseTo(c.mu / (1 + c.sigma), 6);
    expect(c.stock_gap).toBe(0);
  });

  it("uses CPP-derived gmv/pedido and reduces full_premium when FBM share is high", async () => {
    mockCpp = { tgmv_lc: 10000, tgmv_lc_fbm: 8000, tsi: 100 }; // gmv/order = 100, shareFBM=0.8 -> premium 0.18
    mockEleg = [
      { item_id: "MLB1", pedidos_7d: 7, estoque_medio_7d: 100, flag_item_s_optin: true },
    ];
    const r = await getFullRecommendations("s", "100");
    const c = r.candidatos[0];
    expect(c.full_premium).toBeCloseTo(0.18, 6);
    expect(c.gmv_atual_estimado).toBeCloseTo(1 * 30 * 100, 5);
    expect(c.mu).toBeCloseTo(3000 * 0.18, 5);
  });

  it("adds +5pp uplift when item is not opted-in to CDP", async () => {
    mockEleg = [
      { item_id: "MLB1", pedidos_7d: 7, estoque_medio_7d: 100, flag_item_s_optin: false },
    ];
    const r = await getFullRecommendations("s");
    expect(r.candidatos[0].full_premium).toBeCloseTo(0.33, 6); // 0.28 + 0.05
  });

  it("flags 'aguardar_estoque' when stock_gap > 0", async () => {
    mockEleg = [
      { item_id: "MLB1", pedidos_7d: 70, estoque_medio_7d: 50 }, // velocity 10, need 300
    ];
    const r = await getFullRecommendations("s");
    const c = r.candidatos[0];
    expect(c.stock_gap).toBe(250);
    expect(c.prioridade).toBe("aguardar_estoque");
    expect(c.acao).toContain("Repor 250 unidades");
  });

  it("prioritizes by sharpe thresholds (alta >=500, media >=150, baixa <150)", async () => {
    mockCpp = { tgmv_lc: 100000, tgmv_lc_fbm: 0, tsi: 100 }; // gmv/order=1000, premium baseline 0.28
    mockEleg = [
      // High sharpe: lots of orders, plenty of stock
      { item_id: "HI", pedidos_7d: 70, estoque_medio_7d: 10000, flag_item_s_optin: true },
      // Low sharpe: few orders
      { item_id: "LO", pedidos_7d: 1, estoque_medio_7d: 100, flag_item_s_optin: true },
    ];
    const r = await getFullRecommendations("s", "100");
    const hi = r.candidatos.find((c) => c.item_id === "HI")!;
    const lo = r.candidatos.find((c) => c.item_id === "LO")!;
    expect(hi.sharpe).toBeGreaterThan(lo.sharpe);
    expect(hi.prioridade).toBe("alta");
    expect(["media", "baixa"]).toContain(lo.prioridade);
    // Sorted: alta first
    expect(r.candidatos[0].item_id).toBe("HI");
  });

  it("aggregates totals only over recomendados (alta+media)", async () => {
    mockCpp = { tgmv_lc: 100000, tgmv_lc_fbm: 0, tsi: 100 };
    mockEleg = [
      { item_id: "HI", pedidos_7d: 70, estoque_medio_7d: 10000, vertical_item: "Moda", flag_item_s_optin: true },
      { item_id: "GAP", pedidos_7d: 70, estoque_medio_7d: 10, vertical_item: "Moda", flag_item_s_optin: true },
    ];
    const r = await getFullRecommendations("s", "100");
    const hi = r.candidatos.find((c) => c.item_id === "HI")!;
    expect(r.totalGMVGanho).toBeCloseTo(hi.mu, 5);
    expect(r.distribuicaoVertical).toEqual({ Moda: 1 });
    expect(r.indiceEficiencia).toBeGreaterThan(0);
  });
});