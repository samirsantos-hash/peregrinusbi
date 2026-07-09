import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLiveListingsCount(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["live-listings-count", sellerId],
    queryFn: async (): Promise<number> => {
      if (!sellerId) return 0;

      const { data, error } = await supabase
        .from("live_listings")
        .select("data, itens")
        .eq("seller_id", sellerId);

      if (error) throw error;
      if (!data || data.length === 0) return 0;

      // Snapshot mais recente do seller
      const maxData = data.reduce(
        (mx, r) => (r.data && r.data > mx ? r.data : mx),
        ""
      );

      return data
        .filter((r) => r.data === maxData)
        .reduce((sum, r) => sum + (r.itens ?? 0), 0);
    },
    enabled: !!sellerId,
  });
}
