import { describe, it, expect } from "vitest";
import { descreverAparelho, ehAcessoNovo } from "../../../supabase/functions/auth-guard/acessos";

describe("registro de acessos", () => {
  it("primeiro login sem histórico não gera aviso", () => {
    expect(ehAcessoNovo([], "a")).toBe(false);
  });
  it("aparelho já usado não gera aviso", () => {
    expect(ehAcessoNovo(["a", "b"], "a")).toBe(false);
  });
  it("aparelho novo com histórico gera aviso", () => {
    expect(ehAcessoNovo(["a"], "c")).toBe(true);
  });
  it("descreve navegador e sistema", () => {
    expect(descreverAparelho("Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/120 Safari/537")).toBe("Chrome · Windows");
    expect(descreverAparelho("Mozilla/5.0 (iPhone; CPU iPhone OS 17) AppleWebKit Version/17 Safari/604")).toBe("Safari · iOS");
  });
});
