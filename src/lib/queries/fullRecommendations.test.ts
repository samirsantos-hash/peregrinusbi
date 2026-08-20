import { describe, it, expect, vi, beforeEach } from "vitest";

type ElegRow = {
  item_id: string | null;
  item_name?: string;
  vertical_item?: string;
  pedidos_7d: number;
  estoque_medio_7d: number;
  flag_item_s_optin?: boolean;
  discount_seller_percentage?: number;
  data?: string;
};
type DailyRow = { data: string; tsi: number; visits: number; tgmv_lc: number };

let mockEleg: ElegRow[] = [];
let mockDaily: DailyRow[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const chain = (resolver: () => any) => {
    const thenable: any = {
      select: () => thenable,
      eq: () => thenable,
      order: () => thenable,
      limit: () => Promise.resolve(resolver()),
      maybeSingle: () => Promise.resolve(resolver()),
      then: (onfulfilled: any) => Promise.resolve(resolver()).then(onfulfilled),
    };
    return thenable;
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === "seller_eligibility") return chain(() => ({ data: mockEleg, error: null }));
        if (table === "sellers_kpi_daily") return chain(() => ({ data: mockDaily, error: null }));
        return chain(() => ({ data: null, error: null }));
      },
    },
  };
});

import { getFullRecommendations } from "./fullRecommendations";

const REF = "2026-08-17";
const daily = (tsi: number, visits: number, gmv: number): DailyRow[] =>
  Array.from({ length: 30 }, (_, i) => ({
    data: `2026-07-${String(i + 1).padStart(2, "0")}`,
    tsi,
    visits,
    tgmv_lc: gmv,
  }));

beforeEach(() => {
  mockEleg = [];
  mockDaily = [];
});

describe("getFullRecommendations", () => {
  it("returns empty portfolio when there is no eligibility data", async () => {
    const r = await getFullRecommendations("s");
    expect(r.candidatos).toEqual([]);
    expect(r.gmvEstimadoRecomendado).toBe(0);
  });

  it("treats pedidos_7d as visits and estimates units with the seller conversion rate", async () => {
    mockDaily = daily(10, 200, 1000); // conversão 5%, ticket R$100
    mockEleg = [{ item_id: "MLB1", pedidos_7d: 1000, estoque_medio_7d: 1000, data: REF }];
    const r = await getFullRecommendations("s");
    const c = r.candidatos[0];
    expect(r.taxaConversao).toBeCloseTo(0.05, 6);
    expect(r.ticketMedio).toBeCloseTo(100, 6);
    expect(c.visitas_7d).toBe(1000);
    expect(c.unidades_est_7d).toBeCloseTo(50, 6);
    expect(c.gmv_est_30d).toBeCloseTo(50 * (30 / 7) * 100, 4);
  });

  it("marks items with zero visits as sem_movimento and never recommends restock", async () => {
    mockDaily = daily(10, 200, 1000);
    mockEleg = [{ item_id: "MLB1", pedidos_7d: 0, estoque_medio_7d: 0, data: REF }];
    const r = await getFullRecommendations("s");
    const c = r.candidatos[0];
    expect(c.estado).toBe("sem_movimento");
    expect(c.prioridade).toBe("sem_movimento");
    expect(c.acao).toContain("Investigar queda");
  });

  it("distinguishes sem_dado (no snapshot at reference date) from zero", async () => {
    mockDaily = daily(10, 200, 1000);
    mockEleg = [
      { item_id: "NOVO", pedidos_7d: 500, estoque_medio_7d: 100, data: REF },
      { item_id: "ANTIGO", pedidos_7d: 500, estoque_medio_7d: 100, data: "2026-08-01" },
    ];
    const r = await getFullRecommendations("s");
    const antigo = r.candidatos.find((c) => c.item_id === "ANTIGO")!;
    expect(antigo.visitas_7d).toBeNull();
    expect(antigo.prioridade).toBe("sem_dado");
  });

  it("classifies as repor_estoque only when there is demand and coverage < 30 days", async () => {
    mockDaily = daily(10, 100, 1000); // conversão 10%, ticket 100
    mockEleg = [{ item_id: "MLB1", pedidos_7d: 700, estoque_medio_7d: 10, data: REF }];
    const r = await getFullRecommendations("s");
    expect(r.candidatos[0].prioridade).toBe("repor_estoque");
    expect(r.candidatos[0].acao).toContain("Repor estoque");
  });

  it("computes trend from two independent 7-day windows ~28 days apart", async () => {
    mockDaily = daily(10, 200, 1000);
    mockEleg = [
      { item_id: "MLB1", pedidos_7d: 200, estoque_medio_7d: 5000, data: REF },
      { item_id: "MLB1", pedidos_7d: 100, estoque_medio_7d: 5000, data: "2026-07-20" },
    ];
    const r = await getFullRecommendations("s");
    expect(r.candidatos[0].visitas_7d_anterior).toBe(100);
    expect(r.candidatos[0].tendencia).toBeCloseTo(1, 6);
  });

  it("falls back to '—' fields when the seller has no measured conversion", async () => {
    mockEleg = [{ item_id: "MLB1", pedidos_7d: 500, estoque_medio_7d: 100, data: REF }];
    const r = await getFullRecommendations("s");
    expect(r.taxaConversao).toBeNull();
    expect(r.candidatos[0].unidades_est_7d).toBeNull();
    expect(r.candidatos[0].gmv_est_30d).toBeNull();
    expect(r.candidatos[0].prioridade).toBe("sem_dado");
  });

  it("deduplicates item_id and ignores empty ids", async () => {
    mockDaily = daily(10, 200, 1000);
    mockEleg = [
      { item_id: "", pedidos_7d: 10, estoque_medio_7d: 10, data: REF },
      { item_id: null, pedidos_7d: 10, estoque_medio_7d: 10, data: REF },
      { item_id: "MLB1", pedidos_7d: 100, estoque_medio_7d: 1000, data: REF },
      { item_id: "MLB1", pedidos_7d: 90, estoque_medio_7d: 900, data: "2026-08-14" },
    ];
    const r = await getFullRecommendations("s");
    expect(r.candidatos.map((c) => c.item_id)).toEqual(["MLB1"]);
  });

  it("reports rule counts for every class", async () => {
    mockDaily = daily(10, 200, 1000);
    mockEleg = [{ item_id: "MLB1", pedidos_7d: 100, estoque_medio_7d: 100000, data: REF }];
    const r = await getFullRecommendations("s");
    expect(r.classes.map((c) => c.chave)).toEqual([
      "alta",
      "media",
      "baixa",
      "repor_estoque",
      "sem_movimento",
      "sem_dado",
    ]);
    expect(r.classes.reduce((s, c) => s + c.itens, 0)).toBe(r.candidatos.length);
  });
});
