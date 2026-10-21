import { describe, expect, it } from "vitest";
import { resolveMlAppUrl } from "../../supabase/functions/_shared/mlAppUrl";

describe("Mercado Livre callback destination", () => {
  it("rejects a function endpoint as the panel destination", () => {
    expect(resolveMlAppUrl("https://example.supabase.co/functions/v1/ml-oauth-callback")).toBeNull();
  });
  it("rejects the unrelated domain from the uploaded diagnosis", () => {
    expect(resolveMlAppUrl("https://ecomdatabr.com")).toBeNull();
  });
  it("keeps the official panel origin without appended paths", () => {
    expect(resolveMlAppUrl("https://ecomperegrinus.com.br/integracoes/")).toBe("https://ecomperegrinus.com.br");
  });
  it("returns no destination when configuration is missing", () => {
    expect(resolveMlAppUrl()).toBeNull();
    expect(resolveMlAppUrl("")).toBeNull();
  });
});
