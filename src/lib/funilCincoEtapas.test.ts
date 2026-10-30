import { describe, it, expect } from "vitest";
import { funilCincoEtapas } from "./funilCincoEtapas";

describe("funilCincoEtapas", () => {
  it("mostra só etapas reais: visitas e unidades", () => {
    const f = funilCincoEtapas(1000, 40);
    expect(f.etapas.map((e) => e.id)).toEqual(["visitas", "pedidos"]);
    expect(f.etapas.every((e) => e.fonte === "real")).toBe(true);
    expect(f.etapas[1].valor).toBe(40);
  });

  it("abandono real entre visitas e unidades, sem estimativa", () => {
    const f = funilCincoEtapas(1000, 10);
    expect(f.cvr).toBeCloseTo(0.01);
    expect(f.maiorAbandono!.perdidos).toBe(990);
    expect(f.maiorAbandono!.estimado).toBe(false);
  });

  it("limita unidades ao topo quando excedem visitas", () => {
    const f = funilCincoEtapas(100, 250);
    expect(f.etapas[1].valor).toBe(100);
    expect(f.cvr).toBe(1);
  });

  it("sem visitas retorna CVR nulo e sem abandono", () => {
    const f = funilCincoEtapas(0, 0);
    expect(f.cvr).toBeNull();
    expect(f.maiorAbandono).toBeNull();
  });
});
