import { beforeEach, describe, expect, it } from "vitest";
import { apagarPeriodosSalvos, lerPeriodoSalvo, salvarPeriodo, validarPeriodoSalvo } from "./periodoSalvo";
describe("período salvo", () => {
  beforeEach(() => localStorage.clear());
  it("restaura o período do mesmo usuário", () => { salvarPeriodo("u1", { periodo: "30d", granularidade: "daily" }); expect(lerPeriodoSalvo("u1")).toEqual({ periodo: "30d", granularidade: "daily" }); expect(lerPeriodoSalvo("u2")).toBeNull(); });
  it("nunca restaura intervalo personalizado", () => { expect(validarPeriodoSalvo({ periodo: "custom-x", granularidade: "daily" })).toBeNull(); });
  it("descarta valor inválido", () => { localStorage.setItem("peregrinus:periodo:u1", "{bad"); expect(lerPeriodoSalvo("u1")).toBeNull(); expect(validarPeriodoSalvo({ periodo: "30d", granularidade: "anual" })).toBeNull(); });
  it("apaga ao sair", () => { salvarPeriodo("u1", { periodo: "q1", granularidade: "consolidated" }); apagarPeriodosSalvos(); expect(lerPeriodoSalvo("u1")).toBeNull(); });
});
