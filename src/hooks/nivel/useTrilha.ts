import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SegmentoBreadcrumb } from "@/components/nivel/BreadcrumbSeletor";

interface Args {
  lojaId?: string;
  grupoId?: string;
  programaId?: string | null;
  categoriaId?: string | null;
  mlb?: string | null;
}

/** Monta os segmentos do breadcrumb do nível atual, resolvendo nomes reais. */
export function useTrilha({ lojaId, grupoId, programaId, categoriaId, mlb }: Args) {
  const { data } = useQuery({
    queryKey: ["trilha", lojaId, grupoId, programaId, categoriaId, mlb],
    queryFn: async () => {
      let loja: { id: string; nickname: string | null; grupo_id: string | null; cust_id: string } | null = null;
      if (lojaId) {
        const { data } = await supabase
          .from("sellers")
          .select("id, nickname, grupo_id, cust_id")
          .eq("id", lojaId)
          .maybeSingle();
        loja = (data as any) ?? null;
      }
      const gid = grupoId ?? loja?.grupo_id ?? (lojaId ? "sem-grupo" : undefined);
      let grupoNome = gid === "sem-grupo" ? "Lojas sem grupo" : null;
      if (gid && gid !== "sem-grupo") {
        const { data } = await supabase.from("grupos").select("nome").eq("id", gid).maybeSingle();
        grupoNome = data?.nome ?? "Grupo";
      }
      let programaNome: string | null = null;
      if (programaId && programaId !== "todos" && loja) {
        const { data } = await supabase
          .from("cpp_mensal")
          .select("nombre_solucion, programa")
          .eq("cust_id_text", String(loja.cust_id))
          .eq("programa", programaId)
          .limit(1);
        programaNome = data?.[0]?.nombre_solucion || programaId;
      }
      let anuncioNome: string | null = null;
      if (mlb && lojaId) {
        const { data } = await supabase
          .from("seller_eligibility")
          .select("item_name")
          .eq("seller_id", lojaId)
          .eq("item_id", mlb)
          .limit(1);
        anuncioNome = data?.[0]?.item_name || mlb;
      }
      return { loja, gid, grupoNome, programaNome, anuncioNome };
    },
  });

  const segmentos: SegmentoBreadcrumb[] = [{ nivel: 0, rotulo: "Carteira", destino: "/carteira" }];

  const gid = data?.gid ?? grupoId;
  if (gid) {
    segmentos.push({
      nivel: 1,
      rotulo: data?.grupoNome || "Grupo",
      destino: `/grupos/${gid}`,
      irmaos: { tipo: "grupos" },
    });
  }
  if (lojaId) {
    segmentos.push({
      nivel: 2,
      rotulo: data?.loja?.nickname || "Loja",
      destino: `/lojas/${lojaId}`,
      irmaos: { tipo: "lojas", grupoId: gid },
    });
  }
  if (lojaId && (programaId !== undefined && programaId !== null)) {
    segmentos.push({
      nivel: 3,
      rotulo: data?.programaNome || (programaId === "todos" ? "Programas" : programaId || "Programas"),
      destino: `/lojas/${lojaId}/programas`,
      irmaos: { tipo: "programas", lojaId },
    });
  }
  if (lojaId && categoriaId) {
    segmentos.push({
      nivel: 4,
      rotulo: categoriaId,
      destino: `/lojas/${lojaId}/programas/${encodeURIComponent(programaId || "todos")}/categorias/${encodeURIComponent(categoriaId)}`,
      irmaos: { tipo: "categorias", lojaId, programaId: programaId || "todos" },
    });
  }
  if (lojaId && mlb) {
    segmentos.push({
      nivel: 5,
      rotulo: data?.anuncioNome || mlb,
      destino: `/lojas/${lojaId}/anuncios/${mlb}`,
      irmaos: { tipo: "anuncios", lojaId, categoriaId },
    });
  }

  return segmentos;
}
