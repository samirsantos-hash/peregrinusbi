import { Award, ShieldCheck, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TIER_THRESHOLDS } from "@/hooks/useClassificacaoLojas";
import { perfilLegivel, tierPorMedalha } from "@/lib/perfilReputacao";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Seller = { nickname: string; custId?: string; cluster?: string; subCluster?: string };
type Reputacao = { nivel?: string | null; medalha?: string | null };

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
  const nomeMedalha = tier === 1 ? "MercadoLíder Platinum" : tier === 2 ? "MercadoLíder Gold" : tier === 3 ? "MercadoLíder Silver" : r ? "Sem medalha informada" : "Medalha não confirmada";
  const nivel = r?.nivel ?? repLevel?.replace(/_(platinum|gold|silver)$/i, "");
  const nivelNome: Record<string, string> = { "5_green": "Verde", green: "Verde", "4_light_green": "Verde-claro", light_green: "Verde-claro", "3_yellow": "Amarela", yellow: "Amarela", "2_orange": "Laranja", orange: "Laranja", "1_red": "Vermelha", red: "Vermelha" };
  const perfil = perfilLegivel(seller.cluster || seller.subCluster);
  return <section className="space-y-6 border-b border-border pb-6" aria-label="Identidade e reputação da loja">
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
      <div className={cn("w-20 h-24 rounded-lg border border-border bg-muted/40 flex items-center justify-center", tier === 2 ? "text-medal-gold" : "text-medal-silver")}><Award className="w-14 h-14" strokeWidth={1.3} aria-hidden /></div>
      <div className="min-w-0 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Mercado Livre · {seller.nickname}</p>
        <h2 className="text-2xl font-semibold break-words">{nomeMedalha}</h2>
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div><dt className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Reputação</dt><dd className={nivel?.includes("green") ? "text-primary font-semibold" : "text-foreground font-semibold"}>{nivelNome[nivel ?? ""] ?? "Não informada"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Tier associado à medalha</dt><dd className="font-semibold">{tier ? `Tier ${tier}` : "Não confirmado"}</dd></div>
          <div><dt className="text-xs text-muted-foreground flex items-center gap-1"><UserRound className="w-3 h-3" />Perfil da conta</dt><dd className="font-semibold">{perfil}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">{r ? `Medalha e reputação da API · ${consulta.data?.atualizado_em ? new Date(consulta.data.atualizado_em).toLocaleDateString("pt-BR") : ""}` : consulta.isError ? "Leitura da reputação indisponível." : "Reputação do histórico importado; não é confirmação atual da API."} · Perfil do cadastro importado.</p>
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