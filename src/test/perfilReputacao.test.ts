import { describe, expect, it } from "vitest";
import { perfilLegivel, tierPorMedalha } from "@/lib/perfilReputacao";
describe("identidade da reputação", () => {
  it("não atribui tier à reputação verde sem medalha", () => { expect(tierPorMedalha("5_green")).toBeNull(); expect(tierPorMedalha(null)).toBeNull(); });
  it.each([["platinum",1],["gold",2],["silver",3]] as const)("associa %s ao tier %s sem receita estimada", (medalha,tier) => { expect(tierPorMedalha(medalha)).toBe(tier); });
  it("preserva ausência de perfil sem inventar maturidade", () => { expect(perfilLegivel(null)).toBe("Não informado"); });
  it("reconhece Joias da Coroa e profissionalização", () => { expect(perfilLegivel("Crown Jewels")).toBe("Joias da Coroa"); expect(perfilLegivel("In professionalization")).toBe("Em profissionalização"); });
});import { metaEnvios } from "@/lib/perfilReputacao";
describe("meta de envios 97%", () => {
  it("2% de atraso em 1000 vendas atinge a meta com folga de 10", () => { const r = metaEnvios(0.02, 1000)!; expect(r.noPrazo).toBeCloseTo(98); expect(r.atingida).toBe(true); expect(r.atrasosPermitidos).toBe(30); expect(r.folga).toBe(10); });
  it("4% de atraso não atinge a meta", () => { expect(metaEnvios(0.04, 500)!.atingida).toBe(false); });
  it("sem taxa não calcula", () => { expect(metaEnvios(null, 100)).toBeNull(); });
});
