import { describe, expect, it } from "vitest";
import { resolveMlAppUrl } from "../../supabase/functions/_shared/mlAppUrl";

describe("Mercado Livre callback destination", () => {
  it("rejects a function endpoint as the panel destination", () => {
    expect(resolveMlAppUrl("https://example.supabase.co/functions/v1/ml-oauth-callback")).toBe("https://ecomperegrinus.com.br");
  });
  it("does not redirect to the unrelated domain from the uploaded diagnosis", () => {
    expect(resolveMlAppUrl("https://ecomdatabr.com")).toBe("https://ecomperegrinus.com.br");
  });
  it("keeps the official panel origin without appended paths", () => {
    expect(resolveMlAppUrl("https://ecomperegrinus.com.br/integracoes/")).toBe("https://ecomperegrinus.com.br");
  });
  it("uses the official panel when configuration is missing", () => {
    expect(resolveMlAppUrl()).toBe("https://ecomperegrinus.com.br");
  });
});