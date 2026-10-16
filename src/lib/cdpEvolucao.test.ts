import { describe, it, expect } from "vitest";
import { evolucaoCdp, META_CDP, JANELA_CDP } from "./cdpEvolucao";

describe("Evolução CDP", () => {
  it("usa participação sobre os totais, não média de percentuais", () => {
    const serie = evolucaoCdp([{ date: "2026-10-01", tgmv: 100, cdpTgmv: 80 }, { date: "2026-10-02", tgmv: 900, cdpTgmv: 20 }]);
    expect(serie[1].participacao).toBe(10);
    expect(serie[1].pontuacao).toBe(50);
  });
  it("parametriza a meta existente de 20% e limita a nota a 100", () => {
    expect(META_CDP).toBe(20);
    expect(evolucaoCdp([{ date: "2026-10-01", tgmv: 100, cdpTgmv: 20 }])[0].pontuacao).toBe(100);
    expect(evolucaoCdp([{ date: "2026-10-01", tgmv: 100, cdpTgmv: 80 }])[0].pontuacao).toBe(100);
  });
  it("trava cada ponto em 30 dias corridos", () => {
    expect(JANELA_CDP).toBe(30);
    const serie = evolucaoCdp([{ date: "2026-09-01", tgmv: 1000, cdpTgmv: 1000 }, { date: "2026-10-01", tgmv: 100, cdpTgmv: 10 }]);
    expect(serie[serie.length - 1].participacao).toBe(10);
    expect(serie[serie.length - 1].faturamento).toBe(100);
  });
  it("preserva lacunas, zero real e faturamento ausente", () => {
    const serie = evolucaoCdp([{ date: "2026-10-01", tgmv: 100, cdpTgmv: 0 }, { date: "2026-10-03", tgmv: 100, cdpTgmv: 0 }]);
    expect(serie[0].pontuacao).toBe(0);
    expect(serie[1].participacao).toBeNull();
    expect(serie[2].dias).toBe(2);
    expect(evolucaoCdp([{ date: "2026-10-01", tgmv: 0, cdpTgmv: 0 }])[0].pontuacao).toBeNull();
  });
  it("sinaliza CDP maior que faturamento em vez de fabricar um score", () => {
    const ponto = evolucaoCdp([{ date: "2026-10-01", tgmv: 100, cdpTgmv: 150 }])[0];
    expect(ponto.inconsistente).toBe(true);
    expect(ponto.pontuacao).toBeNull();
  });
});