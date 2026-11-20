import { describe, expect, it } from "vitest";
import { ABA_ALIAS, getSubanalise, SUBANALISES, GRUPOS_SECOES } from "@/config/sellerTabs";
describe("navegação por subanálise", () => {
  it("agrupa correlações com anúncios sem perder destinos existentes", () => { expect(GRUPOS_SECOES.find(g => g.titulo === "Anúncios")?.ids).toEqual(["quality", "correlacoes"]); expect(getSubanalise("correlacoes")?.id).toBe("geral"); expect(getSubanalise("correlacoes", "anuncios")?.id).toBe("anuncios"); expect(getSubanalise("quality", "anuncios")?.id).toBe("anuncios"); });
  it("abre Análise geral primeiro no ramo Resumo e preserva links existentes", () => { expect(ABA_ALIAS.executive).toBe("efficiency"); expect(SUBANALISES.efficiency[0].id).toBe("analise"); expect(getSubanalise("efficiency")?.id).toBe("analise"); expect(getSubanalise("efficiency", "geral")?.id).toBe("geral"); });
  it("usa uma opção válida para links com subanálise desconhecida", () => { expect(getSubanalise("reputation", "inexistente")?.id).toBe("resumo"); });
  it("separa o índice de preço de McKinsey e evolução", () => { expect(getSubanalise("competitiveness", "mckinsey")?.id).toBe("mckinsey"); expect(getSubanalise("competitiveness", "evolucao")?.id).toBe("evolucao"); });
  it("mantém sinergia e produtos como destinos distintos", () => { expect(getSubanalise("publicidade", "sinergia")?.id).toBe("sinergia"); expect(getSubanalise("publicidade", "produtos")?.id).toBe("produtos"); });
  it("não cria subanálise em seção sem ramo", () => { expect(getSubanalise("perguntas", "sinergia")).toBeUndefined(); });
  it("não possui destinos repetidos dentro de um ramo", () => { for (const opcoes of Object.values(SUBANALISES)) expect(new Set(opcoes.map(o => o.id)).size).toBe(opcoes.length); });
});