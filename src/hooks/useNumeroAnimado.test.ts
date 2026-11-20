import { describe, expect, it } from "vitest";
import { duracaoNumero, extrairNumero } from "./useNumeroAnimado";

describe("animação proporcional dos números", () => {
  it("mantém números sem separador, moedas e sinais completos", () => {
    expect(extrairNumero("12345")?.valor).toBe(12345);
    expect(extrairNumero("R$ 51.088,42")).toEqual({ valor: 51088.42, casas: 2, milhar: true, prefixo: "R$ ", sufixo: "" });
    expect(extrairNumero("-20,5%")?.valor).toBe(-20.5);
    expect(extrairNumero("Sem dado")).toBeNull();
  });
  it("usa 450–900ms e leva menos tempo em pequenas mudanças", () => {
    expect(duracaoNumero(0, 100)).toBe(900);
    expect(duracaoNumero(100, 100)).toBe(450);
    expect(duracaoNumero(100, 101)).toBeLessThan(duracaoNumero(100, 200));
  });
});