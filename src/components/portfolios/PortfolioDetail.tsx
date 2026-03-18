import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Folder, TrendingUp, AlertTriangle } from "lucide-react";
import { usePortfolioData, type Portfolio } from "@/hooks/usePortfolios";
import TrophyCards from "./TrophyCards";
import AlertMatrix from "./AlertMatrix";
import RaioXTable from "./RaioXTable";

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function safePct(num: number, den: number): number {
  if (!den || den === 0) return 0;
  return (num / den) * 100;
}

interface Props {
  portfolio: Portfolio;
  onBack: () => void;
}

export default function PortfolioDetail({ portfolio, onBack }: Props) {
  const { sellers, loading } = usePortfolioData(portfolio.cust_ids);

  const summary = useMemo(() => {
    if (!sellers.length) return null;

    const totalRevenue = sellers.reduce((s, x) => s + x.tgmvLc, 0);
    const topSeller = [...sellers].sort((a, b) => b.tgmvLc - a.tgmvLc)[0];

    const subInvestCount = sellers.filter((s) => {
      const ratio = safePct(s.invPads, s.tgmvLc);
      return s.tgmvLc > 0 && ratio < 1.5;
    }).length;

    const lowFullCount = sellers.filter((s) => {
      return s.tgmvLc > 0 && s.tgmvLcFull < s.tgmvLc * 0.1;
    }).length;

    return {
      totalRevenue,
      topSeller: topSeller.nickname,
      subInvestCount,
      lowFullCount,
    };
  }, [sellers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Folder className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold">{portfolio.name}</h2>
          <p className="text-xs text-muted-foreground">{portfolio.cust_ids.length} seller(s)</p>
        </div>
      </div>

      {/* Resumo Inteligente */}
      {summary && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Resumo Inteligente da Carteira
            </h3>
            <p className="text-sm leading-relaxed text-foreground">
              Esta carteira gerou <strong>{fmtBRL(summary.totalRevenue)}</strong> no período.
              O maior destaque foi <strong>{summary.topSeller}</strong>.
              {summary.subInvestCount > 0 && (
                <> Atenção: <strong>{summary.subInvestCount}</strong> seller(s) apresentam subinvestimento em Ads</>
              )}
              {summary.lowFullCount > 0 && (
                <> e <strong>{summary.lowFullCount}</strong> precisam melhorar a adoção do Full</>
              )}
              .
            </p>
          </CardContent>
        </Card>
      )}

      {/* Troféus */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          🏆 Top Performers
        </h3>
        <TrophyCards sellers={sellers} />
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Radar de Oportunidades
          </h3>
          <AlertMatrix sellers={sellers} />
        </div>

        {/* Raio-X */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold">📊 Raio-X da Carteira</h3>
          <RaioXTable sellers={sellers} />
        </div>
      </div>
    </div>
  );
}
