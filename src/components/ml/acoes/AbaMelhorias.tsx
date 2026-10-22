import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ds";
import { num } from "@/lib/format";
import { dataHoraBr } from "@/lib/mlFuncoes";
import { MelhoriasDoAnuncio } from "./MelhoriasDoAnuncio";

type Linha = {
  item_id: string;
  titulo: string | null;
  qualidade_score: number | null;
  achados_altos: number;
  achados_total: number;
  erro_ia: string | null;
  origem: "manual" | "diario";
  gerado_em: string;
  verificado_em: string;
};

/** Anúncios já analisados (automático diário dos mais vendidos + pedidos manuais), piores primeiro. */
export function AbaMelhorias({ accountId }: { accountId: string }) {
  const [aberto, setAberto] = useState<{ item_id: string; titulo: string | null } | null>(null);

  const lista = useQuery({
    queryKey: ["ml-melhorias", accountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_listing_improvements")
        .select("item_id, titulo, qualidade_score, achados_altos, achados_total, erro_ia, origem, gerado_em, verificado_em")
        .eq("account_id", accountId)
        .order("achados_altos", { ascending: false })
        .order("qualidade_score", { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Linha[];
    },
  });

  const linhas = lista.data ?? [];
  const ultima = linhas.reduce<string | null>((m, l) => (!m || l.verificado_em > m ? l.verificado_em : m), null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {ultima ? `Fonte: Mercado Livre + IA · verificado em ${dataHoraBr(ultima)}` : "Fonte: Mercado Livre + IA"}
        {" · "}os 10 anúncios ativos mais vendidos são analisados todo dia; os demais pelo botão Melhorias na aba Anúncios.
      </p>

      {lista.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>}
      {lista.isError && <EmptyState falta="Não foi possível carregar as análises." acao="Tente de novo em instantes." />}
      {lista.data && linhas.length === 0 && (
        <EmptyState falta="Nenhum anúncio analisado ainda." acao="A análise automática roda de hora em hora. Para um anúncio agora, use Melhorias na aba Anúncios." />
      )}

      {linhas.length > 0 && (
        <div className="overflow-x-auto border border-border [border-width:0.5px]">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border">
                <th className="py-2 px-2">Anúncio</th>
                <th className="pr-2 text-right">Qualidade ML</th>
                <th className="pr-2 text-right">Achados altos</th>
                <th className="pr-2 text-right">Achados</th>
                <th className="pr-2">IA</th>
                <th className="pr-2">Analisado em</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.item_id} onClick={() => setAberto({ item_id: l.item_id, titulo: l.titulo })} className="border-t border-border cursor-pointer hover:bg-muted/40">
                  <td className="py-2 px-2 min-w-[240px]">
                    <span className="line-clamp-2">{l.titulo ?? l.item_id}</span>
                    <span className="text-muted-foreground">{l.item_id}</span>
                  </td>
                  <td className="pr-2 text-right">{l.qualidade_score == null ? "Sem dado" : num(l.qualidade_score)}</td>
                  <td className={`pr-2 text-right ${l.achados_altos ? "text-destructive" : ""}`}>{num(l.achados_altos)}</td>
                  <td className="pr-2 text-right">{num(l.achados_total)}</td>
                  <td className="pr-2">{l.erro_ia ? <span className="text-ec-ambar">Sem resposta</span> : "Ok"}</td>
                  <td className="pr-2">{dataHoraBr(l.gerado_em)}{l.origem === "diario" ? " · automático" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MelhoriasDoAnuncio accountId={accountId} item={aberto} aoFechar={() => setAberto(null)} />
    </div>
  );
}
