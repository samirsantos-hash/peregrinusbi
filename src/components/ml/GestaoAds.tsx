import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { KpiCard, RotuloSecao } from "@/components/ds";
import { brl, num, pctFracao } from "@/lib/format";

type Campanha = { id: string; nome: string; status: string | null; orcamento_diario: number | null; meta_acos: number | null; meta_roas: number | null; investimento: number | null; vendas: number | null; cliques: number | null; impressoes: number | null; roas: number | null; acos: number | null; cpc: number | null; ctr: number | null };
const DIAS = [7, 14, 30, 60, 90] as const;

export default function GestaoAds({ custId }: { custId: string }) {
  const [dias, setDias] = useState<(typeof DIAS)[number]>(30);
  const [status, setStatus] = useState<"todas" | "active" | "paused">("todas");
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["ml-gestao-ads", custId, dias], staleTime: 5 * 60_000, retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ml-gestao-ads", { body: { cust_id: custId, dias } });
      let msg = data?.error as string | undefined;
      if (error && !msg) { try { msg = (await (error as any).context?.json())?.error; } catch { /* sem detalhe */ } }
      if (error || msg) throw new Error(msg ?? "Não foi possível consultar as campanhas agora.");
      return data;
    },
  });
  const campanhas: Campanha[] = (data?.campanhas ?? []).filter((c: Campanha) => status === "todas" || c.status === status)
    .sort((a: Campanha, b: Campanha) => (b.investimento ?? -1) - (a.investimento ?? -1));
  const r = data?.resumo;
  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><RotuloSecao>Gestão de Ads</RotuloSecao><p className="text-xs text-muted-foreground">Product Ads · {data?.periodo ? `${data.periodo.inicio.split("-").reverse().join("/")} a ${data.periodo.fim.split("-").reverse().join("/")}` : `${dias} dias completos`}</p></div>
        <div className="flex flex-wrap gap-1.5">
          {DIAS.map((d) => <Button key={d} size="sm" variant={dias === d ? "default" : "outline"} onClick={() => setDias(d)}>{d} dias</Button>)}
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />Consultar</Button>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : !data ? <p className="text-sm text-muted-foreground">Consultando campanhas…</p> : !data.usa_ads ? <p className="text-sm text-muted-foreground">Esta loja não tem Product Ads ativo no Mercado Livre.</p> : <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard focal rotulo="Investimento" valor={brl(r?.investimento, true)} referencia={`${num(data.campanhas.length)} campanhas`} />
          <KpiCard rotulo="Vendas por Ads" valor={brl(r?.vendas)} referencia={`${num(r?.unidades)} unidades`} />
          <KpiCard rotulo="ROAS" valor={r?.roas == null ? "Sem dado" : `${num(r.roas, 2)}x`} referencia={`ACOS ${pctFracao(r?.acos, 1)} · vendas ÷ investimento`} />
          <KpiCard rotulo="CPC médio" valor={r?.cpc == null ? "Sem dado" : brl(r.cpc, true)} referencia={`${num(r?.cliques)} cliques · CTR ${pctFracao(r?.ctr, 2)}`} />
        </div>
        <div className="flex gap-1.5">{(["todas", "active", "paused"] as const).map((s) => <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s === "todas" ? "Todas" : s === "active" ? "Ativas" : "Pausadas"}</Button>)}</div>
        <div className="overflow-x-auto rounded-md border border-border [border-width:0.5px]">
          <table className="w-full text-xs tnum"><thead className="text-left text-muted-foreground"><tr>{["Campanha", "Situação", "Orçamento/dia", "Meta", "Investimento", "Vendas", "ROAS", "ACOS", "Cliques", "CPC", "Leitura"].map((h) => <th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">{campanhas.map((c) => {
              const metaRoas = c.meta_roas;
              const leitura = c.investimento == null ? "Sem dado" : c.investimento === 0 ? "Sem gasto" : c.vendas === 0 ? "Gasto sem venda" : metaRoas != null && c.roas != null && c.roas < metaRoas ? "Abaixo da meta" : metaRoas != null && c.roas != null ? "Na meta" : "Sem meta";
              return <tr key={c.id}><td className="p-2 font-medium">{c.nome}</td><td className="p-2">{c.status === "active" ? "Ativa" : c.status === "paused" ? "Pausada" : c.status ?? "Sem dado"}</td><td className="p-2">{c.orcamento_diario == null ? "Sem dado" : brl(c.orcamento_diario)}</td><td className="p-2">{metaRoas == null ? "Sem dado" : `ROAS ${num(metaRoas, 2)}x`}</td><td className="p-2">{brl(c.investimento, true)}</td><td className="p-2">{brl(c.vendas, true)}</td><td className="p-2">{c.roas == null ? "Sem dado" : `${num(c.roas, 2)}x`}</td><td className="p-2">{pctFracao(c.acos, 1)}</td><td className="p-2">{num(c.cliques)}</td><td className="p-2">{c.cpc == null ? "Sem dado" : brl(c.cpc, true)}</td><td className={`p-2 ${leitura === "Gasto sem venda" || leitura === "Abaixo da meta" ? "font-medium text-destructive" : ""}`}>{leitura}</td></tr>;
            })}</tbody></table>
        </div>
        {campanhas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma campanha neste filtro.</p>}
        {!data.completo && <p className="text-xs text-muted-foreground">Mostrando as primeiras 1.000 campanhas.</p>}
      </>}
    </div>
  );
}