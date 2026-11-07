import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chamar = vi.fn();
vi.mock("@/lib/mlFuncoes", () => ({ chamarFuncaoMl: (...a: unknown[]) => chamar(...a) }));
vi.mock("@/hooks/usePermissoes", () => ({ usePermissoes: () => ({ pode: () => true }) }));
import { useAcaoEmLote } from "@/lib/mlAcoes";

const track = vi.fn(() => null);
beforeEach(() => { chamar.mockReset(); track.mockClear(); window.__lovableEvents = { track }; });
afterEach(() => { delete window.__lovableEvents; });

async function confirmarCom(resultados: { status: string }[]) {
  chamar.mockResolvedValueOnce({ linhas: [] }).mockResolvedValueOnce({ resultados });
  const { result } = renderHook(() => useAcaoEmLote("ml-price-action", "conta"));
  await act(() => result.current.previa({}));
  expect(track).not.toHaveBeenCalled();
  await act(() => result.current.confirmar());
}

describe("alterações confirmadas", () => {
  it("conta só itens aplicados pelo Mercado Livre", async () => {
    await confirmarCom([{ status: "feito" }, { status: "feito" }, { status: "ja_feito" }, { status: "recusado" }]);
    expect(track).toHaveBeenCalledExactlyOnceWith("project.listing_changes_confirmed", { change_area: "price", applied_count: 2 });
  });
  it("não registra quando nada foi aplicado", async () => {
    await confirmarCom([{ status: "conflito" }, { status: "ja_feito" }]);
    expect(track).not.toHaveBeenCalled();
  });
});
