import { describe, expect, it } from "vitest";
import { agruparPorMes, construirSerie, limitesMes, resumirComparacao } from "@/lib/gmvMesVsMes";
import {
  SINOSCAR_AGO_TOTAL,
  SINOSCAR_FARRAPOS,
  SINOSCAR_JUL_JANELA_1_6,
  SINOSCAR_JUL_TOTAL,
} from "./fixtures/sinoscarFarrapos";

const porMes = agruparPorMes(SINOSCAR_FARRAPOS);

describe("Regressão Sinoscar Farrapos — janela 1–6 em mês parcial", () => {
  it("detecta a janela real do mês parcial (ago: 1→6)", () => {
    expect(limitesMes(porMes.get("2026-08"))).toEqual({ primeiro: 1, ultimo: 6 });
    expect(limitesMes(porMes.get("2026-07"))).toEqual({ primeiro: 1, ultimo: 31 });
  });

  it("compara ago (parcial) contra a MESMA janela de jul (dias 1–6)", () => {
    const r = resumirComparacao(porMes, "2026-08", "2026-07");
    expect(r.parcial).toBe(true);
    expect(r.totalA).toBe(SINOSCAR_AGO_TOTAL);
    expect(r.totalB).toBe(SINOSCAR_JUL_TOTAL);
    expect(r.totalBJanela).toBe(SINOSCAR_JUL_JANELA_1_6);
    // 71.000 vs 61.000 => +16,39%. Nunca o -74% do total cheio.
    expect(r.variacao).toBeCloseTo((71000 - 61000) / 61000, 6);
    expect(r.variacao).toBeGreaterThan(0);
  });

  it("não prolonga a curva do mês parcial depois do dia 6 (sem linha reta)", () => {
    const serie = construirSerie(porMes, "2026-08", "2026-07", "acumulado");
    expect(serie).toHaveLength(31);
    const ago = serie.map((l) => l.base);
    expect(ago.slice(0, 6).every((v) => typeof v === "number" && (v as number) > 0)).toBe(true);
    expect(ago.slice(6).every((v) => v === null)).toBe(true);
    // jul segue até o dia 31
    expect(serie[30].comp).toBe(SINOSCAR_JUL_TOTAL);
  });

  it("modo índice também respeita a janela 1–6", () => {
    const serie = construirSerie(porMes, "2026-08", "2026-07", "indice");
    expect(serie.slice(6).every((l) => l.base === null)).toBe(true);
    expect(serie[5].base).toBeCloseTo((71000 / 61000) * 100, 6);
  });

  it("meses fechados (jul vs jun) não são tratados como parciais", () => {
    const comJun = agruparPorMes([
      ...SINOSCAR_FARRAPOS,
      ...Array.from({ length: 30 }, (_, i) => ({
        date: `2026-06-${String(i + 1).padStart(2, "0")}`,
        gmv: 9000,
      })),
    ]);
    const r = resumirComparacao(comJun, "2026-07", "2026-06");
    expect(r.parcial).toBe(false);
    expect(r.totalBJanela).toBe(r.totalB);
  });
});
