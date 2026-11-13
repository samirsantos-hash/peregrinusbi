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
import { desempenhoVendedor } from "@/lib/perfilReputacao";
describe("desempenho do vendedor", () => {
  it("calcula quantidades e folga sobre 92.770 vendas", () => {
    const [rec, can, atr] = desempenhoVendedor({ reclamacoes: 0.0039, cancelamentos: 0, atrasos: 0.0013, vendas_concluidas_60d: 92770 });
    expect(rec.qtd).toBe(362); expect(rec.permitidos).toBe(927); expect(can.ok).toBe(true); expect(atr.permitidos).toBe(2783); expect(atr.qtd).toBe(121);
  });
  it("taxa ausente fica sem cálculo", () => { expect(desempenhoVendedor({ vendas_concluidas_60d: 10 })[0].taxa).toBeNull(); });
});
import { evolucaoTier } from "@/lib/perfilReputacao";
const L = { 1: { sowPads: 2.5, oos: 15, bs: 35 }, 2: { sowPads: 1.25, oos: 25, bs: 45 }, 3: { sowPads: 0.5, oos: 35, bs: 55 } } as const;
describe("evolução de tier", () => {
  it("Gold mira Tier 1 e mostra lacuna de Ads", () => { const r = evolucaoTier({ tier: 2, sowPads: 1.5, oos: 10, bs: null }, L); expect(r.alvo).toBe(1); expect(r.linhas[0].gap).toBeCloseTo(1); expect(r.linhas[1].ok).toBe(true); expect(r.linhas[2].ok).toBeNull(); });
  it("sem medalha mira Tier 2", () => { expect(evolucaoTier({ tier: null, sowPads: 0, oos: 0, bs: 0 }, L).alvo).toBe(2); });
});
