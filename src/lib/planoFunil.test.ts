import { describe, it, expect } from "vitest";
import { planoFunil } from "./planoFunil";

describe("planoFunil", () => {
  it("prioriza a etapa com maior perda de clientes", () => {
    // 1000 visitas, 300 competitivas (perde 70%), 30 unidades (perde 90% das competitivas)
    const p = planoFunil({ visitas: 1000, competitivas: 300, unidades: 30, fat: 3000 });
    expect(p[0].etapa).toBe("fechar");
    expect(p[0].prioridade).toBe("Alta");
    expect(p[1].etapa).toBe("preco");
  });
  it("estima unidades a mais ao levar a competitividade até a meta de 70%", () => {
    // conversão 10% sobre competitivas; faltam 40 p.p. → 400 visitas × 10% = 40 unidades
    const p = planoFunil({ visitas: 1000, competitivas: 300, unidades: 30, fat: 0 });
    expect(p.find((x) => x.etapa === "preco")!.unidadesPotenciais).toBeCloseTo(40);
  });
  it("atrair visitas fica por último", () => {
    const p = planoFunil({ visitas: 100, competitivas: 0, unidades: 5, fat: 0 });
    expect(p[p.length - 1].etapa).toBe("atrair");
  });
});
