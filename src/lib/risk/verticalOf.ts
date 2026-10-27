import { supabase } from "@/integrations/supabase/client";
import { fetchScopedRows } from "@/lib/scopedRows";

/** Vertical dominante por seller_id = maior soma de `itens` em live_listings. */
export async function fetchDominantVerticals(ids: string[]): Promise<Record<string, string>> {
  const rows = await fetchScopedRows<{ seller_id: string; vertical: string }>(ids, (batch, from, to) =>
    supabase.rpc("indicadores_verticais", { p_seller_ids: batch }).range(from, to));
  return Object.fromEntries(rows.map(r => [r.seller_id, r.vertical]));
}
