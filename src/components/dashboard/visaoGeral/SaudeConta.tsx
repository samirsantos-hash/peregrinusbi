import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { num, pctFracao } from "@/lib/format";

type Reputacao = {
  nivel?: string | null;
  medalha?: string | null;
  vendas_concluidas_60d?: number | null;
  reclamacoes?: number | null;
  atrasos?: number | null;
  cancelamentos?: number | null;
};

/** Escala oficial do termômetro ML, do pior para o melhor. */
const NIVEIS = [
  { id: "1_red", rotulo: "Vermelha", cor: "bg-rose-500", brilho: "shadow-[0_0_12px_rgba(244,63,94,0.55)]" },
  { id: "2_orange", rotulo: "Laranja", cor: "bg-orange-400", brilho: "shadow-[0_0_12px_rgba(251,146,60,0.55)]" },
  { id: "3_yellow", rotulo: "Amarela", cor: "bg-amber-400", brilho: "shadow-[0_0_12px_rgba(251,191,36,0.55)]" },
  { id: "4_light_green", rotulo: "Verde-clara", cor: "bg-lime-400", brilho: "shadow-[0_0_12px_rgba(163,230,53,0.55)]" },
  { id: "5_green", rotulo: "Verde", cor: "bg-emerald-400", brilho: "shadow-[0_0_12px_rgba(52,211,153,0.6)]" },
] as const;

const MEDALHA: Record<string, string> = { platinum: "MercadoLíder Platinum", gold: "MercadoLíder Gold", silver: "MercadoLíder" };

/** Limites oficiais (fração): atenção / crítico. */
const LIMITES = {
  reclamacoes: { atencao: 0.02, critico: 0.05, meta: "< 2%" },
  atrasos: { atencao: 0.05, critico: 0.1, meta: "< 5%" },
  cancelamentos: { atencao: 0.02, critico: 0.05, meta: "< 2%" },
} as const;

function corTaxa(v: number | null | undefined, lim: { atencao: number; critico: number }) {
  if (v == null) return "text-slate-300";
  if (v >= lim.critico) return "text-rose-400";
  if (v >= lim.atencao) return "text-amber-400";
  return "text-emerald-400";
}

function indiceNivel(nivel?: string | null) {
  if (!nivel) return -1;
  const n = nivel.toLowerCase();
  const i = NIVEIS.findIndex((x) => x.id === n);
  if (i >= 0) return i;
  // Aceita variantes sem prefixo numérico (ex.: "green", "light_green")
  return NIVEIS.findIndex((x) => x.id.replace(/^\d_/, "") === n);
}

function useReputacaoMl(custId?: string) {
  return useQuery({
    queryKey: ["ml-sync-tema", custId, "reputacao"],
    enabled: !!custId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_sync_tema")
        .select("dados, erro, atualizado_em")
        .eq("cust_id", custId ?? "")
        .eq("tema", "reputacao")
        .maybeSingle();
      if (error) throw error;
      return data as { dados: Reputacao | null; erro: string | null; atualizado_em: string } | null;
    },
  });
}

function Termometro({ indice }: { indice: number }) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={indice >= 0 ? `Termômetro: ${NIVEIS[indice].rotulo}` : "Termômetro sem dado"}>
      {NIVEIS.map((n, i) => {
        const ativo = i === indice;
        return (
          <span
            key={n.id}
            className={cn(
              "h-2 flex-1 rounded-full transition-all duration-200",
              ativo ? cn(n.cor, n.brilho, "ring-1 ring-white/30") : "bg-white/10",
            )}
          />
        );
      })}
    </div>
  );
}

function MiniColuna({ rotulo, valor, meta, cor }: { rotulo: string; valor: string; meta: string; cor: string }) {
  return (
    <div className="min-w-0 px-2.5 first:pl-0 last:pr-0 sm:px-3">
      <p className="hyphens-auto text-[10px] font-medium uppercase leading-snug tracking-wide text-slate-400 [overflow-wrap:anywhere] sm:text-[11px] sm:tracking-wider" title={rotulo}>
        {rotulo}
      </p>
      <p className={cn("mt-1 truncate text-base font-semibold tabular-nums tracking-tight sm:text-lg", cor)} title={valor}>
        {valor}
      </p>
      <p className="truncate text-[11px] text-slate-400">meta {meta}</p>
    </div>
  );
}

/**
 * Saúde da conta: termômetro ML + 3 taxas oficiais (reclamações, atrasos,
 * cancelamentos) em mini-colunas com divisores translúcidos.
 * Fonte: `ml_sync_tema.reputacao` (conta conectada). Altura preenche a coluna.
 */
export default function SaudeConta({ custId, className }: { custId?: string; className?: string }) {
  const q = useReputacaoMl(custId);
  const r = q.data?.dados ?? null;
  const idx = indiceNivel(r?.nivel);
  const nivelTxt = idx >= 0 ? NIVEIS[idx].rotulo : "Sem dado";
  const medalha = r?.medalha ? MEDALHA[r.medalha.toLowerCase()] ?? r.medalha : null;
  const atualizado = q.data?.atualizado_em
    ? new Date(q.data.atualizado_em).toLocaleDateString("pt-BR")
    : null;

  return (
    <section
      aria-label="Saúde da conta"
      className={cn(
        "noite-vidro flex h-full min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5",
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl",
        "transition-all duration-200 hover:border-white/15",
        className,
      )}
    >
      <header className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={1.75} aria-hidden />
        <h3 className="truncate text-xs font-medium uppercase tracking-wider text-slate-400">Saúde da conta</h3>
      </header>

      {q.isLoading ? (
        <div className="mt-4 flex-1 animate-pulse space-y-3" aria-hidden>
          <div className="h-6 w-2/3 rounded bg-white/10" />
          <div className="h-2 rounded-full bg-white/10" />
          <div className="h-12 rounded bg-white/5" />
        </div>
      ) : !r ? (
        <div className="mt-4 flex flex-1 flex-col justify-center gap-2">
          <p className="text-sm text-slate-300">Reputação ainda não sincronizada.</p>
          <p className="text-xs text-slate-400">
            {q.data?.erro ? "O Mercado Livre não devolveu reputação na última atualização." : "Conecte a loja ou atualize os dados em Reputação."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight text-white" title={[nivelTxt, medalha].filter(Boolean).join(" · ")}>
              {nivelTxt}
              {medalha ? <span className="font-medium text-slate-300"> · {medalha}</span> : null}
            </p>
          </div>
          <div className="mt-3">
            <Termometro indice={idx} />
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-white/5">
            <MiniColuna
              rotulo="Reclamações"
              valor={pctFracao(r.reclamacoes, 2)}
              meta={LIMITES.reclamacoes.meta}
              cor={corTaxa(r.reclamacoes, LIMITES.reclamacoes)}
            />
            <MiniColuna rotulo="Atrasos" valor={pctFracao(r.atrasos, 2)} meta={LIMITES.atrasos.meta} cor={corTaxa(r.atrasos, LIMITES.atrasos)} />
            <MiniColuna
              rotulo="Cancelamentos"
              valor={pctFracao(r.cancelamentos, 2)}
              meta={LIMITES.cancelamentos.meta}
              cor={corTaxa(r.cancelamentos, LIMITES.cancelamentos)}
            />
          </div>

          <footer className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-3 text-xs text-slate-400">
            <span className="tabular-nums">Janela oficial · 60 dias</span>
            {r.vendas_concluidas_60d != null ? <span className="tabular-nums">{num(r.vendas_concluidas_60d)} vendas concluídas</span> : null}
            {atualizado ? <span className="tabular-nums">Atualizado {atualizado}</span> : null}
          </footer>
        </>
      )}
    </section>
  );
}
