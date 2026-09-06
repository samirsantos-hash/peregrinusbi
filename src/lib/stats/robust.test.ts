import { describe, it, expect } from "vitest";
import { computeRobustZScore, mad, mediana, zModificado } from "./robust";

describe("robust", () => {
  it("mediana e MAD", () => {
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
    expect(mad([1, 2, 3, 4, 100])).toBe(1);
  });

  it("estoura erro com dispersão nula", () => {
    expect(() => computeRobustZScore(Array(10).fill(5))).toThrow(/MAD=0/);
  });

  it("estoura erro com amostra insuficiente", () => {
    expect(() => computeRobustZScore([1, 2, 3, 4, 5])).toThrow(/amostra insuficiente/);
  });

  it("retorna sem_dado quando tudo é nulo", () => {
    const r = computeRobustZScore([null, undefined, NaN]);
    expect(r.estado).toBe("sem_dado");
  });

  it("detecta outlier extremo que o z clássico não pega", () => {
    const serie = [10, 10, 11, 10, 9, 10, 11, 10, 10, 200];
    const r = computeRobustZScore(serie);
    if (r.estado !== "ok") throw new Error("esperado ok");
    const zRobusto = r.zs[9];
    const media = serie.reduce((a, b) => a + b, 0) / serie.length;
    const sd = Math.sqrt(serie.reduce((s, v) => s + (v - media) ** 2, 0) / (serie.length - 1));
    const zClassico = (200 - media) / sd;
    expect(Math.abs(zRobusto)).toBeGreaterThan(3.5);
    expect(Math.abs(zClassico)).toBeLessThan(3.5);
  });

  it("zModificado falha com MAD zero", () => {
    expect(() => zModificado(1, 1, 0)).toThrow(/MAD=0/);
  });
});
