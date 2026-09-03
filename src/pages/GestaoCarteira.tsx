import { linhaCsvSegura } from "@/lib/csvSafe";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Briefcase, ExternalLink, AlertTriangle, TrendingUp, TrendingDown,
  Upload, Settings, Download, Search, ChevronRight, FolderPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose,
} from "@/components/ui/drawer";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area, ScatterChart, Scatter,
  ZAxis, Cell, ReferenceLine,
} from "recharts";
import { classificarSeller, loadAlertConfig, saveAlertConfig, type AlertConfig, type SellerAlert, type SellerData } from "@/lib/alerts";
import { abrirSellerNoMeli } from "@/lib/sellerLink";
import { ingestAllFiles } from "@/lib/carteira-ingest";
import KpiCard, { type KpiId } from "@/components/carteira/KpiCard";
import KpiDetailPanel from "@/components/carteira/KpiDetailPanel";
import GraficoReputacao from "@/components/carteira/GraficoReputacao";
import CreatePortfolioModal from "@/components/portfolios/CreatePortfolioModal";
import { usePortfolios } from "@/hooks/usePortfolios";
import AccessScopeBadge from "@/components/AccessScopeBadge";

// ── Types ──
interface CppMensalRow {
  cus_cust_id_sel: number;
  tim_month_id: number;
  mes_ref: string;
  cus_nickname: string;
  cluster_seller: string;
  sub_cluster_seller: string;
  cus_state: string;
  h_l: string;
  nivel_solucion: string;
  tgmv_lc: number;
  tsi: number;
  fecha_in?: string;
  inv_pads: number;
  meses_no_programa: number;
  score_final_full: number;
  total_livelistings: number;
  f_tgmv_lc: number;
}

interface SellersPmRow {
  cust_id: number;
  seller_url: string;
  nmv_lc: number;
  nmv_lc_1: number;
  nmv_lc_2: number;
  vs_pm_pct: number;
  dias_expiracao: number;
  snapshot_date: string;
}

interface EnrichedSeller extends SellerData {
  cluster_seller: string;
  nivel_solucion: string;
  h_l: string;
  cus_state: string;
  score_final_full: number;
  seller_url: string;
  alerts: SellerAlert[];
  worstAlert: SellerAlert | null;
  inv_pads: number;
  meses_no_programa: number;
  f_tgmv_lc: number;
}

// ── Formatters ──
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);

const MEDAL_COLORS: Record<string, string> = {
  PLATINUM: "#1F4E79",
  GOLD: "#D4AF37",
  SILVER: "#9CA3AF",
  BRONZE: "#CD7F32",
};

// ── Data fetching ──
function useCppMensal() {
  return useQuery({
    queryKey: ["cpp_mensal_gm"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cpp_mensal")
        .select("*")
        .order("tim_month_id", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as CppMensalRow[];
    },
    refetchInterval: 60000,
  });
}

function useSellersPm() {
  return useQuery({
    queryKey: ["sellers_pm_gm"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sellers_pm")
        .select("*")
        .order("snapshot_date", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as SellersPmRow[];
    },
    refetchInterval: 60000,
  });
}

function useCdpMensal() {
  return useQuery({
    queryKey: ["cdp_mensal_gm"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cdp_mensal")
        .select("*")
        .limit(5000);
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
    refetchInterval: 60000,
  });
}

function useGmElegibilidade() {
  return useQuery({
    queryKey: ["gm_elegibilidade"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gm_elegibilidade")
        .select("*")
        .limit(5000);
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
    refetchInterval: 60000,
  });
}

function useGmLiveListings() {
  return useQuery({
    queryKey: ["gm_live_listings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gm_live_listings")
        .select("*")
        .limit(5000);
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
    refetchInterval: 60000,
  });
}

// ── Page ──
export default function GestaoCarteira() {
  const { user, isAdmin } = useAuth();
  const { create: createPortfolio, reload: reloadPortfolios } = usePortfolios();
  const { data: cppData = [], isLoading: loadingCpp } = useCppMensal();
  const { data: pmData = [], isLoading: loadingPm } = useSellersPm();
  const { data: cdpData = [] } = useCdpMensal();
  const { data: elegData = [] } = useGmElegibilidade();
  const { data: llData = [] } = useGmLiveListings();

  const [alertConfig, setAlertConfig] = useState<AlertConfig>(loadAlertConfig);
  const [search, setSearch] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<string>("all");
  const [selectedNivel, setSelectedNivel] = useState<string>("all");
  const [selectedHL, setSelectedHL] = useState<string>("all");
  const [drawerSeller, setDrawerSeller] = useState<EnrichedSeller | null>(null);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string>("tgmv_lc");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ingesting, setIngesting] = useState(false);
  const [kpiSelecionado, setKpiSelecionado] = useState<KpiId | null>("tgmv");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Derive available months
  const months = useMemo(() => {
    const s = new Set(cppData.map((r) => r.tim_month_id));
    return Array.from(s).sort((a, b) => b - a);
  }, [cppData]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const activeMonth = selectedMonth ?? months[0] ?? 0;
  const prevMonth = months[months.indexOf(activeMonth) + 1] ?? 0;

  // Available filter values
  const clusters = useMemo(() => [...new Set(cppData.map((r) => r.cluster_seller).filter(Boolean))].sort(), [cppData]);
  const niveis = useMemo(() => [...new Set(cppData.map((r) => r.nivel_solucion).filter(Boolean))].sort(), [cppData]);

  // Enrich sellers
  const enrichedSellers = useMemo<EnrichedSeller[]>(() => {
    const currentMonth = cppData.filter((r) => r.tim_month_id === activeMonth);
    const pmMap = new Map(pmData.map((r) => [r.cust_id, r]));

    return currentMonth.map((cpp) => {
      const pm = pmMap.get(cpp.cus_cust_id_sel);
      const sd: SellerData = {
        cust_id: cpp.cus_cust_id_sel,
        cus_nickname: cpp.cus_nickname || "",
        nmv_lc: pm?.nmv_lc ?? 0,
        nmv_lc_1: pm?.nmv_lc_1 ?? 0,
        nmv_lc_2: pm?.nmv_lc_2 ?? 0,
        vs_pm_pct: pm?.vs_pm_pct ?? 0,
        dias_expiracao: pm?.dias_expiracao ?? 999,
        meses_no_programa: cpp.meses_no_programa ?? 0,
        tgmv_lc: cpp.tgmv_lc ?? 0,
      };
      const alerts = classificarSeller(sd, alertConfig);
      const worstAlert = alerts.length > 0 ? alerts[0] : null;

      return {
        ...sd,
        cluster_seller: cpp.cluster_seller ?? "",
        nivel_solucion: cpp.nivel_solucion ?? "",
        h_l: cpp.h_l ?? "",
        cus_state: cpp.cus_state ?? "",
        score_final_full: cpp.score_final_full ?? 0,
        seller_url: pm?.seller_url ?? "",
        alerts,
        worstAlert,
        inv_pads: cpp.inv_pads ?? 0,
        meses_no_programa: cpp.meses_no_programa ?? 0,
        f_tgmv_lc: cpp.f_tgmv_lc ?? 0,
      };
    });
  }, [cppData, pmData, activeMonth, alertConfig]);

  // Apply filters
  const filteredSellers = useMemo(() => {
    return enrichedSellers.filter((s) => {
      if (selectedCluster !== "all" && s.cluster_seller !== selectedCluster) return false;
      if (selectedNivel !== "all" && s.nivel_solucion !== selectedNivel) return false;
      if (selectedHL !== "all" && s.h_l !== selectedHL) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.cus_nickname.toLowerCase().includes(q) &&
          !String(s.cust_id).includes(q)
        )
          return false;
      }
      return true;
    });
  }, [enrichedSellers, selectedCluster, selectedNivel, selectedHL, search]);

  // Sort
  const sortedSellers = useMemo(() => {
    return [...filteredSellers].sort((a, b) => {
      const av = (a as any)[sortCol] ?? 0;
      const bv = (b as any)[sortCol] ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [filteredSellers, sortCol, sortDir]);

  // Pagination
  const PAGE_SIZE = 50;
  const pagedSellers = sortedSellers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedSellers.length / PAGE_SIZE);

  // KPIs
  const kpis = useMemo(() => {
    const totalTgmv = filteredSellers.reduce((s, r) => s + r.tgmv_lc, 0);
    const activeCount = filteredSellers.filter((r) => r.tgmv_lc > 0).length;
    const emQueda = filteredSellers.filter((r) => r.alerts.some((a) => a.tipo === "QUEDA_3M" || a.tipo === "QUEDA_MOM")).length;
    const emCrescimento = filteredSellers.filter((r) => r.alerts.some((a) => a.tipo === "CRESCIMENTO_3M" || a.tipo === "CRESCIMENTO_MOM")).length;
    const riscoVenc = filteredSellers.filter((r) => r.alerts.some((a) => a.tipo === "VENCIMENTO_PROXIMO" || a.tipo === "VENCIDO")).length;
    const ticket = activeCount > 0 ? totalTgmv / activeCount : 0;

    // delta from previous month
    const prevSellers = cppData.filter((r) => r.tim_month_id === prevMonth);
    const prevTgmv = prevSellers.reduce((s, r) => s + (r.tgmv_lc ?? 0), 0);
    const deltaPct = prevTgmv > 0 ? ((totalTgmv - prevTgmv) / prevTgmv) * 100 : 0;

    return { totalTgmv, activeCount, emQueda, emCrescimento, riscoVenc, ticket, deltaPct };
  }, [filteredSellers, cppData, prevMonth]);

  // Sparkline builders
  const sparkData = useMemo(() => {
    const last12 = months.slice(0, 12).reverse();
    const byMonth = last12.map((m) => {
      const rows = cppData.filter((r) => r.tim_month_id === m);
      const ativos = rows.filter((r) => (r.tgmv_lc ?? 0) > 0);
      const total = ativos.reduce((s, r) => s + (r.tgmv_lc ?? 0), 0);
      return { tgmv: total, ativos: ativos.length, ticket: ativos.length > 0 ? total / ativos.length : 0 };
    });
    return {
      tgmv: byMonth.map((m) => m.tgmv),
      sellers_ativos: byMonth.map((m) => m.ativos),
      ticket_medio: byMonth.map((m) => m.ticket),
      queda: [kpis.emQueda],
      crescimento: [kpis.emCrescimento],
      vencimento: [kpis.riscoVenc],
    };
  }, [months, cppData, kpis]);

  const severidades = useMemo(() => ({
    tgmv: kpis.deltaPct > 0 ? "positivo" as const : kpis.deltaPct < -15 ? "critico" as const : kpis.deltaPct < -5 ? "atencao" as const : "neutro" as const,
    sellers_ativos: "neutro" as const,
    ticket_medio: "neutro" as const,
    queda: kpis.emQueda > 0 ? "atencao" as const : "positivo" as const,
    crescimento: kpis.emCrescimento > 0 ? "positivo" as const : "neutro" as const,
    vencimento: filteredSellers.some((s) => s.dias_expiracao < 0) ? "critico" as const : kpis.riscoVenc > 0 ? "atencao" as const : "neutro" as const,
  }), [kpis, filteredSellers]);

  // Keyboard shortcuts 1-6
  useEffect(() => {
    const KPI_ORDER: KpiId[] = ["tgmv", "sellers_ativos", "ticket_medio", "queda", "crescimento", "vencimento"];
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < 6) setKpiSelecionado(KPI_ORDER[idx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Sellers list for portfolio modal
  const sellerOptions = useMemo(() => {
    const map = new Map<string, { id: string; nickname: string; custId: string }>();
    for (const r of cppData) {
      const cid = String(r.cus_cust_id_sel);
      if (!map.has(cid)) {
        map.set(cid, { id: cid, nickname: r.cus_nickname || cid, custId: cid });
      }
    }
    return Array.from(map.values());
  }, [cppData]);

  // Alert lists
  const alertLists = useMemo(() => {
    const criticos = filteredSellers.filter((s) => s.alerts.some((a) => a.tipo === "CRITICO"));
    const queda = filteredSellers
      .filter((s) => s.alerts.some((a) => a.tipo === "QUEDA_3M" || a.tipo === "QUEDA_MOM"))
      .sort((a, b) => a.vs_pm_pct - b.vs_pm_pct);
    const cresc = filteredSellers
      .filter((s) => s.alerts.some((a) => a.tipo === "CRESCIMENTO_3M" || a.tipo === "CRESCIMENTO_MOM"))
      .sort((a, b) => b.vs_pm_pct - a.vs_pm_pct);
    const vencendo = filteredSellers
      .filter((s) => s.alerts.some((a) => a.tipo === "VENCIMENTO_PROXIMO" || a.tipo === "VENCIDO"))
      .sort((a, b) => a.dias_expiracao - b.dias_expiracao);
    return { criticos, queda, cresc, vencendo };
  }, [filteredSellers]);

  // Top 20 for chart A
  const top20 = useMemo(() =>
    [...filteredSellers].sort((a, b) => b.tgmv_lc - a.tgmv_lc).slice(0, 20),
    [filteredSellers]
  );

  // NMV trail for chart B
  const nmvTrail = useMemo(() => {
    const top10 = [...filteredSellers]
      .filter((s) => s.nmv_lc > 0 || s.nmv_lc_1 > 0 || s.nmv_lc_2 > 0)
      .sort((a, b) => b.nmv_lc - a.nmv_lc)
      .slice(0, 10);
    return top10;
  }, [filteredSellers]);

  // CDP composition for chart C
  const cdpComposition = useMemo(() => {
    const byMonth = new Map<number, Record<string, number>>();
    for (const r of cdpData as any[]) {
      const m = r.tim_month_id as number;
      if (!byMonth.has(m)) {
        byMonth.set(m, { tim_month_id: m, regular: 0, cupom: 0, lightning: 0, dod: 0, dxb: 0, tiers: 0, pre_acordo: 0, automatic: 0, custom_seller: 0 });
      }
      const o = byMonth.get(m)!;
      o.regular += Number(r.f_tgmv_lc_regular) || 0;
      o.cupom += Number(r.f_tgmv_lc_cupom) || 0;
      o.lightning += Number(r.f_tgmv_lc_lightning) || 0;
      o.dod += Number(r.f_tgmv_lc_dod) || 0;
      o.dxb += Number(r.f_tgmv_lc_dxb) || 0;
      o.tiers += Number(r.f_tgmv_lc_tiers) || 0;
      o.pre_acordo += Number(r.f_tgmv_lc_pre_acordo) || 0;
      o.automatic += Number(r.f_tgmv_lc_automatic) || 0;
      o.custom_seller += Number(r.f_tgmv_lc_custom_seller) || 0;
    }
    return Array.from(byMonth.values()).sort((a, b) => a.tim_month_id - b.tim_month_id).slice(-6);
  }, [cdpData]);

  // Elegibility funnel for chart F
  const funnel = useMemo(() => {
    const total = (elegData as any[]).length;
    const sellerOptin = (elegData as any[]).filter((r) => r.flag_seller_optin).length;
    const itemOptin = (elegData as any[]).filter((r) => r.flag_seller_optin && r.flag_item_optin).length;
    const comPedidos = (elegData as any[]).filter((r) => r.flag_seller_optin && r.flag_item_optin && Number(r.pedidos_7d) > 0).length;
    return [
      { etapa: "Itens elegíveis", valor: total },
      { etapa: "Com optin seller", valor: sellerOptin },
      { etapa: "Com optin item", valor: itemOptin },
      { etapa: "Com pedidos 7d", valor: comPedidos },
    ];
  }, [elegData]);

  // Heatmap for chart E
  const heatmapData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of llData as any[]) {
      const key = `${r.cluster_seller}|${r.vertical}`;
      map.set(key, (map.get(key) || 0) + (Number(r.itens) || 0));
    }
    return Array.from(map.entries()).map(([k, v]) => {
      const [cluster, vertical] = k.split("|");
      return { cluster, vertical, itens: v };
    });
  }, [llData]);

  // CSV ingest handler
  const handleIngest = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;
    setIngesting(true);
    try {
      const files: { name: string; content: string }[] = [];
      for (const file of Array.from(filesList)) {
        const content = await file.text();
        files.push({ name: file.name, content });
      }
      const results = await ingestAllFiles(files, user?.id || "");
      const totalRows = results.reduce((s, r) => s + r.rowsUpserted, 0);
      const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
      toast.success(`Importação concluída: ${totalRows} linhas em ${results.length} arquivos. ${totalErrors} erros.`);
    } catch (err: any) {
      toast.error(`Erro na importação: ${err.message}`);
    } finally {
      setIngesting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [user]);

  // Sort handler
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  // Export CSV
  const handleExport = () => {
    const headers = ["Status", "Nickname", "CustID", "Cluster", "Nível", "H/L", "UF", "TGMV", "Δ MoM%", "Score", "Dias Exp."];
    const csvRows = sortedSellers.map((s) => [
      s.worstAlert?.tipo ?? "OK",
      s.cus_nickname,
      s.cust_id,
      s.cluster_seller,
      s.nivel_solucion,
      s.h_l,
      s.cus_state,
      s.tgmv_lc.toFixed(2),
      s.vs_pm_pct.toFixed(1),
      s.score_final_full.toFixed(1),
      s.dias_expiracao,
    ]);
    const csv = [linhaCsvSegura(headers, ","), ...csvRows.map((r) => linhaCsvSegura(r, ","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "carteira_gm.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = loadingCpp || loadingPm;

  // Alert config save
  const handleSaveConfig = (cfg: AlertConfig) => {
    setAlertConfig(cfg);
    saveAlertConfig(cfg);
    toast.success("Configurações salvas");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple nav bar */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = "/"}>← Dashboard</Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = "/cpp"}>CPP</Button>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <AccessScopeBadge />
        {/* Title + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Gestão de Carteira GM</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv"
                  className="hidden"
                  onChange={handleIngest}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ingesting}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  {ingesting ? "Importando..." : "Atualizar dados"}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Criar Carteira
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm"><Settings className="w-4 h-4" /></Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>Configurações de Alertas</SheetTitle></SheetHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Limiar de queda MoM (%)</label>
                    <Input
                      type="number"
                      value={alertConfig.quedaPct}
                      onChange={(e) => handleSaveConfig({ ...alertConfig, quedaPct: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Limiar de crescimento MoM (%)</label>
                    <Input
                      type="number"
                      value={alertConfig.crescimentoPct}
                      onChange={(e) => handleSaveConfig({ ...alertConfig, crescimentoPct: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Janela de dias (vencimento)</label>
                    <Input
                      type="number"
                      value={alertConfig.diasJanela}
                      onChange={(e) => handleSaveConfig({ ...alertConfig, diasJanela: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-card/50 border border-border/50 rounded-lg p-3 sticky top-0 z-10 backdrop-blur-sm">
          <Select value={activeMonth ? String(activeMonth) : ""} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {String(m).slice(4)}/{String(m).slice(0, 4)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCluster} onValueChange={setSelectedCluster}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Cluster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos clusters</SelectItem>
              {clusters.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedNivel} onValueChange={setSelectedNivel}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos níveis</SelectItem>
              {niveis.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedHL} onValueChange={setSelectedHL}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="H/L" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="HIGH TOUCH">High Touch</SelectItem>
              <SelectItem value="LOW TOUCH">Low Touch</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por Nickname ou Cust ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* KPI Cards — animate on filter change */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard id="tgmv" titulo="TGMV Total" valor={fmtBRL(kpis.totalTgmv)}
            delta={{ pct: kpis.deltaPct, direcao: kpis.deltaPct > 0 ? "up" : kpis.deltaPct < 0 ? "down" : "flat" }}
            sparkline={sparkData.tgmv} severidade={severidades.tgmv}
            selected={kpiSelecionado === "tgmv"} onExpandir={setKpiSelecionado} />
          <KpiCard id="sellers_ativos" titulo="Sellers Ativos" valor={String(kpis.activeCount)}
            sparkline={sparkData.sellers_ativos} severidade={severidades.sellers_ativos}
            selected={kpiSelecionado === "sellers_ativos"} onExpandir={setKpiSelecionado} />
          <KpiCard id="ticket_medio" titulo="Ticket Médio" valor={fmtBRL(kpis.ticket)}
            sparkline={sparkData.ticket_medio} severidade={severidades.ticket_medio}
            selected={kpiSelecionado === "ticket_medio"} onExpandir={setKpiSelecionado} />
          <KpiCard id="queda" titulo="Em Queda" valor={String(kpis.emQueda)}
            sparkline={sparkData.queda} severidade={severidades.queda}
            selected={kpiSelecionado === "queda"} onExpandir={setKpiSelecionado} />
          <KpiCard id="crescimento" titulo="Em Crescimento" valor={String(kpis.emCrescimento)}
            sparkline={sparkData.crescimento} severidade={severidades.crescimento}
            selected={kpiSelecionado === "crescimento"} onExpandir={setKpiSelecionado} />
          <KpiCard id="vencimento" titulo="Risco Vencimento" valor={String(kpis.riscoVenc)}
            sparkline={sparkData.vencimento} severidade={severidades.vencimento}
            selected={kpiSelecionado === "vencimento"} onExpandir={setKpiSelecionado} />
        </div>

        {/* KPI Detail Panel */}
        {kpiSelecionado && (
          <KpiDetailPanel
            kpiId={kpiSelecionado}
            onClose={() => setKpiSelecionado(null)}
            cppData={cppData as any}
            pmData={pmData as any}
            filteredSellers={filteredSellers as any}
            months={months}
            activeMonth={activeMonth}
            setDrawerSeller={setDrawerSeller}
          />
        )}

        {/* Alert Center */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Central de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="criticos">
              <TabsList className="mb-3">
                <TabsTrigger value="criticos">
                  Críticos ({alertLists.criticos.length})
                </TabsTrigger>
                <TabsTrigger value="queda">
                  Em queda ({alertLists.queda.length})
                </TabsTrigger>
                <TabsTrigger value="crescimento">
                  Crescimento ({alertLists.cresc.length})
                </TabsTrigger>
                <TabsTrigger value="vencendo">
                  Vencimento ({alertLists.vencendo.length})
                </TabsTrigger>
              </TabsList>

              {(["criticos", "queda", "crescimento", "vencendo"] as const).map((tab) => {
                const list =
                  tab === "criticos" ? alertLists.criticos :
                  tab === "queda" ? alertLists.queda :
                  tab === "crescimento" ? alertLists.cresc :
                  alertLists.vencendo;

                return (
                  <TabsContent key={tab} value={tab} className="space-y-2 max-h-[300px] overflow-y-auto">
                    {list.length === 0 && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-muted-foreground py-4 text-center"
                      >
                        Nenhum alerta nesta categoria
                      </motion.p>
                    )}
                    <AnimatePresence mode="popLayout">
                    {list.slice(0, 20).map((s, idx) => (
                      <motion.div
                        key={s.cust_id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.25, delay: idx * 0.03 }}
                        className={`flex items-center justify-between border rounded-lg p-3 ${
                          s.alerts.some((a) => a.pulsante) ? "animate-pulse border-red-500/50" : "border-border/50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{s.cus_nickname}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {s.nivel_solucion}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {s.alerts[0]?.mensagem}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs tabular-nums">NMV: {fmtCompact(s.nmv_lc)}</span>
                            {/* Mini sparkline */}
                            <div className="flex items-end gap-px h-4">
                              {[s.nmv_lc_2, s.nmv_lc_1, s.nmv_lc].map((v, i) => {
                                const max = Math.max(s.nmv_lc_2, s.nmv_lc_1, s.nmv_lc, 1);
                                return (
                                  <div
                                    key={i}
                                    className="w-2 rounded-sm bg-primary/60"
                                    style={{ height: `${Math.max((v / max) * 16, 2)}px` }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDrawerSeller(s)}
                          >
                            Detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Abrir seller ${s.cus_nickname} no MELI Partners`}
                            onClick={() => abrirSellerNoMeli(s.cust_id, s.cus_nickname)}
                          >
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <motion.div
          key={`charts-${selectedCluster}-${selectedNivel}-${selectedHL}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* Chart A — Top 20 TGMV */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top 20 Sellers por TGMV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top20} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" tickFormatter={(v) => fmtCompact(v)} />
                    <YAxis
                      type="category"
                      dataKey="cus_nickname"
                      tick={{ fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v: number) => fmtBRL(v)}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar
                      dataKey="tgmv_lc"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(d: any) => {
                        const seller = top20.find((s) => s.cus_nickname === d.cus_nickname);
                        if (seller) setDrawerSeller(seller);
                      }}
                    >
                      {top20.map((s, i) => (
                        <Cell
                          key={i}
                          fill={MEDAL_COLORS[s.nivel_solucion] || "hsl(var(--primary))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Barras coloridas por nível de solução. Clique para ver detalhes do seller.
              </p>
            </CardContent>
          </Card>

          {/* Chart B — NMV Trail */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trilha de NMV (3 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { label: "M-2", ...Object.fromEntries(nmvTrail.map((s) => [s.cus_nickname, s.nmv_lc_2])) },
                      { label: "M-1", ...Object.fromEntries(nmvTrail.map((s) => [s.cus_nickname, s.nmv_lc_1])) },
                      { label: "M", ...Object.fromEntries(nmvTrail.map((s) => [s.cus_nickname, s.nmv_lc])) },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(v) => fmtCompact(v)} />
                    <Tooltip
                      formatter={(v: number) => fmtBRL(v)}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    {nmvTrail.map((s, i) => (
                      <Line
                        key={s.cust_id}
                        type="monotone"
                        dataKey={s.cus_nickname}
                        stroke={`hsl(${(i * 36) % 360} 70% 55%)`}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Evolução de NMV dos top 10 sellers nos últimos 3 meses.
              </p>
            </CardContent>
          </Card>

          {/* Chart C — CDP Composition */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Composição do TGMV por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cdpComposition}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="tim_month_id"
                      tickFormatter={(v) => `${String(v).slice(4)}/${String(v).slice(2, 4)}`}
                    />
                    <YAxis tickFormatter={(v) => fmtCompact(v)} />
                    <Tooltip
                      formatter={(v: number, name: string) => [fmtBRL(v), name]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    {[
                      { key: "regular", color: "#3B82F6" },
                      { key: "cupom", color: "#8B5CF6" },
                      { key: "lightning", color: "#F59E0B" },
                      { key: "dod", color: "#EF4444" },
                      { key: "dxb", color: "#10B981" },
                      { key: "tiers", color: "#6366F1" },
                      { key: "pre_acordo", color: "#EC4899" },
                      { key: "automatic", color: "#14B8A6" },
                      { key: "custom_seller", color: "#F97316" },
                    ].map(({ key, color }) => (
                      <Bar key={key} dataKey={key} stackId="a" fill={color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {cdpComposition.length > 0 && (() => {
                const last = cdpComposition[cdpComposition.length - 1];
                const total = Object.entries(last).filter(([k]) => k !== "tim_month_id").reduce((s, [, v]) => s + (v as number), 0);
                const dominant = Object.entries(last).filter(([k]) => k !== "tim_month_id").sort(([, a], [, b]) => (b as number) - (a as number))[0];
                const pct = total > 0 ? (((dominant[1] as number) / total) * 100).toFixed(0) : 0;
                return <p className="text-[11px] text-muted-foreground mt-1">Origem dominante este mês: {dominant[0]} ({pct}%)</p>;
              })()}
            </CardContent>
          </Card>

          {/* Chart D — Scatter */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Eficiência: TGMV vs Investimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      type="number"
                      dataKey="inv"
                      name="Investimento"
                      tickFormatter={(v) => fmtCompact(v)}
                    />
                    <YAxis
                      type="number"
                      dataKey="tgmv"
                      name="TGMV"
                      tickFormatter={(v) => fmtCompact(v)}
                    />
                    <ZAxis type="number" dataKey="meses" range={[30, 200]} />
                    <Tooltip
                      formatter={(v: number) => fmtBRL(v)}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Scatter
                      data={filteredSellers.slice(0, 100).map((s) => ({
                        inv: s.inv_pads,
                        tgmv: s.tgmv_lc,
                        meses: s.meses_no_programa,
                        name: s.cus_nickname,
                        color: s.alerts.some((a) => a.tipo.startsWith("QUEDA"))
                          ? "#EF4444"
                          : s.alerts.some((a) => a.tipo.startsWith("CRESCIMENTO"))
                          ? "#10B981"
                          : "#6B7280",
                      }))}
                    >
                      {filteredSellers.slice(0, 100).map((s, i) => (
                        <Cell
                          key={i}
                          fill={
                            s.alerts.some((a) => a.tipo.startsWith("QUEDA"))
                              ? "#EF4444"
                              : s.alerts.some((a) => a.tipo.startsWith("CRESCIMENTO"))
                              ? "#10B981"
                              : "#6B7280"
                          }
                          fillOpacity={0.7}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Tamanho do ponto: tempo no programa. Cor: verde=crescimento, vermelho=queda.
              </p>
            </CardContent>
          </Card>

          {/* Chart F — Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Funil de Elegibilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="etapa" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                      {funnel.map((_, i) => (
                        <Cell key={i} fill={`hsl(${210 + i * 20} 70% ${55 - i * 5}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {funnel.length > 1 && funnel[0].valor > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Conversão total: {((funnel[funnel.length - 1].valor / funnel[0].valor) * 100).toFixed(1)}% dos itens elegíveis geraram pedidos.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Chart E — Heatmap (simplified as bar) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Itens por Cluster × Vertical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={heatmapData.sort((a, b) => b.itens - a.itens).slice(0, 15)}
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="cluster"
                      tick={{ fontSize: 10 }}
                      width={120}
                      tickFormatter={(v, i) => {
                        const item = heatmapData.sort((a, b) => b.itens - a.itens)[i];
                        return item ? `${item.cluster?.slice(0, 10)} | ${item.vertical?.slice(0, 10)}` : v;
                      }}
                    />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="itens" fill="hsl(210 70% 50%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Top combinações de Cluster × Vertical por quantidade de itens ativos.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reputation Chart */}
        <GraficoReputacao />

        {/* Full Table */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Carteira Completa</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("cus_nickname")}>Nickname</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>H/L</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("tgmv_lc")}>TGMV</TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("vs_pm_pct")}>Δ MoM</TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("score_final_full")}>Score</TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("dias_expiracao")}>Dias Exp.</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                  {pagedSellers.map((s, idx) => (
                    <motion.tr
                      key={s.cust_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.015 }}
                      className="border-b cursor-pointer hover:bg-muted/30 transition-colors data-[state=selected]:bg-muted"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") abrirSellerNoMeli(s.cust_id, s.cus_nickname); }}
                    >
                      <TableCell>
                        {s.worstAlert ? (
                          <Badge
                            className="text-[10px]"
                            style={{ background: s.worstAlert.cor, color: "#fff" }}
                          >
                            {s.worstAlert.tipo.replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {s.cus_nickname}
                          <button
                            onClick={(e) => { e.stopPropagation(); abrirSellerNoMeli(s.cust_id, s.cus_nickname); }}
                            aria-label={`Abrir seller ${s.cus_nickname} no MELI Partners`}
                            title="Ctrl/Cmd+click para abrir em background"
                          >
                            <ExternalLink className="w-3 h-3 text-primary opacity-60 hover:opacity-100" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{s.cluster_seller}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{ borderColor: MEDAL_COLORS[s.nivel_solucion] || "hsl(var(--border))" }}
                        >
                          {s.nivel_solucion}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{s.h_l}</TableCell>
                      <TableCell className="text-xs">{s.cus_state}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtCompact(s.tgmv_lc)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${s.vs_pm_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {fmtPct(s.vs_pm_pct)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.score_final_full.toFixed(1)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${
                        s.dias_expiracao < 0 ? "text-red-500" : s.dias_expiracao <= 30 ? "text-orange-400" : ""
                      }`}>
                        {s.dias_expiracao}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDrawerSeller(s)}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                {sortedSellers.length} sellers • Página {page + 1} de {Math.max(totalPages, 1)}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seller Detail Drawer */}
      <Drawer open={!!drawerSeller} onOpenChange={(open) => !open && setDrawerSeller(null)}>
        <DrawerContent className="max-h-[85vh]">
          {drawerSeller && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2 flex-wrap">
                  {drawerSeller.cus_nickname}
                  <Badge variant="outline" className="text-xs">{drawerSeller.cust_id}</Badge>
                  <Badge style={{ background: MEDAL_COLORS[drawerSeller.nivel_solucion] || "hsl(var(--primary))", color: "#fff" }} className="text-xs">
                    {drawerSeller.nivel_solucion}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{drawerSeller.cluster_seller}</Badge>
                  <Badge variant="outline" className="text-xs">{drawerSeller.h_l}</Badge>
                  <Badge variant="outline" className="text-xs">{drawerSeller.cus_state}</Badge>
                </DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Drawer KPIs */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">TGMV</p>
                    <p className="font-bold tabular-nums text-sm">{fmtCompact(drawerSeller.tgmv_lc)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Δ MoM</p>
                    <p className={`font-bold tabular-nums text-sm ${drawerSeller.vs_pm_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {fmtPct(drawerSeller.vs_pm_pct)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">NMV</p>
                    <p className="font-bold tabular-nums text-sm">{fmtCompact(drawerSeller.nmv_lc)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Score</p>
                    <p className="font-bold tabular-nums text-sm">{drawerSeller.score_final_full.toFixed(1)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Meses Pgm</p>
                    <p className="font-bold tabular-nums text-sm">{drawerSeller.meses_no_programa}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Dias Exp.</p>
                    <p className={`font-bold tabular-nums text-sm ${drawerSeller.dias_expiracao < 0 ? "text-red-500" : drawerSeller.dias_expiracao <= 30 ? "text-orange-400" : ""}`}>
                      {drawerSeller.dias_expiracao}
                    </p>
                  </div>
                </div>

                {/* NMV Mini Chart */}
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { label: "M-2", value: drawerSeller.nmv_lc_2 },
                      { label: "M-1", value: drawerSeller.nmv_lc_1 },
                      { label: "M", value: drawerSeller.nmv_lc },
                    ]}>
                      <XAxis dataKey="label" />
                      <YAxis tickFormatter={(v) => fmtCompact(v)} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Alerts */}
                {drawerSeller.alerts.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Alertas ativos</p>
                    {drawerSeller.alerts.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: a.cor }} />
                        <span className="text-xs">{a.mensagem}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Open MELI */}
                <Button
                  className="w-full"
                  onClick={() => abrirSellerNoMeli(drawerSeller.cust_id, drawerSeller.cus_nickname)}
                  aria-label={`Abrir seller ${drawerSeller.cus_nickname} no MELI Partners`}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir seller no MELI Partners
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <CreatePortfolioModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={reloadPortfolios}
        sellers={sellerOptions}
        createPortfolio={createPortfolio}
      />
    </div>
  );
}