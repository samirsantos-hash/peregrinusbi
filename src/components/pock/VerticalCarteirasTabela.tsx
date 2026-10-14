import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { compararLojas, ROTULO_VERTICAL, type LojaMes } from "@/lib/verticalCarteiras";
import { brl, num, pct } from "@/lib/format";
import TooltipInfo from "@/components/dashboard/TooltipInfo";

const pp = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : "−"}${num(Math.abs(v * 100), 1)} p.p.`);
const cresc = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : "−"}${pct(Math.abs(v * 100), 1)}`);

/** Lojas por vertical e desempenho contra a mediana da vertical; permite comparar carteiras. */
export default function VerticalCarteirasTabela({ sellerId }: { sellerId?: string }) {
  const [carteira, setCarteira] = useState<string>("todas");
  const [aberta, setAberta] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["vertical-carteiras"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: sellers }, { data: carteiras }] = await Promise.all([
        fetchAllRows((a, b) => supabase.from("sellers").select("id,cust_id,nickname,vertical_dominant").order("id").range(a, b)),
        supabase.from("portfolios").select("id,name,cust_ids").order("name"),
      ]);
      // Dois últimos meses fechados (o mês corrente fica de fora por estar incompleto)
      const hoje = new Date();
      const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: ult } = await supabase.from("sellers_kpi").select("data").lt("data", mesAtual).order("data", { ascending: false }).limit(1);
      const m2 = ult?.[0]?.data as string | undefined;
      if (!m2) return { sellers, carteiras: carteiras ?? [], kpi: [], m2: null };
      const d = new Date(m2 + "T00:00:00"); d.setMonth(d.getMonth() - 1);
      const m1 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: kpi } = await fetchAllRows((a, b) =>
        supabase.from("sellers_kpi").select("seller_id,data,tgmv_lc").in("data", [m1, m2]).order("seller_id").order("data").range(a, b));
      return { sellers, carteiras: carteiras ?? [], kpi, m2 };
    },
  });

  const r = useMemo(() => {
    if (!data) return null;
    const fat = new Map<string, { atual: number; anterior: number }>();
    for (const k of data.kpi as any[]) {
      const e = fat.get(k.seller_id) ?? { atual: 0, anterior: 0 };
      if (k.data === data.m2) e.atual += Number(k.tgmv_lc) || 0; else e.anterior += Number(k.tgmv_lc) || 0;
      fat.set(k.seller_id, e);
    }
    const lojas: LojaMes[] = (data.sellers as any[]).filter((s) => fat.has(s.id)).map((s) => ({
      sellerId: s.id, vertical: s.vertical_dominant?.trim() || null, ...fat.get(s.id)!,
    }));
    const comp = compararLojas(lojas);
    const info = new Map((data.sellers as any[]).map((s) => [s.id, s]));
    const cart = data.carteiras.find((c: any) => c.id === carteira);
    const custs = cart ? new Set((cart.cust_ids ?? []).map(String)) : null;
    const naCarteira = (id: string) => !custs || custs.has(String(info.get(id)?.cust_id));
    return { ...comp, info, naCarteira };
  }, [data, carteira]);

  if (!r) return <div className="glass-card p-5 text-xs text-muted-foreground">Carregando comparação por vertical…</div>;
  const mesRot = data?.m2 ? `${data.m2.slice(5, 7)}/${data.m2.slice(0, 4)}` : "";
  const linhas = r.verticais.map((v) => {
    const ls = r.lojas.filter((l) => l.vertical === v.vertical && r.naCarteira(l.sellerId));
    const comVs = ls.filter((l) => l.vsMediana !== null);
    return { v, ls, acimaCart: comVs.length ? comVs.filter((l) => l.vsMediana! > 0).length / comVs.length : null, medVsCart: comVs.length ? comVs.reduce((a, l) => a + l.vsMediana!, 0) / comVs.length : null };
  }).filter((x) => x.ls.length > 0);

  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Lojas por vertical vs mediana</h3>
          <TooltipInfo text={`Crescimento do faturamento em ${mesRot} contra o mês anterior. A mediana é de todas as lojas da vertical; cada loja aparece em pontos percentuais acima ou abaixo dela. Lojas sem faturamento no mês anterior ficam sem crescimento. Vertical definida pelos produtos vendidos.`} />
        </div>
        <select value={carteira} onChange={(e) => setCarteira(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground">
          <option value="todas">Todas as lojas</option>
          {data!.carteiras.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 pr-3">Vertical</th><th className="py-2 pr-3 text-right">Lojas</th>
              <th className="py-2 pr-3 text-right">Faturamento mediano</th><th className="py-2 pr-3 text-right">Crescimento mediano</th>
              <th className="py-2 pr-3 text-right">Acima da mediana</th><th className="py-2 text-right">Média vs mediana</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ v, ls, acimaCart, medVsCart }) => (
              <Fragment key={v.vertical}>
                <tr onClick={() => setAberta(aberta === v.vertical ? null : v.vertical)} className="cursor-pointer border-b border-border/50 hover:bg-white/5">
                  <td className="py-2 pr-3 font-medium text-foreground">{aberta === v.vertical ? "▾" : "▸"} {ROTULO_VERTICAL[v.vertical] ?? v.vertical}</td>
                  <td className="py-2 pr-3 text-right">{num(ls.length)}{carteira !== "todas" && <span className="text-muted-foreground"> de {num(v.lojas)}</span>}</td>
                  <td className="py-2 pr-3 text-right">{brl(v.medianaFat)}</td>
                  <td className="py-2 pr-3 text-right">{cresc(v.medianaCresc)}</td>
                  <td className="py-2 pr-3 text-right">{acimaCart === null ? "—" : pct(acimaCart * 100, 0)}</td>
                  <td className={`py-2 text-right ${medVsCart === null ? "" : medVsCart >= 0 ? "text-ok" : "text-crit"}`}>{pp(medVsCart)}</td>
                </tr>
                {aberta === v.vertical && [...ls].sort((a, b) => (b.vsMediana ?? -9) - (a.vsMediana ?? -9)).map((l) => (
                  <tr key={l.sellerId} className={`border-b border-border/30 ${l.sellerId === sellerId ? "bg-cyan-400/10" : ""}`}>
                    <td className="py-1.5 pl-5 pr-3 text-muted-foreground" colSpan={2}>{r.info.get(l.sellerId)?.nickname ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-right">{brl(l.atual)}</td>
                    <td className="py-1.5 pr-3 text-right">{cresc(l.crescimento)}</td>
                    <td />
                    <td className={`py-1.5 text-right ${l.vsMediana === null ? "" : l.vsMediana >= 0 ? "text-ok" : "text-crit"}`}>{pp(l.vsMediana)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Clique numa vertical para ver as lojas. Escolha uma carteira para comparar suas lojas com a mediana de toda a vertical.</p>
    </div>
  );
}
