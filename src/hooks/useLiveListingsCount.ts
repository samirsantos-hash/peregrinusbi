import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLiveListingsCount(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["live-listings-count", sellerId],
    queryFn: async (): Promise<number> => {
      if (!sellerId) return 0;

      const { count, error } = await supabase
        .from("live_listings")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", sellerId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!sellerId,
  });
}
