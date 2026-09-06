import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Rocket, Star, Target, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SellerWithKpi } from "@/hooks/usePortfolios";

function safePct(num: number, den: number): number {
  if (!den || den === 0) return 0;
  return (num / den) * 100;
}

interface Props {
  sellers: SellerWithKpi[];
}

export default function TrophyCards({ sellers }: Props) {
  if (!sellers.length) return null;

  // 🏆 Campeão de Logística: max TSI_FULL (corrigido - apenas Full real)
  const logisticsChamp = [...sellers].sort((a, b) => b.fTsi - a.fTsi)[0];
  const logisticsPct = safePct(logisticsChamp.fTsi, logisticsChamp.tsi);

  // 🚀 Maior Tração
  const tractionChamp = [...sellers].sort((a, b) => safePct(b.tgmvLc, b.fTgmvLc) - safePct(a.tgmvLc, a.fTgmvLc))[0];
  const tractionPct = safePct(tractionChamp.tgmvLc, tractionChamp.fTgmvLc);

  // ⭐ Excelência em Qualidade
  const qualitySellers = sellers.filter((s) =>
    s.repCurrentLevel?.toLowerCase().includes("platinum") ||
    s.repCurrentLevel?.toLowerCase().includes("titanium") ||
    s.repCurrentLevel?.toLowerCase().includes("gold")
  );
  const qualityChamp = (qualitySellers.length > 0 ? qualitySellers : sellers)
    .sort((a, b) => b.scoreQualidadeFinal - a.scoreQualidadeFinal)[0];

  // 🎯 Mestre do Ads
  const adsRatio3 = [...sellers]
    .filter((s) => s.tgmvLc > 0)
    .sort((a, b) => {
      const ratioA = Math.abs(safePct(a.invPads, a.tgmvLc) - 3);
      const ratioB = Math.abs(safePct(b.invPads, b.tgmvLc) - 3);
      return ratioA - ratioB;
    });
  const adsChamp = adsRatio3[0] || sellers[0];
  const adsPct = safePct(adsChamp.invPads, adsChamp.tgmvLc);

  const trophies = [
    {
      icon: Trophy,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10 border-yellow-400/20",
      title: "📦 Máxima Potência no Full",
      seller: logisticsChamp.nickname,
      detail: `${logisticsPct.toFixed(1)}% Potência Full (TSI_FULL) · n=${logisticsChamp.mesesObservados}`,
      tooltip: "Mede o aproveitamento do potencial de escala do seller utilizando o ecossistema Fulfillment. Sellers com alta potência no Full possuem maior conversão e relevância no algoritmo.",
    },
    {
      icon: Rocket,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
      title: "Maior Tração",
      seller: tractionChamp.nickname,
      detail: `${tractionPct.toFixed(1)}% de efetividade (TGMV/Meta) · n=${tractionChamp.mesesObservados}`,
      tooltip: null as string | null,
    },
    {
      icon: Star,
      color: "text-blue-400",
      bg: "bg-blue-400/10 border-blue-400/20",
      title: "Excelência em Qualidade",
      seller: qualityChamp.nickname,
      detail: `${qualityChamp.repCurrentLevel || "N/A"} · Score ${qualityChamp.scoreQualidadeFinal.toFixed(0)} · n=${qualityChamp.mesesObservados}`,
      tooltip: null as string | null,
    },
    {
      icon: Target,
      color: "text-purple-400",
      bg: "bg-purple-400/10 border-purple-400/20",
      title: "Mestre do Ads",
      seller: adsChamp.nickname,
      detail: `Ratio Ads: ${adsPct.toFixed(2)}% (meta 3%) · n=${adsChamp.mesesObservados}`,
      tooltip: null as string | null,
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {trophies.map((t) => (
          <Card key={t.title} className={`border ${t.bg}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <t.icon className={`w-5 h-5 ${t.color}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.title}</span>
                {t.tooltip && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                      {t.tooltip}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-sm font-bold truncate">{t.seller}</p>
              <p className="text-xs text-muted-foreground">{t.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
