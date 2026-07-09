import { supabase } from "@/integrations/supabase/client";

/** Vertical dominante por seller_id = maior soma de `itens` em live_listings. */
export async function fetchDominantVerticals(): Promise<Record<string, string>> {
  const map: Record<string, { vertical: string; itens: number }> = {};
  const PAGE = 1000;
  let from = 0;
  // paginate — live_listings pode ter muitas linhas
  while (true) {
    const { data, error } = await supabase
      .from("live_listings")
      .select("seller_id, vertical, itens")
      .not("vertical", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const sid = String(row.seller_id || "");
      const vert = String(row.vertical || "").trim();
      const itens = Number(row.itens) || 0;
      if (!sid || !vert) continue;
      const cur = map[sid];
      if (!cur || itens > cur.itens) map[sid] = { vertical: vert, itens };
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const out: Record<string, string> = {};
  for (const [sid, v] of Object.entries(map)) out[sid] = v.vertical;
  return out;
}
