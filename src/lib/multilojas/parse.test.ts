import { describe, it, expect } from "vitest";
import { parseDataML, dedupHeaders, mapColunas, diaLocal, rangeDias } from "@/lib/multilojas/parse";

describe("ingestão ML", () => {
  it("não trunca março", () => {
    const d = parseDataML("13 de março de 2026 16:49 hs.")!;
    expect(d.getMonth()).toBe(2);
    expect(diaLocal(d)).toBe("2026-03-13");
  });
  it("aceita espanhol", () => expect(parseDataML("2 de marzo de 2026")!.getMonth()).toBe(2));
  it("dia local à meia-noite não desloca", () => expect(diaLocal(new Date(2026, 6, 13, 0, 58))).toBe("2026-07-13"));
  it("dedup de colunas homônimas", () => {
    const h = dedupHeaders(["N.º de venda", "Data da venda", "Estado", "# de anúncio", "Tipo de anúncio", "Estado", "Unidades"]);
    expect(h).toContain("estado 2");
    const idx = mapColunas(h);
    expect(idx.status).toBe(2);
    expect(idx.uf).toBe(5);
    expect(idx.mlb).toBe(3);
    expect(idx.tipoAnun).toBe(4);
  });
  it("calendário contínuo", () => expect(rangeDias("2026-02-27", "2026-03-02").length).toBe(4));
});
