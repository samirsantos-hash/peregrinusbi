import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClusterPercentile {
  cluster: string;
  // Seller values
  sellerGmv: number;
  sellerRoas: number;
  sellerConv: number;
  // Cluster medians
  medianGmv: number;
  medianRoas: number;
  medianConv: number;
  // Percentile (0-100, higher = better)
  percentileGmv: number;
  percentileRoas: number;
  percentileConv: number;
  // Quartile boundaries
  p25Gmv: number;
  p75Gmv: number;
  peerCount: number;
}

export interface CategoryPercentile {
  category: string;
  position: number;
  totalPeers: number;
  percentileGmv: number;
}

export interface ClusterBenchmarkResult {
  cluster: ClusterPercentile | null;
  category: CategoryPercentile | null;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], value: number): number {
  if (arr.length === 0) return 50;
  const sorted = [...arr].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

function quartileValue(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

// Fallback medians when no cluster found (excluding MeliPro)
const FALLBACK_BENCHMARK = { gmv: 46636, roas: 8.6, conv: 3.4 };

export function useClusterBenchmark(sellerId: string | undefined, sellerCluster: string | undefined) {
  return useQuery({
    queryKey: ["cluster-benchmark", sellerId, sellerCluster],
    queryFn: async (): Promise<ClusterBenchmarkResult> => {
      if (!sellerId) return { cluster: null, category: null };

      // 1. Get seller's monthly KPI (latest month)
      const { data: sellerKpi } = await supabase
        .from("sellers_kpi")
        .select("tgmv_lc, inv_pads, tgmv_lc_pads, tsi, sellers!inner(sub_cluster_seller)")
        .eq("seller_id", sellerId)
        .order("data", { ascending: false })
        .limit(1);

      if (!sellerKpi?.length) return { cluster: null, category: null };

      const sk = sellerKpi[0] as any;
      const sellerGmv = Number(sk.tgmv_lc) || 0;
      const sellerInv = Number(sk.inv_pads) || 0;
      const sellerTgmvPads = Number(sk.tgmv_lc_pads) || 0;
      const sellerTsi = Number(sk.tsi) || 0;
      const sellerRoas = sellerInv > 0 ? sellerTgmvPads / sellerInv : 0;
      const cluster = sellerCluster || sk.sellers?.sub_cluster_seller || "";

      // 2. Get all sellers in same cluster
      let peerSellerIds: string[] = [];
      if (cluster) {
        const { data: peers } = await supabase
          .from("sellers")
          .select("id")
          .eq("sub_cluster_seller", cluster)
          .neq("id", sellerId);
        peerSellerIds = (peers || []).map(p => p.id);
      }

      // If no cluster or no peers, use all sellers excluding MeliPro
      if (peerSellerIds.length === 0) {
        const { data: allSellers } = await supabase
          .from("sellers")
          .select("id, sub_cluster_seller")
          .neq("id", sellerId);
        peerSellerIds = (allSellers || [])
          .filter(s => s.sub_cluster_seller !== "MeliPro")
          .map(s => s.id);
      }

      // 3. Fetch latest KPIs for peers (batched)
      const PAGE = 500;
      let peerKpis: any[] = [];
      for (let i = 0; i < peerSellerIds.length; i += PAGE) {
        const batch = peerSellerIds.slice(i, i + PAGE);
        // Get latest month per peer
        const { data } = await supabase
          .from("sellers_kpi")
          .select("seller_id, tgmv_lc, inv_pads, tgmv_lc_pads, tsi, visits, data")
          .in("seller_id", batch)
          .order("data", { ascending: false });
        if (data) peerKpis = peerKpis.concat(data);
      }

      // Deduplicate: keep latest per seller
      const latestPerSeller = new Map<string, any>();
      for (const row of peerKpis) {
        if (!latestPerSeller.has(row.seller_id) || row.data > latestPerSeller.get(row.seller_id).data) {
          latestPerSeller.set(row.seller_id, row);
        }
      }

      const peerGmvs: number[] = [];
      const peerRoas: number[] = [];
      const peerConvs: number[] = [];

      for (const row of latestPerSeller.values()) {
        const gmv = Number(row.tgmv_lc) || 0;
        const inv = Number(row.inv_pads) || 0;
        const tgmvPads = Number(row.tgmv_lc_pads) || 0;
        const tsi = Number(row.tsi) || 0;
        const visits = Number(row.visits) || 0;

        if (gmv > 0) peerGmvs.push(gmv);
        if (inv > 0) peerRoas.push(tgmvPads / inv);
        if (visits > 0) peerConvs.push((tsi / visits) * 100);
      }

      // Get seller visits for conv
      const { data: sellerVisitData } = await supabase
        .from("sellers_kpi")
        .select("visits")
        .eq("seller_id", sellerId)
        .order("data", { ascending: false })
        .limit(1);
      const sellerVisits = Number(sellerVisitData?.[0]?.visits) || 0;
      const sellerConv = sellerVisits > 0 ? (sellerTsi / sellerVisits) * 100 : 0;

      const clusterResult: ClusterPercentile = {
        cluster: cluster || "Geral",
        sellerGmv,
        sellerRoas,
        sellerConv,
        medianGmv: peerGmvs.length > 0 ? median(peerGmvs) : FALLBACK_BENCHMARK.gmv,
        medianRoas: peerRoas.length > 0 ? median(peerRoas) : FALLBACK_BENCHMARK.roas,
        medianConv: peerConvs.length > 0 ? median(peerConvs) : FALLBACK_BENCHMARK.conv,
        percentileGmv: percentile(peerGmvs, sellerGmv),
        percentileRoas: percentile(peerRoas, sellerRoas),
        percentileConv: percentile(peerConvs, sellerConv),
        p25Gmv: quartileValue(peerGmvs, 0.25),
        p75Gmv: quartileValue(peerGmvs, 0.75),
        peerCount: latestPerSeller.size,
      };

      // 4. Category-level percentile (from live_listings)
      let categoryResult: CategoryPercentile | null = null;
      const { data: sellerListings } = await supabase
        .from("live_listings")
        .select("dom_domain_agg1, itens")
        .eq("seller_id", sellerId)
        .not("dom_domain_agg1", "is", null);

      if (sellerListings?.length) {
        // Find primary category
        const catMap = new Map<string, number>();
        for (const l of sellerListings) {
          const cat = l.dom_domain_agg1 || "";
          catMap.set(cat, (catMap.get(cat) || 0) + (l.itens || 0));
        }
        const primaryCat = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

        if (primaryCat) {
          // Find all sellers with this category
          const { data: catSellers } = await supabase
            .from("live_listings")
            .select("seller_id")
            .eq("dom_domain_agg1", primaryCat)
            .neq("seller_id", sellerId);

          const catPeerIds = [...new Set((catSellers || []).map(s => s.seller_id))];

          if (catPeerIds.length >= 5) {
            // Get GMVs for category peers
            let catKpis: any[] = [];
            for (let i = 0; i < catPeerIds.length; i += PAGE) {
              const batch = catPeerIds.slice(i, i + PAGE);
              const { data } = await supabase
                .from("sellers_kpi")
                .select("seller_id, tgmv_lc, data")
                .in("seller_id", batch)
                .order("data", { ascending: false });
              if (data) catKpis = catKpis.concat(data);
            }

            const latestCatPeer = new Map<string, number>();
            for (const row of catKpis) {
              if (!latestCatPeer.has(row.seller_id)) {
                latestCatPeer.set(row.seller_id, Number(row.tgmv_lc) || 0);
              }
            }

            const catGmvs = [...latestCatPeer.values()];
            const allCatGmvs = [...catGmvs, sellerGmv].sort((a, b) => b - a);
            const pos = allCatGmvs.indexOf(sellerGmv) + 1;

            categoryResult = {
              category: primaryCat,
              position: pos,
              totalPeers: allCatGmvs.length,
              percentileGmv: percentile(catGmvs, sellerGmv),
            };
          }
        }
      }

      return { cluster: clusterResult, category: categoryResult };
    },
    enabled: !!sellerId,
    staleTime: 5 * 60 * 1000,
  });
}

export function getPercentileBadge(pct: number): { label: string; className: string } {
  if (pct >= 80) return { label: `Top ${100 - pct}%`, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (pct >= 50) return { label: "Acima da mediana", className: "bg-teal-500/15 text-teal-400 border-teal-500/30" };
  if (pct >= 25) return { label: "Abaixo da mediana", className: "bg-muted/30 text-muted-foreground border-border" };
  return { label: "Quartil inferior", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
}
