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
  /** nº de meses com faturamento observado — usado no encolhimento dos rankings (OS-4) */
  mesesObservados: number;
  /** vertical dominante — grupo de referência do prior intravertical (OS-4) */
  vertical: string | null;
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
        .select("id, cust_id, nickname, cus_state, vertical_dominant")
        .in("cust_id", custIds);

      if (!sellersData || sellersData.length === 0) {
        setSellers([]);
        setLoading(false);
        return;
      }

      const sellerIds = sellersData.map((s) => s.id);

      // Get latest KPI for each seller (most recent data) — base cadastral/scores
      const { data: kpiData } = await supabase
        .from("sellers_kpi")
        .select("*")
        .in("seller_id", sellerIds)
        .order("data", { ascending: false });

      // Group by seller_id, take latest
      const latestKpi: Record<string, any> = {};
      const mesesPorSeller: Record<string, number> = {};
      if (kpiData) {
        for (const k of kpiData) {
          if (!latestKpi[k.seller_id]) latestKpi[k.seller_id] = k;
          if ((Number(k.tgmv_lc) || 0) > 0) {
            mesesPorSeller[k.seller_id] = (mesesPorSeller[k.seller_id] || 0) + 1;
          }
        }
      }

      // ── Janela móvel de 30 dias (base diária) ────────────────────────
      // Referência = último dia disponível na base diária destes sellers.
      const { data: maxRow } = await supabase
        .from("sellers_kpi_daily")
        .select("data")
        .in("seller_id", sellerIds)
        .order("data", { ascending: false })
        .limit(1);

      const soma30: Record<string, any> = {};
      const fimJanela = maxRow?.[0]?.data as string | undefined;
      if (fimJanela) {
        const fim = new Date(`${fimJanela}T00:00:00Z`);
        const ini = new Date(fim.getTime() - 29 * 86400000);
        const iniStr = ini.toISOString().slice(0, 10);

        const PAGE = 1000;
        for (let offset = 0; ; offset += PAGE) {
          const { data: page } = await supabase
            .from("sellers_kpi_daily")
            .select(
              "seller_id, tgmv_lc, f_tgmv_lc, tsi, f_tsi, tsi_flex, tgmv_lc_full, tgmv_lc_flex, inv_pads, tgmv_lc_pads, gmv_lc",
            )
            .in("seller_id", sellerIds)
            .gte("data", iniStr)
            .lte("data", fimJanela)
            .range(offset, offset + PAGE - 1);

          if (!page || page.length === 0) break;
          for (const r of page as any[]) {
            const acc = (soma30[r.seller_id] ||= {
              tgmv_lc: 0,
              f_tgmv_lc: 0,
              tsi: 0,
              f_tsi: 0,
              tsi_flex: 0,
              tgmv_lc_full: 0,
              tgmv_lc_flex: 0,
              inv_pads: 0,
              tgmv_lc_pads: 0,
              gmv_lc: 0,
            });
            for (const key of Object.keys(acc)) {
              acc[key] += Number(r[key]) || 0;
            }
          }
          if (page.length < PAGE) break;
        }
      }

      const merged: SellerWithKpi[] = sellersData.map((s) => {
        const k = latestKpi[s.id] || {};
        // Fluxo (faturamento, itens, ads) vem da janela de 30 dias quando há base diária;
        // senão cai para o último mês disponível.
        const f = soma30[s.id] || k;
        const nick = (s.nickname || "").trim();
        return {
          sellerId: s.id,
          custId: s.cust_id,
          nickname: nick || `Loja ${s.cust_id}`,
          cusState: s.cus_state,
          repCurrentLevel: k.rep_current_level || null,
          tgmvLc: Number(f.tgmv_lc) || 0,
          fTgmvLc: Number(f.f_tgmv_lc) || 0,
          tsi: Number(f.tsi) || 0,
          tsiFlex: Number(f.tsi_flex) || 0,
          fTsi: Number(f.f_tsi) || 0,
          tgmvLcFull: Number(f.tgmv_lc_full) || 0,
          tgmvLcFlex: Number(f.tgmv_lc_flex) || 0,
          invPads: Number(f.inv_pads) || 0,
          tgmvLcPads: Number(f.tgmv_lc_pads) || 0,
          scoreQualidadeFinal: Number(k.score_qualidade_final) || 0,
          scoreOfertaFinal: Number(k.score_oferta_final) || 0,
          scoreCaracteristicaFinal: Number(k.score_caracteristica_final) || 0,
          gmvLc: Number(f.gmv_lc) || 0,
          mesesObservados: mesesPorSeller[s.id] || 0,
          vertical: (s as any).vertical_dominant || null,
        };
      });

      setSellers(merged);
      setLoading(false);
    };

    fetchData();
  }, [custIds.join(",")]);

  return { sellers, loading };
}
