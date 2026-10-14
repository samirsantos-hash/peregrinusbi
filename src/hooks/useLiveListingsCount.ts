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

      // Snapshots parciais (ex.: 1 item) acontecem; usa o maior total entre os últimos 45 dias.
      const totais = new Map<string, number>();
      for (const r of data) if (r.data) totais.set(r.data, (totais.get(r.data) ?? 0) + (r.itens ?? 0));
      const datas = [...totais.keys()].sort();
      const ult = new Date(datas[datas.length - 1] + "T00:00:00");
      ult.setDate(ult.getDate() - 45);
      const corte = ult.toISOString().slice(0, 10);
      return Math.max(0, ...datas.filter((d) => d >= corte).map((d) => totais.get(d) ?? 0));
    },
    enabled: !!sellerId,
  });
}
