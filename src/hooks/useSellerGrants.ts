import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SellerGrant {
  sellerId: string;
  custId: string;
  salesforceUrl: string | null;
  expirationDate: string;
  daysToExpire: number;
}

export type GrantLevel = "blacklist" | "critical" | "warning" | "ok";

export function getGrantLevel(days: number): GrantLevel {
  if (days <= 5) return "blacklist";
  if (days <= 10) return "critical";
  if (days <= 15) return "warning";
  return "ok";
}

export function getGrantBadge(level: GrantLevel) {
  switch (level) {
    case "blacklist":
      return { label: "URGENTE", emoji: "🔴", className: "bg-black text-red-500 border-red-700 animate-pulse" };
    case "critical":
      return { label: "CRÍTICO", emoji: "🚨", className: "bg-red-600/20 text-red-400 border-red-500/50" };
    case "warning":
      return { label: "ATENÇÃO", emoji: "⚠️", className: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    case "ok":
      return { label: "OK", emoji: "✅", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  }
}

export function useSellerGrants(sellerIds: string[]) {
  const [grants, setGrants] = useState<Record<string, SellerGrant>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sellerIds.length) {
      setGrants({});
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("seller_grants" as any)
        .select("*")
        .in("seller_id", sellerIds);

      if (!error && data) {
        const map: Record<string, SellerGrant> = {};
        for (const row of data as any[]) {
          map[row.seller_id] = {
            sellerId: row.seller_id,
            custId: row.cust_id,
            salesforceUrl: row.salesforce_url,
            expirationDate: row.expiration_date,
            daysToExpire: row.days_to_expire,
          };
        }
        setGrants(map);
      }
      setLoading(false);
    };

    fetch();
  }, [sellerIds.join(",")]);

  return { grants, loading };
}
