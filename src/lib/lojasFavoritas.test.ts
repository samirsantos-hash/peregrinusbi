import { describe, it, expect } from "vitest";
import { alternarFavorita, ordenarComFavoritas } from "./lojasFavoritas";
describe("lojas favoritas", () => {
  it("favoritas vão para o topo mantendo a ordem", () => {
    const l = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    expect(ordenarComFavoritas(l, ["d", "b"]).map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });
  it("alternar adiciona e remove", () => {
    expect(alternarFavorita(["a"], "b")).toEqual(["a", "b"]);
    expect(alternarFavorita(["a", "b"], "a")).toEqual(["b"]);
  });
});
