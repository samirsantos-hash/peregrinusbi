import { describe, expect, it } from "vitest";
import { ABA_ALIAS, getSubanalise, SUBANALISES } from "@/config/sellerTabs";
describe("navegação por subanálise", () => {
  it("preserva a entrada antiga do resumo", () => { expect(ABA_ALIAS.executive).toBe("efficiency"); expect(getSubanalise("efficiency")?.id).toBe("geral"); });
  it("usa uma opção válida para links com subanálise desconhecida", () => { expect(getSubanalise("reputation", "inexistente")?.id).toBe("resumo"); });
  it("separa o índice de preço de McKinsey e evolução", () => { expect(getSubanalise("competitiveness", "mckinsey")?.id).toBe("mckinsey"); expect(getSubanalise("competitiveness", "evolucao")?.id).toBe("evolucao"); });
  it("mantém sinergia e produtos como destinos distintos", () => { expect(getSubanalise("publicidade", "sinergia")?.id).toBe("sinergia"); expect(getSubanalise("publicidade", "produtos")?.id).toBe("produtos"); });
  it("não cria subanálise em seção sem ramo", () => { expect(getSubanalise("perguntas", "sinergia")).toBeUndefined(); });
  it("não possui destinos repetidos dentro de um ramo", () => { for (const opcoes of Object.values(SUBANALISES)) expect(new Set(opcoes.map(o => o.id)).size).toBe(opcoes.length); });
});