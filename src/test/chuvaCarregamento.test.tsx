import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const estado = vi.hoisted(() => ({ buscando: 0 }));
const ambiente = vi.hoisted(() => vi.fn(() => null));
const letras = vi.hoisted(() => vi.fn(() => null));
vi.mock("@/components/chuva/LetrasCarregamento", () => ({ LetrasCarregamento: letras }));
vi.mock("@/components/chuva/AmbientePainel", () => ({ AmbientePainel: ambiente }));
vi.mock("@tanstack/react-query", () => ({ useIsFetching: () => estado.buscando }));
vi.mock("@/components/chuva/rain.js", () => ({}));
vi.mock("@/components/chuva/rainShaders.js", () => ({}));
import { ChuvaPainel } from "@/components/chuva/ChuvaPainel";
afterEach(() => { cleanup(); vi.useRealTimers(); estado.buscando = 0; ambiente.mockClear(); letras.mockClear(); delete window.AsimovRain; });
describe("chuva apenas no carregamento", () => {
  it("não inicia o efeito com painel carregado", () => {
    const mount = vi.fn(); window.AsimovRain = { mount };
    render(<ChuvaPainel />);
    expect(mount).not.toHaveBeenCalled();
    expect(letras).not.toHaveBeenCalled();
    expect(ambiente).toHaveBeenCalledTimes(1);
  });
  it("encerra o efeito depois de concluir a leitura", () => {
    vi.useFakeTimers(); estado.buscando = 1;
    const destroy = vi.fn(); const mount = vi.fn(() => ({ destroy, refresh: vi.fn() }));
    window.AsimovRain = { mount };
    const tela = render(<ChuvaPainel />);
    expect(mount).toHaveBeenCalledTimes(1);
    expect(letras).toHaveBeenCalledTimes(1);
    estado.buscando = 0; tela.rerender(<ChuvaPainel />);
    act(() => vi.advanceTimersByTime(600));
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(ambiente).toHaveBeenCalledTimes(3);
    expect(letras).toHaveBeenCalledTimes(2);
  });
});