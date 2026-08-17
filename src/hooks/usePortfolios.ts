import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearCarteiraCache } from "@/hooks/carteira/useCarteiraData";

export interface Portfolio {
  id: string;
  name: string;
  cust_ids: string[];
  created_by: string;
  created_at: string;
  assigned_to: string | null;
  seller_aliases?: Record<string, string>;
}

export interface SellerWithKpi {
  sellerId: string;
  custId: string;
  nickname: string;
  cusState: string | null;
  repCurrentLevel: string | null;
  tgmvLc: number;
  fTgmvLc: number;
  tsi: number;
  tsiFlex: number;
  fTsi: number;
  tgmvLcFull: number;
  tgmvLcFlex: number;
  invPads: number;
  tgmvLcPads: number;
  scoreQualidadeFinal: number;
  scoreOfertaFinal: number;
  scoreCaracteristicaFinal: number;
  gmvLc: number;
}

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("portfolios" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading portfolios:", error);
    } else {
      setPortfolios((data as any[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Limpa todos os caches (memória + react-query) e recarrega as carteiras. */
  const sync = useCallback(async () => {
    clearCarteiraCache();
    await queryClient.invalidateQueries();
    await load();
  }, [queryClient, load]);

  const create = async (name: string, custIds: string[], assignedTo?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: inserted, error } = await supabase
      .from("portfolios" as any)
      .insert({ name, cust_ids: custIds, created_by: user.id, assigned_to: assignedTo || null } as any)
      .select("id")
      .single();

    if (error) {
      toast({ title: "Erro ao criar carteira", description: error.message, variant: "destructive" });
      return { error: error.message };
    }

    if (assignedTo && custIds.length > 0 && assignedTo !== user.id) {
      await supabase.from("portfolio_notifications" as any).insert({
        user_id: assignedTo,
        portfolio_id: (inserted as any)?.id ?? null,
        portfolio_name: name,
        added_cust_ids: custIds,
        message: `Carteira "${name}" criada com ${custIds.length} loja(s) atribuída(s) a você.`,
      } as any);
    }

    toast({ title: "Carteira criada com sucesso!" });
    clearCarteiraCache();
    await queryClient.invalidateQueries();
    await load();
    return { error: null };
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("portfolios" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Carteira removida" });
      clearCarteiraCache();
      await queryClient.invalidateQueries();
      await load();
    }
  };

  const update = async (
    id: string,
    patch: { name?: string; cust_ids?: string[]; assigned_to?: string | null; seller_aliases?: Record<string, string> }
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    const previous = portfolios.find((p) => p.id === id);

    const { error } = await supabase
      .from("portfolios" as any)
      .update(patch as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return { error: error.message };
    }

    // Notify when new cust_ids were added
    if (previous && patch.cust_ids) {
      const prevSet = new Set(previous.cust_ids || []);
      const added = patch.cust_ids.filter((c) => !prevSet.has(c));
      const targetUser = (patch.assigned_to ?? previous.assigned_to) || null;
      if (added.length > 0 && targetUser && targetUser !== user?.id) {
        await supabase.from("portfolio_notifications" as any).insert({
          user_id: targetUser,
          portfolio_id: id,
          portfolio_name: patch.name || previous.name,
          added_cust_ids: added,
          message: `${added.length} nova(s) loja(s) adicionada(s) à carteira "${patch.name || previous.name}".`,
        } as any);
      }
    }

    toast({ title: "Carteira atualizada" });
    clearCarteiraCache();
    await queryClient.invalidateQueries();
    await load();
    return { error: null };
  };

  return { portfolios, loading, reload: load, sync, create, remove, update };
}

export function usePortfolioData(custIds: string[]) {
  const [sellers, setSellers] = useState<SellerWithKpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!custIds.length) {
      setSellers([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      // Get sellers by cust_ids
      const { data: sellersData } = await supabase
        .from("sellers")
        .select("id, cust_id, nickname, cus_state")
        .in("cust_id", custIds);

      if (!sellersData || sellersData.length === 0) {
        setSellers([]);
        setLoading(false);
        return;
      }

      const sellerIds = sellersData.map((s) => s.id);

      // Get latest KPI for each seller (most recent data)
      const { data: kpiData } = await supabase
        .from("sellers_kpi")
        .select("*")
        .in("seller_id", sellerIds)
        .order("data", { ascending: false });

      // Group by seller_id, take latest
      const latestKpi: Record<string, any> = {};
      if (kpiData) {
        for (const k of kpiData) {
          if (!latestKpi[k.seller_id]) latestKpi[k.seller_id] = k;
        }
      }

      const merged: SellerWithKpi[] = sellersData.map((s) => {
        const k = latestKpi[s.id] || {};
        const nick = (s.nickname || "").trim();
        return {
          sellerId: s.id,
          custId: s.cust_id,
          nickname: nick || `Loja ${s.cust_id}`,
          cusState: s.cus_state,
          repCurrentLevel: k.rep_current_level || null,
          tgmvLc: Number(k.tgmv_lc) || 0,
          fTgmvLc: Number(k.f_tgmv_lc) || 0,
          tsi: Number(k.tsi) || 0,
          tsiFlex: Number(k.tsi_flex) || 0,
          fTsi: Number(k.f_tsi) || 0,
          tgmvLcFull: Number(k.tgmv_lc_full) || 0,
          tgmvLcFlex: Number(k.tgmv_lc_flex) || 0,
          invPads: Number(k.inv_pads) || 0,
          tgmvLcPads: Number(k.tgmv_lc_pads) || 0,
          scoreQualidadeFinal: Number(k.score_qualidade_final) || 0,
          scoreOfertaFinal: Number(k.score_oferta_final) || 0,
          scoreCaracteristicaFinal: Number(k.score_caracteristica_final) || 0,
          gmvLc: Number(k.gmv_lc) || 0,
        };
      });

      setSellers(merged);
      setLoading(false);
    };

    fetchData();
  }, [custIds.join(",")]);

  return { sellers, loading };
}
