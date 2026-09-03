import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, Loader2, AlertTriangle, CheckCircle2, ShieldCheck, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lerPlanilhaML, type Diagnostico, type PedidoML } from "@/lib/multilojas/parse";
import {
  sha256Hex, cargaJaExiste, publicarCargaVendas, listarCargas, arquivarCarga, type CargaResumo,
} from "@/lib/multilojas/persist";
import { fInt, fBRL, fPct } from "@/lib/multilojas/stats";
import { useAuth } from "@/hooks/useAuth";
import MercadoLivrePanel from "./MercadoLivrePanel";

interface Props {
  perfilAdmin: boolean;
  onPublicado: () => void;
}

const FONTES = [
  { id: "vendas", rotulo: "Base de Vendas Consolidada" },
];

const CentralDados = ({ perfilAdmin, onPublicado }: Props) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [fonte, setFonte] = useState("vendas");
  const [responsavel, setResponsavel] = useState("");
  const [pendente, setPendente] = useState<{ pedidos: PedidoML[]; diag: Diagnostico; hash: string; bytes: number } | null>(null);
  const [cargas, setCargas] = useState<CargaResumo[]>([]);

  const recarregar = useCallback(async () => {
    try { setCargas(await listarCargas(perfilAdmin)); } catch { /* sem permissão */ }
  }, [perfilAdmin]);

  useEffect(() => { recarregar(); }, [recarregar]);
  useEffect(() => { if (user?.email && !responsavel) setResponsavel(user.email); }, [user, responsavel]);

  const processar = useCallback(async (file: File) => {
    setBusy(true); setErro(null); setOk(null); setPendente(null); setPct(0);
    try {
      validarArquivoUpload(file, { extensoes: [".xlsx", ".xls", ".csv"] });
      const buf = await file.arrayBuffer();
      const hash = await sha256Hex(buf);
      const dup = await cargaJaExiste(hash);
      if (dup) throw new Error(`Arquivo já processado em ${new Date(dup.created_at).toLocaleString("pt-BR")} (assinatura ${hash.slice(0, 12)}…).`);
      const out = await lerPlanilhaML(file, (p, l) => { setPct(p); setLabel(l); });
      if (!out.pedidos.length) throw new Error("Nenhuma linha válida foi encontrada na planilha.");
      setPendente({ ...out, hash, bytes: file.size });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ler a planilha.");
    } finally { setBusy(false); }
  }, []);

  const publicar = async () => {
    if (!pendente) return;
    setBusy(true); setErro(null); setPct(0);
    try {
      const r = await publicarCargaVendas({
        pedidos: pendente.pedidos, diag: pendente.diag, hash: pendente.hash,
        arquivoBytes: pendente.bytes, fonteId: fonte, responsavel: responsavel || "—",
        userId: user?.id ?? null, podeCriarLoja: perfilAdmin,
        onProgress: (p, l) => { setPct(p); setLabel(l); },
      });
      setOk(`${fInt(r.inseridos)} pedidos publicados${r.lojasNovas ? ` · ${r.lojasNovas} loja(s) cadastrada(s) automaticamente` : ""}.`);
      setPendente(null);
      await recarregar();
      onPublicado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao publicar a carga.");
    } finally { setBusy(false); }
  };

  const diag = pendente?.diag;

  return (
    <div className="space-y-4">
      <MercadoLivrePanel />
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Publicar carga</h3>
        <div className="flex flex-wrap gap-2">
          <select value={fonte} onChange={(e) => setFonte(e.target.value)}
            className="h-8 rounded-md border border-border/60 bg-card/60 px-2 text-xs">
            {FONTES.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}
          </select>
          <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)}
            placeholder="Responsável pela carga" className="h-8 w-[240px] text-xs" />
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) processar(f); }}
          onClick={() => !busy && inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            drag ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 bg-card/40"
          }`}
        >
          <input ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processar(f); e.target.value = ""; }} />
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
              <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls ou .csv · assinatura SHA-256 impede reprocessar o mesmo arquivo</p>
            </>
          )}
        </div>

        <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 mt-px text-emerald shrink-0" />
          LGPD: nome, CPF em claro, logradouro e telefone do comprador são descartados na ingestão e nunca chegam ao banco.
          Persistem apenas cidade, UF e um identificador irreversível do documento.
        </p>

        {erro && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {erro}
          </div>
        )}
        {ok && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald/40 bg-emerald/10 p-3 text-xs text-emerald">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {ok}
          </div>
        )}

        {diag && pendente && (
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-2">
            <p className="text-xs font-semibold">Diagnóstico da carga · {diag.arquivo}</p>
            <div className="grid gap-x-8 md:grid-cols-2 text-[11px]">
              <div className="flex justify-between border-b border-border/30 py-1"><span className="text-muted-foreground">Linhas lidas</span><span className="tabular-nums">{fInt(diag.linhas)}</span></div>
              <div className="flex justify-between border-b border-border/30 py-1"><span className="text-muted-foreground">Registros válidos</span><span className="tabular-nums">{fInt(diag.validas)} ({fPct(diag.aproveitamento)})</span></div>
              <div className="flex justify-between border-b border-border/30 py-1"><span className="text-muted-foreground">Período</span><span className="tabular-nums">{diag.ini} → {diag.fim}</span></div>
              <div className="flex justify-between border-b border-border/30 py-1"><span className="text-muted-foreground">Lojas atingidas</span><span className="tabular-nums">{diag.lojas.length}</span></div>
              <div className="flex justify-between border-b border-border/30 py-1"><span className="text-muted-foreground">IDs duplicados</span><span className="tabular-nums">{fInt(diag.duplicados)}</span></div>
              <div className="flex justify-between border-b border-border/30 py-1"><span className="text-muted-foreground">Campos mapeados</span><span className="tabular-nums">{diag.camposMapeados} de {diag.camposTotal}</span></div>
            </div>
            {diag.faltando.length > 0 && (
              <p className="text-[11px] text-warning">
                Campos não localizados: {diag.faltando.map((f) => f.campo).join(", ")} — as análises dependentes ficam indisponíveis.
              </p>
            )}
            {!perfilAdmin && (
              <p className="text-[11px] text-muted-foreground">
                Lojas ainda não cadastradas ficam sem vínculo nesta carga: só o Administrador cria cadastro de loja.
              </p>
            )}
            <Button className="w-full gap-2" onClick={publicar} disabled={busy}>
              <CheckCircle2 className="w-4 h-4" /> Publicar para a rede
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-card/60 p-4">
        <h3 className="text-sm font-semibold mb-2">Histórico de cargas</h3>
        {!cargas.length ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Nenhuma carga publicada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left py-1.5">Fonte</th>
                  <th className="text-left">Enviada em</th>
                  <th className="text-left">Responsável</th>
                  <th className="text-right">Aproveitamento</th>
                  <th className="text-right">Registros</th>
                  <th className="text-left">Período</th>
                  <th className="text-right">GMV</th>
                  {perfilAdmin && <th className="text-left">Arquivo</th>}
                  {perfilAdmin && <th className="text-left">Assinatura</th>}
                  <th className="text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {cargas.map((c) => {
                  const apro = c.linhas ? (c.validas || 0) / c.linhas : 0;
                  return (
                    <tr key={c.id} className={`border-b border-border/20 ${c.ativa ? "" : "opacity-50"}`}>
                      <td className="py-1.5">{c.fonte_id}</td>
                      <td>{new Date(c.created_at).toLocaleString("pt-BR")}</td>
                      <td className="truncate max-w-[180px]">{c.responsavel || "—"}</td>
                      <td className="text-right tabular-nums">{fPct(apro)}</td>
                      <td className="text-right tabular-nums">{fInt(c.validas || 0)}</td>
                      <td>{c.periodo_ini || "—"} → {c.periodo_fim || "—"}</td>
                      <td className="text-right tabular-nums">{fBRL(Number(c.gmv) || 0)}</td>
                      {perfilAdmin && <td className="truncate max-w-[160px]" title={c.arquivo || ""}>{c.arquivo || "—"}</td>}
                      {perfilAdmin && <td className="font-mono">{(c.hash || "").slice(0, 10)}…</td>}
                      <td className="text-right">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1"
                          onClick={async () => { await arquivarCarga(c.id, !c.ativa); await recarregar(); onPublicado(); }}>
                          {c.ativa ? <><Archive className="w-3 h-3" />arquivar</> : <><RotateCcw className="w-3 h-3" />reativar</>}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CentralDados;
