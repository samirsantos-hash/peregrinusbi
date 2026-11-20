import { describe, expect, it } from "vitest";
import { entradaValida, evidencias, situacao } from "../../supabase/functions/ml-market-access/regras";

describe("Validação de acesso ao mercado", () => {
  const account_id = "7b33ec83-180e-42ff-b76e-7b22dd46a37f";
  it("não aceita caminhos livres nem grupos desconhecidos", () => {
    expect(entradaValida({ account_id, grupo: "catalogo" })).toBe(true);
    expect(entradaValida({ account_id, grupo: "concorrente_app" })).toBe(true);
    expect(entradaValida({ account_id, grupo: "catalogo", url: "https://example.com" })).toBe(false);
    expect(entradaValida({ account_id, grupo: "escrever" })).toBe(false);
  });
  it("não expõe valores ou dados fora da lista permitida", () => {
    const r = evidencias("concorrente_item", { sold_quantity: 500, available_quantity: 1, access_token: "segredo", buyer: { email: "privado" }, shipping: { free_shipping: false } });
    expect(r.campos).toEqual(["sold_quantity", "available_quantity", "shipping.free_shipping"]);
    expect(JSON.stringify(r)).not.toContain("segredo");
    expect(JSON.stringify(r)).not.toContain("privado");
    expect(r.precisao).toContain("não comprova precisão");
  });
  it("trata 403 interno de multiget como restrito mesmo com HTTP 200", () => {
    expect(situacao(200, 403)).toBe("restrito");
    expect(situacao(200)).toBe("disponivel");
    expect(situacao(429)).toBe("nao_confirmado");
  });
  it("campos ausentes não viram valores zero", () => {
    expect(evidencias("concorrente_item", { sold_quantity: null }).campos).toEqual([]);
    expect(evidencias("catalogo_ofertas", { results: [] }).registros).toBe(0);
  });
});