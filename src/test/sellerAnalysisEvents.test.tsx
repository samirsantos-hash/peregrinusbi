import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContextoNavegacaoProvider } from "@/contexts/ContextoNavegacao";
import ListaFilhos from "@/components/nivel/ListaFilhos";
import type { ItemFilho } from "@/lib/navegacao/tipos";

vi.mock("@/components/programas/base/Sparkline", () => ({ default: () => null }));

const track = vi.fn(() => null);
function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}
function openRow(start: string, destination: string, disabled = false) {
  const item: ItemFilho = {
    id: "private-id", nome: "Private seller", status: "verde", valor: 100,
    unidade: "BRL", gap: 0, serie: [], acao: "Analisar", destino: destination,
  };
  render(<MemoryRouter initialEntries={[start]}><ContextoNavegacaoProvider>
    <ListaFilhos itens={[item]} vazio="" semNavegacao={disabled} /><Location />
  </ContextoNavegacaoProvider></MemoryRouter>);
}
beforeEach(() => { track.mockClear(); window.__lovableEvents = { track }; });
afterEach(() => { cleanup(); delete window.__lovableEvents; });

describe("seller analysis navigation events", () => {
  it("opens a store from the portfolio once, preserving filters without sending private context", () => {
    openRow("/carteira?periodo=2026-01:2026-11", "/lojas/private-id");
    expect(track).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button"));
    expect(track).toHaveBeenCalledExactlyOnceWith("project.seller_analysis_opened", {
      analysis_level: "store", source: "portfolio", seller_scope: "single_store",
    });
    expect(screen.getByTestId("location").textContent).toBe("/lojas/private-id?periodo=2026-01%3A2026-11");
  });
  it("opens listing analysis from the store dashboard", () => {
    openRow("/lojas/private-id", "/lojas/private-id/anuncios/private-listing");
    fireEvent.click(screen.getByRole("button"));
    expect(track).toHaveBeenCalledExactlyOnceWith("project.seller_analysis_opened", {
      analysis_level: "listing", source: "seller_analysis", seller_scope: "single_store",
    });
  });
  it("does not count navigation to an intermediate program", () => {
    openRow("/lojas/private-id", "/lojas/private-id/programas");
    fireEvent.click(screen.getByRole("button"));
    expect(track).not.toHaveBeenCalled();
  });
  it("does not recount the same store when only filters change", () => {
    openRow("/lojas/private-id", "/lojas/private-id?aba=visao");
    fireEvent.click(screen.getByRole("button"));
    expect(track).not.toHaveBeenCalled();
  });
  it("does not count non-navigable listing indicators", () => {
    openRow("/lojas/private-id/anuncios/item", "", true);
    fireEvent.click(screen.getByText("Private seller"));
    expect(track).not.toHaveBeenCalled();
  });
  it("opens normally when the injected runtime is absent", () => {
    delete window.__lovableEvents;
    openRow("/carteira", "/lojas/private-id");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByTestId("location").textContent).toBe("/lojas/private-id");
  });
});