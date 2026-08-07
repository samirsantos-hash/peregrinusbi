import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Database, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/* ═══════ Upload dos arquivos mensais + qualidade dos feeds ═══════
   Nenhum parse de CSV acontece no browser: o arquivo bruto vai para o
   Storage privado e a Edge Function `ingest-sftp` faz a leitura.        */

type Feed = "CPP" | "CDP";

const detectFeed = (name: string): Feed | null => {
  const n = name.toUpperCase();
  if (n.includes("CDP_MENSAL")) return "CDP";
  if (n.includes("CPP_MENSAL")) return "CPP";
  return null;
};

interface MesLinha { mes: string; so_cpp: number; so_cdp: number; ambos: number; sem_vinculo: number }
interface NuloLinha { feed: string; coluna: string; total: number; nulos: number; pct_nulo: number }
interface ImportLinha { feed: string; arquivo: string | null; importado_em: string | null; linhas: number; meses: number; sellers: number }
interface DivLinha { cust_id: string; nickname: string | null; em_cpp: boolean; em_cdp: boolean; vinculado: boolean }
interface ExecLinha {
  id: string; feed: string | null; arquivo: string | null; status: string;
  linhas_lidas: number | null; linhas_gravadas: number | null; erro: string | null;
  iniciado_em: string | null; finalizado_em: string | null;
}

const fmtDT = (s: string | null) =>
  s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const nomeArquivo = (p: string | null) => (p ? p.split("/").pop() ?? p : "—");

/** CSV com ; e BOM — abre direto no Excel pt-BR. */
function baixarCsv(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const txt = [cabecalho, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + txt], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}

const QualidadeFeeds = () => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [meses, setMeses] = useState<MesLinha[]>([]);
  const [nulos, setNulos] = useState<NuloLinha[]>([]);
  const [imports, setImports] = useState<ImportLinha[]>([]);
  const [mesSel, setMesSel] = useState<string | null>(null);
  const [divs, setDivs] = useState<DivLinha[]>([]);
  const [execs, setExecs] = useState<ExecLinha[]>([]);
  const [soFalhas, setSoFalhas] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const cli = supabase as any;
    const [a, b, c, d] = await Promise.all([
      cli.rpc("qualidade_feeds_por_mes"),
      cli.rpc("qualidade_nulos_criticos"),
      cli.rpc("qualidade_ultimo_import"),
      cli.from("ingestao_execucoes").select("*").order("iniciado_em", { ascending: false }).limit(500),
    ]);
    setMeses((a.data ?? []) as MesLinha[]);
    setNulos((b.data ?? []) as NuloLinha[]);
    setImports((c.data ?? []) as ImportLinha[]);
    setExecs((d.data ?? []) as ExecLinha[]);
    const primeiro = (a.data ?? [])[0]?.mes ?? null;
    setMesSel((m) => m ?? primeiro);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!mesSel) return;
    (supabase as any).rpc("qualidade_divergencias", { _mes: mesSel })
      .then((r: { data: DivLinha[] | null }) => setDivs(r.data ?? []));
  }, [mesSel]);

  const enviar = async (file: File) => {
    const feed = detectFeed(file.name);
    if (!feed) {
      setMsg({ tipo: "erro", texto: `Nome do arquivo "${file.name}" não identifica o layout. Precisa conter CPP_MENSAL ou CDP_MENSAL.` });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const agora = new Date();
      const aaaamm = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, "0")}`;
      const carimbo = agora.toISOString().replace(/[:.]/g, "-");
      // Arquivo bruto é imutável: nunca sobrescreve, versiona por data.
      const path = `${feed}/${aaaamm}/${carimbo}__${file.name}`;

      const up = await supabase.storage.from("sftp-raw").upload(path, file, { upsert: false });
      if (up.error) throw new Error(`Falha ao enviar ao Storage: ${up.error.message}`);

      const { data, error } = await supabase.functions.invoke("ingest-sftp", { body: { path } });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      const d = data as { feed: string; linhas_gravadas: number; colunas: number; decimal_origem: string };
      setMsg({
        tipo: "ok",
        texto: `${d.feed}: ${d.linhas_gravadas.toLocaleString("pt-BR")} linhas gravadas · ${d.colunas} colunas · decimal de origem "${d.decimal_origem}".`,
      });
      await carregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro desconhecido" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Upload className="h-4 w-4 text-primary" /> Arquivos mensais do fornecedor (CPP / CDP)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          O arquivo é enviado íntegro para o repositório privado e lido no servidor. Delimitador, BOM e
          separador decimal são tratados por layout — o CPP usa vírgula, o CDP usa ponto. Header inesperado
          aborta a importação inteira, sem gravar linha parcial.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); }}
          />
          <Button size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando…</> : <>Selecionar arquivo</>}
          </Button>
          <Button size="sm" variant="ghost" onClick={carregar} disabled={busy}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
        {msg && (
          <div className={`mt-3 flex items-start gap-2 rounded-lg border p-2 text-xs ${
            msg.tipo === "ok" ? "border-emerald/40 bg-emerald/10 text-emerald" : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}>
            {msg.tipo === "ok" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />}
            <span>{msg.texto}</span>
          </div>
        )}
      </section>

      {/* Último import por feed */}
      <section className="grid gap-3 sm:grid-cols-2">
        {imports.map((i) => (
          <div key={i.feed} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4 text-primary" /> Feed {i.feed}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-muted-foreground">
              <dt>Último import</dt><dd className="text-right text-foreground tnum">{fmtDT(i.importado_em)}</dd>
              <dt>Linhas</dt><dd className="text-right text-foreground tnum">{Number(i.linhas ?? 0).toLocaleString("pt-BR")}</dd>
              <dt>Meses</dt><dd className="text-right text-foreground tnum">{i.meses ?? 0}</dd>
              <dt>Sellers</dt><dd className="text-right text-foreground tnum">{i.sellers ?? 0}</dd>
            </dl>
            <p className="mt-2 break-all text-[10px] text-muted-foreground">{i.arquivo ?? "—"}</p>
          </div>
        ))}
        {imports.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum arquivo importado ainda.</p>
        )}
      </section>

      {/* Cobertura por mês */}
      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h3 className="text-sm font-semibold">Cobertura por mês</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Os feeds não cobrem o mesmo conjunto de contas. A divergência é exibida, não resolvida.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/50">
                <th className="py-1 text-left">Mês</th>
                <th className="py-1 text-right">Só CPP</th>
                <th className="py-1 text-right">Só CDP</th>
                <th className="py-1 text-right">Em ambos</th>
                <th className="py-1 text-right">Sem vínculo em lojas</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {meses.map((m) => (
                <tr
                  key={m.mes}
                  onClick={() => setMesSel(m.mes)}
                  className={`cursor-pointer border-b border-border/30 hover:bg-muted/20 ${mesSel === m.mes ? "bg-muted/30" : ""}`}
                >
                  <td className="py-1 text-left">{m.mes}</td>
                  <td className="py-1 text-right">{m.so_cpp}</td>
                  <td className="py-1 text-right">{m.so_cdp}</td>
                  <td className="py-1 text-right">{m.ambos}</td>
                  <td className="py-1 text-right">{m.sem_vinculo}</td>
                </tr>
              ))}
              {meses.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-center text-muted-foreground">Sem dados importados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Divergências do mês selecionado */}
      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h3 className="text-sm font-semibold">Contas divergentes {mesSel ? `· ${mesSel}` : ""}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Contas presentes em apenas um dos feeds. A reconciliação considera apelido e ID — nada é unificado à força.
        </p>
        <div className="mt-3 max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/50">
                <th className="py-1 text-left">Cust ID</th>
                <th className="py-1 text-left">Apelido</th>
                <th className="py-1 text-left">Presente em</th>
                <th className="py-1 text-left">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {divs.map((d) => (
                <tr key={d.cust_id} className="border-b border-border/30">
                  <td className="py-1 tnum">{d.cust_id}</td>
                  <td className="py-1">{d.nickname ?? "—"}</td>
                  <td className="py-1">{d.em_cpp ? "só CPP" : "só CDP"}</td>
                  <td className="py-1">{d.vinculado ? "vinculado" : "sem vínculo"}</td>
                </tr>
              ))}
              {divs.length === 0 && (
                <tr><td colSpan={4} className="py-3 text-center text-muted-foreground">Nenhuma divergência neste mês.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Nulos por coluna crítica */}
      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h3 className="text-sm font-semibold">Campos vazios por coluna crítica</h3>
        <p className="mt-1 text-xs text-muted-foreground">Campo vazio no arquivo é null — nunca zero — e renderiza “—”.</p>
        <div className="mt-3 grid gap-1 sm:grid-cols-2">
          {nulos.map((n) => (
            <div key={`${n.feed}-${n.coluna}`} className="flex items-center justify-between gap-2 border-b border-border/30 py-1 text-xs">
              <span className="text-muted-foreground">{n.feed} · {n.coluna}</span>
              <span className="tnum">{n.pct_nulo ?? 0}% ({Number(n.nulos ?? 0).toLocaleString("pt-BR")})</span>
            </div>
          ))}
          {nulos.length === 0 && <p className="text-xs text-muted-foreground">Sem dados importados.</p>}
        </div>
      </section>
    </div>
  );
};

export default QualidadeFeeds;
