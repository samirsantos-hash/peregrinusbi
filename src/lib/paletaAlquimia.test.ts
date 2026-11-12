import { describe, it, expect, beforeEach } from "vitest";
import { lerPaletaAlquimia, salvarPaletaAlquimia, apagarPaletasAlquimia } from "./paletaAlquimia";

describe("paleta Alquimia", () => {
  beforeEach(() => localStorage.clear());
  it("lembra a escolha do mesmo usuário", () => {
    salvarPaletaAlquimia("u1", true);
    expect(lerPaletaAlquimia("u1")).toBe(true);
  });
  it("não vaza para outro usuário", () => {
    salvarPaletaAlquimia("u1", true);
    expect(lerPaletaAlquimia("u2")).toBe(false);
  });
  it("desfazer volta ao visual atual", () => {
    salvarPaletaAlquimia("u1", true);
    salvarPaletaAlquimia("u1", false);
    expect(lerPaletaAlquimia("u1")).toBe(false);
  });
  it("sair apaga a escolha", () => {
    salvarPaletaAlquimia("u1", true);
    apagarPaletasAlquimia();
    expect(lerPaletaAlquimia("u1")).toBe(false);
  });
});
