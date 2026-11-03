import { useMemo, useRef, useState } from "react";
import { Search, Loader2, ExternalLink, AlertTriangle, Info, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { brl, delta, num } from "@/lib/format";
import { lerPrecoInformado, normalizarOfertas, resumoPrecos, type OfertaConcorrente } from "@/lib/concorrentesPreco";

export default function BuscaConcorrentes() {
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<OfertaConcorrente[] | null>(null);
  const [meuPreco, setMeuPreco] = useState("");
  const [produto, setProduto] = useState("");
  const [limite, setLimite] = useState(10);
  const [termoBuscado, setTermoBuscado] = useState("");
  const [produtosConsultados, setProdutosConsultados] = useState(0);
  const emCurso = useRef(false);

  const buscar = async () => {
    const termo = q.trim();
    if (termo.length < 2 || emCurso.current) return;
    emCurso.current = true;
    setCarregando(true); setErro(null); setItens(null); setProduto(""); setLimite(10);
    setTermoBuscado(termo); setProdutosConsultados(0);
    try {
      const { data, error } = await supabase.functions.invoke("ml-busca-concorrentes", { body: { q: termo } });
      if (error || data?.error) {
        setErro("Não foi possível consultar as ofertas no Mercado Livre. Tente novamente mais tarde.");
        return;
      }
      const ofertas = normalizarOfertas(data?.itens).sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity));
      setItens(ofertas); setProduto(ofertas[0]?.produtoId ?? "");
      setProdutosConsultados(typeof data?.produtos === "number" ? data.produtos : 0);
    } catch {
      setErro("A consulta não foi concluída. Verifique sua conexão e tente novamente.");
    } finally {
      emCurso.current = false; setCarregando(false);
    }
  };

  const produtos = useMemo(() => [...new Map((itens ?? []).map((i) => [i.produtoId, i.titulo])).entries()], [itens]);
  const filtrados = useMemo(() => (itens ?? []).filter((i) => i.produtoId === produto), [itens, produto]);
  const resumo = useMemo(() => resumoPrecos(itens ?? [], produto), [itens, produto]);
  const meu = lerPrecoInformado(meuPreco);
  const diferenca = meu !== null && resumo ? (meu / resumo.mediana - 1) * 100 : null;

  return (
    <section className="space-y-5 min-w-0" aria-labelledby="concorrentes-titulo">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 id="concorrentes-titulo" className="text-xl font-semibold">Concorrentes</h2>
          <p className="text-sm text-muted-foreground mt-1">Mercado Livre · Ofertas do catálogo · Preços atuais</p>
        </div>
        {itens !== null && <span className="text-sm text-muted-foreground">{num(itens.length)} ofertas retornadas</span>}
      </header>

      <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] items-end" onSubmit={(e) => { e.preventDefault(); void buscar(); }}>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="concorrentes-busca" className="text-sm font-medium">Produto</label>
          <Input id="concorrentes-busca" value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder="Nome ou modelo do produto" className="text-base" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="concorrentes-preco" className="text-sm font-medium">Seu preço (R$)</label>
          <Input id="concorrentes-preco" value={meuPreco} onChange={(e) => setMeuPreco(e.target.value)} placeholder="Opcional" inputMode="decimal" className="text-base tnum" />
        </div>
        <Button type="submit" className="gap-2" disabled={carregando || q.trim().length < 2}>
          {carregando ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Search className="h-4 w-4" />}
          {carregando ? "Consultando" : "Buscar"}
        </Button>
      </form>

      <div className="flex items-start gap-2 text-sm text-muted-foreground border-l-2 border-border pl-3">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>Visitas e conversão de concorrentes não estão confirmadas pelo Mercado Livre. Esses campos permanecem indisponíveis; vendas acumuladas não são usadas como conversão.</p>
      </div>

      {erro && <div role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{erro}</div>}

      {produtos.length > 0 && (
        <div className="space-y-1.5 max-w-2xl">
          <label className="text-sm font-medium">Produto do catálogo</label>
          <Select value={produto} onValueChange={(v) => { setProduto(v); setLimite(10); }}>
            <SelectTrigger aria-label="Produto do catálogo"><SelectValue /></SelectTrigger>
            <SelectContent>{produtos.map(([id, titulo]) => <SelectItem key={id} value={id}>{titulo} · {id}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-border py-4">
          {[["Menor preço", brl(resumo.minimo, true)], ["Mediana", brl(resumo.mediana, true)], ["Maior preço", brl(resumo.maximo, true)], ["Seu preço vs. mediana", delta(diferenca)]].map(([rotulo, valor]) => (
            <div key={rotulo} className="min-w-0"><p className="text-sm text-muted-foreground">{rotulo}</p><p className="text-xl font-semibold tnum mt-1 break-words">{valor}</p></div>
          ))}
          <p className="col-span-full text-sm text-muted-foreground">{num(resumo.total)} preços do mesmo produto. Sem histórico de período anterior.</p>
        </div>
      )}

      <div className="overflow-x-auto border-y border-border">
        <table className="w-full min-w-[780px] text-sm">
          <caption className="sr-only">Preços e disponibilidade de métricas dos concorrentes</caption>
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>{["Anúncio", "Vendedor", "Preço atual", "Visitas", "Conversão", "Entrega", ""].map((label, i) => <th key={i} scope="col" className="text-left px-4 py-3 font-medium border-r border-border last:border-r-0 whitespace-nowrap">{label}</th>)}</tr>
          </thead>
          <tbody>
            {filtrados.slice(0, limite).map((i) => (
              <tr key={i.id} className="border-t border-border even:bg-muted/20 hover:bg-muted/40">
                <td className="p-4 border-r border-border"><span className="block font-medium max-w-80">{i.titulo}</span><span className="text-xs text-muted-foreground">{i.id}</span></td>
                <td className="p-4 border-r border-border">{i.vendedor ?? "Não informado"}</td>
                <td className="p-4 border-r border-border tnum whitespace-nowrap font-semibold">{brl(i.preco, true)}{i.precoOriginal !== null && i.preco !== null && i.precoOriginal > i.preco && <span className="block text-xs font-normal text-muted-foreground line-through">{brl(i.precoOriginal, true)}</span>}</td>
                <td className="p-4 border-r border-border text-muted-foreground">Indisponível</td>
                <td className="p-4 border-r border-border text-muted-foreground">Indisponível</td>
                <td className="p-4 border-r border-border"><span className="block">{i.full ? "Full" : "—"}</span>{i.freteGratis && <span className="text-xs text-muted-foreground">Frete grátis</span>}</td>
                <td className="p-4"><Button asChild variant="ghost" size="icon"><a href={i.link} target="_blank" rel="noopener noreferrer" aria-label={`Abrir anúncio ${i.id}`} title="Abrir no Mercado Livre"><ExternalLink className="h-4 w-4" /></a></Button></td>
              </tr>
            ))}
            {filtrados.length === 0 && <tr><td colSpan={7} className="p-8 text-center">
              <p className="font-medium" role="status">{carregando ? "Consultando ofertas do catálogo…" : erro ? "Consulta indisponível" : itens !== null ? "Nenhuma oferta retornada nesta consulta" : "Nenhuma consulta realizada"}</p>
              {itens !== null && <p className="text-sm text-muted-foreground mt-2">Busca: {termoBuscado} · {num(produtosConsultados)} produtos consultados. Isso não confirma ausência de concorrentes: o acesso às ofertas pode estar indisponível.</p>}
            </td></tr>}
          </tbody>
        </table>
      </div>
      {filtrados.length > limite && <Button variant="outline" onClick={() => setLimite(filtrados.length)} className="gap-2"><ChevronDown className="h-4 w-4" />Mostrar todas as {num(filtrados.length)} ofertas</Button>}
    </section>
  );
}
