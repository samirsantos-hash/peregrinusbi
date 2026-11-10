import { describe, it, expect } from "vitest";
import { temaDoVidro } from "./KpiVidro";
describe("temaDoVidro", () => {
  it("subiu e melhor subir = verde", () => expect(temaDoVidro(5, "subir")).toBe("verde"));
  it("subiu e melhor descer = vermelho", () => expect(temaDoVidro(5, "descer")).toBe("vermelho"));
  it("sem comparação = neutro", () => expect(temaDoVidro(null)).toBe("neutro"));
  it("indicador neutro nunca colore", () => expect(temaDoVidro(-8, "neutro")).toBe("neutro"));
});
