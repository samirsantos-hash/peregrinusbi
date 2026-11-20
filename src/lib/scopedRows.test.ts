import { describe, expect, it } from "vitest";
import { fetchScopedRows } from "./scopedRows";

describe("server-scoped portfolio reads", () => {
  it("never queries when no stores were requested", async () => {
    let calls = 0;
    expect(await fetchScopedRows([], async () => { calls++; return { data: [], error: null }; })).toEqual([]);
    expect(calls).toBe(0);
  });
  it("keeps a portfolio over 300 stores filtered in sequential batches", async () => {
    const ids = Array.from({ length: 351 }, (_, i) => `store-${i}`);
    const scopes: string[][] = [];
    let active = 0, peak = 0;
    const rows = await fetchScopedRows<string>(ids, async (scope) => {
      scopes.push(scope); active++; peak = Math.max(peak, active);
      await Promise.resolve(); active--;
      return { data: scope, error: null };
    });
    expect(scopes.map(s => s.length)).toEqual([100, 100, 100, 51]);
    expect(new Set(rows)).toEqual(new Set(ids));
    expect(peak).toBe(1);
  });
  it("does not return a partial dataset after a failed page", async () => {
    await expect(fetchScopedRows(["store-1"], async () => ({ data: [], error: new Error("failed") }))).rejects.toThrow("failed");
  });
  it("retrieves all pages inside each scope", async () => {
    const rows = await fetchScopedRows<number>(["store-1"], async (_, from) => ({
      data: from === 0 ? Array.from({ length: 1000 }, (_, i) => i) : [1000], error: null,
    }));
    expect(rows.length).toBe(1001);
    expect(rows[1000]).toBe(1000);
  });
});