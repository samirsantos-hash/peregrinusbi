import { describe, it, expect } from "vitest";
import { adsNumber, adsPeriod, adsRatios, canManageAds } from "../../supabase/functions/_shared/mlAdsRules";

describe("Gestão de Ads", () => {
  it("permite escrita ao super admin", () => { expect(canManageAds(true, "admin")).toBe(true); });
  it("permite escrita ao consultor", () => { expect(canManageAds(false, "consultor")).toBe(true); });
  it("nega escrita a admin comum, gerente, gestor e usuário sem perfil", () => {
    for (const role of ["admin", "gerente", "gestor_loja", null]) expect(canManageAds(false, role)).toBe(false);
  });
  it("usa dias completos UTC no mesmo intervalo para todas as campanhas", () => {
    expect(adsPeriod(30, new Date("2026-10-22T01:10:00Z"))).toEqual({ inicio: "2026-09-22", fim: "2026-10-21" });
  });
  it("calcula indicadores ponderados sobre totais, não média de índices", () => {
    expect(adsRatios(100 + 900, 1000 + 1800, 100 + 300, 1000 + 9000)).toEqual({ roas: 2.8, acos: 1000 / 2800, cpc: 2.5, ctr: 0.04 });
  });
  it("mantém dado ausente como null e zero conhecido como zero", () => {
    expect(adsNumber(undefined)).toBeNull(); expect(adsNumber("invalid")).toBeNull(); expect(adsNumber(0)).toBe(0);
    expect(adsRatios(null, 0, 0, 0)).toEqual({ roas: null, acos: null, cpc: null, ctr: null });
  });
});