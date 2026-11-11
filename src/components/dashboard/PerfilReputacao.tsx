import { ShieldCheck, Truck, UserRound } from "lucide-react";
import { MedalhaML } from "@/components/ds/MedalhaML";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TIER_THRESHOLDS } from "@/hooks/useClassificacaoLojas";
import { metaEnvios, perfilLegivel, tierPorMedalha } from "@/lib/perfilReputacao";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Seller = { nickname: string; custId?: string; cluster?: string; subCluster?: string };
type Reputacao = { nivel?: string | null; medalha?: string | null; atrasos?: number | null; vendas_concluidas_60d?: number | null };

export default function PerfilReputacao({ seller, repLevel, requisitos = false }: { seller?: Seller; repLevel?: string; requisitos?: boolean }) {
  const consulta = useQuery({ queryKey: ["ml-sync-tema", seller?.custId, "reputacao"], enabled: !!seller?.custId, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("ml_sync_tema").select("dados, erro, atualizado_em").eq("cust_id", seller?.custId ?? "").eq("tema", "reputacao").maybeSingle();
      if (error) throw error;
      return data as { dados: Reputacao | null; erro: string | null; atualizado_em: string } | null;
    } });
  if (!seller) return <p className="text-sm text-muted-foreground">Selecione uma loja para ver sua medalha, perfil e requisitos.</p>;
  if (consulta.isLoading) return <Skeleton className="h-40 w-full" />;
  const r = consulta.data?.dados;
  const medalha = r ? r.medalha : consulta.isError ? null : repLevel;
  const tier = tierPorMedalha(medalha);
  const nomeMedalha = tier === 1 ? "MercadoLíder Platinum" : tier === 2 ? "MercadoLíder Gold" : tier === 3 ? "MercadoLíder" : r ? "Sem medalha informada" : "Medalha não confirmada";
  const nivel = r?.nivel ?? repLevel?.replace(/_(platinum|gold|silver)$/i, "");
  const nivelNome: Record<string, string> = { "5_green": "Verde", green: "Verde", "4_light_green": "Verde-claro", light_green: "Verde-claro", "3_yellow": "Amarela", yellow: "Amarela", "2_orange": "Laranja", orange: "Laranja", "1_red": "Vermelha", red: "Vermelha" };
  const envios = metaEnvios(r?.atrasos, r?.vendas_concluidas_60d);
  const faixas = ["1_red","2_orange","3_yellow","4_light_green","5_green"];
  const corFaixa = ["bg-destructive","bg-destructive/60","bg-medal-gold","bg-primary/60","bg-primary"];
  const idxNivel = nivel ? faixas.findIndex(f => f === nivel || f.endsWith(nivel)) : -1;
  const perfil = perfilLegivel(seller.cluster || seller.subCluster);
  return <section className="space-y-6 border-b border-border pb-6" aria-label="Identidade e reputação da loja">
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
      <div className="w-24 h-28 flex items-center justify-center"><MedalhaML tier={tier as 1|2|3|null} className="w-20 h-24 drop-shadow" /></div>
      <div className="min-w-0 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Mercado Livre · {seller.nickname}</p>
        <h2 className="text-2xl font-semibold break-words">{nomeMedalha}</h2>
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div><dt className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Reputação</dt><dd className={nivel?.includes("green") ? "text-primary font-semibold" : "text-foreground font-semibold"}>{nivelNome[nivel ?? ""] ?? "Não informada"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Tier associado à medalha</dt><dd className="font-semibold">{tier ? `Tier ${tier}` : "Não confirmado"}</dd></div>
          <div><dt className="text-xs text-muted-foreground flex items-center gap-1"><UserRound className="w-3 h-3" />Perfil da conta</dt><dd className="font-semibold">{perfil}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">{r ? `Medalha e reputação na última atualização · ${consulta.data?.atualizado_em ? new Date(consulta.data.atualizado_em).toLocaleDateString("pt-BR") : ""}` : consulta.isError ? "Leitura da reputação indisponível." : "Reputação do histórico; não confirma o estado atual."} · Perfil conforme o cadastro disponível.</p>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border p-5 space-y-3 liquid-card">
        <p className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />Termômetro de reputação</p>
        <p className="text-3xl font-semibold">{nivelNome[nivel ?? ""] ?? "Não informada"}</p>
        <div className="grid grid-cols-5 gap-1" role="img" aria-label={`Reputação ${nivelNome[nivel ?? ""] ?? "não informada"}`}>
          {faixas.map((f, i) => <div key={f} className={cn("h-3 rounded-full", corFaixa[i], i === idxNivel ? "ring-2 ring-foreground scale-y-150" : "opacity-30")} />)}
        </div>
        <p className="text-xs text-muted-foreground">Da faixa vermelha (esquerda) à verde (direita).</p>
      </div>
      <div className="rounded-xl border border-border p-5 space-y-3 liquid-card">
        <p className="text-sm font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-primary" />Meta de envios no prazo · {num(envios?.meta ?? 97)}%</p>
        {envios ? <>
          <p className={cn("text-3xl font-semibold tabular-nums", envios.atingida ? "text-primary" : "text-destructive")}>{num(envios.noPrazo, 1)}%</p>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full", envios.atingida ? "bg-primary" : "bg-destructive")} style={{ width: `${Math.min(100, envios.noPrazo)}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${envios.meta}%` }} aria-hidden />
          </div>
          <p className="text-sm">{envios.atingida ? "Meta atingida" : `Faltam ${num(envios.meta - envios.noPrazo, 1)} p.p. para a meta`}
            {envios.folga != null && <> · {envios.folga >= 0 ? `cabem mais ${num(envios.folga)} atrasos` : `${num(-envios.folga)} atrasos acima do limite`} ({num(envios.atrasosAtuais ?? 0)} de {num(envios.atrasosPermitidos ?? 0)} permitidos em {num(r?.vendas_concluidas_60d ?? 0)} vendas)</>}</p>
        </> : <p className="text-sm text-muted-foreground">Sem taxa de atraso disponível para calcular a meta.</p>}
      </div>
    </div>
    {requisitos && <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-border py-4">
        <div><p className="text-xs text-muted-foreground">Maturação</p><p className="font-medium">{perfil}</p></div>
        <div><p className="text-xs text-muted-foreground">Profissionalização / segmentação</p><p className="font-medium">{perfilLegivel(seller.subCluster)}</p></div>
        <div><p className="text-xs text-muted-foreground">Classificação</p><p className="font-medium">{tier ? `Tier ${tier} associado à medalha` : "Sem tier confirmado"}</p></div>
      </div>
      <div className="space-y-3">
        <h3 className="text-base font-semibold">Requisitos por tier</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm [&_th]:p-3 [&_td]:p-3 tabular-nums">
          <thead className="text-left text-muted-foreground bg-muted/30"><tr><th>Critério de referência</th>{([1,2,3] as const).map(t => <th key={t} className={tier === t ? "text-primary" : ""}>Tier {t}{tier === t && <span className="block text-xs font-normal">Medalha da loja</span>}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            <tr><th className="text-left font-medium">Medalha</th><td>Platinum</td><td>Gold</td><td>Silver</td></tr>
            <tr><th className="text-left font-medium">Investimento Ads / faturamento</th>{([1,2,3] as const).map(t => <td key={t}>≥ {num(TIER_THRESHOLDS[t].sowPads, 2)}%</td>)}</tr>
            <tr><th className="text-left font-medium">Falta de estoque</th>{([1,2,3] as const).map(t => <td key={t}>≤ {num(TIER_THRESHOLDS[t].oos)}%</td>)}</tr>
            <tr><th className="text-left font-medium">Bad Seller · referência</th>{([1,2,3] as const).map(t => <td key={t}>≤ {num(TIER_THRESHOLDS[t].bs)}%</td>)}</tr>
          </tbody>
        </table></div>
        <p className="text-xs text-muted-foreground">Régua de referência já utilizada no painel. Não comprova elegibilidade completa nem substitui a classificação do Mercado Livre. Bad Seller não é a taxa de cancelamento. Meta Peregrinus de Ads: 3%, separada dos tiers.</p>
      </div>
    </>}
  </section>;
}