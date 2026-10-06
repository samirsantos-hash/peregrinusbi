import { describe, it, expect } from "vitest";
import { analisarLinhas } from "./revisaoPlanilha";

const H = ["CUS_CUST_ID_SEL", "CUS_NICKNAME", "TIM_DAY", "TGMV_LC", "TSI", "VISITAS"];
const row = (id: string, nick: string, d: string, g: string, u: string, v: string) =>
  ({ CUS_CUST_ID_SEL: id, CUS_NICKNAME: nick, TIM_DAY: d, TGMV_LC: g, TSI: u, VISITAS: v });

const tipos = (rows: ReturnType<typeof row>[]) => analisarLinhas(rows, H).alertas.map((a) => a.tipo);

describe("revisão de planilha", () => {
  it("marca mesma loja e mesma data duas vezes", () => {
    expect(tipos([row("1", "A", "2026-10-01", "10", "1", "5"), row("1,0", "A", "2026-10-01", "10", "1", "5")])).toContain("registro_duplicado");
  });
  it("marca vendas com zero visitas", () => {
    expect(tipos([row("1", "A", "2026-10-01", "1208,82", "3", "0")])).toEqual(["vendas_sem_visitas"]);
  });
  it("marca o mesmo ID com apelidos diferentes", () => {
    expect(tipos([row("1", "A", "2026-10-01", "10", "1", "5"), row("1", "B", "2026-10-02", "10", "1", "5")])).toContain("id_com_varios_apelidos");
  });
  it("marca faturamento negativo", () => {
    expect(tipos([row("1", "A", "2026-10-01", "-5", "1", "5")])).toContain("faturamento_negativo");
  });
});
