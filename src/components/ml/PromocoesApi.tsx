import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/ds";
import { num } from "@/lib/format";
import { STATUS_PROMOCAO, TIPO_PROMOCAO } from "@/lib/mlRotulos";
import { DIAS_AVISO_VENCIMENTO, diasParaVencer, fatiaRebate, rebatePct, recomendarPorRebate, vendedorPct, venceEmBreve, type PromoBase } from "@/lib/promocoesAnalise";

type Promo = PromoBase & { candidatos: number | null; participando: number | null };

const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const pct = (v: number | null) => (v == null ? "Sem dado" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const nome = (p: Promo) => p.nome || TIPO_PROMOCAO[p.tipo] || p.tipo;

/** Promoções da loja conectada: investimento do vendedor, rebate do ML, recomendação e vencimento. */
export default function PromocoesApi({ custId, resumo }: { custId: string; resumo: any }) {
  const q = useQuery({
    queryKey: ["ml-promocoes-oportunidades", custId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const sb = supabase as any;
      const { data: t } = await sb.from("ml_sync_tema").select("account_id").eq("cust_id", custId).limit(1).maybeSingle();
      if (!t?.account_id) return [] as Promo[];
      const { data, error } = await sb.from("ml_promotions")
        .select("promotion_id, nome, tipo, status, fim, prazo, beneficios, candidatos, participando")
        .eq("account_id", t.account_id).order("fim", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Promo[];
    },
  });

  const lista = q.data ?? [];
  if (q.isLoading) return <p className="text-xs text-muted-foreground">Carregando promoções…</p>;
  if (!lista.length) {
    return resumo ? <KpiCard focal rotulo="Promoções ativas" valor={num(resumo.ativas)} referencia={`${num(resumo.total)} disponíveis para a loja`} /> : null;
  }

  const ativas = lista.filter((p) => p.status === "started").length;
  const comRebate = lista.filter((p) => rebatePct(p) != null).length;
  const vencendo = lista.filter((p) => venceEmBreve(p));
  const rec = recomendarPorRebate(lista);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard focal rotulo="Promoções ativas" valor={num(ativas)} referencia={`${num(lista.length)} disponíveis para a loja`} />
        <KpiCard rotulo="Com rebate do ML" valor={num(comRebate)} referencia="O Mercado Livre paga parte do desconto" />
        <KpiCard rotulo="Maior rebate" valor={pct(rec ? rebatePct(rec) : null)} referencia={rec ? nome(rec) : "Nenhuma promoção com rebate"} />
        <KpiCard rotulo="Vencem em breve" valor={num(vencendo.length)} referencia={`Em até ${DIAS_AVISO_VENCIMENTO} dias`} />
      </div>

      {rec && (
        <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Recomendada: {nome(rec)}</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Maior rebate do Mercado Livre entre as promoções abertas: o ML paga {pct(rebatePct(rec))}
              {vendedorPct(rec) != null ? ` e a loja ${pct(vendedorPct(rec))}` : ""} do desconto
              {rec.fim ? `, até ${dataBr(rec.fim)}` : ""}. Mais desconto para o cliente com menor custo para a loja.
            </p>
          </div>
        </div>
      )}

      {vencendo.length > 0 && (
        <div className="flex gap-3 rounded-xl border p-4 text-sm" style={{ borderColor: "rgb(255 229 0 / .45)", background: "rgb(255 229 0 / .08)" }}>
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#FFE500" }} />
          <p>
            <span className="font-medium" style={{ color: "#FFE500" }}>Perto do vencimento: </span>
            {vencendo.map((p) => `${nome(p)} (${diasParaVencer(p) === 0 ? "hoje" : `${diasParaVencer(p)} dia(s)`})`).join(" · ")}
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border [border-width:0.5px]">
        <table className="w-full text-xs tabular-nums">
          <thead className="text-left text-muted-foreground">
            <tr>
              {["Promoção", "Situação", "Investimento da loja", "Rebate do ML", "Parte do ML no desconto", "Participando", "Vence em"].map((h) => (
                <th key={h} className="p-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lista.map((p) => {
              const dv = diasParaVencer(p);
              const amarelo = venceEmBreve(p);
              const fat = fatiaRebate(p);
              return (
                <tr key={p.promotion_id} className={p.promotion_id === rec?.promotion_id ? "bg-primary/5" : undefined}>
                  <td className="p-2 max-w-[260px]"><span className="block truncate font-medium" title={nome(p)}>{nome(p)}</span></td>
                  <td className="p-2">{STATUS_PROMOCAO[p.status ?? ""] ?? p.status ?? "—"}</td>
                  <td className="p-2">{pct(vendedorPct(p))}</td>
                  <td className="p-2">{rebatePct(p) == null ? "Sem rebate" : pct(rebatePct(p))}</td>
                  <td className="p-2">{fat == null ? "Sem dado" : pct(fat * 100)}</td>
                  <td className="p-2">{p.participando == null ? "—" : num(p.participando)}</td>
                  <td className="p-2 whitespace-nowrap">
                    {dv == null ? dataBr(p.fim) : (
                      <span style={amarelo ? { color: "#FFE500", fontWeight: 500 } : undefined}>
                        {dataBr(p.fim)} · {dv === 0 ? "hoje" : `${dv} dia(s)`}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Percentuais do desconto informados pelo Mercado Livre na promoção. Sem dado quando a promoção não informa a divisão.</p>
    </div>
  );
}
