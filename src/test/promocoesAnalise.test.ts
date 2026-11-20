import { describe, expect, it } from "vitest";
import { diasParaVencer, recomendarPorRebate, venceEmBreve, type PromoBase } from "@/lib/promocoesAnalise";

const agora = Date.parse("2026-10-26T12:00:00Z");
const p = (id: string, meli: number | null, fim: string | null, status = "started"): PromoBase => ({
  promotion_id: id, nome: id, tipo: "DEAL", status, fim, prazo: null,
  beneficios: meli == null ? null : { meli_percent: meli, seller_percent: 10 },
});

describe("promoções", () => {
  it("recomenda a de maior rebate do ML, ignorando encerradas", () => {
    const r = recomendarPorRebate([p("a", 5, "2026-12-01"), p("b", 12, "2026-12-01", "finished"), p("c", 8, "2026-12-01")], agora);
    expect(r?.promotion_id).toBe("c");
  });
  it("sem rebate, sem recomendação", () => {
    expect(recomendarPorRebate([p("a", null, "2026-12-01")], agora)).toBeNull();
  });
  it("aviso amarelo até 7 dias do vencimento", () => {
    expect(venceEmBreve(p("a", 5, "2026-11-02T12:00:00Z"), agora)).toBe(true);
    expect(venceEmBreve(p("a", 5, "2026-11-03T13:00:00Z"), agora)).toBe(false);
    expect(diasParaVencer(p("a", 5, "2026-10-20"), agora)).toBeNull();
  });
});
