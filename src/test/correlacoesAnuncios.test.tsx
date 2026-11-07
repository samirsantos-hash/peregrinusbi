import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({ granted: new Set<string>() }));
vi.mock("@/hooks/usePermissoes", () => ({ usePermissoes: () => ({ pode: (p: string) => state.granted.has(p) }) }));
vi.mock("@/components/ml/CompararAnuncios", () => ({ default: () => <div data-testid="comparison" /> }));
vi.mock("@/components/ml/acoes/AbaMelhorias", () => ({ AbaMelhorias: () => <div data-testid="improvements" /> }));
vi.mock("@/components/ml/acoes/AbaPromocoes", () => ({ AbaPromocoes: () => <div data-testid="promotions" /> }));
import CorrelacoesAnuncios from "@/components/ml/CorrelacoesAnuncios";
describe("liberações dos assuntos de anúncios", () => {
  it("não abre comparação sem permissão de qualidade", () => {
    state.granted = new Set(["correlacoes.visualizar"]);
    render(<MemoryRouter><CorrelacoesAnuncios accountId="account" custId="123" itens={[]} /></MemoryRouter>);
    expect(screen.queryByTestId("comparison")).toBeNull();
    expect(screen.queryByTestId("improvements")).toBeNull();
    expect(screen.queryByTestId("promotions")).toBeNull();
  });
  it("abre comparação com permissão de qualidade", () => {
    state.granted = new Set(["qualidade.visualizar", "correlacoes.visualizar"]);
    render(<MemoryRouter><CorrelacoesAnuncios accountId="account" custId="123" itens={[]} /></MemoryRouter>);
    expect(screen.getByTestId("comparison")).toBeInTheDocument();
  });
});