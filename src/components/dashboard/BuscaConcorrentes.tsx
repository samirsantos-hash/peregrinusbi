import { useMemo, useState } from "react";
import { Search, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Oferta {
  id: string; produto_id: string; titulo: string; foto: string | null;
  preco: number; preco_original: number | null;
  vendedor: string | null; vendedor_id: number | null;
  full: boolean; frete_gratis: boolean; link: string;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function mediana(v: number[]) {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function BuscaConcorrentes() {
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<Oferta[] | null>(null);
  const [meuPreco, setMeuPreco] = useState("");

  const buscar = async () => {
    if (q.trim().length < 2) return;
    setCarregando(true); setErro(null);
    const { data, error } = await supabase.functions.invoke("ml-busca-concorrentes", { body: { q } });
    setCarregando(false);
    const msg = (data as { error?: string } | null)?.error;
    if (error || msg) { setErro(msg ?? "Não foi possível buscar agora."); setItens(null); return; }
    setItens(((data as { itens: Oferta[] }).itens ?? []).sort((a, b) => a.preco - b.preco));
  };

  const resumo = useMemo(() => {
    if (!itens?.length) return null;
    const p = itens.map((i) => i.preco);
    return {
      n: itens.length, min: Math.min(...p), max: Math.max(...p), med: mediana(p)!,
      full: itens.filter((i) => i.full).length, frete: itens.filter((i) => i.frete_gratis).length,
    };
  }, [itens]);

  const meu = Number(meuPreco.replace(",", "."));
  const posicao = resumo && meu > 0 && itens ? itens.filter((i) => i.preco < meu).length : null;

  return (
    <section className="glass-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Buscar concorrentes no Mercado Livre</h3>
        <p className="text-[11px] text-muted-foreground">
          Pesquisa ofertas ativas do catálogo do Mercado Livre e compara preços, Full e frete grátis.
        </p>
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: pneu aro 15, fone bluetooth" className="h-9 flex-1 min-w-[200px] text-xs" />
        <Input value={meuPreco} onChange={(e) => setMeuPreco(e.target.value)} placeholder="Seu preço (opcional)" inputMode="decimal" className="h-9 w-40 text-xs" />
        <Button type="submit" size="sm" className="h-9 gap-1" disabled={carregando || q.trim().length < 2}>
          {carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Buscar
        </Button>
      </form>

      {erro && <p className="flex items-center gap-2 text-xs text-destructive"><AlertTriangle className="w-3.5 h-3.5" />{erro}</p>}
      {itens && !itens.length && <p className="text-xs text-muted-foreground">Nenhuma oferta encontrada no catálogo para essa busca.</p>}

      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {[
            ["Ofertas", String(resumo.n)],
            ["Menor · Mediana", `${brl(resumo.min)} · ${brl(resumo.med)}`],
            ["Maior", brl(resumo.max)],
            ["Full · Frete grátis", `${resumo.full} · ${resumo.frete}`],
          ].map(([r, v]) => (
            <div key={r} className="rounded-lg border border-border/50 p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{r}</p>
              <p className="font-semibold tnum">{v}</p>
            </div>
          ))}
          {posicao !== null && (
            <p className="col-span-full text-xs">
              Seu preço de <b className="tnum">{brl(meu)}</b> fica na posição <b className="tnum">{posicao + 1}</b> de {resumo.n + 1}
              {meu > resumo.med ? " — acima da mediana dos concorrentes." : " — na mediana ou abaixo."}
            </p>
          )}
        </div>
      )}

      {itens && itens.length > 0 && (
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-[11px]">
            <thead className="text-muted-foreground sticky top-0 bg-card">
              <tr className="border-b border-border/40">
                <th className="text-left py-1.5">Produto</th>
                <th className="text-left">Vendedor</th>
                <th className="text-right">Preço</th>
                <th className="text-center">Full</th>
                <th className="text-center">Frete grátis</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id} className="border-b border-border/20">
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-2">
                      {i.foto && <img src={i.foto} alt="" className="h-8 w-8 rounded object-cover" loading="lazy" />}
                      <span className="line-clamp-2">{i.titulo}</span>
                    </div>
                  </td>
                  <td>{i.vendedor ?? "—"}</td>
                  <td className="text-right tnum">
                    {brl(i.preco)}
                    {i.preco_original && i.preco_original > i.preco && (
                      <span className="block text-[10px] text-muted-foreground line-through">{brl(i.preco_original)}</span>
                    )}
                  </td>
                  <td className="text-center">{i.full ? "Sim" : "—"}</td>
                  <td className="text-center">{i.frete_gratis ? "Sim" : "—"}</td>
                  <td className="text-right">
                    <a href={i.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">
                      ver <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
