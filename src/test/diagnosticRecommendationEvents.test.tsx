import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConversaoPorMLBPanel from "@/components/dashboard/ConversaoPorMLBPanel";

const mocks = vi.hoisted(() => ({ items: [] as Record<string, unknown>[] }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: mocks.items, isLoading: false }) }));
vi.mock("@/components/ds/CopiarAnuncio", () => ({ default: () => null }));
vi.mock("@/components/dashboard/TooltipInfo", () => ({ default: () => null }));
const track = vi.fn<(event: string, properties?: Record<string, unknown>) => string | null>(() => null);
function item(diagnostico = "qualidade") {
  return { itemId: "private-id", itemName: "Private listing", vertical: "private-vertical", pedidos7d: 2,
    estoqueMedio: 20, estoqueFull: 10, flagOptinCdp: false, flagBestPromo: false, descontoSellerPct: 5,
    diasEstoque: 10, statusGiro: "lento", shareEstoqueFull: 50, qualityScore: 30,
    scoreFotos: 30, scoreTitulo: 30, scoreFicha: 30, diagnostico, acoes: ["Private corrective recommendation"],
    prioridade: 1, mlbLink: "https://example.com/private-listing" };
}
beforeEach(() => { track.mockClear(); window.__lovableEvents = { track }; mocks.items = [item()]; });
afterEach(() => { cleanup(); delete window.__lovableEvents; });
function openPanel() { render(<ConversaoPorMLBPanel sellerId="private-seller" />); }
describe("diagnostic recommendation openings", () => {
  it("counts opening, not render or closing, and excludes private context", () => {
    openPanel();
    expect(track).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Private listing"));
    expect(screen.getByText("Private corrective recommendation")).toBeInTheDocument();
    expect(track).toHaveBeenCalledExactlyOnceWith("project.diagnostic_recommendation_opened", {
      recommendation_category: "listing_quality", dashboard_context: "seller_listing_performance",
    });
    fireEvent.click(screen.getByText("Private listing"));
    expect(track).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Private listing"));
    expect(track).toHaveBeenCalledTimes(2);
  });
  it.each([["visibilidade", "visibility"], ["estoque_parado", "inventory"], ["sem_dados", "missing_quality_data"]])(
    "records the bounded category for %s", (diagnosis, category) => {
      mocks.items = [item(diagnosis)]; openPanel();
      fireEvent.click(screen.getByText("Private listing"));
      expect(track).toHaveBeenCalledExactlyOnceWith("project.diagnostic_recommendation_opened", {
        recommendation_category: category, dashboard_context: "seller_listing_performance",
      });
    },
  );
  it("does not count healthy items or filters", () => {
    mocks.items = [item("ok")]; openPanel();
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "todos" } });
    fireEvent.click(screen.getByText("Private listing"));
    expect(track).not.toHaveBeenCalled();
  });
  it("does not count the external listing link as a diagnostic opening", () => {
    openPanel(); fireEvent.click(screen.getByRole("link")); expect(track).not.toHaveBeenCalled();
  });
  it("opens normally without the injected tracker", () => {
    delete window.__lovableEvents; openPanel(); fireEvent.click(screen.getByText("Private listing"));
    expect(screen.getByText("Private corrective recommendation")).toBeInTheDocument();
  });
});