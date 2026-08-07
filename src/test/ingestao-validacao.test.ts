import { describe, it, expect } from "vitest";
import { flag, contarFlag, mapIntegrador, COLUNAS_FLAG } from "@/lib/programas/flags";
import { normalizarCustId } from "@/lib/programas/rawMensal";
import { fmtTaxa } from "@/utils/formatters";
describe("ingestão", () => {
  it("chave casa nos dois feeds", () => {
    expect(normalizarCustId("237664328,0")).toBe("237664328");
    expect(normalizarCustId("237664328")).toBe("237664328");
  });
  it("flags viram booleano", () => {
    expect(COLUNAS_FLAG.length).toBe(27);
    expect(flag("237664328")).toBe(true);
    expect(flag("")).toBe(null);
    expect(flag("0")).toBe(false);
    expect(contarFlag([{ F: "237664328" }, { F: "" }, { F: "9" }], "F")).toBe(2);
    expect(mapIntegrador("1")).toBe("Utiliza");
    expect(mapIntegrador("0")).toBe("Não utiliza");
    expect(mapIntegrador("")).toBe("sem_dado");
  });
  it("taxa 0,125 -> 12,5%", () => {
    expect(fmtTaxa(0.125)).toBe("12,5%");
    expect(fmtTaxa(null)).toBe("—");
  });
});
