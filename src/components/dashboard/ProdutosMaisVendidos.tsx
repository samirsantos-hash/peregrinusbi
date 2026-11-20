import { useQuery } from "@tanstack/react-query";
import { useContaMl } from "@/components/dashboard/RupturaApi";
import { supabase } from "@/integrations/supabase/client";
import { num, brl } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProdutosMaisVendidos({ custId }: { custId?: string }) {
  const conta = useContaMl(custId);
  const produtos = useQuery({ queryKey: ["produtos-mais-vendidos", conta.data], enabled: !!conta.data, staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("ml_listings").select("item_id,titulo,thumbnail,vendidos,preco,estoque,link").eq("account_id", conta.data ?? "").order("vendidos", { ascending: false, nullsFirst: false }).order("item_id").limit(10);
      if (error) throw error;
      return data;
    } });
  if (conta.isLoading || produtos.isLoading) return <Skeleton className="h-60 w-full" />;
  if (conta.isError || produtos.isError) return <p role="alert" className="text-sm text-destructive">Não foi possível ler os produtos desta loja.</p>;
  if (!conta.data) return <p className="text-sm text-muted-foreground">Selecione uma loja conectada ao Mercado Livre.</p>;
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Produtos mais vendidos</h2>
    <p className="text-xs text-muted-foreground">Quantidades acumuladas informadas pelo anúncio, não vendas do período nem vendas atribuídas à publicidade.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm [&_td]:p-3 [&_th]:p-3 tabular-nums"><thead className="text-left text-muted-foreground"><tr><th>Produto</th><th>Vendidos acumulados</th><th>Preço atual</th><th>Estoque</th></tr></thead><tbody className="divide-y divide-border">
      {produtos.data?.map(i => <tr key={i.item_id}><td><div className="flex gap-3 items-center">{i.thumbnail && <img src={i.thumbnail} alt="" className="w-12 h-12 object-contain rounded-lg bg-card" />}<div className="min-w-48">{i.link ? <a href={i.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">{i.titulo ?? i.item_id}</a> : i.titulo ?? i.item_id}<p className="text-xs text-muted-foreground">{i.item_id}</p></div></div></td><td>{i.vendidos == null ? "Sem dado" : num(i.vendidos)}</td><td>{i.preco == null ? "Sem dado" : brl(i.preco)}</td><td>{i.estoque == null ? "Sem dado" : num(i.estoque)}</td></tr>)}
    </tbody></table></div>
    {!produtos.data?.length && <p className="text-sm text-muted-foreground">Nenhum produto sincronizado nesta loja.</p>}
  </section>;
}