import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { DiagnosticoLoja, TipoAlerta } from "@/lib/carteiraDeepDive/calculo";
import { brl, pct } from "./fmt";

export const ROTULO: Record<TipoAlerta, string> = {
  queda: "Faturamento em queda", full: "Full baixo", ads: "Ads baixo", promocao: "Promoção baixa", competitividade: "Preço pouco competitivo",
};

export default function PlanoAcao({ itens }: { itens: DiagnosticoLoja[] }) {
  const [todas, setTodas] = useState(false);
  const nav = useNavigate();
  const vis = todas ? itens : itens.slice(0, 15);
  return (
    <section className="rounded-lg border border-border/50 bg-card/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Plano de ação · lojas prioritárias</h2>
        <span className="text-xs text-muted-foreground">{itens.length} lojas com alerta · ordem: quantidade de alertas</span>
      </div>
      {!itens.length ? <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma loja com alerta no filtro atual.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr className="border-b border-border/40">
              <th className="text-left py-1.5">Loja</th><th className="text-right">Mês atual</th><th className="text-right">Mês anterior</th><th className="text-left pl-4">Alertas</th>
            </tr></thead>
            <tbody>
              {vis.map((d) => (
                <tr key={d.loja.id} onClick={() => nav(`/lojas/${d.loja.id}`)} className="border-b border-border/20 cursor-pointer hover:bg-muted/40">
                  <td className="py-1.5"><span className="font-medium">{d.loja.nickname}</span> <span className="text-muted-foreground">{d.loja.custId}</span></td>
                  <td className="text-right tabular-nums">{brl(d.gmv)}</td>
                  <td className="text-right tabular-nums">{brl(d.gmvAnterior)}</td>
                  <td className="pl-4">
                    <div className="flex flex-wrap gap-1">
                      {d.alertas.map((a) => (
                        <span key={a.tipo} className="rounded border border-[hsl(var(--crit))]/40 px-1.5 py-0.5 text-[10px] text-[hsl(var(--crit))]">
                          {ROTULO[a.tipo]} {pct(a.valor)} · {a.limite}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {itens.length > 15 && (
        <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setTodas(!todas)}>
          {todas ? "Mostrar 15" : `Ver todas (${itens.length})`}
        </Button>
      )}
    </section>
  );
}
