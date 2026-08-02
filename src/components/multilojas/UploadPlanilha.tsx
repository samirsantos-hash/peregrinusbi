import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lerPlanilhaML, type Diagnostico, type PedidoML } from "@/lib/multilojas/parse";
import { fInt, fPct } from "@/lib/multilojas/stats";

interface Props {
  onReady: (pedidos: PedidoML[], diag: Diagnostico) => void;
}

const Linha = ({ label, value, alerta }: { label: string; value: string; alerta?: boolean }) => (
  <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border/30 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className={alerta ? "text-destructive font-semibold tabular-nums" : "text-foreground font-medium tabular-nums"}>{value}</span>
  </div>
);

const UploadPlanilha = ({ onReady }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [res, setRes] = useState<{ pedidos: PedidoML[]; diag: Diagnostico } | null>(null);

  const processar = useCallback(async (file: File) => {
    setBusy(true); setErro(null); setRes(null); setPct(0);
    try {
      const out = await lerPlanilhaML(file, (p, l) => { setPct(p); setLabel(l); });
      if (!out.pedidos.length) throw new Error("Nenhuma linha válida foi encontrada na planilha.");
      setRes(out);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ler a planilha.");
    } finally {
      setBusy(false);
    }
  }, []);

  const diag = res?.diag;
  const aprovBaixo = !!diag && diag.aproveitamento < 0.95;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) processar(f); }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          drag ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 bg-card/40"
        }`}
      >
        <input
          ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processar(f); e.target.value = ""; }}
        />
        {busy ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="h-2 w-full max-w-md mx-auto rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">{pct}%</p>
          </div>
        ) : (
          <>
            <UploadCloud className="w-9 h-9 mx-auto text-primary mb-2" />
            <p className="text-sm font-medium">Arraste o relatório de Vendas do Mercado Livre</p>
            <p className="text-xs text-muted-foreground mt-1">
              .xlsx, .xls ou .csv · o arquivo é processado no seu navegador
            </p>
          </>
        )}
      </div>

      <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 mt-px text-emerald shrink-0" />
        LGPD: nome, CPF em claro, logradouro e telefone do comprador são descartados na ingestão. Só permanecem
        cidade, UF e um identificador irreversível do documento, usado para contar compradores únicos e recompra.
      </p>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="w-4 h-4" /> {erro}
        </div>
      )}

      {diag && res && (
        <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Diagnóstico da carga</h3>
            <span className="text-xs text-muted-foreground truncate">{diag.arquivo}</span>
          </div>

          <div className="grid gap-x-8 md:grid-cols-2">
            <div>
              <Linha label="Linhas lidas" value={fInt(diag.linhas)} />
              <Linha label="Registros válidos" value={`${fInt(diag.validas)} (${fPct(diag.aproveitamento)})`} alerta={aprovBaixo} />
              <Linha label="Cabeçalho detectado" value={`linha ${diag.headerRow}`} />
              <Linha label="Campos mapeados" value={`${diag.camposMapeados} de ${diag.camposTotal}`} />
              <Linha label="IDs duplicados" value={fInt(diag.duplicados)} alerta={diag.duplicados > 0} />
            </div>
            <div>
              <Linha label="Lojas identificadas" value={`${diag.lojas.length} · ${diag.lojas.slice(0, 3).join(", ")}${diag.lojas.length > 3 ? "…" : ""}`} />
              <Linha label="Cobertura temporal" value={`${diag.dias} dias · ${diag.ini} → ${diag.fim}`} />
              <Linha label="Sem receita de produto" value={fInt(diag.semReceita)} alerta={diag.semReceita > diag.validas * 0.05} />
              <Linha label="Sem UF" value={fInt(diag.semUf)} alerta={diag.semUf > diag.validas * 0.1} />
              <Linha label="Sem NF-e autorizada" value={fInt(diag.semNfe)} />
              <Linha label="Sem modal logístico" value={fInt(diag.semLogi)} />
            </div>
          </div>

          {aprovBaixo && (
            <p className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
              Aproveitamento abaixo de 95%: verifique datas em formato inesperado antes de usar os números.
            </p>
          )}

          {diag.faltando.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="text-xs font-semibold text-warning mb-1">Campos não localizados</p>
              <ul className="text-[11px] text-muted-foreground space-y-0.5">
                {diag.faltando.map((f) => (
                  <li key={f.campo}>· <span className="font-medium text-foreground">{f.campo}</span> — indisponível: {f.impacto}</li>
                ))}
              </ul>
            </div>
          )}

          <Button className="w-full gap-2" onClick={() => onReady(res.pedidos, diag)}>
            <CheckCircle2 className="w-4 h-4" /> Abrir o painel
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadPlanilha;