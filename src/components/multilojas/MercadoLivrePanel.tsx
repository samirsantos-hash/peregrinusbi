import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, RefreshCw, AlertTriangle, Send, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Convites sempre apontam para o site publicado: o endereço de pré-visualização exige login no Lovable.
const LINK_PUBLICO = "https://ecomperegrinus.com.br";

interface ContaML {
  account_id: string;
  ml_user_id: number;
  nickname: string | null;
  site_id: string | null;
  status: string;
  token_expira_em: string | null;
  tem_token: boolean;
  jobs_total: number;
  jobs_concluidos: number;
}

const rotuloStatus = (c: ContaML) => {
  if (c.status === "disabled") return { txt: "Desativada", cls: "text-muted-foreground border-border/60" };
  const venceu = !c.tem_token || (c.token_expira_em && new Date(c.token_expira_em) < new Date());
  if (venceu) return { txt: "Reautorizar", cls: "text-warning border-warning/50" };
  return { txt: "Conectada", cls: "text-emerald border-emerald/50" };
};

const expiraEm = (iso: string | null) => {
  if (!iso) return "—";
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (min <= 0) return "expirado";
  if (min < 60) return `${min} min`;
  return `${Math.round(min / 60)} h`;
};

const MercadoLivrePanel = () => {
  const [contas, setContas] = useState<ContaML[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [conectando, setConectando] = useState(false);
  const [rotulo, setRotulo] = useState("");
  const [convite, setConvite] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const filtradas = contas.filter((c) => !termo || `${c.nickname ?? ""} ${c.ml_user_id} ${rotuloStatus(c).txt}`.toLowerCase().includes(termo));

  const gerarConvite = async () => {
    setGerando(true);
    const { data, error } = await supabase.functions.invoke("ml-oauth-start", {
      body: { criar_convite: true, rotulo: rotulo || null },
    });
    setGerando(false);
    const token = (data as { token?: string } | null)?.token;
    if (error || !token) { toast.error("Não foi possível gerar o convite."); return; }
    setConvite(`${LINK_PUBLICO}/conectar/${token}`);
  };

  const textoWhats = (link: string) =>
    encodeURIComponent(`Olá! Para ativar a Integração Peregrinus com sua loja do Mercado Livre, acesse o link abaixo e clique em "Autorizar conexão Peregrinus" (válido por 7 dias, uso único):\n${link}`);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase.rpc("ml_minhas_contas_status");
    if (!error) setContas((data as ContaML[]) ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const status = p.get("status");
    if (!status) return;
    const msg = p.get("msg");
    if (status === "ok") toast.success("Conta do Mercado Livre conectada.");
    else toast.error(`Não foi possível conectar${msg ? `: ${msg}` : "."}`);
    window.history.replaceState({}, "", window.location.pathname);
    carregar();
  }, [carregar]);

  const conectar = async () => {
    setConectando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ml-oauth-start", { body: {} });
      const destino = (data as { url?: string } | null)?.url;
      if (error || !destino) throw new Error(error?.message ?? "resposta inválida");
      window.location.href = destino; // redirect de página inteira, nunca popup
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar a conexão.");
      setConectando(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Mercado Livre</h3>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={carregar}>
          <RefreshCw className="w-3 h-3" /> atualizar
        </Button>
      </div>

      <div role="alert" className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs">
        <AlertTriangle className="w-4 h-4 mt-px shrink-0 text-warning" />
        <p>
          <strong>É necessário estar com a conta master (principal) do Mercado Livre.</strong>{" "}
          Contas de colaborador não conseguem autorizar a integração. Antes de conectar, saia de outras contas no Mercado Livre.
        </p>
      </div>


      {carregando ? (
        <div className="flex items-center gap-2 py-6 justify-center text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> carregando contas…
        </div>
      ) : !contas.length ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Você ainda não conectou sua conta. Conecte para importar vendas e custos diretamente do Mercado Livre.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input type="search" aria-label="Buscar loja integrada" placeholder="Buscar por apelido, ID ou situação" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-9 w-full sm:w-80 text-sm" />
            <span className="text-xs text-muted-foreground tabular-nums">{filtradas.length} de {contas.length} lojas</span>
          </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm border-collapse">
            <thead className="text-muted-foreground bg-muted/40">
              <tr className="border-b border-border [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium [&>th]:border-r [&>th]:border-border [&>th:last-child]:border-r-0">
                <th className="text-left">Apelido</th>
                <th className="text-left">ID Mercado Livre</th>
                <th className="text-left">Loja vinculada</th>
                <th className="text-left">Situação</th>
                <th className="text-right">Autorização expira em</th>
                <th className="text-right">Histórico</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => {
                const s = rotuloStatus(c);
                return (
                  <tr key={c.account_id} className="border-b border-border last:border-b-0 even:bg-muted/20 hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2 [&>td]:border-r [&>td]:border-border [&>td:last-child]:border-r-0">
                    <td className="font-medium">{c.nickname || "—"}</td>
                    <td className="tabular-nums">{c.ml_user_id}</td>
                    <td className="text-muted-foreground">{c.site_id || "—"}</td>
                    <td>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${s.cls}`}>{s.txt}</span>
                    </td>
                    <td className="text-right tabular-nums">{expiraEm(c.token_expira_em)}</td>
                    <td className="text-right tabular-nums">
                      {c.jobs_total ? `${c.jobs_concluidos}/${c.jobs_total}` : "—"}
                    </td>
                    <td className="text-right">
                      {s.txt === "Reautorizar" && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]"
                          onClick={conectar} disabled={conectando}>
                          Reconectar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtradas.length && <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma loja encontrada para “{busca}”.</p>}
        </div>
        </div>
      )}

      <Button className="w-full gap-2" onClick={conectar} disabled={conectando}>
        {conectando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        Conectar conta Mercado Livre
      </Button>
      <div className="rounded-lg border border-border/40 p-3 space-y-2">
        <p className="text-xs font-medium">Convite Peregrinus para o lojista</p>
        <div className="flex gap-2">
          <Input value={rotulo} onChange={(e) => setRotulo(e.target.value)} placeholder="Nome da loja (aparece no convite)" className="h-8 text-xs" />
          <Button size="sm" variant="secondary" className="gap-1" onClick={gerarConvite} disabled={gerando}>
            {gerando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Gerar convite
          </Button>
        </div>
        {convite && (
          <div className="space-y-2">
            <Input readOnly value={convite} className="h-8 text-[11px]" onFocus={(e) => e.target.select()} />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="gap-1 text-[11px]" onClick={() => { navigator.clipboard.writeText(convite); toast.success("Link copiado."); }}>
                <Copy className="w-3 h-3" /> Copiar
              </Button>
              <Button size="sm" variant="ghost" className="text-[11px]" asChild>
                <a href={`https://wa.me/?text=${textoWhats(convite)}`} target="_blank" rel="noreferrer">Enviar por WhatsApp</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MercadoLivrePanel;
