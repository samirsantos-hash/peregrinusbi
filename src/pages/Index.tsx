import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Shield, Swords, Truck, Loader2, Settings, LogOut } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { useNavigate } from "react-router-dom";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EfficiencyPanel from "@/components/dashboard/EfficiencyPanel";
import QualityPanel from "@/components/dashboard/QualityPanel";
import CompetitivenessPanel from "@/components/dashboard/CompetitivenessPanel";
import LogisticsPanel from "@/components/dashboard/LogisticsPanel";
import DiagnosticAlerts from "@/components/dashboard/DiagnosticAlerts";
import CsvUploadModal from "@/components/dashboard/CsvUploadModal";
import { useSellers, useSellerKpis } from "@/hooks/useSellerData";
import { useAuth } from "@/hooks/useAuth";
import { sellers as mockSellers, sellerKPIs as mockSellerKPIs } from "@/data/mockData";

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 365),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("efficiency");

  // Fetch real data (RLS will filter based on user's allowed_cust_ids)
  const { data: dbSellers, isLoading: loadingSellers, isFetched: sellersFetched } = useSellers();

  const hasRealData = sellersFetched && dbSellers && dbSellers.length > 0;

  const sellers = useMemo(() => {
    if (!sellersFetched) return [];
    if (hasRealData) return dbSellers!.map(s => ({ id: s.id, nickname: s.nickname, custId: s.custId }));
    // Only show mock data for admin (for demo purposes)
    if (isAdmin) return mockSellers;
    return [];
  }, [hasRealData, dbSellers, sellersFetched, isAdmin]);

  // If user has no sellers and is not admin, redirect to no-access
  useEffect(() => {
    if (sellersFetched && sellers.length === 0 && !isAdmin) {
      navigate("/no-access", { replace: true });
    }
  }, [sellersFetched, sellers.length, isAdmin, navigate]);

  useEffect(() => {
    if (sellers.length > 0 && (!selectedSeller || !sellers.find(s => s.id === selectedSeller))) {
      setSelectedSeller(sellers[0].id);
    }
  }, [sellers]);

  const { data: dbKpis, isLoading: loadingKpis } = useSellerKpis(
    hasRealData ? selectedSeller : undefined
  );

  const filteredKpis = useMemo(() => {
    let kpis: any[];
    if (hasRealData) {
      kpis = dbKpis || [];
    } else {
      kpis = (mockSellerKPIs[selectedSeller] || []);
    }

    if (!dateRange?.from) return kpis;

    return kpis.filter((k: any) => {
      const d = new Date(k.date);
      const from = dateRange.from!;
      const to = dateRange.to || from;
      return d >= from && d <= to;
    });
  }, [hasRealData, dbKpis, selectedSeller, dateRange]);

  const tabs = [
    { id: "efficiency", label: "Eficiência", icon: BarChart3 },
    { id: "quality", label: "Qualidade", icon: Shield },
    { id: "competitiveness", label: "Competitividade", icon: Swords },
    { id: "logistics", label: "Logística", icon: Truck },
  ];

  const isLoading = !sellersFetched || (hasRealData && loadingKpis);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--neon-blue)) 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 rounded-full bg-neon-blue" style={{ boxShadow: '0 0 12px hsl(199, 100%, 50%)' }} />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Seller Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Gestão de Performance · Mercado Livre
                {sellersFetched && hasRealData && <span className="ml-2 text-emerald">● Dados reais</span>}
                {sellersFetched && !hasRealData && isAdmin && <span className="ml-2 text-warning">● Dados de demonstração</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <CsvUploadModal onSuccess={() => window.location.reload()} />
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </motion.div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
          </div>
        )}

        {!isLoading && sellers.length > 0 && (
          <>
            <DashboardHeader
              sellers={sellers}
              selectedSeller={selectedSeller}
              onSellerChange={setSelectedSeller}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              kpis={filteredKpis}
            />

            <DiagnosticAlerts kpis={filteredKpis} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="glass-card w-full justify-start gap-1 p-1 bg-card/60 h-auto">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm data-[state=active]:bg-neon-blue/10 data-[state=active]:text-neon-blue data-[state=active]:tab-glow data-[state=active]:border-neon-blue/30 rounded-lg transition-all border border-transparent"
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${selectedSeller}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="mt-5"
                >
                  <TabsContent value="efficiency" className="mt-0">
                    <EfficiencyPanel kpis={filteredKpis} />
                  </TabsContent>
                  <TabsContent value="quality" className="mt-0">
                    <QualityPanel kpis={filteredKpis} />
                  </TabsContent>
                  <TabsContent value="competitiveness" className="mt-0">
                    <CompetitivenessPanel kpis={filteredKpis} />
                  </TabsContent>
                  <TabsContent value="logistics" className="mt-0">
                    <LogisticsPanel kpis={filteredKpis} />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
