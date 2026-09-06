import { describe, it, expect } from "vitest";
import { resumoCarteira, separarParaLog } from "./stats";

describe("resumoCarteira", () => {
  it("mediana resiste ao outlier que domina a média", () => {
    const r = resumoCarteira([10, 20, 30, 40, 50, 60, 70, 80, 90, 10_000]);
    expect(r.mediana).toBeLessThan(100);
    expect(r.media).toBeGreaterThan(1000);
    expect(r.p25).toBeLessThan(r.p75);
    expect(r.amostraMinima).toBe(false);
  });

  it("marca amostra mínima abaixo de 5 lojas", () => {
    expect(resumoCarteira([1, 2, 3]).amostraMinima).toBe(true);
  });

  it("lista vazia devolve zeros sem quebrar", () => {
    const r = resumoCarteira([]);
    expect(r.n).toBe(0);
    expect(r.mediana).toBe(0);
  });

  it("separarParaLog conta os não-positivos omitidos", () => {
    const { plotaveis, omitidos } = separarParaLog([{ v: 5 }, { v: 0 }, { v: -3 }], (r) => r.v);
    expect(plotaveis).toHaveLength(1);
    expect(omitidos).toBe(2);
  });
});
