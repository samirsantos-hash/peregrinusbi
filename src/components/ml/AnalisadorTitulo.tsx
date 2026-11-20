import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { analisarTitulo } from "@/lib/anuncio/titulo";
import { num, pctFracao } from "@/lib/format";
import { toast } from "sonner";

type Item = { item_id: string; titulo: string | null; categoria_id?: string | null };
export default function AnalisadorTitulo({ itens, carregando, erro }: { itens: Item[]; carregando?: boolean; erro?: boolean }) {
  const [id, setId] = useState("");
  const [busca, setBusca] = useState("");
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [corte, setCorte] = useState(45);
  const selecionado = itens.find(i => i.item_id === id);
  const titulo = rascunho ?? selecionado?.titulo ?? "";
  const categoria = selecionado?.categoria_id;
  const limite = useQuery({
    queryKey: ["ml-categoria-limite-titulo", categoria], enabled: !!categoria && /^MLB\d+$/.test(categoria), staleTime: 24 * 60 * 60_000, retry: false,
    queryFn: async () => {
      if (!categoria || !/^MLB\d+$/.test(categoria)) return null;
      const response = await fetch(`https://api.mercadolibre.com/categories/${encodeURIComponent(categoria)}`, { credentials: "omit", signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("Limite da categoria não confirmado.");
      const data = await response.json();
      const max = data?.settings?.max_title_length;
      return data?.id === categoria && Number.isInteger(max) && max > 0 ? max as number : null;
    },
  });
  const d = useMemo(() => titulo.trim() ? analisarTitulo(titulo, { limitePlataforma: limite.data, corteVisual: corte }) : null, [titulo, limite.data, corte]);
  const lista = itens.filter(i => `${i.titulo ?? ""} ${i.item_id}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")));
  return <section className="space-y-5 min-w-0">
    <header><h3 className="text-lg font-semibold">Analisador de título</h3><p className="text-sm text-muted-foreground mt-1">Revisão editorial local · nenhuma alteração enviada ao Mercado Livre</p></header>
    <div className="grid gap-3 sm:grid-cols-2">
      <Input aria-label="Pesquisar título ou MLB" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar título ou MLB" />
      <Select value={id} onValueChange={v => { setId(v); setRascunho(null); }}><SelectTrigger aria-label="Anúncio para analisar" className="min-w-0 [&>span]:truncate"><SelectValue placeholder="Selecionar anúncio" /></SelectTrigger><SelectContent>{lista.map(i => <SelectItem key={i.item_id} value={i.item_id}>{i.titulo ?? i.item_id}</SelectItem>)}</SelectContent></Select>
    </div>
    {carregando && <p role="status" className="text-sm">Carregando anúncios…</p>}
    {erro && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os anúncios.</p>}
    {!carregando && !erro && lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum anúncio encontrado nesta lista.</p>}
    <div className="space-y-2"><label htmlFor="titulo-rascunho" className="text-sm font-medium">Título para revisão</label><Textarea id="titulo-rascunho" value={titulo} onChange={e => setRascunho(e.target.value)} rows={3} placeholder="Selecione um anúncio ou digite um título" /><p className="text-xs text-muted-foreground">{selecionado?.item_id ?? "Rascunho livre"} · {num(titulo.trim().length)} caracteres · {limite.isFetching ? "consultando limite" : limite.data ? `limite da categoria: ${num(limite.data)}` : "limite da categoria não confirmado"}</p></div>
    {d && <>
      {d.excedeLimite && <p role="alert" className="text-sm text-destructive">Excede o limite confirmado da categoria; isso não reduz a nota editorial.</p>}
      <div className="grid gap-4 sm:grid-cols-3 border-y border-border py-4">{[["Densidade editorial estimada", pctFracao(d.densidadeUtil, 1)], ["Caracteres sinalizados", num(d.caracteresDesperdicados)], ["Nota interna de densidade", `${num(d.nota * 100, 1)} / 100`]].map(([nome, valor]) => <div key={nome}><p className="text-xs text-muted-foreground">{nome}</p><p className="text-2xl font-semibold tnum mt-1">{valor}</p></div>)}</div>
      <p className="text-xs text-muted-foreground">Não mede buscas, indexação ou conversão. Comprimento e corte visual não entram na nota; termos sinalizados exigem revisão.</p>
      <div className="space-y-3 max-w-xl"><label className="text-sm font-medium">Corte visual estimado · {num(corte)} caracteres</label><Slider aria-label="Corte visual estimado" min={25} max={100} step={1} value={[corte]} onValueChange={v => setCorte(v[0] ?? 45)} /><p className="text-base break-words border-l-2 border-primary pl-3">{titulo.slice(0, corte)}{titulo.length > corte ? "…" : ""}</p><p className="text-xs text-muted-foreground">Simulação por caracteres, não reprodução medida do cartão do Mercado Livre.</p>{d.chaveForaDaVisao.length > 0 && <p className="text-sm">Após o corte estimado: <strong>{d.chaveForaDaVisao.join(", ")}</strong></p>}</div>
      <div className="space-y-2"><h4 className="text-sm font-semibold">Pontos para revisar</h4>{d.sugestoes.length ? <ul className="space-y-2 text-sm text-muted-foreground">{d.sugestoes.map((s,i) => <li key={i} className="border-l border-border pl-3">{s}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhum padrão editorial sinalizado; isso não comprova desempenho nas buscas.</p>}</div>
      <div className="space-y-3 border-t border-border pt-4"><h4 className="text-sm font-semibold">Sugestão de limpeza revisável</h4><p className="text-base break-words">{d.tituloLimpo}</p><p className="text-xs text-muted-foreground">Termos promocionais não são removidos automaticamente; preserve marcas, modelos e características reais.</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(d.tituloLimpo); toast.success("Sugestão copiada."); } catch { toast.error("Não foi possível copiar."); } }}><Copy className="mr-2 h-4 w-4" />Copiar sugestão</Button><Button variant="ghost" size="sm" disabled={!selecionado} onClick={() => setRascunho(null)}><RotateCcw className="mr-2 h-4 w-4" />Restaurar título</Button></div></div>
    </>}
  </section>;
}