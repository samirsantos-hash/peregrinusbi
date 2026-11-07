import { describe, expect, it } from "vitest";
import { perfilLegivel, tierPorMedalha } from "@/lib/perfilReputacao";
describe("identidade da reputação", () => {
  it("não atribui tier à reputação verde sem medalha", () => { expect(tierPorMedalha("5_green")).toBeNull(); expect(tierPorMedalha(null)).toBeNull(); });
  it.each([["platinum",1],["gold",2],["silver",3]] as const)("associa %s ao tier %s sem receita estimada", (medalha,tier) => { expect(tierPorMedalha(medalha)).toBe(tier); });
  it("preserva ausência de perfil sem inventar maturidade", () => { expect(perfilLegivel(null)).toBe("Não informado"); });
  it("reconhece Joias da Coroa e profissionalização", () => { expect(perfilLegivel("Crown Jewels")).toBe("Joias da Coroa"); expect(perfilLegivel("In professionalization")).toBe("Em profissionalização"); });
});