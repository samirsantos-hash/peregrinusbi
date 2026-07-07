import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingDown,
  EyeOff,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolios } from "@/hooks/usePortfolios";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ItemRow = {
  item_id: string;
  seller_id: string;
  data: string;
  visitas_clips: number | null;
  orders_clips: number | null;
  tgmv_lc_clips: number | null;
};

type SellerLookup = Record<string, { custId: string; nickname: string }>;

type DropRow = {
  mlb: string;
  nickname: string;
  atual: number;
  anterior: number;
  variacao: number; // %
};

type NoSalesRow = {
  mlb: string;
  nickname: string;
  ultimaVenda: string | null;
  diasSemVenda: number;
  status: "Sem venda" | "Sem histórico";
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const REF_DATE = new Date("2026-03-24T00:00:00Z");
const daysBetween = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / 86_400_000);
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
const fmtInt = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v));
const fmtPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function pctChange(atual: number, anterior: number) {
  if (!anterior) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

function useMLBData(custIds: string[] | null) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [sellers, setSellers] = useState<SellerLookup>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // 1) Sellers lookup (optionally filtered by portfolio cust_ids)
      const sellerQ = supabase.from("sellers").select("id, cust_id, nickname");
      if (custIds && custIds.length) sellerQ.in("cust_id", custIds);
      const { data: sellersData } = await sellerQ;

      const lookup: SellerLookup = {};
      const sellerIds: string[] = [];
      (sellersData || []).forEach((s: any) => {
        lookup[s.id] = {
          custId: s.cust_id,
          nickname: (s.nickname || "").trim() || `Loja ${s.cust_id}`,
        };
        sellerIds.push(s.id);
      });

      // 2) MLB-level metrics — only per-MLB source in current schema
      let itemsData: any[] = [];
      if (!custIds || sellerIds.length) {
        const itemQ = supabase
          .from("seller_listings_quality")
          .select("item_id, seller_id, data, visitas_clips, orders_clips, tgmv_lc_clips")
          .order("data", { ascending: false })
          .limit(20000);
        if (custIds && sellerIds.length) itemQ.in("seller_id", sellerIds);
        const { data } = await itemQ;
        itemsData = data || [];
      }

      if (cancelled) return;
      setSellers(lookup);
      setItems(itemsData as ItemRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [custIds?.join(",") ?? "__all__"]);

  return { items, sellers, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section builders
// ─────────────────────────────────────────────────────────────────────────────
function buildPeriodCompare(
  items: ItemRow[],
  sellers: SellerLookup,
  metric: "tgmv_lc_clips" | "visitas_clips",
  windowDays = 15
): DropRow[] {
  const cur0 = new Date(REF_DATE);
  const curStart = new Date(cur0);
  curStart.setDate(curStart.getDate() - (windowDays - 1));
  const prevEnd = new Date(curStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (windowDays - 1));

  const agg = new Map<string, { atual: number; anterior: number; seller_id: string }>();
  for (const it of items) {
    if (!it.item_id || !it.data) continue;
    const d = new Date(it.data);
    const v = Number(it[metric] || 0);
    const cur = agg.get(it.item_id) || {
      atual: 0,
      anterior: 0,
      seller_id: it.seller_id,
    };
    if (d >= curStart && d <= cur0) cur.atual += v;
    else if (d >= prevStart && d <= prevEnd) cur.anterior += v;
    agg.set(it.item_id, cur);
  }

  const rows: DropRow[] = [];
  agg.forEach((v, mlb) => {
    const variacao = pctChange(v.atual, v.anterior);
    if (v.anterior === 0 && v.atual === 0) return;
    if (variacao >= 0) return; // only drops
    rows.push({
      mlb,
      nickname: sellers[v.seller_id]?.nickname || "—",
      atual: v.atual,
      anterior: v.anterior,
      variacao,
    });
  });
  return rows;
}

function buildNoSales(items: ItemRow[], sellers: SellerLookup): NoSalesRow[] {
  const last = new Map<string, { date: Date | null; seller_id: string }>();
  for (const it of items) {
    const cur = last.get(it.item_id) || { date: null, seller_id: it.seller_id };
    const orders = Number(it.orders_clips || 0);
    if (orders > 0) {
      const d = new Date(it.data);
      if (!cur.date || d > cur.date) cur.date = d;
    }
    last.set(it.item_id, cur);
  }
  const rows: NoSalesRow[] = [];
  last.forEach((v, mlb) => {
    const dias = v.date ? daysBetween(REF_DATE, v.date) : 9999;
    if (dias < 15) return;
    rows.push({
      mlb,
      nickname: sellers[v.seller_id]?.nickname || "—",
      ultimaVenda: v.date ? v.date.toISOString().slice(0, 10) : null,
      diasSemVenda: dias,
      status: v.date ? "Sem venda" : "Sem histórico",
    });
  });
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable table
// ─────────────────────────────────────────────────────────────────────────────
function useSort<T>(rows: T[], initial: keyof T, initialDir: "asc" | "desc" = "asc") {
  const [col, setCol] = useState<keyof T>(initial);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);
  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av;
      }
      return dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [rows, col, dir]);
  const toggle = (c: keyof T) => {
    if (c === col) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setCol(c);
      setDir("asc");
    }
  };
  const icon = (c: keyof T) =>
    c !== col ? (
      <ArrowUpDown className="w-3 h-3 opacity-40" />
    ) : dir === "asc" ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  return { sorted, toggle, icon, col, dir };
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Sections
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
      <Info className="w-4 h-4" />
      {message}
    </div>
  );
}

function DropSection({
  rows,
  metricLabel,
  valueFmt,
}: {
  rows: DropRow[];
  metricLabel: string;
  valueFmt: (v: number) => string;
}) {
  const { sorted, toggle, icon } = useSort<DropRow>(rows, "variacao", "asc");
  if (!rows.length) return <EmptyState message="Nenhum MLB com queda no período." />;
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => toggle("mlb")}>
              <span className="inline-flex items-center gap-1">MLB ID {icon("mlb")}</span>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggle("nickname")}>
              <span className="inline-flex items-center gap-1">Loja {icon("nickname")}</span>
            </TableHead>
            <TableHead className="text-right cursor-pointer" onClick={() => toggle("atual")}>
              <span className="inline-flex items-center gap-1">{metricLabel} atual {icon("atual")}</span>
            </TableHead>
            <TableHead className="text-right cursor-pointer" onClick={() => toggle("anterior")}>
              <span className="inline-flex items-center gap-1">{metricLabel} anterior {icon("anterior")}</span>
            </TableHead>
            <TableHead className="text-right cursor-pointer" onClick={() => toggle("variacao")}>
              <span className="inline-flex items-center gap-1">Δ % {icon("variacao")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.slice(0, 200).map((r) => (
            <TableRow key={r.mlb}>
              <TableCell className="font-mono text-xs">{r.mlb}</TableCell>
              <TableCell className="text-xs">{r.nickname}</TableCell>
              <TableCell className="text-right tabular-nums">{valueFmt(r.atual)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {valueFmt(r.anterior)}
              </TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center gap-1 text-destructive font-medium tabular-nums">
                  <ArrowDown className="w-3 h-3" />
                  {fmtPct(r.variacao)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function NoSalesSection({ rows }: { rows: NoSalesRow[] }) {
  const { sorted, toggle, icon } = useSort<NoSalesRow>(rows, "diasSemVenda", "desc");
  if (!rows.length) return <EmptyState message="Nenhum MLB sem venda há +15 dias." />;
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => toggle("mlb")}>
              <span className="inline-flex items-center gap-1">MLB ID {icon("mlb")}</span>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggle("nickname")}>
              <span className="inline-flex items-center gap-1">Loja {icon("nickname")}</span>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggle("ultimaVenda")}>
              <span className="inline-flex items-center gap-1">Última venda {icon("ultimaVenda")}</span>
            </TableHead>
            <TableHead className="text-right cursor-pointer" onClick={() => toggle("diasSemVenda")}>
              <span className="inline-flex items-center gap-1">Dias sem venda {icon("diasSemVenda")}</span>
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.slice(0, 200).map((r) => (
            <TableRow key={r.mlb}>
              <TableCell className="font-mono text-xs">{r.mlb}</TableCell>
              <TableCell className="text-xs">{r.nickname}</TableCell>
              <TableCell className="text-xs">{r.ultimaVenda || "—"}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {r.diasSemVenda >= 9999 ? "—" : fmtInt(r.diasSemVenda)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={r.status === "Sem venda" ? "destructive" : "outline"}
                  className="text-[10px]"
                >
                  {r.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AnaliseMLB() {
  const navigate = useNavigate();
  const { portfolios, loading: loadingPort } = usePortfolios();
  const [portfolioId, setPortfolioId] = useState<string>("__all__");

  const custIds = useMemo(() => {
    if (portfolioId === "__all__") return null;
    return portfolios.find((p) => p.id === portfolioId)?.cust_ids || [];
  }, [portfolioId, portfolios]);

  const { items, sellers, loading } = useMLBData(custIds);

  const gmvDrops = useMemo(
    () => buildPeriodCompare(items, sellers, "tgmv_lc_clips", 15),
    [items, sellers]
  );
  const noSales = useMemo(() => buildNoSales(items, sellers), [items, sellers]);
  const visitsDrops = useMemo(
    () =>
      buildPeriodCompare(items, sellers, "visitas_clips", 15).filter(
        (r) => r.variacao <= -20
      ),
    [items, sellers]
  );

  const isEmpty = !loading && items.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div className="w-2 h-8 rounded-full bg-neon-blue" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Análise de MLB</h1>
              <p className="text-xs text-muted-foreground">
                Anúncios em queda, sem vendas e com perda de visitas — janela 15 dias vs
                15 dias anteriores (ref. 24/03/2026)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={portfolioId} onValueChange={setPortfolioId}>
              <SelectTrigger className="w-[240px] h-9 text-xs">
                <SelectValue placeholder="Filtrar por carteira" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as carteiras</SelectItem>
                {portfolios.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.cust_ids.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {isEmpty && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-4 flex items-start gap-3 text-xs">
              <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Sem dados por MLB disponíveis no momento.</p>
                <p className="text-muted-foreground">
                  As tabelas <code>live_listings</code>, <code>cpp_mensal</code> e{" "}
                  <code>cdp_mensal</code> armazenam agregados por categoria e por seller/mês —
                  não guardam GMV, vendas ou visitas <em>por anúncio ao longo do tempo</em>.
                  Assim que a ingestão por MLB (via <code>seller_listings_quality</code> ou
                  nova fonte) estiver populada, estas listas passam a operar automaticamente.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="queda-gmv" className="w-full">
          <TabsList className="glass-card bg-card/60 p-1">
            <TabsTrigger value="queda-gmv" className="gap-2 text-xs">
              <TrendingDown className="w-3.5 h-3.5" /> Queda de GMV/Vendas
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {gmvDrops.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sem-vendas" className="gap-2 text-xs">
              <Clock className="w-3.5 h-3.5" /> Sem vendas +15d
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {noSales.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="queda-visitas" className="gap-2 text-xs">
              <EyeOff className="w-3.5 h-3.5" /> Queda de visitas &gt;20%
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {visitsDrops.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queda-gmv">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">MLBs em queda de GMV / vendas</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Compara TGMV dos últimos 15 dias vs. 15 dias anteriores. Ordenável por
                  qualquer coluna.
                </p>
              </CardHeader>
              <CardContent>
                <DropSection rows={gmvDrops} metricLabel="GMV" valueFmt={fmtBRL} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sem-vendas">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">MLBs sem vendas há mais de 15 dias</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Data-referência: 24/03/2026. Considera MLBs com histórico e sem pedidos no
                  intervalo.
                </p>
              </CardHeader>
              <CardContent>
                <NoSalesSection rows={noSales} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queda-visitas">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">MLBs com queda de visitas &gt; 20%</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Visitas dos últimos 15 dias vs. 15 dias anteriores. Somente quedas
                  significativas.
                </p>
              </CardHeader>
              <CardContent>
                <DropSection rows={visitsDrops} metricLabel="Visitas" valueFmt={fmtInt} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loadingPort && (
          <p className="text-xs text-muted-foreground">Carregando carteiras...</p>
        )}
        {loading && (
          <p className="text-xs text-muted-foreground">Carregando MLBs...</p>
        )}
      </div>
    </div>
  );
}