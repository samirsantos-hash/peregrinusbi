import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { calcularJanelas, agregarPorLoja, type LinhaDiaria, type Loja, type Janelas, type Totais } from "@/lib/carteiraDeepDive/calculo";

const COLS = "seller_id, data, tgmv_lc, tsi, visits, tgmv_lc_full, tgmv_lc_flex, tgmv_lc_pads, cdp_tgmv_lc, tgmv_lc_clips, visits_match, visits_cheaper, visits_expensive";

export interface DadosDeepDive {
  ref: string;
  janelas: Janelas;
  lojas: Loja[];
  atual: Map<string, Totais>;
  anterior: Map<string, Totais>;
  anoAnterior: Map<string, Totais>;
  /** pedidos do mês corrente (total mensal, sem recorte diário) */
  pedidos: Map<string, number>;
}

async function diarias(ini: string, fim: string): Promise<LinhaDiaria[]> {
  const { data, error } = await fetchAllRows<LinhaDiaria>((a, b) =>
    supabase.from("sellers_kpi_daily").select(COLS).gte("data", ini).lte("data", fim)
      .order("data").order("seller_id").range(a, b),
  );
  if (error) throw new Error(`Falha ao ler vendas diárias: ${error.message}`);
  return data;
}

export function useCarteiraDeepDive() {
  return useQuery({
    queryKey: ["carteira-deep-dive"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DadosDeepDive> => {
      const ultimo = await supabase.from("sellers_kpi_daily").select("data").order("data", { ascending: false }).limit(1).maybeSingle();
      if (ultimo.error) throw new Error(`Falha ao achar a data de referência: ${ultimo.error.message}`);
      if (!ultimo.data?.data) throw new Error("Não há vendas diárias carregadas para a sua carteira.");
      const ref = String(ultimo.data.data);
      const janelas = calcularJanelas(ref);

      const lojasQ = await fetchAllRows((a, b) =>
        supabase.from("sellers").select("id, cust_id, nickname, vertical_dominant, fecha_in, fecha_out")
          .order("nickname").order("id").range(a, b),
      );
      if (lojasQ.error) throw new Error(`Falha ao ler lojas: ${lojasQ.error.message}`);
      const lojas: Loja[] = lojasQ.data.map((s: any) => ({
        id: s.id, custId: String(s.cust_id), nickname: s.nickname,
        vertical: s.vertical_dominant || null, fechaIn: s.fecha_in, fechaOut: s.fecha_out,
      }));

      const [a, p, y] = await Promise.all([
        diarias(janelas.atual.ini, janelas.atual.fim),
        diarias(janelas.anterior.ini, janelas.anterior.fim),
        diarias(janelas.anoAnterior.ini, janelas.anoAnterior.fim),
      ]);

      const mesId = Number(ref.slice(0, 7).replace("-", ""));
      const ped = await fetchAllRows((x, z) =>
        supabase.from("sellers_kpi").select("seller_id, tgmv_orders").eq("tim_month_id", mesId)
          .not("tgmv_orders", "is", null).order("seller_id").range(x, z),
      );
      if (ped.error) throw new Error(`Falha ao ler pedidos: ${ped.error.message}`);
      const pedidos = new Map<string, number>();
      ped.data.forEach((r: any) => pedidos.set(r.seller_id, (pedidos.get(r.seller_id) ?? 0) + Number(r.tgmv_orders)));

      return {
        ref, janelas, lojas, pedidos,
        atual: agregarPorLoja(a, janelas.atual),
        anterior: agregarPorLoja(p, janelas.anterior),
        anoAnterior: agregarPorLoja(y, janelas.anoAnterior),
      };
    },
  });
}
