import { describe, it, expect } from "vitest";
import { brlCurto, numCurto, pct, pctFracao, delta } from "./format";

const n = (s: string) => s.replace(/\u00a0/g, " ");

describe("format pt-BR", () => {
  it("não abrevia abaixo de 1 milhão", () => expect(n(brlCurto(558500))).toBe("R$ 558.500"));
  it("abrevia acima de 1 milhão com vírgula", () => expect(n(brlCurto(1_234_000))).toBe("R$ 1,2 mi"));
  it("280000 nunca vira 280000K", () => expect(numCurto(280000)).toBe("280.000"));
  it("percentual com vírgula", () => expect(pct(0.57, 2)).toBe("0,57%"));
  it("fração multiplica por 100 só uma vez", () => expect(pctFracao(0.125)).toBe("12,5%"));
  it("variação com sinal", () => expect(delta(8.4)).toBe("+8,4%"));
});
