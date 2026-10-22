import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ds";
import { num } from "@/lib/format";
import { chamarFuncaoMl, dataHoraBr } from "@/lib/mlFuncoes";
import { compararSemanas, type Linha, type Termo } from "@/lib/tendencias";

/** Semanas de histórico lidas para contar "semanas no ranking". */
const SEMANAS_LIDAS = 12;
const BRASIL = "MLB";
const GRUPO = { crescimento: "Maior crescimento", desejadas: "Mais desejados", populares: "Mais populares" };

type Escopo = { escopo: string; nome: string | null; anuncios: number; vendidos: number };

const diaMes = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

/** Termos em alta guardados semana a semana: o que entrou, subiu, caiu ou saiu, e quantos anúncios da conta têm o termo. */
export function AbaTendencias({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const [escopo, setEscopo] = useState(BRASIL);
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => { setEscopo(BRASIL); }, [accountId]);

  const escopos = useQuery({
    queryKey: ["ml-tendencias-escopos", accountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("ml_tendencias_escopos", { p_account_id: accountId });
      if (error) throw error;
      return (data ?? []) as Escopo[];
    },
  });

  const historico = useQuery({
    queryKey: ["ml-tendencias", escopo],
    queryFn: async () => {
      const desde = new Date(Date.now() - SEMANAS_LIDAS * 7 * 86400_000).toISOString().slice(0, 10);
      const [termos, coleta] = await Promise.all([
        (supabase as any).from("ml_trends_weekly").select("semana, posicao, palavra, url, grupo")
          .eq("escopo", escopo).gte("semana", desde).order("semana", { ascending: false }).order("posicao").limit(SEMANAS_LIDAS * 50),
        (supabase as any).from("ml_trends_coletas").select("semana, termos, coletado_em")
          .eq("escopo", escopo).order("semana", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (termos.error) throw termos.error;
      if (coleta.error) throw coleta.error;
      return { termos: (termos.data ?? []) as Termo[], coleta: coleta.data as { semana: string; termos: number; coletado_em: string } | null };
    },
  });

  const comparacao = useMemo(() => compararSemanas(historico.data?.termos ?? []), [historico.data]);
  const palavras = comparacao.linhas.map((l) => l.palavra);

  const cobertura = useQuery({
    queryKey: ["ml-tendencias-cobertura", accountId, escopo, comparacao.semana],
    enabled: palavras.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("ml_tendencias_cobertura", { p_account_id: accountId, p_termos: palavras });
      if (error) throw error;
      return new Map(((data ?? []) as { termo: string; anuncios: number }[]).map((r) => [r.termo, r.anuncios]));
    },
  });

  const atualizar = async () => {
    setAtualizando(true);
    try {
      const r = await chamarFuncaoMl<{ coletados: number; ja_coletados: number; pendentes: number; erros: string[] }>("ml-trends-sync", { account_id: accountId });
      if (r.erros.length) toast.error(r.erros[0]);
      else if (r.pendentes) toast.info("Parte das categorias ficou para a próxima coleta automática.");
      else if (r.coletados) toast.success("Termos em alta desta semana guardados.");
      else toast.info("Os termos desta semana já estavam guardados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar agora.");
    } finally {
      setAtualizando(false);
      qc.invalidateQueries({ queryKey: ["ml-tendencias"] });
      qc.invalidateQueries({ queryKey: ["ml-tendencias-escopos", accountId] });
    }
  };

  const coleta = historico.data?.coleta;
  const nomeEscopo = escopo === BRASIL ? "Mercado Livre Brasil" : escopos.data?.find((e) => e.escopo === escopo)?.nome ?? escopo;
  const semAnuncios = comparacao.linhas.filter((l) => cobertura.data?.get(l.palavra) === 0).length;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={escopo} onValueChange={setEscopo}>
          <SelectTrigger className="w-80 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={BRASIL}>Mercado Livre Brasil</SelectItem>
            {escopos.data?.map((e) => (
              <SelectItem key={e.escopo} value={e.escopo}>{e.nome ?? e.escopo} · {num(e.anuncios)} anúncio(s) seu(s)</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {coleta ? `Fonte: Mercado Livre · semana de ${diaMes(coleta.semana)} · coletado em ${dataHoraBr(coleta.coletado_em)}` : "Fonte: Mercado Livre"}
          </span>
          <Button size="sm" variant="outline" onClick={atualizar} disabled={atualizando}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${atualizando ? "animate-spin" : ""}`} /> {atualizando ? "Atualizando…" : "Atualizar"}
          </Button>
        </div>
      </div>
      {escopos.data && escopos.data.length === 0 && (
        <p className="text-xs text-muted-foreground">As categorias dos seus anúncios aparecem aqui depois da primeira coleta (Atualizar).</p>
      )}

      {historico.isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>}
      {historico.isError && <EmptyState falta="Não foi possível carregar os termos em alta." acao="Recarregue a página." />}
      {historico.data && !comparacao.semana && (
        <EmptyState
          falta={coleta ? `O Mercado Livre não devolveu termos em alta para ${nomeEscopo} nesta semana.` : `Ainda não há coleta de termos em alta para ${nomeEscopo}.`}
          acao={coleta ? "Escolha outra categoria." : "Use Atualizar para guardar a semana atual."}
        />
      )}

      {comparacao.semana && (
        <>
          <p className="text-xs text-muted-foreground">
            {comparacao.anterior
              ? `Semana de ${diaMes(comparacao.semana)} comparada com a de ${diaMes(comparacao.anterior)}.`
              : "Primeira semana guardada: a comparação começa na próxima coleta."}
            {cobertura.data && ` ${semAnuncios} de ${comparacao.linhas.length} termos não aparecem no título de nenhum anúncio ativo da conta.`}
          </p>
          <div className="overflow-x-auto border border-border [border-width:0.5px]">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-muted-foreground text-left">
                <tr className="border-b border-border">
                  <th className="py-2 px-2 w-10">#</th>
                  <th className="pr-2">Termo</th>
                  <th className="pr-2">Grupo</th>
                  <th className="pr-2">Na semana</th>
                  <th className="pr-2 text-right">Semanas no ranking</th>
                  <th className="pr-2 text-right">Seus anúncios com o termo</th>
                </tr>
              </thead>
              <tbody>
                {comparacao.linhas.map((l) => {
                  const n = cobertura.data?.get(l.palavra);
                  return (
                    <tr key={l.posicao} className="border-t border-border">
                      <td className="py-1.5 px-2 text-muted-foreground">{l.posicao}</td>
                      <td className="pr-2">
                        {l.url ? <a href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{l.palavra}</a> : l.palavra}
                      </td>
                      <td className="pr-2">
                        {GRUPO[l.grupo]}
                        {l.grupoAntes && l.grupoAntes !== l.grupo && <span className="block text-muted-foreground">antes: {GRUPO[l.grupoAntes]}</span>}
                      </td>
                      <td className="pr-2"><Mov linha={l} /></td>
                      <td className="pr-2 text-right">{l.semanas}</td>
                      <td className={`pr-2 text-right ${n === 0 ? "text-ec-ambar" : ""}`}>{n == null ? "…" : n === 0 ? "nenhum" : num(n)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {comparacao.sairam.length > 0 && (
            <section className="space-y-1">
              <h3 className="font-medium">Saíram do ranking</h3>
              <p className="text-xs">
                {comparacao.sairam.map((t) => `${t.palavra} (era ${t.posicao}º)`).join(" · ")}
              </p>
            </section>
          )}
          <p className="text-xs text-muted-foreground">
            Ranking semanal do Mercado Livre: 10 de maior crescimento, 20 mais desejados e 20 mais populares, sem volume de busca.
            O histórico existe a partir da primeira coleta deste painel. "Seus anúncios" conta anúncios ativos com todas as palavras do termo no título, sem acento.
          </p>
        </>
      )}
    </div>
  );
}

function Mov({ linha }: { linha: Linha }) {
  const m = linha.movimento;
  if (!m) return <span className="text-muted-foreground">—</span>;
  if (m.tipo === "nova") return <span className="text-primary font-medium">Nova</span>;
  if (m.tipo === "igual") return <span className="text-muted-foreground">Mesma posição</span>;
  return m.tipo === "subiu"
    ? <span className="inline-flex items-center gap-0.5 text-ec-verde-txt"><ArrowUp className="h-3 w-3" />{m.passos} (era {m.de}º)</span>
    : <span className="inline-flex items-center gap-0.5 text-destructive"><ArrowDown className="h-3 w-3" />{m.passos} (era {m.de}º)</span>;
}
