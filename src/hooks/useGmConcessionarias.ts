import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GmConcessionaria {
  nome: string;
  custId: string;
  status: string;
  responsavel: string | null;
  uf: string | null;
  cidade: string | null;
  divisao: "Norte" | "Sul";
}

let cache: GmConcessionaria[] | null = null;

/** Cadastro das concessionárias GM (status, responsável, praça e divisão Norte/Sul). */
export function useGmConcessionarias() {
  const [rows, setRows] = useState<GmConcessionaria[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("gm_concessionarias" as any)
        .select("nome, cust_id, status, responsavel, uf, cidade, divisao")
        .order("nome");
      if (!alive) return;
      if (!error && data) {
        cache = (data as any[]).map((r) => ({
          nome: r.nome,
          custId: String(r.cust_id),
          status: r.status,
          responsavel: r.responsavel ?? null,
          uf: r.uf ?? null,
          cidade: r.cidade ?? null,
          divisao: r.divisao,
        }));
        setRows(cache);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const byCustId = new Map<string, GmConcessionaria[]>();
  for (const r of rows) {
    const list = byCustId.get(r.custId) ?? [];
    list.push(r);
    byCustId.set(r.custId, list);
  }

  return { rows, byCustId, loading };
}
