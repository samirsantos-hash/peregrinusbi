import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, DollarSign, Swords, Truck, Loader2, Settings, LogOut, Shield, HeartPulse, Gift, Video, Volume2, VolumeX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSoundFeedback } from "@/hooks/useSoundFeedback";
import { type DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ExecutivePanel from "@/components/dashboard/ExecutivePanel";
import TrendAnalysisPanel from "@/components/dashboard/TrendAnalysisPanel";
import EfficiencyPanel from "@/components/dashboard/EfficiencyPanel";
import CompetitivenessPanel from "@/components/dashboard/CompetitivenessPanel";
import GrowthPotentialPanel from "@/components/dashboard/GrowthPotentialPanel";
import LogisticsPanel from "@/components/dashboard/LogisticsPanel";
import QualityRadarPanel from "@/components/dashboard/QualityRadarPanel";
import CriticalListingsTable from "@/components/dashboard/CriticalListingsTable";
import OpportunitiesPanel from "@/components/dashboard/OpportunitiesPanel";
import ClipsAudiencePanel from "@/components/dashboard/ClipsAudiencePanel";
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
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("executive");
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  useEffect(() => {
    if (sellers.length > 0 && (!selectedSeller || !sellers.find((s) => s.id === selectedSeller))) {
      setSelectedSeller(sellers[0].id);
    }
  }, [sellers]);

  const { data: dbKpis, isLoading: loadingKpis } = useSellerKpis(
    hasRealData ? selectedSeller : undefined
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

  // ALL kpis (unfiltered) — used for anchor date computation
  const allKpis: any[] = useMemo(() => {
    if (hasRealData) return dbKpis || [];
    return mockSellerKPIs[selectedSeller] || [];
  }, [hasRealData, dbKpis, selectedSeller]);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["sellers"] });
    await queryClient.invalidateQueries({ queryKey: ["seller-kpis", selectedSeller] });
    setIsRefreshing(false);
  }, [queryClient, selectedSeller]);

  const tabs = [
    { id: "executive", label: "Faturamento", icon: LayoutDashboard },
    { id: "efficiency", label: "Eficiência & Ads", icon: DollarSign },
    { id: "competitiveness", label: "Diagnóstico de Preço", icon: Swords },
    { id: "logistics", label: "Logística", icon: Truck },
    { id: "quality", label: "Qualidade", icon: Shield },
    { id: "clips", label: "Clips & Audiência", icon: Video },
    { id: "opportunities", label: "Oportunidades", icon: Gift },
    { id: "reputation", label: "Reputação", icon: HeartPulse },
  ];

  // Map seller UUID -> custId for external links
  const sellerCustIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sellers) map[s.id] = s.custId;
    return map;
  }, [sellers]);

  const isLoading = !sellersFetched || (hasRealData && loadingKpis);

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

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg border border-border/50 p-1 flex items-center justify-center bg-primary-foreground">
              <img alt="Ecom Peregrinus" className="w-full h-full object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" src="/lovable-uploads/2f12a5a6-9e0e-4367-a737-5d6a8137e4bd.png" />
            </div>
            <div className="w-2 h-8 rounded-full bg-neon-blue" style={{ boxShadow: '0 0 12px hsl(199, 100%, 50%)' }} />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Peregrinus Business Intelligence</h1>
              <p className="text-xs text-muted-foreground">
                Gestão de Performance · Mercado Livre
                {sellersFetched && hasRealData && <span className="ml-2 text-emerald">● Dados reais</span>}
                {sellersFetched && !hasRealData && isAdmin && <span className="ml-2 text-warning">● Dados de demonstração</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sound toggle */}
            <SoundToggleButton />
            {isAdmin &&
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-2">
                <Settings className="w-4 h-4" />
                Admin
              </Button>
            }
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </motion.div>

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
            />

            {/* Debug: active date range */}
            {dateDebugLabel && (
              <div className="text-[10px] text-muted-foreground bg-muted/20 border border-border/30 px-3 py-1 rounded-md inline-flex items-center gap-2">
                📅 {dateDebugLabel} · {filteredKpis.length} registros
              </div>
            )}

            <DiagnosticAlerts kpis={filteredKpis} sellerCustIdMap={sellerCustIdMap} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="glass-card w-full justify-start gap-1 p-1 bg-card/60 h-auto flex-wrap">
                {tabs.map((tab) =>
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm data-[state=active]:bg-neon-blue/10 data-[state=active]:text-neon-blue data-[state=active]:tab-glow data-[state=active]:border-neon-blue/30 rounded-lg transition-all border border-transparent">
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                )}
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${selectedSeller}-${dateRange?.from?.getTime()}-${dateRange?.to?.getTime()}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="mt-5">
                  <TabsContent value="executive" className="mt-0 space-y-6">
                    <ExecutivePanel kpis={filteredKpis} />
                    <GrowthPotentialPanel kpis={filteredKpis} />
                    <TrendAnalysisPanel kpis={filteredKpis} />
                  </TabsContent>
                  <TabsContent value="efficiency" className="mt-0">
                    <EfficiencyPanel kpis={filteredKpis} sellerCustIdMap={sellerCustIdMap} />
                  </TabsContent>
                  <TabsContent value="competitiveness" className="mt-0">
                    <CompetitivenessPanel kpis={filteredKpis} sellers={sellers.map((s) => ({ id: s.id, cluster: (s as any).cluster }))} sellerCustIdMap={sellerCustIdMap} listingsQuality={listingsQuality} />
                  </TabsContent>
                  <TabsContent value="logistics" className="mt-0">
                    <LogisticsPanel kpis={filteredKpis} />
                  </TabsContent>
                  <TabsContent value="quality" className="mt-0 space-y-5">
                    <QualityKpiCards
                      scoreCaracteristica={(() => {
                        const latest = [...filteredKpis].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).scoreCaracteristica || 0 : 0;
                      })()}
                      pontuacaoLlGtin={(() => {
                        const latest = [...filteredKpis].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).pontuacaoLlGtin || 0 : 0;
                      })()}
                      scoreOfertaFinal={(() => {
                        const latest = [...filteredKpis].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
                        return latest ? (latest as any).scoreOferta || 0 : 0;
                      })()}
                      totalLiveListings={liveListingsCount || 0}
                    />
                    <QualityRadarPanel kpis={filteredKpis} sellerCustIdMap={sellerCustIdMap} />
                    <CriticalListingsTable listings={listingsQuality || []} />
                  </TabsContent>
                  <TabsContent value="clips" className="mt-0">
                    <ClipsAudiencePanel kpis={filteredKpis} eligibilityItems={eligibilityItems || []} listingsQuality={listingsQuality || []} sellerCustIdMap={sellerCustIdMap} selectedSeller={selectedSeller} />
                  </TabsContent>
                  <TabsContent value="opportunities" className="mt-0">
                    <OpportunitiesPanel items={eligibilityItems || []} />
                  </TabsContent>
                  <TabsContent value="reputation" className="mt-0">
                    <ReputationPanel kpis={filteredKpis} />
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
