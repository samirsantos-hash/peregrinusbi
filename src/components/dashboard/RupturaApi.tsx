import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CopiarAnuncio from "@/components/ds/CopiarAnuncio";
import { brl, num } from "@/lib/format";
import { avaliarRuptura, QUALIDADE_MIN, type LinhaRuptura } from "@/lib/rupturaApi";
import type { EligibilityItem } from "@/hooks/useEligibility";

const ROTULO: Record<LinhaRuptura["severidade"], string> = {
  critical: "Ruptura iminente", warn: "Baixa cobertura", ok: "Cobertura ok", sem: "Sem venda 7d",
};
const COR: Record<LinhaRuptura["severidade"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  warn: "bg-destructive/5 text-destructive border-destructive/20",
  ok: "bg-primary/10 text-primary border-primary/30",
  sem: "bg-muted text-muted-foreground border-border",
};
const soDigitos = (s: string) => String(s).replace(/\D/g, "");

/** Usado só quando a loja tem conta conectada; devolve null sem conexão para o painel da planilha assumir. */
export function useContaMl(custId?: string) {
  return useQuery({
    queryKey: ["ml-conta-ruptura", custId],
    enabled: !!custId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ml_sync_tema").select("account_id").eq("cust_id", custId).limit(1).maybeSingle();
      return (data?.account_id as string) ?? null;
    },
  });
}

export default function RupturaApi({ accountId, planilha }: { accountId: string; planilha: EligibilityItem[] }) {
  const [filtro, setFiltro] = useState<"risco" | "todos" | "qualidade" | "promo">("risco");
  const q = useQuery({
    queryKey: ["ruptura-api", accountId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const sb = supabase as any;
      const desde = new Date(Date.now() - 30 * 864e5).toISOString();
      const [an, pe, pr] = await Promise.all([
        sb.from("ml_listings").select("item_id, titulo, estoque, preco, saude, logistica, status").eq("account_id", accountId).eq("status", "active").limit(5000),
        sb.from("ml_questions").select("item_id").eq("account_id", accountId).gte("data_criacao", desde).limit(10000),
        sb.from("ml_promotion_items").select("item_id, status").eq("account_id", accountId).limit(20000),
      ]);
      if (an.error) throw an.error;
      return { anuncios: an.data ?? [], perguntas: pe.data ?? [], promos: pr.data ?? [] };
    },
  });

  const linhas = useMemo(() => {
    if (!q.data) return [];
    const vendas = new Map<string, number>();
    for (const it of planilha) {
      const k = soDigitos(it.itemId);
      vendas.set(k, Math.max(vendas.get(k) ?? 0, it.pedidos7d || 0));
    }
    const perg = new Map<string, number>();
    for (const p of q.data.perguntas) if (p.item_id) perg.set(p.item_id, (perg.get(p.item_id) ?? 0) + 1);
    const ativa = new Set<string>(), disp = new Set<string>();
    for (const p of q.data.promos) (p.status === "started" ? ativa : disp).add(p.item_id);
    return q.data.anuncios.map((a: any) => avaliarRuptura({
      itemId: a.item_id, titulo: a.titulo ?? a.item_id, estoque: a.estoque, preco: a.preco != null ? Number(a.preco) : null,
      saude: a.saude != null ? Number(a.saude) : null, logistica: a.logistica,
      vendas7d: vendas.has(soDigitos(a.item_id)) ? vendas.get(soDigitos(a.item_id))! : null,
      perguntas30d: perg.get(a.item_id) ?? 0, emPromocao: ativa.has(a.item_id), promocaoDisponivel: disp.has(a.item_id),
    })).sort((x: LinhaRuptura, y: LinhaRuptura) => {
      const r = { critical: 0, warn: 1, ok: 2, sem: 3 } as const;
      return r[x.severidade] - r[y.severidade] || (y.vendas7d ?? 0) - (x.vendas7d ?? 0);
    });
  }, [q.data, planilha]);

  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error) return <p className="text-sm text-muted-foreground">Não foi possível ler os anúncios do Mercado Livre.</p>;

  const vis = linhas.filter((l) =>
    filtro === "todos" ? true :
    filtro === "risco" ? l.severidade === "critical" || l.severidade === "warn" :
    filtro === "qualidade" ? l.qualidade != null && l.qualidade < QUALIDADE_MIN :
    !l.emPromocao && l.promocaoDisponivel);
  const crit = linhas.filter((l) => l.severidade === "critical").length;
  const warn = linhas.filter((l) => l.severidade === "warn").length;
  const valor = vis.reduce((s, l) => s + (l.valorEnvio ?? 0), 0);

  const baixar = () => {
    const ws = XLSX.utils.json_to_sheet(vis.map((l) => ({
      MLB: l.itemId, Título: l.titulo, "Vendas 7d": l.vendas7d ?? "", "Estoque (ML)": l.estoque ?? "", "Preço (ML)": l.preco ?? "",
      "Cobertura (dias)": l.cobertura ?? "", "Enviar p/ Full (4 sem.)": l.envio ?? "", "Valor do envio": l.valorEnvio ?? "",
      Qualidade: l.qualidade ?? "", "Perguntas 30d": l.perguntas30d, Promoção: l.emPromocao ? "Ativa" : l.promocaoDisponivel ? "Disponível" : "Nenhuma",
      Situação: ROTULO[l.severidade], Ações: l.acoes.join("; "),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reposição Full");
    XLSX.writeFile(wb, `reposicao-full-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="glass-card p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">Risco de ruptura & recomendação Full</h3>
          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
            Direto do Mercado Livre · {num(linhas.length)} anúncios ativos ·{" "}
            <span className="text-destructive font-medium">{crit} ruptura</span> · {warn} baixa cobertura · envio sugerido {brl(valor)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {([["risco", "Em risco"], ["qualidade", "Qualidade baixa"], ["promo", "Sem promoção"], ["todos", "Todos"]] as const).map(([k, r]) => (
            <Button key={k} size="sm" variant={filtro === k ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFiltro(k)}>{r}</Button>
          ))}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={baixar}><Download className="w-3.5 h-3.5" />Baixar planilha</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-xs tabular-nums">
          <thead>
            <tr className="border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left py-2 px-2">Anúncio</th><th className="text-right px-2">Vendas 7d</th><th className="text-right px-2">Estoque</th>
              <th className="text-right px-2">Preço</th><th className="text-right px-2">Cobertura</th><th className="text-right px-2">Enviar p/ Full</th>
              <th className="text-right px-2">Qualidade</th><th className="text-right px-2">Perguntas 30d</th><th className="text-left px-2">Promoção</th>
              <th className="text-left px-2">Recomendação</th>
            </tr>
          </thead>
          <tbody>
            {vis.slice(0, 150).map((l) => (
              <tr key={l.itemId} className="border-b border-border/20 hover:bg-muted/20 align-top">
                <td className="py-2 px-2 max-w-[300px]">
                  <p className="truncate" title={l.titulo}>{l.titulo}</p>
                  <div className="flex items-center gap-1 text-muted-foreground font-mono text-[10px]">{l.itemId}<CopiarAnuncio itemId={l.itemId} titulo={l.titulo} /></div>
                </td>
                <td className="text-right px-2 py-2">{l.vendas7d == null ? "Sem dado" : num(l.vendas7d)}</td>
                <td className="text-right px-2 py-2">{l.estoque == null ? "Sem dado" : num(l.estoque)}</td>
                <td className="text-right px-2 py-2">{l.preco == null ? "Sem dado" : brl(l.preco)}</td>
                <td className={`text-right px-2 py-2 ${l.severidade === "critical" ? "text-destructive font-semibold" : ""}`}>{l.cobertura == null ? "Sem dado" : `${num(l.cobertura, 1)} d`}</td>
                <td className="text-right px-2 py-2 font-semibold">{l.envio == null ? "Sem dado" : num(l.envio)}</td>
                <td className={`text-right px-2 py-2 ${l.qualidade != null && l.qualidade < QUALIDADE_MIN ? "text-destructive" : ""}`}>{l.qualidade == null ? "Sem dado" : `${l.qualidade}/100`}</td>
                <td className="text-right px-2 py-2">{num(l.perguntas30d)}</td>
                <td className="px-2 py-2">{l.emPromocao ? "Ativa" : l.promocaoDisponivel ? "Disponível" : "Nenhuma"}</td>
                <td className="px-2 py-2">
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mb-1 ${COR[l.severidade]}`}>{ROTULO[l.severidade]}</span>
                  <ul className="space-y-0.5">{l.acoes.map((a) => <li key={a} className="flex gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />{a}</li>)}</ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!vis.length && <p className="text-sm text-muted-foreground py-4">Nenhum anúncio neste filtro.</p>}
      </div>
      <p className="text-[11px] text-muted-foreground">Estoque, preço, qualidade, perguntas e promoções vêm do Mercado Livre. O ritmo de venda dos últimos 7 dias vem da planilha mais recente; sem ele, cobertura e envio ficam "Sem dado". Envio cobre 28 dias no ritmo atual, descontando o estoque.</p>
    </div>
  );
}
