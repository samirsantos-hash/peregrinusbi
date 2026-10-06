import { useMemo, useRef, useState } from "react";
import { Loader2, UploadCloud, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { validarArquivoUpload } from "@/lib/uploadGuard";
import { analisarArquivo, ROTULO_ALERTA, type AnaliseLocal, type TipoAlerta } from "@/lib/revisaoPlanilha";

interface Prioridade { loja: string; gravidade: "alta" | "media" | "baixa"; motivo: string; acao: string; linhas: number[] }
interface RespostaIA { resumo: string; prioridades: Prioridade[] }

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const COR: Record<string, "destructive" | "secondary" | "outline"> = { alta: "destructive", media: "secondary", baixa: "outline" };

export default function RevisaoPlanilhaIA() {
  const ref = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState("");
  const [analise, setAnalise] = useState<AnaliseLocal | null>(null);
  const [ia, setIa] = useState<RespostaIA | null>(null);
  const [busy, setBusy] = useState<"" | "lendo" | "ia">("");
  const [erro, setErro] = useState<string | null>(null);

  const contagem = useMemo(() => {
    const c: Partial<Record<TipoAlerta, number>> = {};
    analise?.alertas.forEach((a) => { c[a.tipo] = (c[a.tipo] ?? 0) + 1; });
    return c;
  }, [analise]);

  const ler = async (f: File) => {
    setErro(null); setIa(null); setAnalise(null); setBusy("lendo"); setArquivo(f.name);
    try {
      validarArquivoUpload(f, { extensoes: [".csv"] });
      setAnalise(await analisarArquivo(f));
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao ler a planilha."); }
    finally { setBusy(""); }
  };

  const revisar = async () => {
    if (!analise) return;
    setBusy("ia"); setErro(null);
    try {
      const fat = analise.lojas.reduce((s, l) => s + l.faturamento, 0);
      const { data, error } = await supabase.functions.invoke("revisar-planilha", {
        body: {
          arquivo,
          contagem,
          totais: { linhas: analise.linhas, lojas: analise.lojas.length, faturamento: Math.round(fat) },
          alertas: analise.alertas.slice(0, 300),
        },
      });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* sem corpo */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      setIa(data as RespostaIA);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha na revisão."); }
    finally { setBusy(""); }
  };

  return (
    <Card className="bg-card/60 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Revisão de planilha com IA</CardTitle>
        <p className="text-xs text-muted-foreground">
          Envie uma planilha de vendas (.csv). O painel confere as regras entre lojas no seu navegador e a IA resume o que precisa de revisão. Nada é gravado no painel.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div onClick={() => !busy && ref.current?.click()}
          className="rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 p-6 text-center cursor-pointer">
          <input ref={ref} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) ler(f); e.target.value = ""; }} />
          {busy === "lendo" ? <Loader2 className="w-7 h-7 mx-auto animate-spin text-primary" /> : <UploadCloud className="w-7 h-7 mx-auto text-primary" />}
          <p className="text-sm mt-2">{arquivo || "Clique para escolher a planilha"}</p>
        </div>

        {erro && <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"><AlertTriangle className="w-4 h-4 shrink-0" />{erro}</div>}

        {analise && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg border border-border/40 p-2"><p className="text-muted-foreground">Linhas</p><p className="font-semibold tabular-nums">{fmt(analise.linhas)}</p></div>
              <div className="rounded-lg border border-border/40 p-2"><p className="text-muted-foreground">Lojas</p><p className="font-semibold tabular-nums">{fmt(analise.lojas.length)}</p></div>
              <div className="rounded-lg border border-border/40 p-2"><p className="text-muted-foreground">Inconsistências</p><p className="font-semibold tabular-nums">{fmt(analise.alertas.length)}</p></div>
              <div className="rounded-lg border border-border/40 p-2"><p className="text-muted-foreground">Lojas afetadas</p><p className="font-semibold tabular-nums">{fmt(new Set(analise.alertas.map((a) => a.custId)).size)}</p></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(contagem).map(([t, n]) => <Badge key={t} variant="outline" className="text-[11px]">{ROTULO_ALERTA[t as TipoAlerta]}: {n}</Badge>)}
              {!analise.alertas.length && <span className="text-xs text-muted-foreground">Nenhuma inconsistência encontrada pelas regras.</span>}
            </div>
            <Button onClick={revisar} disabled={!!busy || !analise.alertas.length} className="gap-2">
              {busy === "ia" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Resumir com IA
            </Button>
          </div>
        )}

        {ia && (
          <div className="space-y-3">
            <p className="text-sm">{ia.resumo}</p>
            <div className="space-y-2">
              {ia.prioridades.map((p, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2"><Badge variant={COR[p.gravidade]}>{p.gravidade}</Badge><span className="font-semibold">{p.loja}</span></div>
                  <p>{p.motivo}</p>
                  <p className="text-muted-foreground">Ação: {p.acao}</p>
                  {p.linhas.length > 0 && <p className="text-muted-foreground tabular-nums">Linhas: {p.linhas.slice(0, 20).join(", ")}{p.linhas.length > 20 ? "…" : ""}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {analise && analise.alertas.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Ver registros detectados ({analise.alertas.length})</summary>
            <div className="max-h-80 overflow-auto mt-2">
              <table className="w-full">
                <thead className="text-muted-foreground"><tr className="border-b border-border/40"><th className="text-left py-1">Linha</th><th className="text-left">Loja</th><th className="text-left">Data</th><th className="text-left">Tipo</th><th className="text-left">Detalhe</th></tr></thead>
                <tbody>
                  {analise.alertas.slice(0, 500).map((a, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="py-1 tabular-nums">{a.linha || "—"}</td><td>{a.apelido} ({a.custId})</td><td>{a.data || "—"}</td><td>{ROTULO_ALERTA[a.tipo]}</td><td>{a.detalhe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
