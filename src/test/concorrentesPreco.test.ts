import { describe, expect, it } from "vitest";
import { normalizarOfertas, resumoPrecos, lerPrecoInformado } from "@/lib/concorrentesPreco";

const oferta = { id: "MLB123", produto_id: "MLB456", titulo: "Produto", preco: 100 };

describe("Comparação confirmada de concorrentes", () => {
  it("não infere visitas ou conversão de vendidos e estoque", () => {
    const [r] = normalizarOfertas([{ ...oferta, sold_quantity: 200, visitas: 1000, conversao: 20 }]);
    expect(r?.visitas).toBeNull();
    expect(r?.conversao).toBeNull();
  });
  it("preserva preço ausente em vez de apresentar zero", () => {
    const r = normalizarOfertas([{ ...oferta, preco: null }]);
    expect(r[0]?.preco).toBeNull();
    expect(resumoPrecos(r, "MLB456")).toBeNull();
  });
  it("compara apenas ofertas do mesmo produto do catálogo", () => {
    const r = normalizarOfertas([oferta, { ...oferta, id: "MLB124", preco: 120 }, { ...oferta, id: "MLB125", produto_id: "MLB789", preco: 1000 }]);
    expect(resumoPrecos(r, "MLB456")).toEqual({ minimo: 100, maximo: 120, mediana: 110, total: 2 });
  });
  it("remove duplicatas sem inventar URLs de terceiros", () => {
    const r = normalizarOfertas([oferta, oferta, { ...oferta, id: "invalid" }]);
    expect(r).toHaveLength(1);
    expect(r[0]?.link).toBe("https://produto.mercadolivre.com.br/MLB-123");
  });
  it("lê preço brasileiro com centavos sem confundir milhares", () => {
    expect(lerPrecoInformado("1.234,56")).toBe(1234.56);
    expect(lerPrecoInformado("99,90")).toBe(99.9);
    expect(lerPrecoInformado("abc")).toBeNull();
  });
});