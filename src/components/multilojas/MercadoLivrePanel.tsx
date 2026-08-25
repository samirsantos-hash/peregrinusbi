import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase.rpc("ml_contas_status");
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

      {carregando ? (
        <div className="flex items-center gap-2 py-6 justify-center text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> carregando contas…
        </div>
      ) : !contas.length ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Nenhuma conta conectada. Conecte para importar vendas e custos diretamente do Mercado Livre.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="text-left py-1.5">Apelido</th>
                <th className="text-left">ID Mercado Livre</th>
                <th className="text-left">Loja vinculada</th>
                <th className="text-left">Situação</th>
                <th className="text-right">Autorização expira em</th>
                <th className="text-right">Histórico</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => {
                const s = rotuloStatus(c);
                return (
                  <tr key={c.account_id} className="border-b border-border/20">
                    <td className="py-1.5">{c.nickname || "—"}</td>
                    <td className="tabular-nums">{c.ml_user_id}</td>
                    <td className="text-muted-foreground">{c.site_id || "—"}</td>
                    <td>
                      <span className={`rounded-full border px-2 py-0.5 ${s.cls}`}>{s.txt}</span>
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
        </div>
      )}

      <Button className="w-full gap-2" onClick={conectar} disabled={conectando}>
        {conectando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        Conectar conta Mercado Livre
      </Button>
      <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
        Faça login no Mercado Livre com a conta principal da loja. Contas de colaborador não conseguem autorizar.
      </p>
    </div>
  );
};

export default MercadoLivrePanel;
