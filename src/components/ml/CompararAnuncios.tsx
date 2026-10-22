import { useState } from "react";
import { Search, BarChart3, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import CopiarAnuncio from "@/components/ds/CopiarAnuncio";
import { brl, num, pctFracao } from "@/lib/format";
import { ordenarAnuncios, type AnuncioComparavel, type MetricaAnuncio } from "@/lib/mlComparacaoAnuncios";
import { toast } from "sonner";

const tipo = (id?: string | null) => id === "gold_special" ? "Clássico" : id === "gold_pro" ? "Premium" : "Outro";
const valor = (n: number | null) => n == null ? "Sem dado" : num(n);
interface Item { id: string; titulo: string; link: string; preco: number; tipo?: string | null; vendidos?: number; sku?: string | null }

export default function CompararAnuncios({ custId, itens }: { custId: string; itens: Item[] }) {
  const [termo, setTermo] = useState("");
  const [resultado, setResultado] = useState<Item[] | null>(null);
  const [selecionados, setSelecionados] = useState<Item[]>([]);
  const [stats, setStats] = useState<AnuncioComparavel[]>([]);
  const [periodo, setPeriodo] = useState<{ inicio: string; fim: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [metrica, setMetrica] = useState<MetricaAnuncio>("visitas");
  const [pagina, setPagina] = useState(0);
  const lista = resultado ?? itens;
  const ordenados = ordenarAnuncios(stats, metrica);
  const chamar = async (body: object) => {
    const { data, error } = await supabase.functions.invoke("ml-buscar-produtos", { body: { cust_id: custId, ...body } });
    let mensagem = data?.error;
    if (error && !mensagem) { try { mensagem = (await error.context.json())?.error; } catch { /* erro sem corpo */ } }
    if (error || mensagem) throw new Error(mensagem ?? "Não foi possível consultar o Mercado Livre.");
    return data;
  };
  const buscar = async (e: React.FormEvent) => {
    e.preventDefault(); setOcupado(true); setErro(null);
    try { const data = await chamar({ termo }); setResultado(data.itens); setPagina(0); }
    catch (e) { setErro(e instanceof Error ? e.message : "Busca indisponível."); }
    finally { setOcupado(false); }
  };
  const consultar = async () => {
    setOcupado(true); setErro(null); setStats([]);
    const respostas: AnuncioComparavel[] = [];
    for (const item of selecionados) {
      try { const data = await chamar({ item_id: item.id }); respostas.push(data.estatisticas); setPeriodo(data.periodo); }
      catch (e) { setErro(e instanceof Error ? e.message : "Consulta indisponível."); }
    }
    setStats(respostas); setOcupado(false);
  };
  const selecionar = (item: Item, checked: boolean) => {
    if (checked && selecionados.length >= 4) { toast.info("Compare até 4 anúncios por vez."); return; }
    setSelecionados(checked ? [...selecionados, item] : selecionados.filter(x => x.id !== item.id));
    setStats([]);
  };
  return <div className="space-y-3">
    <h3 className="text-sm font-semibold">Estatísticas e comparação de anúncios</h3>
    <form onSubmit={buscar} className="flex flex-wrap gap-2">
      <Input aria-label="Buscar anúncio por título, SKU ou MLB" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Título, SKU ou MLB" className="min-w-0 flex-1" />
      <Button type="submit" size="sm" variant="outline" disabled={ocupado || termo.trim().length < 2}><Search className="mr-1 h-4 w-4" />Buscar</Button>
      {resultado && <Button type="button" size="sm" variant="ghost" onClick={() => { setResultado(null); setTermo(""); setPagina(0); }}>Todos</Button>}
    </form>
    {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    <div className="overflow-x-auto">
      <table className="w-full text-xs tnum text-left">
        <thead className="text-muted-foreground"><tr><th className="p-2">Comparar</th><th className="p-2">Anúncio</th><th className="p-2">Tipo</th><th className="p-2">Preço</th><th className="p-2">Vendidos acumulados</th></tr></thead>
        <tbody>{lista.slice(pagina * 10, pagina * 10 + 10).map(item => <tr key={item.id} className="border-t border-border">
          <td className="p-2"><Checkbox aria-label={`Comparar ${item.id}`} checked={selecionados.some(x => x.id === item.id)} onCheckedChange={checked => selecionar(item, checked === true)} disabled={ocupado} /></td>
          <td className="p-2 min-w-[200px] max-w-[340px]"><a className="text-primary hover:underline break-words" href={item.link} target="_blank" rel="noreferrer">{item.titulo}</a><div className="mt-1"><CopiarAnuncio itemId={item.id} titulo={item.titulo} />{item.sku && <span className="ml-2 text-muted-foreground">SKU {item.sku}</span>}</div></td>
          <td className="p-2 whitespace-nowrap">{tipo(item.tipo)}</td><td className="p-2 whitespace-nowrap">{brl(item.preco, true)}</td><td className="p-2">{item.vendidos == null ? "Sem dado" : num(item.vendidos)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum anúncio encontrado nesta loja.</p>}
    {lista.length > 10 && <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>Anterior</Button><span className="text-xs text-muted-foreground">{pagina + 1} / {Math.ceil(lista.length / 10)}</span><Button size="sm" variant="outline" disabled={(pagina + 1) * 10 >= lista.length} onClick={() => setPagina(pagina + 1)}>Próxima</Button></div>}
    <div className="flex flex-wrap items-center gap-2">
      {selecionados.map(x => <Button key={x.id} size="sm" variant="ghost" disabled={ocupado} onClick={() => selecionar(x, false)} aria-label={`Remover ${x.id}`}>{x.id}<X className="ml-1 h-3 w-3" /></Button>)}
      <Button size="sm" disabled={ocupado || selecionados.length === 0} onClick={consultar}><BarChart3 className="mr-1 h-4 w-4" />{ocupado ? "Consultando…" : selecionados.length > 1 ? "Comparar estatísticas" : "Ver estatísticas"}</Button>
    </div>
    {stats.length > 0 && <div className="space-y-3 border-t border-border pt-3">
      <p className="text-xs text-muted-foreground">30 dias completos · {periodo?.inicio.split("-").reverse().join("/")} a {periodo?.fim.split("-").reverse().join("/")} · pedidos pagos, por data de criação</p>
      <div className="flex flex-wrap gap-2">{(["visitas", "pedidos", "conversao"] as const).map(m => <Button key={m} size="sm" variant={metrica === m ? "default" : "outline"} onClick={() => setMetrica(m)}>{m === "visitas" ? "Mais visitas" : m === "pedidos" ? "Mais vendas" : "Maior conversão"}</Button>)}</div>
      <div className="overflow-x-auto"><table className="w-full text-xs tnum text-left"><thead className="text-muted-foreground"><tr>{["Anúncio", "Tipo", "Visitas", "Cliques Ads", "Pedidos pagos", "Unidades", "Faturamento", "Cancelados", "Conversão", "Promoção atual"].map(label => <th key={label} className="p-2 whitespace-nowrap">{label}</th>)}</tr></thead>
        <tbody>{ordenados.map(x => <tr key={x.id} className="border-t border-border"><td className="p-2 min-w-[200px] max-w-[300px] break-words">{x.titulo}<div className="text-muted-foreground">{x.id}</div></td><td className="p-2">{tipo(x.tipo)}</td><td className="p-2">{valor(x.visitas)}</td><td className="p-2">{valor(x.cliques)}</td><td className="p-2">{valor(x.pedidos)}</td><td className="p-2">{valor(x.unidades)}</td><td className="p-2 whitespace-nowrap">{x.faturamento == null ? "Sem dado" : brl(x.faturamento, true)}</td><td className="p-2">{valor(x.cancelados)}</td><td className="p-2">{pctFracao(x.conversao, 2)}</td><td className="p-2">{x.promocao == null ? "Sem dado" : x.promocao ? "Ativa" : "Não"}</td></tr>)}</tbody>
      </table></div>
      {stats.length > 1 && ordenados[0]?.[metrica] != null && <p className="text-sm"><strong>Destaque observado:</strong> {ordenados[0].titulo} · {metrica === "conversao" ? pctFracao(ordenados[0].conversao, 2) : num(ordenados[0][metrica])} {metrica === "visitas" ? "visitas" : metrica === "pedidos" ? "pedidos pagos" : "de conversão"}.</p>}
      <p className="text-xs text-muted-foreground">Cliques por anúncio e volume de buscas não estão disponíveis nesta consulta. Visitas não são buscas. Promoção é a situação atual, não o histórico dos 30 dias. A comparação mostra resultados observados, não previsão de vendas.</p>
      {stats.some(x => !x.completo) && <p className="text-xs text-destructive">Consulta de pedidos incompleta: vendas e conversão indisponíveis para evitar totais parciais.</p>}
    </div>}
  </div>;
}