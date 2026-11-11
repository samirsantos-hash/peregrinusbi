import { describe, expect, it } from "vitest";
import { GRUPOS_ACESSOS } from "@/config/arvoreAcessos";
describe("grupos do menu lateral", () => {
  it("usa os cinco grupos aprovados", () => { expect(GRUPOS_ACESSOS.map(g => g.titulo)).toEqual(["Comando Central", "Motor de Vendas", "Anúncios & Conteúdo", "Operação", "Planejamento"]); });
  it("coloca Full em Operação e Correlações em Anúncios & Conteúdo", () => { expect(GRUPOS_ACESSOS.find(g => g.titulo === "Operação")?.ids).toContain("pock"); expect(GRUPOS_ACESSOS.find(g => g.titulo === "Anúncios & Conteúdo")?.ids).toContain("correlacoes"); });
  it("cada seção aparece em um só grupo", () => { const ids = GRUPOS_ACESSOS.flatMap(g => g.ids); expect(new Set(ids).size).toBe(ids.length); });
});
