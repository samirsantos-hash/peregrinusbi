import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const estado = vi.hoisted(() => ({ buscando: 0 }));
vi.mock("@tanstack/react-query", () => ({ useIsFetching: () => estado.buscando }));
import { IndicadorCarregamento } from "@/components/chuva/IndicadorCarregamento";
afterEach(() => { cleanup(); estado.buscando = 0; });
it("mostra indicador durante consultas e remove assim que acabam", () => {
  const tela = render(<IndicadorCarregamento />);
  expect(screen.queryByRole("status")).toBeNull();
  estado.buscando = 2; tela.rerender(<IndicadorCarregamento />);
  expect(screen.queryByRole("status")).not.toBeNull();
  estado.buscando = 0; tela.rerender(<IndicadorCarregamento />);
  expect(screen.queryByRole("status")).toBeNull();
});