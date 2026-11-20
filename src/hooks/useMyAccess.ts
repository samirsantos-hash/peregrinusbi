import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
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
// Vários componentes usam este hook ao mesmo tempo: compartilha uma única leitura por usuário (30 s).
const TTL_MS = 30_000;
let compartilhado: { userId: string; em: number; promessa: Promise<{ custIds: string[]; list: AllowedSeller[] }> } | null = null;
function carregarAcesso(userId: string) {
  if (compartilhado && compartilhado.userId === userId && Date.now() - compartilhado.em < TTL_MS) return compartilhado.promessa;
  const promessa = (async () => {
    const { data: acc } = await supabase.from("user_access_control").select("allowed_cust_ids").eq("user_id", userId).maybeSingle();
    const custIds = (acc?.allowed_cust_ids || []) as string[];
    const { data: sellers } = await fetchAllRows<any>((from, to) =>
      supabase.from("sellers").select("cust_id, nickname").order("nickname", { ascending: true }).order("cust_id").range(from, to)
    );
    const list: AllowedSeller[] = (sellers || []).map((s: any) => ({ custId: String(s.cust_id), nickname: s.nickname || "—" }));
    return { custIds, list };
  })();
  compartilhado = { userId, em: Date.now(), promessa };
  promessa.catch(() => { if (compartilhado?.promessa === promessa) compartilhado = null; });
  return promessa;
}
export function limparAcessoCompartilhado() { compartilhado = null; }

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

      const { custIds, list } = await carregarAcesso(user.id);
      if (!mounted) return;

      setAllowedCustIds(isAdmin ? list.map((l) => l.custId) : custIds);
      setAllowedSellers(list);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [user?.id, isAdmin, authLoading]);

  return { allowedCustIds, allowedSellers, isAdmin, loading };
}