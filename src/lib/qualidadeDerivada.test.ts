import { describe, it, expect } from "vitest";
import { atratividadeDerivada, qualidadeDerivada } from "./qualidadeDerivada";

describe("qualidadeDerivada", () => {
  it("todas as metas batidas = 100 de atratividade", () => {
    expect(atratividadeDerivada({ visitsMatch: 70, visitsExpensive: 30, gmv: 100, cdpTgmv: 20, tgmvFull: 40 })).toBe(100);
  });
  it("sem dado nenhum = null (não vira 0)", () => {
    expect(atratividadeDerivada({})).toBeNull();
  });
  it("atributos usa a última nota real do histórico", () => {
    const r = qualidadeDerivada([
      { date: "2026-10-01", scoreCaracteristica: 0 },
      { date: "2026-07-01", scoreQualidade: 100 },
    ]);
    expect(r.atributos?.valor).toBe(100);
    expect(r.gtin).toBeNull();
  });
});
