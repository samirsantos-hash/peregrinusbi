import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AllowedSeller {
  custId: string;
  nickname: string;
}

/**
 * Retorna as lojas (cust_ids) que o usuário atual está autorizado a ver.
 * A leitura passa por RLS (`sellers` + `user_access_control`), portanto
 * qualquer tentativa de acessar cust_ids fora da lista é bloqueada no banco.
 */
export function useMyAccess() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [allowedCustIds, setAllowedCustIds] = useState<string[]>([]);
  const [allowedSellers, setAllowedSellers] = useState<AllowedSeller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (authLoading) return;
    if (!user) {
      setAllowedCustIds([]);
      setAllowedSellers([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      // 1) Lista oficial de cust_ids permitidos (tabela user_access_control).
      //    Admins não têm registro aqui — usam RLS "read all".
      const { data: acc } = await supabase
        .from("user_access_control")
        .select("allowed_cust_ids")
        .eq("user_id", user.id)
        .maybeSingle();

      const custIds = (acc?.allowed_cust_ids || []) as string[];

      // 2) Nicknames das lojas visíveis via RLS.
      const { data: sellers } = await supabase
        .from("sellers")
        .select("cust_id, nickname")
        .order("nickname", { ascending: true });

      if (!mounted) return;
      const list: AllowedSeller[] = (sellers || []).map((s: any) => ({
        custId: String(s.cust_id),
        nickname: s.nickname || "—",
      }));

      setAllowedCustIds(isAdmin ? list.map((l) => l.custId) : custIds);
      setAllowedSellers(list);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [user, isAdmin, authLoading]);

  return { allowedCustIds, allowedSellers, isAdmin, loading };
}