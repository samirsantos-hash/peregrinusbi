import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Folder, TrendingUp, AlertTriangle, DollarSign, BarChart3, Truck, Tag } from "lucide-react";
import { usePortfolioData, type Portfolio } from "@/hooks/usePortfolios";
import { usePortfolioTrends } from "@/hooks/usePortfolioTrends";
import { useMeliCampaigns } from "@/hooks/useMeliCampaigns";
import TrophyCards from "./TrophyCards";
import AlertMatrix from "./AlertMatrix";
import RaioXTable from "./RaioXTable";
import MedalFilter from "./MedalFilter";
import PerformanceClusterChart from "./PerformanceClusterChart";
import ProjecaoPanel from "./ProjecaoPanel";
import GmCadastroPanel from "./GmCadastroPanel";

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
  const [selectedMedals, setSelectedMedals] = useState<string[]>([]);
  const aliases = portfolio.seller_aliases || {};
  const sellersWithAliases = useMemo(
    () => sellers.map((s) => ({ ...s, nickname: aliases[s.custId] || s.nickname })),
    [sellers, aliases]
  );

  const sellerIds = useMemo(() => sellersWithAliases.map((s) => s.sellerId), [sellersWithAliases]);
  const { trends } = usePortfolioTrends(sellerIds);
  const { campaigns } = useMeliCampaigns(sellerIds);

  const filteredSellers = useMemo(() => {
    if (selectedMedals.length === 0) return sellersWithAliases;
    return sellersWithAliases.filter((s) => {
      const level = (s.repCurrentLevel || "").toLowerCase();
      return selectedMedals.some((m) => {
        if (m === "sem_medalha") return !level || level === "" || level === "null";
        return level.includes(m.toLowerCase());
      });
    });
  }, [sellersWithAliases, selectedMedals]);

  const summary = useMemo(() => {
    if (!filteredSellers.length) return null;

    const totalRevenue = filteredSellers.reduce((s, x) => s + x.tgmvLc, 0);
    const topSeller = [...filteredSellers].sort((a, b) => b.tgmvLc - a.tgmvLc)[0];

    const subInvestCount = filteredSellers.filter((s) => {
      const ratio = safePct(s.invPads, s.tgmvLc);
      return s.tgmvLc > 0 && ratio < 1.5;
    }).length;

    const lowFullCount = filteredSellers.filter((s) => {
      return s.tgmvLc > 0 && s.tsi > 0 && s.fTsi === 0;
    }).length;

    // Sellers em queda (trend negativo)
    const sellersEmQueda = filteredSellers.filter((s) => {
      const t = trends?.[s.sellerId];
      return t && (t.tgmvTrend < 0 || t.visitsTrend < 0);
    }).length;

    const totalTgmvPads = filteredSellers.reduce((s, x) => s + (x.tgmvLcPads || 0), 0);
    const totalInvPads = filteredSellers.reduce((s, x) => s + x.invPads, 0);
    const roas = totalInvPads > 0 ? totalTgmvPads / totalInvPads : 0;
    const adsRatio = safePct(totalInvPads, totalRevenue);

    const totalTsi = filteredSellers.reduce((s, x) => s + x.tsi, 0);
    const totalTsiFull = filteredSellers.reduce((s, x) => s + x.fTsi, 0);
    const totalTsiFlex = filteredSellers.reduce((s, x) => s + x.tsiFlex, 0);
    const pctFull = safePct(totalTsiFull, totalTsi);
    const pctFlex = safePct(totalTsiFlex, totalTsi);

    // Algorithm audit counts
    const promoAlertCount = filteredSellers.filter((s) => {
      const potFull = safePct(s.fTsi, s.tsi);
      return potFull > 50 && s.scoreOfertaFinal < 30;
    }).length;

    const kitOpportunityCount = filteredSellers.filter((s) => {
      const ticket = s.tsi > 0 ? s.tgmvLc / s.tsi : 0;
      return ticket > 0 && ticket < 50 && s.tsi >= 10;
    }).length;

    return { totalRevenue, topSeller: topSeller.nickname, subInvestCount, lowFullCount, sellersEmQueda, roas, adsRatio, totalInvPads, pctFull, pctFlex, promoAlertCount, kitOpportunityCount };
  }, [filteredSellers, trends]);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Folder className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold">{portfolio.name}</h2>
            <p className="text-xs text-muted-foreground">
              {filteredSellers.length} de {sellers.length} seller(s)
            </p>
          </div>
        </div>
        <MedalFilter selected={selectedMedals} onChange={setSelectedMedals} />
      </div>

      <div className="space-y-6">
      {/* Resumo Inteligente */}
      {summary && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Resumo Inteligente da Carteira
            </h3>
            <p className="text-sm leading-relaxed text-foreground">
              Total faturado: <strong>{fmtBRL(summary.totalRevenue)}</strong>.
              {summary.sellersEmQueda > 0 && (
                <> <strong>{summary.sellersEmQueda}</strong> seller(s) em queda.</>
              )}
              {summary.subInvestCount > 0 && (
                <> <strong>{summary.subInvestCount}</strong> seller(s) com subpenetração de Ads.</>
              )}
              {summary.lowFullCount > 0 && (
                <> <strong>{summary.lowFullCount}</strong> sem adoção de Full.</>
              )}
              {summary.promoAlertCount > 0 && (
                <> <strong>{summary.promoAlertCount}</strong> seller(s) fora da Central de Promoções (potencial Full alto).</>
              )}
              {summary.kitOpportunityCount > 0 && (
                <> <strong>{summary.kitOpportunityCount}</strong> com oportunidade de KIT (ticket médio baixo).</>
              )}
              {summary.sellersEmQueda === 0 && summary.subInvestCount === 0 && summary.lowFullCount === 0 && summary.promoAlertCount === 0 && (
                <> Todos os indicadores estão saudáveis.</>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cluster de Desempenho */}
      <PerformanceClusterChart sellers={filteredSellers} aliases={aliases} />

      {/* Cadastro GM (status, responsável, praça e divisão Norte/Sul) */}
      <GmCadastroPanel custIds={portfolio.cust_ids} sellers={filteredSellers} />

      {/* Projeção de Crescimento da Carteira */}
      <ProjecaoPanel custIds={portfolio.cust_ids} portfolioName={portfolio.name} />

      {/* 4 KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Faturamento</span>
              </div>
              <p className="text-xl font-bold">{fmtBRL(summary.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">{filteredSellers.length} sellers</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Resumo</span>
              </div>
              <p className="text-xl font-bold">ROAS {summary.roas.toFixed(1)}x</p>
              <p className="text-xs text-muted-foreground">
                Ratio Ads: {summary.adsRatio.toFixed(2)}% · Invest: {fmtBRL(summary.totalInvPads)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Diagnóstico de Preço</span>
              </div>
              <p className="text-xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Dados de competitividade não disponíveis</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Potencial de Vendas no Full</span>
              </div>
              <p className="text-xl font-bold">{summary.pctFull.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                Share do Full no total de vendas (TSI_FULL / TSI). Indica potencial de crescimento via logística Full.
                Flex: {summary.pctFlex.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Troféus */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          🏆 Top Performers
        </h3>
        <TrophyCards sellers={filteredSellers} />
      </div>

      {/* Alertas + Raio-X */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Radar de Oportunidades
            </h3>
            <AlertMatrix sellers={filteredSellers} trends={trends} campaigns={campaigns} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold">📊 Raio-X da Carteira</h3>
          <RaioXTable
            sellers={filteredSellers}
            trends={trends}
            portfolioName={portfolio.name}
            campaigns={campaigns}
          />
        </div>
      </div>

      </div>
    </div>
  );
}
