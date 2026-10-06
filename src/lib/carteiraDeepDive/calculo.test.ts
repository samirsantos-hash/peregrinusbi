import { describe, it, expect } from "vitest";
import {
  calcularJanelas, razao, alavancas, vazio, diagnosticar, ordenarPlano, cruzamentos,
  movimentacao, possivelMudancaMix, type Loja, type Totais,
} from "./calculo";

const loja = (id: string, extra: Partial<Loja> = {}): Loja => ({ id, custId: id, nickname: id, vertical: null, fechaIn: null, fechaOut: null, ...extra });
const tot = (p: Partial<Totais>): Totais => ({ ...vazio(), linhas: 1, ...p });

describe("carteira deep dive", () => {
  it("compara a mesma janela de dias do mês anterior", () => {
    const j = calcularJanelas("2026-10-04");
    expect(j.atual).toEqual({ ini: "2026-10-01", fim: "2026-10-04", dias: 4 });
    expect(j.anterior).toEqual({ ini: "2026-09-01", fim: "2026-09-04", dias: 4 });
    expect(j.anoAnterior.fim).toBe("2025-10-04");
    expect(j.mesCompleto).toBe(false);
  });

  it("janela do dia 31 vira 30 em mês de 30 dias", () => {
    expect(calcularJanelas("2026-10-31").anterior.fim).toBe("2026-09-30");
  });

  it("denominador zero devolve null, nunca 0%", () => {
    expect(razao(5, 0)).toBeNull();
    expect(alavancas(vazio()).full).toBeNull();
  });

  it("valor inválido lança erro explícito", () => {
    expect(() => razao(Infinity, 2)).toThrow();
  });

  it("Full 39% dispara alerta com meta ≥ 40%; 40% não dispara", () => {
    const a = diagnosticar(loja("a"), tot({ gmv: 100, full: 39, ads: 10, promo: 30, visMatch: 10 }), tot({ gmv: 100 }));
    expect(a.alertas.map((x) => x.tipo)).toEqual(["full"]);
    const b = diagnosticar(loja("b"), tot({ gmv: 100, full: 40, ads: 10, promo: 30, visMatch: 10 }), tot({ gmv: 100 }));
    expect(b.alertas).toEqual([]);
  });

  it("queda de 20% dispara; 19% não", () => {
    const base = { full: 50, ads: 10, promo: 30, visMatch: 10 };
    expect(diagnosticar(loja("a"), tot({ gmv: 80, ...base }), tot({ gmv: 100 })).alertas.map((x) => x.tipo)).toContain("queda");
    expect(diagnosticar(loja("b"), tot({ gmv: 81, ...base }), tot({ gmv: 100 })).alertas.map((x) => x.tipo)).not.toContain("queda");
  });

  it("plano de ação ordena por quantidade de alertas, não por faturamento", () => {
    const grande = diagnosticar(loja("g"), tot({ gmv: 1_000_000, full: 0, ads: 100_000, promo: 300_000, visMatch: 10 }), tot({ gmv: 1_000_000 }));
    const pequena = diagnosticar(loja("p"), tot({ gmv: 10, full: 0, ads: 0, promo: 0, visExpensive: 10 }), tot({ gmv: 100 }));
    expect(ordenarPlano([grande, pequena]).map((d) => d.loja.id)).toEqual(["p", "g"]);
  });

  it("loja nos três cruzamentos é contada 3 vezes", () => {
    const d = diagnosticar(loja("x"), tot({ gmv: 10, full: 0, ads: 0, promo: 0, visMatch: 10 }), tot({ gmv: 100 }));
    expect(cruzamentos([d]).vezes.get("x")).toBe(3);
  });

  it("total em risco é a soma da tabela de saída e separa as lojas sem receita", () => {
    const j = calcularJanelas("2026-10-04").atual;
    const lojas = [loja("a", { fechaOut: "2026-10-20" }), loja("b", { fechaOut: "2026-11-15" }), loja("c", { fechaOut: "2026-10-10" })];
    const g = new Map([["a", tot({ gmv: 300 })], ["b", tot({ gmv: 200 })], ["c", tot({ gmv: 0 })]]);
    const m = movimentacao(lojas, g, j);
    expect(m.emRisco).toBe(500);
    expect(m.saindo.map((s) => s.loja.id)).toEqual(["a", "b"]);
    expect(m.saindoSemReceita.map((s) => s.loja.id)).toEqual(["c"]);
  });

  it("itens -10% com ticket +11% sinaliza mudança de mix", () => {
    expect(possivelMudancaMix(-0.1, 0.11)).toBe(true);
    expect(possivelMudancaMix(-0.1, 0)).toBe(false);
  });
});
