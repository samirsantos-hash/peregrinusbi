import { validarArquivoUpload } from "@/lib/uploadGuard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CarteiraDataset, CarteiraSeller } from "@/hooks/carteira/useCarteiraData";
import {
  parseExtraction, buildDatasetFromExtraction, totalsOf, SchemaError,
  type Extraction,
} from "@/lib/carteira/upload";
import { fmtBRL, fmtBRLShort, fmtInt, fmtPct } from "@/lib/carteira/stats";

const MAX_HISTORY = 5;

function loadHistory(key: string): Extraction[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Extraction[]) : [];
  } catch { return []; }
}
function saveHistory(key: string, list: Extraction[]) {
  try { localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_HISTORY))); } catch { /* quota */ }
}

const fmtD = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(`${d.slice(0, 10)}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("pt-BR");
};
const fmtDT = (iso?: string | null) => {
  if (!iso) return "—";
  const [d, t] = iso.split("T");
  return `${fmtD(d)}${t ? ` ${t}` : ""}`;
};

/* ═══════════ Hook de estado (usado pelo board) ═══════════ */
export function useCarteiraUpload(scopeKey: string, master: CarteiraSeller[], base: CarteiraDataset) {
  const storeKey = `peregrinus:carteira-upload:${scopeKey}`;
  const [history, setHistory] = useState<Extraction[]>(() => loadHistory(storeKey));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState<string | null>(null);

  useEffect(() => {
    const h = loadHistory(storeKey);
    setHistory(h);
    setActiveId(h[0]?.id ?? null);
  }, [storeKey]);

  const active = useMemo(() => history.find((h) => h.id === activeId) ?? null, [history, activeId]);
  const previous = useMemo(() => {
    if (!active) return null;
    const i = history.findIndex((h) => h.id === active.id);
    return i >= 0 ? history[i + 1] ?? null : null;
  }, [history, active]);

  const built = useMemo(
    () => (active ? buildDatasetFromExtraction(active, master, base, storeFilter) : null),
    [active, master, base, storeFilter]
  );

  const add = useCallback((ex: Extraction) => {
    setHistory((prev) => {
      const next = [ex, ...prev.filter((p) => p.fileName !== ex.fileName)].slice(0, MAX_HISTORY);
      saveHistory(storeKey, next);
      return next;
    });
    setActiveId(ex.id);
  }, [storeKey]);

  const remove = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveHistory(storeKey, next);
      setActiveId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return next;
    });
  }, [storeKey]);

  return { history, active, previous, activeId, setActiveId, storeFilter, setStoreFilter, built, add, remove };
}

export type CarteiraUpload = ReturnType<typeof useCarteiraUpload>;

/* ═══════════ Painel ═══════════ */
export function UploadCarteiraPanel({ up, master }: { up: CarteiraUpload; master: CarteiraSeller[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Extraction | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [prog, setProg] = useState<{ pct: number; label: string; done?: boolean } | null>(null);

  const handleFile = async (file: File) => {
    setErr(null); setPending(null);
    try {
      validarArquivoUpload(file, { extensoes: [".xlsx"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Formato inválido: envie o arquivo diário em .xlsx.");
      return;
    }
    setBusy(true);
    setProg({ pct: 2, label: "Iniciando…" });
    try {
      const ex = await parseExtraction(file, (p) => setProg({ pct: p.pct, label: p.label }));
      setPending(ex);
      setProg({ pct: 100, label: "Validação concluída — confira o resumo e processe.", done: true });
    } catch (e: any) {
      setErr(e instanceof SchemaError ? e.message : `Não foi possível ler o arquivo: ${e?.message ?? e}`);
      setProg(null);
    } finally { setBusy(false); }
  };

  const handleProcess = async (ex: Extraction) => {
    setBusy(true);
    setProg({ pct: 30, label: "Isolando cust IDs da carteira…" });
    await new Promise((r) => setTimeout(r, 60));
    setProg({ pct: 65, label: "Recalculando KPIs, séries diárias e categorias…" });
    await new Promise((r) => setTimeout(r, 60));
    up.add(ex);
    setProg({ pct: 90, label: "Atualizando as abas do painel…" });
    await new Promise((r) => setTimeout(r, 120));
    setPending(null);
    setProg({ pct: 100, label: "Painel atualizado com a nova extração.", done: true });
    setBusy(false);
  };

  const masterCusts = useMemo(() => new Set(master.map((m) => m.custId)), [master]);
  const pendingIgnored = useMemo(
    () => (pending ? pending.sellersInFile.filter((s) => !masterCusts.has(s.c)) : []),
    [pending, masterCusts]
  );

  const { active, previous, built, history, storeFilter, setStoreFilter } = up;
  const stores = active?.stores.filter((s) => s !== "ND") ?? [];

  const cmp = useMemo(() => {
    if (!active || !previous) return null;
    const a = totalsOf(active, master, storeFilter);
    const b = totalsOf(previous, master, storeFilter);
    const rows = Array.from(a.perSeller.values()).map((r) => {
      const p = b.perSeller.get(r.custId);
      return {
        ...r,
        gmvPrev: p?.gmv ?? 0,
        deltaGmv: r.gmv - (p?.gmv ?? 0),
        deltaPct: p?.gmv ? (r.gmv - p.gmv) / p.gmv : 0,
        deltaTsi: r.tsi - (p?.tsi ?? 0),
      };
    }).sort((x, y) => y.deltaGmv - x.deltaGmv);
    return { a, b, rows };
  }, [active, previous, master, storeFilter]);

  return (
    <>
      <div className="cart-sec-head">
        <span className="cart-sec-n">00</span>
        <h2>Upload de dados</h2>
        <span className="cart-sec-note">
          Arquivo diário do Mercado Livre (.xlsx) · recorte isolado nos cust IDs oficiais da carteira
        </span>
      </div>

      <div className="cart-card">
        <div className="cart-card-head">
          <h3>Nova extração</h3>
          <p>Arraste a planilha ou selecione o arquivo. O dashboard inteiro é recalculado a partir dela.</p>
        </div>
        <div className="cart-card-body">
          <div
            className={`cart-drop ${drag ? "on" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault(); setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            <Upload className="w-6 h-6" />
            <p>Arraste aqui o arquivo <strong>BRASIL__Daily__…​.xlsx</strong></p>
            <input
              ref={inputRef} type="file" accept=".xlsx" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Selecionar arquivo
            </Button>
          </div>

          {err && <div className="cart-error" style={{ marginTop: 12 }}><AlertTriangle className="w-4 h-4" /> {err}</div>}

          {prog && (
            <div className="cart-upprog" style={{ marginTop: 14 }}>
              <div className="cart-upprog-head">
                <span>
                  {prog.done
                    ? <CheckCircle2 className="w-3.5 h-3.5" style={{ display: "inline", verticalAlign: "-2px" }} />
                    : <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ display: "inline", verticalAlign: "-2px" }} />}
                  {" "}{prog.label}
                </span>
                <strong>{prog.pct}%</strong>
              </div>
              <div className="cart-upprog-track">
                <div className={`cart-upprog-bar ${prog.done ? "done" : ""}`} style={{ width: `${prog.pct}%` }} />
              </div>
            </div>
          )}

          {pending && (
            <div className="cart-upload-info">
              <div className="cart-kpigrid">
                <div className="cart-kpi"><div className="cart-kpi-label">Arquivo</div><div className="cart-kpi-value sm">{pending.fileName}</div></div>
                <div className="cart-kpi"><div className="cart-kpi-label">Extração</div><div className="cart-kpi-value sm">{fmtDT(pending.extractedAt)}</div></div>
                <div className="cart-kpi"><div className="cart-kpi-label">Período coberto</div><div className="cart-kpi-value sm">{fmtD(pending.periodStart)} – {fmtD(pending.periodEnd)}</div></div>
                <div className="cart-kpi"><div className="cart-kpi-label">Linhas</div><div className="cart-kpi-value">{fmtInt(pending.rowCount)}</div></div>
                <div className="cart-kpi"><div className="cart-kpi-label">Lojas no arquivo</div><div className="cart-kpi-value">{fmtInt(pending.sellerCount)}</div></div>
                <div className="cart-kpi">
                  <div className="cart-kpi-label">Lojas da carteira</div>
                  <div className="cart-kpi-value">{fmtInt(pending.sellersInFile.length - pendingIgnored.length)}</div>
                  <div className="cart-kpi-hint">de {fmtInt(master.length)} cadastradas</div>
                </div>
              </div>

              {pendingIgnored.length > 0 && (
                <div className="cart-warn">
                  <AlertTriangle className="w-4 h-4" />
                  <div>
                    <strong>{pendingIgnored.length} loja(s) fora da carteira foram ignoradas.</strong> Nenhum dado delas entra nos cálculos.
                    <button className="cart-linkbtn" onClick={() => setShowIgnored((v) => !v)}>
                      {showIgnored ? "ocultar" : "revisar"}
                    </button>
                    {showIgnored && (
                      <ul className="cart-ignored">
                        {pendingIgnored.slice(0, 40).map((s) => (
                          <li key={s.c}><code>{s.c}</code> {s.nick} · {fmtBRLShort(s.g)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <Button size="sm" className="cart-process" disabled={busy} onClick={() => handleProcess(pending)}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Processar e recalcular o painel
              </Button>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="cart-card">
          <div className="cart-card-head">
            <h3>Histórico de extrações</h3>
            <p>Selecione qual extração alimenta o painel. As demais abas usam sempre a extração ativa.</p>
          </div>
          <div className="cart-card-body">
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Ativa</th><th>Arquivo</th><th>Extração</th><th>Período</th>
                  <th className="right">Linhas</th><th className="right">Lojas na carteira</th><th />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className={h.id === up.activeId ? "on" : ""}>
                    <td>
                      <input type="radio" checked={h.id === up.activeId} onChange={() => up.setActiveId(h.id)} />
                    </td>
                    <td>{h.fileName}</td>
                    <td>{fmtDT(h.extractedAt)}</td>
                    <td>{fmtD(h.periodStart)} – {fmtD(h.periodEnd)}</td>
                    <td className="right">{fmtInt(h.rowCount)}</td>
                    <td className="right">{fmtInt(h.sellersInFile.filter((s) => masterCusts.has(s.c)).length)}</td>
                    <td className="right">
                      <button className="cart-linkbtn" onClick={() => up.remove(h.id)} title="Remover extração">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {stores.length > 1 && (
              <div className="cart-storefilter">
                <span>Loja oficial</span>
                <button className={`cart-pill ${!storeFilter ? "on" : ""}`} onClick={() => setStoreFilter(null)}>Todas</button>
                {stores.map((s) => (
                  <button key={s} className={`cart-pill ${storeFilter === s ? "on" : ""}`} onClick={() => setStoreFilter(s)}>{s}</button>
                ))}
              </div>
            )}

            {built && (
              <div className="cart-business">
                Extração ativa isolada na carteira: <strong>{fmtInt(built.matched)}</strong> lojas plotadas
                {built.ignored.length > 0 && <> · <strong>{built.ignored.length}</strong> fora da carteira ignoradas</>}
                {storeFilter && <> · filtro de loja oficial: <strong>{storeFilter}</strong></>}.
              </div>
            )}
          </div>
        </div>
      )}

      {cmp && (
        <div className="cart-card">
          <div className="cart-card-head">
            <h3>Comparar posições</h3>
            <p>
              {fmtD(active!.periodStart)}–{fmtD(active!.periodEnd)} (ativa) × {fmtD(previous!.periodStart)}–{fmtD(previous!.periodEnd)} (anterior)
            </p>
          </div>
          <div className="cart-card-body">
            <div className="cart-kpigrid">
              <div className="cart-kpi">
                <div className="cart-kpi-label">GMV</div>
                <div className="cart-kpi-value">{fmtBRL(cmp.a.gmv)}</div>
                <div className="cart-kpi-hint">{cmp.b.gmv ? fmtPct((cmp.a.gmv - cmp.b.gmv) / cmp.b.gmv) : "—"} vs anterior</div>
              </div>
              <div className="cart-kpi">
                <div className="cart-kpi-label">TSI</div>
                <div className="cart-kpi-value">{fmtInt(cmp.a.tsi)}</div>
                <div className="cart-kpi-hint">{cmp.b.tsi ? fmtPct((cmp.a.tsi - cmp.b.tsi) / cmp.b.tsi) : "—"} vs anterior</div>
              </div>
              <div className="cart-kpi">
                <div className="cart-kpi-label">Ticket</div>
                <div className="cart-kpi-value">{fmtBRL(cmp.a.ticket)}</div>
                <div className="cart-kpi-hint">{cmp.b.ticket ? fmtPct((cmp.a.ticket - cmp.b.ticket) / cmp.b.ticket) : "—"} vs anterior</div>
              </div>
            </div>
            <table className="cart-table">
              <thead>
                <tr><th>Loja</th><th className="right">GMV ativa</th><th className="right">GMV anterior</th><th className="right">Δ GMV</th><th className="right">Δ %</th><th className="right">Δ TSI</th></tr>
              </thead>
              <tbody>
                {cmp.rows.slice(0, 25).map((r) => (
                  <tr key={r.custId}>
                    <td>{r.nick}</td>
                    <td className="right">{fmtBRLShort(r.gmv)}</td>
                    <td className="right">{fmtBRLShort(r.gmvPrev)}</td>
                    <td className={`right ${r.deltaGmv >= 0 ? "pos" : "neg"}`}>{fmtBRLShort(r.deltaGmv)}</td>
                    <td className={`right ${r.deltaGmv >= 0 ? "pos" : "neg"}`}>{r.gmvPrev ? fmtPct(r.deltaPct) : "—"}</td>
                    <td className={`right ${r.deltaTsi >= 0 ? "pos" : "neg"}`}>{fmtInt(r.deltaTsi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!history.length && (
        <div className="cart-business">
          Sem extração carregada: o painel segue exibindo os dados da base. Ao processar um arquivo, todas as abas
          passam a ser calculadas somente sobre os cust IDs oficiais da carteira presentes nele.
        </div>
      )}
    </>
  );
}