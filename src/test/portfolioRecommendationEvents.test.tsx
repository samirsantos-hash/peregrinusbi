import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlanoAcao from "@/components/carteira/deepdive/PlanoAcao";
import Retencao from "@/components/carteira/deepdive/Retencao";
import type { DiagnosticoLoja, TipoAlerta } from "@/lib/carteiraDeepDive/calculo";

const track = vi.fn<(event: string, properties?: Record<string, unknown>) => string | null>(() => null);
function diagnostic(types: TipoAlerta[]): DiagnosticoLoja {
  return { loja: { id: "private-id", nickname: "Private seller", custId: "private-customer", vertical: null, fechaIn: null, fechaOut: null },
    gmv: 100, gmvAnterior: 200, queda: -0.5, alavancas: null,
    alertas: types.map(tipo => ({ tipo, valor: 0.1, limite: "Private threshold" })) };
}
function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
beforeEach(() => { track.mockClear(); window.__lovableEvents = { track }; });
afterEach(() => { cleanup(); delete window.__lovableEvents; });
describe("portfolio recommendation events", () => {
  it.each([["queda", "revenue_decline"], ["full", "logistics"], ["ads", "advertising"], ["promocao", "promotions"], ["competitividade", "price"]] as const)(
    "opens the existing %s corrective destination with bounded category", (type, category) => {
      render(<MemoryRouter><PlanoAcao itens={[diagnostic([type])]} /><Location /></MemoryRouter>);
      expect(track).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText("Private seller"));
      expect(screen.getByTestId("location").textContent).toBe("/lojas/private-id");
      expect(track).toHaveBeenCalledExactlyOnceWith("project.diagnostic_recommendation_opened", {
        recommendation_category: category, dashboard_context: "portfolio_action_plan",
      });
    },
  );
  it("counts a multi-issue row once, not once per alert", () => {
    render(<MemoryRouter><PlanoAcao itens={[diagnostic(["ads", "queda"])]} /></MemoryRouter>);
    fireEvent.click(screen.getByText("Private seller"));
    expect(track).toHaveBeenCalledExactlyOnceWith("project.diagnostic_recommendation_opened", {
      recommendation_category: "multiple_issues", dashboard_context: "portfolio_action_plan",
    });
  });
  it.each(["ads", "promocao", "full"] as const)("records the %s retention block", (block) => {
    const categories = { ads: "advertising", promocao: "promotions", full: "logistics" };
    render(<MemoryRouter><Retencao ads={block === "ads" ? [diagnostic(["ads"])] : []}
      promocao={block === "promocao" ? [diagnostic(["promocao"])] : []}
      full={block === "full" ? [diagnostic(["full"])] : []} vezes={new Map()} /></MemoryRouter>);
    fireEvent.click(screen.getByText("Private seller"));
    expect(track).toHaveBeenCalledExactlyOnceWith("project.diagnostic_recommendation_opened", {
      recommendation_category: categories[block], dashboard_context: "portfolio_retention",
    });
  });
});