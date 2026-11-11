import { useQuery } from "@tanstack/react-query";
import { PackageX, PauseCircle, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { brl, num } from "@/lib/format";
import { useContaMl } from "./RupturaApi";
import { resumirCatalogo } from "@/lib/catalogoAlertas";

function Cartao({ icone: Icon, titulo, valor, tom }: { icone: typeof PackageX; titulo: string; valor: string; tom: "vermelho" | "neutro" | "verde" }) {
  const cor = tom === "vermelho" ? "text-destructive" : tom === "verde" ? "text-ec-verde-txt" : "text-muted-foreground";
  return (
    <div className="liquid-card glass-card flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-foreground/5 ${cor}`}><Icon size={20} /></div>
        <span className="text-sm font-medium">{titulo}</span>
      </div>
      <span className="text-xl font-bold tabular-nums">{valor}</span>
    </div>
  );
}

export default function AlertasCatalogo({ custId }: { custId?: string }) {
  const conta = useContaMl(custId);
  const accountId = conta.data;
  const an = useQuery({
    queryKey: ["alertas-catalogo", accountId], enabled: !!accountId, staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ml_listings").select("item_id, status, estoque, preco").eq("account_id", accountId).in("status", ["active", "paused"]).limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });
  const vendas = useQuery({
    queryKey: ["ruptura-vendas7d", custId], enabled: !!accountId, staleTime: 10 * 60_000, retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ml-analise-loja", { body: { cust_id: custId, modo: "vendas7d" } });
      if (error || !data?.itens) throw error ?? new Error("sem vendas");
      return data.itens as { id: string; unidades: number }[];
    },
  });
  if (!custId || conta.isLoading) return null;
  if (!accountId) return null;
  if (an.isLoading || vendas.isLoading) return <Skeleton className="h-36 w-full" />;
  if (an.error) return null;
  const mapa = vendas.data ? new Map(vendas.data.map(v => [String(v.id).replace(/\D/g, ""), v.unidades])) : null;
  const r = resumirCatalogo((an.data as any[]).map(a => ({ itemId: a.item_id, status: a.status, estoque: a.estoque, preco: a.preco != null ? Number(a.preco) : null })), mapa);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Cartao icone={PackageX} titulo="Anúncios ativos com estoque zerado" valor={num(r.estoqueZerado)} tom={r.estoqueZerado > 0 ? "vermelho" : "verde"} />
      {r.pausadosSemMedicao
        ? <Cartao icone={PauseCircle} titulo="Anúncios pausados" valor={num(r.pausadosSemVenda)} tom="neutro" />
        : <>
          <Cartao icone={PauseCircle} titulo="Pausados com venda nos últimos 7 dias" valor={num(r.pausadosComVenda)} tom={r.pausadosComVenda > 0 ? "vermelho" : "verde"} />
          <Cartao icone={PauseCircle} titulo="Pausados sem venda nos últimos 7 dias" valor={num(r.pausadosSemVenda)} tom="neutro" />
        </>}
      <div className="liquid-card glass-card flex flex-col justify-center p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingDown size={14} />Vendas recentes em risco por dia</div>
        <div className={`text-xl font-bold tabular-nums ${r.perdaDia ? "text-destructive" : ""}`}>{r.perdaDia == null ? "Sem medição" : brl(r.perdaDia)}</div>
        <div className="text-[11px] text-muted-foreground">Média diária das vendas pagas dos últimos 7 dias, a preço atual, dos anúncios zerados ou pausados.</div>
      </div>
    </div>
  );
}
