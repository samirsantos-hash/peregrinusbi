import { supabase } from "@/integrations/supabase/client";

export async function abrirSellerNoMeli(custId: number, nickname?: string) {
  // Try to find seller_url from sellers_pm
  const { data } = await (supabase as any)
    .from("sellers_pm")
    .select("seller_url")
    .eq("cust_id", custId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  const url =
    data?.seller_url ||
    (nickname
      ? `https://www.mercadolivre.com.br/perfil/${nickname}`
      : `https://lista.mercadolivre.com.br/_CustId_${custId}`);

  window.open(url, "_blank", "noopener,noreferrer");
}