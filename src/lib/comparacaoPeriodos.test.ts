import { describe, expect, it } from "vitest";
import { totalPeriodo, variacaoPeriodos } from "./comparacaoPeriodos";

const serie = [
  { data: "2026-10-01", tgmv_lc: 100, visits: 50, tsi: 2 },
  { data: "2026-10-02", tgmv_lc: 200, visits: 70, tsi: 3 },
  { data: "2026-10-03", tgmv_lc: 600, visits: null, tsi: 10 },
];
describe("comparação entre dois períodos", () => {
  it("soma faturamento, visitas e unidades incluindo as duas datas", () => {
    const p = totalPeriodo(serie, { de: "2026-10-01", ate: "2026-10-02" });
    expect(p.metricas.tgmv_lc.valor).toBe(300);
    expect(p.metricas.visits.valor).toBe(120);
    expect(p.metricas.tsi.valor).toBe(5);
    expect(p.dias).toBe(2);
  });
  it("compara B contra A sem normalizar intervalos de durações distintas", () => {
    const a = totalPeriodo(serie, { de: "2026-10-01", ate: "2026-10-02" });
    const b = totalPeriodo(serie, { de: "2026-10-03", ate: "2026-10-03" });
    expect(variacaoPeriodos(a, b, "tgmv_lc")).toBe(100);
  });
  it("não apresenta ausência de visita como zero", () => {
    const p = totalPeriodo(serie, { de: "2026-10-03", ate: "2026-10-03" });
    expect(p.metricas.visits.valor).toBeNull();
    expect(p.metricas.visits.completa).toBe(false);
  });
  it("identifica lacunas e bloqueia variação de leitura parcial", () => {
    const p = totalPeriodo(serie, { de: "2026-10-02", ate: "2026-10-04" });
    expect(p.metricas.tsi.cobertura).toBe(2);
    expect(p.metricas.tsi.completa).toBe(false);
    expect(variacaoPeriodos(p, p, "tsi")).toBeNull();
  });
  it("mantém zero medido e bloqueia divisão por zero", () => {
    const p = totalPeriodo([{ data: "2026-10-01", tgmv_lc: 0, visits: 0, tsi: 0 }], { de: "2026-10-01", ate: "2026-10-01" });
    expect(p.metricas.tgmv_lc.valor).toBe(0);
    expect(p.metricas.tgmv_lc.completa).toBe(true);
    expect(variacaoPeriodos(p, p, "tgmv_lc")).toBeNull();
  });
  it("rejeita intervalo invertido", () => {
    expect(totalPeriodo(serie, { de: "2026-10-03", ate: "2026-10-01" }).valido).toBe(false);
  });
});