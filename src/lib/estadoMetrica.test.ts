import { describe, it, expect } from "vitest";
import {
  classificarInvestimento,
  classificarRazao,
  formatarComEstado,
  rotuloEstado,
} from "./estadoMetrica";

describe("estadoMetrica", () => {
  it("distingue sem dado, não participa e valor", () => {
    expect(classificarInvestimento(null)).toBe("sem_dado");
    expect(classificarInvestimento(undefined)).toBe("sem_dado");
    expect(classificarInvestimento(NaN)).toBe("sem_dado");
    expect(classificarInvestimento(0)).toBe("nao_participa");
    expect(classificarInvestimento(10)).toBe("valor");
  });

  it("razão herda o estado do investimento", () => {
    expect(classificarRazao(0, 0)).toBe("nao_participa");
    expect(classificarRazao(null, 5)).toBe("sem_dado");
    expect(classificarRazao(2.5, 5)).toBe("valor");
  });

  it("formata sem colapsar estados em 0", () => {
    expect(formatarComEstado("valor", "2,50x")).toBe("2,50x");
    expect(formatarComEstado("nao_participa", "0")).toBe(rotuloEstado("nao_participa"));
    expect(formatarComEstado("sem_dado", "0")).toBe(rotuloEstado("sem_dado"));
  });
});
