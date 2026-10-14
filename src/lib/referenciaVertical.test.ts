import { describe, it, expect } from "vitest";
import { calcularReferenciaVertical } from "./referenciaVertical";

const meses = ["2026-01", "2026-02", "2026-03", "2026-04"];
const par = (id: string, v: number[]) => v.map((tgmv, i) => ({ seller_id: id, mes: meses[i], tgmv }));

describe("calcularReferenciaVertical", () => {
  const pares = [
    ...par("a", [100, 100, 100, 100]),
    ...par("b", [100, 100, 100, 120]),
    ...par("c", [100, 100, 100, 140]),
  ];

  it("o próprio seller nunca entra nos pares", () => {
    const comSeller = [...pares, ...par("eu", [1, 1, 1, 1000])];
    const r = calcularReferenciaVertical("eu", meses, comSeller);
    expect(r.nPares).toBe(3);
    expect(r.pontos[3].mediana).toBe(120);
  });

  it("descarta par com base zero", () => {
    const r = calcularReferenciaVertical("eu", meses, [...pares, ...par("z", [0, 0, 0, 50])]);
    expect(r.nPares).toBe(3);
  });

  it("descarta exagero (ex.: par que cresce 50x)", () => {
    const mais = [...pares, ...par("d", [100, 100, 100, 110]), ...par("x", [100, 100, 100, 5000])];
    const r = calcularReferenciaVertical("eu", meses, mais);
    expect(r.pontos[3].exageros).toBe(1);
    expect(r.pontos[3].p75).toBeLessThan(200);
  });

  it("faixa P25–P75 dos índices", () => {
    const r = calcularReferenciaVertical("eu", meses, pares);
    expect(r.pontos[3].p25).toBe(110);
    expect(r.pontos[3].p75).toBe(130);
  });
});
