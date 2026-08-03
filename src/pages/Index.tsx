import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, DollarSign, Swords, Truck, Loader2, Settings, LogOut, Shield, HeartPulse, Gift, Video, Volume2, VolumeX, KeyRound, TrendingUp, Search, Sun, Moon, Briefcase, Store } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import NewBadge from "@/components/ui/NewBadge";
import { useSoundFeedback } from "@/hooks/useSoundFeedback";
import { type DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GranularityToggle, { type Granularity } from "@/components/dashboard/GranularityToggle";
import ExecutivePanel from "@/components/dashboard/ExecutivePanel";
import { Daily7DPanel } from "@/components/dashboard/Daily7DPanel";
import TrendAnalysisPanel from "@/components/dashboard/TrendAnalysisPanel";
import SynergyAnalysisPanel from "@/components/dashboard/SynergyAnalysisPanel";
import EfficiencyPanel from "@/components/dashboard/EfficiencyPanel";
import CompetitivenessPanel from "@/components/dashboard/CompetitivenessPanel";
import GrowthPotentialPanel from "@/components/dashboard/GrowthPotentialPanel";
import LogisticsPanel from "@/components/dashboard/LogisticsPanel";
import FullRecommendationPanel from "@/components/seller/FullRecommendationPanel";
import StockoutRiskPanel from "@/components/dashboard/StockoutRiskPanel";
import QualityRadarPanel from "@/components/dashboard/QualityRadarPanel";
import CriticalListingsTable from "@/components/dashboard/CriticalListingsTable";
import OpportunitiesPanel from "@/components/dashboard/OpportunitiesPanel";
import { CampanhasCofinanciadasPanel } from "@/components/seller/CampanhasCofinanciadasPanel";
import ClipsAudiencePanel from "@/components/dashboard/ClipsAudiencePanel";
import ConversaoPorMLBPanel from "@/components/dashboard/ConversaoPorMLBPanel";
import { useListingsQuality } from "@/hooks/useListingsQuality";
import { useEligibility } from "@/hooks/useEligibility";
import { useLiveListingsCount } from "@/hooks/useLiveListingsCount";
import ReputationPanel from "@/components/dashboard/ReputationPanel";
import DiagnosticAlerts from "@/components/dashboard/DiagnosticAlerts";
import CsvUploadModal from "@/components/dashboard/CsvUploadModal";
import QualityKpiCards from "@/components/dashboard/QualityKpiCards";
import { useSellers, useSellerKpis } from "@/hooks/useSellerData";
import { useAuth } from "@/hooks/useAuth";
import { sellers as mockSellers, sellerKPIs as mockSellerKPIs } from "@/data/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import { aggregateKpisByMonth } from "@/utils/aggregateByMonth";
import { aggregateKpisByQuarter } from "@/utils/aggregateByQuarter";
import { useSellerDailyKpis } from "@/hooks/useSellerDailyData";
import QualityIndexPanel from "@/components/dashboard/QualityIndexPanel";
import QualityIndexPanelV2 from "@/components/seller/QualityIndexPanel";
import PlanoAcaoAnuncioPanel from "@/components/seller/PlanoAcaoAnuncioPanel";
import { useMeliCampaigns } from "@/hooks/useMeliCampaigns";
import { useVerticalBenchmark } from "@/hooks/useVerticalBenchmark";
import { SELLER_TABS } from "@/config/sellerTabs";
import { useJuniorMode } from "@/hooks/useJuniorMode";
import { JuniorActionBanner } from "@/components/ui/JuniorActionBanner";
import CorrelacaoPanel from "@/components/seller/CorrelacaoPanel";
import PublicidadePanel from "@/components/seller/PublicidadePanel";
import AccessScopeBadge from "@/components/AccessScopeBadge";
import SellerDiagnosticPanel from "@/components/dashboard/SellerDiagnosticPanel";
import { SellerRiskPanel } from "@/components/dashboard/risk/SellerRiskPanel";
import { useTheme } from "@/hooks/useTheme";
/* ------------------------------------------------------------------ */
/*  Helpers — timezone-safe date parsing                               */
/* ------------------------------------------------------------------ */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* Sound Toggle Button */
const SoundToggleButton = () => {
  const { soundEnabled, toggleSound, playClick } = useSoundFeedback();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            toggleSound();
            if (!soundEnabled) playClick(); // Play sound when enabling
          }}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-neon-blue" />
          ) : (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Ativar/Desativar sons de confirmação</p>
      </TooltipContent>
    </Tooltip>
  );
};

const Index = () => {
  const { user, isAdmin, isGerente, isGestorLoja, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggle: toggleTheme } = useTheme();
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("executive");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("consolidated");
  const [activePeriod, setActivePeriod] = useState<string>("q1");

  // Handle period changes from DashboardHeader
  const handlePeriodChange = useCallback((period: string) => {
    setActivePeriod(period);
    const useConsolidated = period.startsWith("q") || period === "all";
    setGranularity(useConsolidated ? "consolidated" : "daily");
    setDateRange(undefined);
  }, []);

  // Clear date range and cache when granularity changes
  const handleGranularityChange = useCallback((val: Granularity) => {
    setGranularity(val);
    setDateRange(undefined);
  }, []);

  const { data: dbSellers, isLoading: loadingSellers, isFetched: sellersFetched } = useSellers();

  const hasRealData = sellersFetched && dbSellers && dbSellers.length > 0;

  const sellers = useMemo(() => {
    if (!sellersFetched) return [];
    if (hasRealData) return dbSellers!.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      custId: s.custId,
      cluster: s.cluster,
      subCluster: s.subCluster,
      state: s.state
    }));
    if (isAdmin) return mockSellers;
    return [];
  }, [hasRealData, dbSellers, sellersFetched, isAdmin]);

  useEffect(() => {
    if (sellersFetched && sellers.length === 0 && !isAdmin) {
      navigate("/no-access", { replace: true });
    }
  }, [sellersFetched, sellers.length, isAdmin, navigate]);

  // When seller changes, reset date range so it re-anchors to the new dataset
  const handleSellerChange = useCallback((id: string) => {
    setSelectedSeller(id);
    setDateRange(undefined); // Reset → will be re-anchored by effect below
  }, []);

  // Persist selected seller globally so other pages (e.g. Projeção de Crescimento) can sync
  useEffect(() => {
    if (!selectedSeller) return;
    try {
      localStorage.setItem("selected_seller_id", selectedSeller);
      window.dispatchEvent(new CustomEvent("selected-seller-change", { detail: selectedSeller }));
    } catch {}
  }, [selectedSeller]);

  useEffect(() => {
    if (sellers.length > 0 && (!selectedSeller || !sellers.find((s) => s.id === selectedSeller))) {
      setSelectedSeller(sellers[0].id);
    }
  }, [sellers]);

  const { data: dbKpis, isLoading: loadingKpis } = useSellerKpis(
    hasRealData ? selectedSeller : undefined
  );

  // Always fetch daily data — needed for 7D/15D/30D periods
  const { data: dbDailyKpis, isLoading: loadingDailyKpis } = useSellerDailyKpis(
    hasRealData ? selectedSeller : undefined,
    true
  );

  const { data: listingsQuality } = useListingsQuality(
    hasRealData ? selectedSeller : undefined
  );

  const { data: eligibilityItems } = useEligibility(
    hasRealData ? selectedSeller : undefined
  );

  const { data: liveListingsCount } = useLiveListingsCount(
    hasRealData ? selectedSeller : undefined
  );

  // Fetch campaign data for selected seller
  const sellerIdsForCampaign = useMemo(() => selectedSeller ? [selectedSeller] : [], [selectedSeller]);
  const { campaigns: sellerCampaigns } = useMeliCampaigns(sellerIdsForCampaign);
  const currentCampaign = sellerCampaigns[selectedSeller] || null;

  // Vertical benchmark for Ads panel
  const { benchmark: verticalBenchmark } = useVerticalBenchmark(currentCampaign);

  // ALL kpis (unfiltered) — monthly source for consolidated view
  const allKpisMonthly: any[] = useMemo(() => {
    if (hasRealData) return dbKpis || [];
    return mockSellerKPIs[selectedSeller] || [];
  }, [hasRealData, dbKpis, selectedSeller]);

  // Daily kpis from dedicated daily table
  const allKpisDaily: any[] = useMemo(() => {
    if (hasRealData) return dbDailyKpis || [];
    return [];
  }, [hasRealData, dbDailyKpis]);

  // Quarter periods and "all" use consolidated (monthly) data
  const isDailyPeriod = !activePeriod.startsWith("q") && activePeriod !== "all" && activePeriod !== "custom";
  const allKpis: any[] = useMemo(() => {
    return isDailyPeriod ? allKpisDaily : allKpisMonthly;
  }, [isDailyPeriod, allKpisDaily, allKpisMonthly]);

  // Compute anchor (max date) and min date from ALL data
  const { anchorDate, minDate, anchorStr, minStr } = useMemo(() => {
    const dates = allKpis
      .map((k: any) => k.date)
      .filter(Boolean)
      .sort();
    if (dates.length === 0) {
      return {
        anchorDate: new Date(),
        minDate: new Date("2020-01-01"),
        anchorStr: formatDateString(new Date()),
        minStr: "2020-01-01",
      };
    }
    const uniqueDates = [...new Set(dates)].sort() as string[];
    const maxStr = uniqueDates[uniqueDates.length - 1];
    const minStr = uniqueDates[0];
    return {
      anchorDate: parseLocalDate(maxStr),
      minDate: parseLocalDate(minStr),
      anchorStr: maxStr,
      minStr,
    };
  }, [allKpis]);

  // Auto-anchor dateRange on first load / seller change
  useEffect(() => {
    if (allKpis.length > 0 && !dateRange) {
      setDateRange({ from: minDate, to: anchorDate });
    }
  }, [allKpis, dateRange, minDate, anchorDate]);

  // FILTERED kpis — used by all panels
  const filteredKpis: any[] = useMemo(() => {
    if (!dateRange?.from) return allKpis;

    const fromStr = formatDateString(dateRange.from);
    const toStr = formatDateString(dateRange.to || dateRange.from);

    const filtered = allKpis.filter((k: any) => {
      const dateStr = k.date;
      return dateStr >= fromStr && dateStr <= toStr;
    });

    // Debug log for date range
    console.log(
      `[Filtro de Datas] Exibindo de ${fromStr} até ${toStr} — ${filtered.length} registros de ${allKpis.length} total`
    );

    return filtered;
  }, [allKpis, dateRange]);

  // Apply aggregation: quarter filters show monthly data, "all" passes raw monthly data
  // (QuarterlyPerformanceChart handles its own quarterly aggregation internally)
  const displayKpis: any[] = useMemo(() => {
    if (isDailyPeriod) {
      return filteredKpis; // raw daily rows
    }
    // Q1-Q4 and "all": pass monthly rows as-is (no pre-aggregation)
    return filteredKpis;
  }, [filteredKpis, isDailyPeriod]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["sellers"] });
    await queryClient.invalidateQueries({ queryKey: ["seller-kpis", selectedSeller] });
    await queryClient.invalidateQueries({ queryKey: ["seller-kpis-daily", selectedSeller] });
    setIsRefreshing(false);
  }, [queryClient, selectedSeller]);

  // Ordem lógica de análise — ver src/config/sellerTabs.ts
  // 1–3: "como está indo?" | 4–6: "por que?" | 7–9: "o que fazer?"
  const tabs = SELLER_TABS;

  // Map seller UUID -> custId for external links
  const sellerCustIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sellers) map[s.id] = s.custId;
    return map;
  }, [sellers]);

  const isLoading = !sellersFetched || (hasRealData && (loadingKpis || loadingDailyKpis));

  // Indicadores agregados para o Guia do Consultor (junior banners)
  const dadosJunior = useMemo(() => {
    const latest = [...displayKpis].sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))[0] || {};
    const totalGmv = displayKpis.reduce((s: number, k: any) => s + (Number(k?.gmv) || Number(k?.revenue) || 0), 0);
    const totalAds = displayKpis.reduce((s: number, k: any) => s + (Number(k?.adsInvestment) || 0), 0);
    const tacos = totalGmv > 0 ? (totalAds / totalGmv) * 100 : 0;
    const itensSemOptin = (eligibilityItems || []).filter((it: any) => it?.elegivel && !it?.optin).length;
    const gapDescontoMedio = (eligibilityItems || []).reduce((s: number, it: any) => {
      const gap = Number(it?.gapDesconto) || Math.max(0, (Number(it?.descontoSugerido) || 0) - (Number(it?.descontoAplicado) || 0));
      return s + (gap > 0 ? gap : 0);
    }, 0) / Math.max(1, (eligibilityItems || []).length);
    return {
      shareFullPct: Number(latest?.shareFullPct) || 0,
      shareFlexPct: Number(latest?.shareFlexPct) || 0,
      pontuacaoIpi: Number(latest?.pontuacaoIpi) || 0,
      scoreCdp: Number(latest?.cdpTgmv) > 0 ? 36 : 0,
      scoreCaracteristica: Number(latest?.scoreCaracteristica) || 0,
      taxaAtrasos: Number(latest?.taxaAtrasos) || Number(latest?.repDelayedHtRate) || 0,
      taxaReclamacoes: Number(latest?.taxaReclamacoes) || Number(latest?.repClaimsRate) || 0,
      taxaCancelamentos: Number(latest?.taxaCancelamentos) || Number(latest?.repCancellationsRate) || 0,
      nivelReputacao: String(latest?.nivelReputacao || latest?.repLevel || ""),
      gmvTrend: 0,
      corrAdsGmv: 0,
      tacos,
      itensSemOptin,
      gapDescontoMedio,
    };
  }, [displayKpis, eligibilityItems]);

  // Active date range debug label
  const dateDebugLabel = useMemo(() => {
    if (!dateRange?.from) return null;
    const fromStr = formatDateString(dateRange.from);
    const toStr = formatDateString(dateRange.to || dateRange.from);
    return `Exibindo de ${fromStr} até ${toStr}`;
  }, [dateRange]);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--neon-blue)) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg border border-border/50 p-1 flex items-center justify-center bg-primary-foreground shrink-0">
              <img alt="Ecom Peregrinus" className="w-full h-full object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" src="/lovable-uploads/2f12a5a6-9e0e-4367-a737-5d6a8137e4bd.png" />
            </div>
            <div className="w-1.5 h-7 sm:w-2 sm:h-8 rounded-full bg-neon-blue shrink-0" style={{ boxShadow: '0 0 12px hsl(199, 100%, 50%)' }} />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold tracking-tight truncate">
                <span className="hidden sm:inline">Peregrinus Business Intelligence</span>
                <span className="sm:hidden">Peregrinus BI</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Gestão de Performance · Mercado Livre
                {sellersFetched && hasRealData && <span className="ml-2 text-emerald">● Dados reais</span>}
                {sellersFetched && !hasRealData && isAdmin && <span className="ml-2 text-warning">● Dados de demonstração</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* Sound toggle */}
            <SoundToggleButton />
            <Button variant="outline" size="sm" onClick={() => navigate("/projecao-crescimento")} className="gap-2 relative px-2 sm:px-3">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Projeção</span>
              <NewBadge featureKey="projecao_v1" tooltip="Novo: forecast, decomposição de crescimento e alertas de sustentabilidade" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              title={theme === "dark" ? "Alternar para modo claro" : "Alternar para modo escuro"}
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-neon-blue" /> : <Moon className="w-4 h-4 text-neon-blue" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/analise-mlb")} className="gap-2 px-2 sm:px-3">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Análise MLB</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/carteira")} className="gap-2 px-2 sm:px-3">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Carteira</span>
            </Button>
            {(isAdmin || isGerente || isGestorLoja) &&
              <Button variant="outline" size="sm" onClick={() => navigate("/multilojas")} className="gap-2 relative px-2 sm:px-3">
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">Multilojas</span>
                <NewBadge featureKey="multilojas_v1" tooltip="Novo: consolidação de rede a partir do relatório de Vendas do Mercado Livre" />
              </Button>
            }
            {(isAdmin || isGerente) &&
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-2 px-2 sm:px-3">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">{isGerente && !isAdmin ? "Carteiras" : "Admin"}</span>
              </Button>
            }
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 px-2 sm:px-3">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </motion.div>

        <AccessScopeBadge />

        {isLoading &&
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
          </div>
        }

        {!isLoading && sellers.length > 0 &&
          <>
            <DashboardHeader
              sellers={sellers}
              selectedSeller={selectedSeller}
              onSellerChange={handleSellerChange}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              allKpis={allKpis}
              filteredKpis={filteredKpis}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              onPeriodChange={handlePeriodChange}
            />

            {activeTab === "efficiency" && (
              <SellerDiagnosticPanel
                seller={sellers.find((s) => s.id === selectedSeller) as any}
                allKpis={allKpis}
              />
            )}

            <DiagnosticAlerts kpis={displayKpis} sellerCustIdMap={sellerCustIdMap} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="glass-card w-full justify-center gap-1 p-1 bg-card/60 h-auto grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-11">
                {tabs.map((tab) =>
                  <Tooltip key={tab.id} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value={tab.id}
                        className="flex items-center justify-center gap-1 px-1.5 sm:px-2 py-1.5 text-[10px] sm:text-[11px] whitespace-nowrap w-full data-[state=active]:bg-neon-blue/10 data-[state=active]:text-neon-blue data-[state=active]:tab-glow data-[state=active]:border-neon-blue/30 rounded-lg transition-all border border-transparent">
                        <tab.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                      <p className="font-semibold mb-0.5">{tab.label}</p>
                      <p className="text-muted-foreground">{tab.juniorTip}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${selectedSeller}-${granularity}-${dateRange?.from?.getTime()}-${dateRange?.to?.getTime()}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="mt-5">
                  <TabsContent value="executive" className="mt-0 space-y-6">
                    <JuniorActionBanner abaId="executive" dados={dadosJunior} />
                    <Daily7DPanel
                      dailyKpis={allKpisDaily}
                      sellerNickname={sellers.find((s) => s.id === selectedSeller)?.nickname}
                    />
                    <ExecutivePanel kpis={displayKpis} allKpis={allKpisMonthly} dataGranularity={granularity} />
                    <GrowthPotentialPanel kpis={displayKpis} dataGranularity={granularity} campaign={currentCampaign} benchmark={verticalBenchmark} />
                    <TrendAnalysisPanel
                      kpis={displayKpis}
                      dataGranularity={granularity}
                      allKpisDaily={allKpisDaily}
                    />
                    <SynergyAnalysisPanel kpis={displayKpis} />
                  </TabsContent>
                  <TabsContent value="efficiency" className="mt-0 space-y-5">
                    <JuniorActionBanner abaId="efficiency" dados={dadosJunior} />
                    <EfficiencyPanel kpis={displayKpis} sellerCustIdMap={sellerCustIdMap} dataGranularity={granularity} campaign={currentCampaign} benchmark={verticalBenchmark} sellerId={selectedSeller} sellerCluster={(sellers.find(s => s.id === selectedSeller) as any)?.subCluster} />
                  </TabsContent>
                  <TabsContent value="competitiveness" className="mt-0 space-y-5">
                    <JuniorActionBanner abaId="competitiveness" dados={dadosJunior} />
                    <CompetitivenessPanel kpis={displayKpis} monthlyKpis={allKpisMonthly} sellers={sellers.map((s) => ({ id: s.id, cluster: (s as any).cluster }))} sellerCustIdMap={sellerCustIdMap} listingsQuality={listingsQuality} dataGranularity={granularity} />
                  </TabsContent>
                  <TabsContent value="publicidade" className="mt-0 space-y-5">
                    <PublicidadePanel
                      sellerUuid={selectedSeller}
                      custId={sellerCustIdMap[selectedSeller]}
                      fromDate={dateRange?.from ? formatDateString(dateRange.from) : minStr}
                      toDate={dateRange?.to ? formatDateString(dateRange.to) : anchorStr}
                      sellerNickname={sellers.find((s) => s.id === selectedSeller)?.nickname}
                    />
                  </TabsContent>
                  <TabsContent value="logistics" className="mt-0 space-y-5">
                    <JuniorActionBanner abaId="logistics" dados={dadosJunior} />
                    <LogisticsPanel kpis={displayKpis} dataGranularity={granularity} eligibilityItems={eligibilityItems || []} />
                    <FullRecommendationPanel
                      sellerId={selectedSeller}
                      custId={sellerCustIdMap[selectedSeller]}
                    />
                    <StockoutRiskPanel sellerId={selectedSeller} />
                  </TabsContent>
                  <TabsContent value="quality" className="mt-0 space-y-5">
                    <JuniorActionBanner abaId="quality" dados={dadosJunior} />
                    <QualityIndexPanelV2
                      custId={sellerCustIdMap[selectedSeller]}
                      sellerUuid={selectedSeller}
                    />
                    <PlanoAcaoAnuncioPanel sellerId={selectedSeller} />
                    <QualityIndexPanel kpis={displayKpis} campaign={currentCampaign} allKpis={allKpis} />
                    <QualityKpiCards
                      scoreCaracteristica={(() => {
                        const latest = [...(displayKpis.length ? displayKpis : allKpis)].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).scoreCaracteristica || 0 : 0;
                      })()}
                      pontuacaoLlGtin={(() => {
                        const latest = [...(displayKpis.length ? displayKpis : allKpis)].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).pontuacaoLlGtin || 0 : 0;
                      })()}
                      scoreOfertaFinal={(() => {
                        const latest = [...(displayKpis.length ? displayKpis : allKpis)].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).scoreOferta || 0 : 0;
                      })()}
                      scoreFull={(() => {
                        const latest = [...(displayKpis.length ? displayKpis : allKpis)].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).scoreFull || 0 : 0;
                      })()}
                      scorePads={(() => {
                        const latest = [...(displayKpis.length ? displayKpis : allKpis)].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).scorePads || 0 : 0;
                      })()}
                      scoreCdp={(() => {
                        const latest = [...(displayKpis.length ? displayKpis : allKpis)].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).cdpTgmv > 0 ? 36 : 0 : 0;
                      })()}
                      pontuacaoIpi={(() => {
                        const latest = [...(displayKpis.length ? displayKpis : allKpis)].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).pontuacaoIpi || 0 : 0;
                      })()}
                      totalLiveListings={liveListingsCount || 0}
                    />
                    <QualityRadarPanel kpis={displayKpis} sellerCustIdMap={sellerCustIdMap} />
                    <ConversaoPorMLBPanel sellerId={selectedSeller} />
                    <CriticalListingsTable listings={listingsQuality || []} />
                  </TabsContent>
                  <TabsContent value="clips" className="mt-0">
                    <ClipsAudiencePanel kpis={displayKpis} eligibilityItems={eligibilityItems || []} listingsQuality={listingsQuality || []} sellerCustIdMap={sellerCustIdMap} selectedSeller={selectedSeller} dataGranularity={granularity} />
                  </TabsContent>
                  <TabsContent value="opportunities" className="mt-0 space-y-5">
                    <JuniorActionBanner abaId="opportunities" dados={dadosJunior} />
                    <CampanhasCofinanciadasPanel items={eligibilityItems || []} />
                    <OpportunitiesPanel items={eligibilityItems || []} />
                  </TabsContent>
                  <TabsContent value="reputation" className="mt-0 space-y-5">
                    <JuniorActionBanner abaId="reputation" dados={dadosJunior} />
                    <ReputationPanel kpis={displayKpis} dataGranularity={granularity} />
                  </TabsContent>
                  <TabsContent value="correlacoes" className="mt-0">
                    <CorrelacaoPanel kpis={displayKpis} />
                  </TabsContent>
                  <TabsContent value="alertas-riscos" className="mt-0">
                    <SellerRiskPanel />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </>
        }
      </div>
    </div>
  );
};

export default Index;
