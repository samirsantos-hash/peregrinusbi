import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, Link2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { norm } from "@/lib/multilojas/parse";
import type { LojaOficial } from "@/hooks/multilojas/usePerfilMultilojas";

interface Conta { cust_id: string; nickname: string | null }
interface Usuario { user_id: string; email: string }

/** Similaridade simples entre a chave técnica da loja e o nickname da conta. */
function score(chave: string, nick: string): number {
  const a = norm(chave).replace(/\s/g, "");
  const b = norm(nick).replace(/\s/g, "");
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  const comum = [...new Set(a)].filter((c) => b.includes(c)).length;
  return comum / Math.max(a.length, b.length) * 0.5;
}

const CadastroLojas = () => {
  const [lojas, setLojas] = useState<LojaOficial[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: ls }, { data: cs }, { data: us }] = await Promise.all([
      supabase.from("multilojas_loja").select("*").order("nome_publico"),
      supabase.from("multilojas_conta").select("cust_id, nickname").order("nickname"),
      supabase.from("profiles").select("user_id, email").order("email"),
    ]);
    setLojas((ls || []) as LojaOficial[]);
    setContas((cs || []) as Conta[]);
    setUsuarios((us || []) as Usuario[]);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  /** Importa as contas de vendedor conhecidas do Peregrinus para o catálogo do módulo. */
  const sincronizarContas = async () => {
    setErro(null); setMsg(null);
    const { data: sellers, error } = await supabase.from("sellers").select("cust_id, nickname, cluster_seller, sub_cluster_seller, cus_state");
    if (error) { setErro(error.message); return; }
    const linhas = (sellers || []).map((s) => ({
      cust_id: String(s.cust_id), nickname: s.nickname,
      cluster: s.cluster_seller, sub_cluster: s.sub_cluster_seller, uf: s.cus_state,
      atualizado_em: new Date().toISOString(),
    }));
    const { error: e2 } = await supabase.from("multilojas_conta").upsert(linhas, { onConflict: "cust_id" });
    if (e2) { setErro(e2.message); return; }
    setMsg(`${linhas.length} contas de vendedor sincronizadas.`);
    carregar();
  };

  const sugestoes = useMemo(() => {
    const m = new Map<string, { conta: Conta; s: number } | null>();
    lojas.forEach((l) => {
      let melhor: { conta: Conta; s: number } | null = null;
      contas.forEach((c) => {
        const s = score(l.chave_tecnica, c.nickname || c.cust_id);
        if (s > 0.55 && (!melhor || s > melhor.s)) melhor = { conta: c, s };
      });
      m.set(l.id, melhor);
    });
    return m;
  }, [lojas, contas]);

  const salvar = async (l: LojaOficial, patch: Partial<LojaOficial>, vinculo?: string) => {
    setSalvando(l.id); setErro(null); setMsg(null);
    const { error } = await supabase.from("multilojas_loja")
      .update({ ...patch, ...(vinculo ? { vinculo } : {}) })
      .eq("id", l.id);
    setSalvando(null);
    if (error) { setErro(error.message); return; }
    setLojas((s) => s.map((x) => (x.id === l.id ? { ...x, ...patch, ...(vinculo ? { vinculo } : {}) } : x)));
    setMsg("Cadastro atualizado.");
  };

  if (loading) return <div className="py-10 text-center text-xs text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2 text-[11px]" onClick={sincronizarContas}>
          <Link2 className="w-3.5 h-3.5" /> Sincronizar contas de vendedor
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {lojas.length} loja(s) · {contas.length} conta(s) catalogada(s)
        </span>
      </div>

      {erro && <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive"><AlertTriangle className="w-3.5 h-3.5" />{erro}</div>}
      {msg && <div className="flex gap-2 rounded-lg border border-emerald/40 bg-emerald/10 p-2 text-[11px] text-emerald"><CheckCircle2 className="w-3.5 h-3.5" />{msg}</div>}

      {!lojas.length ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Nenhuma loja cadastrada — publique uma carga de Vendas na Central de dados para que as lojas apareçam aqui.
        </p>
      ) : (
        <div className="space-y-2">
          {lojas.map((l) => {
            const sug = sugestoes.get(l.id);
            return (
              <div key={l.id} className="rounded-xl border border-border/50 bg-card/60 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">chave técnica</span>
                  <span className="font-mono text-[11px]">{l.chave_tecnica}</span>
                  {l.vinculo && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border/60 text-muted-foreground">vínculo {l.vinculo}</span>}
                </div>

                <div className="grid gap-2 md:grid-cols-4">
                  <Input defaultValue={l.nome_publico} placeholder="Nome público" className="h-8 text-xs"
                    onBlur={(e) => e.target.value !== l.nome_publico && salvar(l, { nome_publico: e.target.value })} />
                  <Input defaultValue={l.marca || ""} placeholder="Marca" className="h-8 text-xs"
                    onBlur={(e) => e.target.value !== (l.marca || "") && salvar(l, { marca: e.target.value })} />
                  <Input defaultValue={l.segmento || ""} placeholder="Segmento" className="h-8 text-xs"
                    onBlur={(e) => e.target.value !== (l.segmento || "") && salvar(l, { segmento: e.target.value })} />
                  <select value={l.conta_id || ""} className="h-8 rounded-md border border-border/60 bg-card/60 px-2 text-xs"
                    onChange={(e) => salvar(l, { conta_id: e.target.value || null }, "manual")}>
                    <option value="">Conta de vendedor…</option>
                    {contas.map((c) => <option key={c.cust_id} value={c.cust_id}>{c.nickname || c.cust_id} · {c.cust_id}</option>)}
                  </select>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <select value={l.gestor_user_id || ""} className="h-8 rounded-md border border-border/60 bg-card/60 px-2 text-xs"
                    onChange={(e) => salvar(l, { gestor_user_id: e.target.value || null })}>
                    <option value="">Gestor responsável…</option>
                    {usuarios.map((u) => <option key={u.user_id} value={u.user_id}>{u.email}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <input type="checkbox" checked={l.ativo} onChange={(e) => salvar(l, { ativo: e.target.checked })} />
                    loja ativa
                  </label>
                </div>

                {!l.conta_id && sug && (
                  <button className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    onClick={() => salvar(l, { conta_id: sug.conta.cust_id, vinculo_score: sug.s }, "automatico")}>
                    <Link2 className="w-3 h-3" />
                    vincular automaticamente a {sug.conta.nickname || sug.conta.cust_id} (confiança {(sug.s * 100).toFixed(0)}%)
                  </button>
                )}
                {!l.conta_id && !sug && (
                  <p className="text-[11px] text-warning">
                    Sem vínculo de conta — os indicadores de marketplace ficam indisponíveis para esta loja.
                  </p>
                )}
                {salvando === l.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground flex items-start gap-2">
        <Save className="w-3.5 h-3.5 mt-px shrink-0" />
        O nome público substitui o nickname técnico em toda a interface. A chave técnica nunca é exibida fora deste cadastro.
      </p>
    </div>
  );
};

export default CadastroLojas;
