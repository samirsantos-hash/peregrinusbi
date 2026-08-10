import { describe, it, expect } from "vitest";
import {
  agruparPorMes, limitesMes, construirSerie, resumirComparacao, type PontoDiario,
} from "./gmvMesVsMes";

const dias = (mes: string, de: number, ate: number, gmv = 100): PontoDiario[] =>
  Array.from({ length: ate - de + 1 }, (_, i) => ({
    date: `${mes}-${String(de + i).padStart(2, "0")}`,
    gmv,
  }));

describe("agruparPorMes", () => {
  it("soma duplicatas do mesmo dia e ignora datas inválidas", () => {
    const m = agruparPorMes([
      { date: "2026-07-01", gmv: 10 },
      { date: "2026-07-01", gmv: 5 },
      { date: "", gmv: 99 },
      { date: "2026-07", gmv: 99 },
    ]);
    expect(m.get("2026-07")!.get(1)).toBe(15);
    expect(m.size).toBe(1);
  });
});

describe("limitesMes", () => {
  it("retorna primeiro e último dia com valor", () => {
    const m = agruparPorMes(dias("2026-03", 20, 31));
    expect(limitesMes(m.get("2026-03"))).toEqual({ primeiro: 20, ultimo: 31 });
  });
  it("retorna zeros para mês vazio", () => {
    expect(limitesMes(undefined)).toEqual({ primeiro: 0, ultimo: 0 });
  });
});

describe("construirSerie — mês parcial não vira linha reta", () => {
  const porMes = agruparPorMes([
    ...dias("2026-03", 20, 31, 1000), // Sinoscar Farrapos: começa no dia 20
    ...dias("2026-04", 1, 30, 1000),
  ]);

  it("acumulado não desenha zeros antes do primeiro dia com dado", () => {
    const s = construirSerie(porMes, "2026-03", "2026-04", "acumulado");
    expect(s.slice(0, 19).every((r) => r.base === null)).toBe(true);
    expect(s[19].base).toBe(1000);
    expect(s[29].base).toBe(11000);
  });

  it("acumulado não prolonga o mês depois do último dia com dado", () => {
    const pm = agruparPorMes([...dias("2026-08", 1, 6, 500), ...dias("2026-07", 1, 31, 500)]);
    const s = construirSerie(pm, "2026-08", "2026-07", "acumulado");
    expect(s[5].base).toBe(3000);
    expect(s.slice(6).every((r) => r.base === null)).toBe(true);
    // nenhum trecho horizontal repetido no fim
    const valores = s.map((r) => r.base).filter((v): v is number => v != null);
    expect(new Set(valores).size).toBe(valores.length);
  });

  it("modo diário preserva os valores dia a dia", () => {
    const s = construirSerie(porMes, "2026-03", "2026-04", "diario");
    expect(s[0].base).toBeNull();
    expect(s[19].base).toBe(1000);
    expect(s[0].comp).toBe(1000);
  });

  it("índice 100 só existe onde os dois meses têm dado", () => {
    const s = construirSerie(porMes, "2026-03", "2026-04", "indice");
    expect(s[0].base).toBeNull();
    expect(s[0].comp).toBe(100);
    expect(s[19].base).toBeCloseTo((1000 / 20000) * 100, 6);
  });

  it("retorna vazio sem dados", () => {
    expect(construirSerie(new Map(), "2026-01", "2026-02", "diario")).toEqual([]);
  });
});

describe("resumirComparacao — mesma janela de dias", () => {
  it("compara agosto parcial (6 dias) contra os mesmos 6 dias de julho", () => {
    const pm = agruparPorMes([...dias("2026-08", 1, 6, 100), ...dias("2026-07", 1, 31, 200)]);
    const r = resumirComparacao(pm, "2026-08", "2026-07");
    expect(r.parcial).toBe(true);
    expect(r.totalA).toBe(600);
    expect(r.totalB).toBe(6200);
    expect(r.totalBJanela).toBe(1200);
    expect(r.variacao).toBeCloseTo(-0.5, 6);
  });

  it("mês base que começa tarde compara a mesma faixa de dias", () => {
    const pm = agruparPorMes([...dias("2026-03", 20, 28, 100), ...dias("2026-04", 1, 30, 100)]);
    const r = resumirComparacao(pm, "2026-03", "2026-04");
    expect(r.primeiroDiaA).toBe(20);
    expect(r.parcial).toBe(true);
    expect(r.totalBJanela).toBe(900); // dias 20..28 de abril
    expect(r.variacao).toBeCloseTo(0, 6);
  });

  it("meses fechados usam o total cheio e não são marcados como parciais", () => {
    const pm = agruparPorMes([...dias("2026-06", 1, 30, 100), ...dias("2026-05", 1, 31, 100)]);
    const r = resumirComparacao(pm, "2026-06", "2026-05");
    expect(r.parcial).toBe(false);
    expect(r.totalBJanela).toBe(r.totalB);
    expect(r.variacao).toBeCloseTo((3000 - 3100) / 3100, 6);
  });

  it("base zero não gera percentual absurdo", () => {
    const pm = agruparPorMes(dias("2026-06", 1, 10, 100));
    const r = resumirComparacao(pm, "2026-06", "2026-05");
    expect(Number.isFinite(r.variacao)).toBe(false);
  });
});
