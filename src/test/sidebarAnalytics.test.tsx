import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PainelSidebar from "@/components/dashboard/PainelSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/hooks/usePermissoes", () => ({ usePermissoes: () => ({ pode: () => true }) }));
vi.mock("@/components/novidades/novidades", () => ({ NovidadeTip: () => null }));
const track = vi.fn(() => null);
beforeEach(() => { localStorage.clear(); track.mockClear(); window.__lovableEvents = { track }; });
afterEach(() => { cleanup(); delete window.__lovableEvents; });
function mount(ativa = "reputation", subativa = "resumo", consultantAccess = true) {
  const select = vi.fn();
  render(<MemoryRouter><TooltipProvider><PainelSidebar ativa={ativa} subativa={subativa}
    consultantAccess={consultantAccess} sellerScope="single_store" onSubChange={select}
    onChange={() => {}} mobileAberto={false} onMobileChange={() => {}} /></TooltipProvider></MemoryRouter>);
  return select;
}
describe("tree analytics", () => {
  it("records only explicit summary expansion, not rendering or closing", () => {
    mount(); expect(track).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Resumo" }));
    expect(track).toHaveBeenCalledExactlyOnceWith("project.summary_tree_opened", {
      consultant_access: true, seller_scope: "single_store", source_view: "dashboard_sidebar",
    });
    fireEvent.click(screen.getByRole("button", { name: "Resumo" }));
    expect(track).toHaveBeenCalledTimes(1);
  });
  it.each([["reputation", "Reputação", "Análise McKinsey", "reputation", "requisitos"],
    ["competitiveness", "Preço", "Análise McKinsey", "price", "mckinsey"],
    ["publicidade", "Publicidade", "Sinergia e dependência", "advertising", "sinergia"]])(
    "records %s destination with bounded context", (section, parent, child, category, subsection) => {
      const select = mount("efficiency", "geral");
      fireEvent.click(screen.getByRole("button", { name: parent }));
      fireEvent.click(screen.getByRole("button", { name: child }));
      expect(track).toHaveBeenCalledExactlyOnceWith("project.seller_section_opened", {
        section: category, subsection, consultant_access: true, seller_scope: "single_store", source_view: "dashboard_sidebar",
      });
      expect(select).toHaveBeenCalledWith(section, subsection);
    });
  it("does not count current destination again", () => {
    mount(); fireEvent.click(screen.getByRole("button", { name: "Resumo da reputação" }));
    expect(track).not.toHaveBeenCalled();
  });
  it("navigation still works without collector", () => {
    const select = mount(); delete window.__lovableEvents;
    fireEvent.click(screen.getByRole("button", { name: "Análise McKinsey" }));
    expect(select).toHaveBeenCalledWith("reputation", "requisitos");
  });
});