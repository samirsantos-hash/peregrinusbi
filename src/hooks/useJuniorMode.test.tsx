import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { JuniorModeProvider, useJuniorMode } from "./useJuniorMode";

describe("escolha do modo didático", () => {
  beforeEach(() => window.localStorage.clear());

  it("permite ocultar e restaurar as orientações", () => {
    const { result } = renderHook(() => useJuniorMode(), { wrapper: JuniorModeProvider });
    expect(result.current.enabled).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(true);
  });

  it("mantém a escolha avançada ao reabrir o painel", () => {
    const first = renderHook(() => useJuniorMode(), { wrapper: JuniorModeProvider });
    act(() => first.result.current.toggle());
    expect(window.localStorage.getItem("peregrinus_junior_mode")).toBe("false");
    first.unmount();
    const reopened = renderHook(() => useJuniorMode(), { wrapper: JuniorModeProvider });
    expect(reopened.result.current.enabled).toBe(false);
  });
});