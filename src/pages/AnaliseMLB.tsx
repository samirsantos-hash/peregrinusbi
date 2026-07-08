import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingDown,
  PauseCircle,
  Eye,
  Loader2,
  ArrowUpDown,
  ExternalLink,
  Info,
  Construction,
} from "lucide-react";
import { Inbox, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolios } from "@/hooks/usePortfolios";

interface EligRow {
  seller_id: string;
  item_id: string;
  item_name: string | null;
  data: string;
  pedidos_7d: number | null;
  estoque_medio_7d: number | null;
  media_tsi_diario_7d: number | null;
  vertical_item: string | null;
}

interface QualityRow {
  seller_id: string;
  item_id: string;
  data: string;
  score_qualidade_final: number | null;
  visitas_clips: number | null;
}

interface MlbAggregate {
  itemId: string;
  sellerId: string;
  itemName: string;
  sellerNickname: string;
  vertical: string;
  // GMV proxy = pedidos_7d
  pedidosAtual: number;
  pedidosAnterior: number;
  pedidosDeltaPct: number;
  dataAtual: string;
  dataAnterior: string;
  // Sem vendas
  estoque: number;
  diasSemVenda: number | null;
  ultimaVenda: string | null;
  // Visitas (proxy = média TSI diário 7d; visitas por MLB não existe no banco)
  tsiAtual: number;
  tsiAnterior: number;
  tsiDeltaPct: number;
  // Qualidade complementar
  scoreAtual: number | null;
  scoreAnterior: number | null;
  scoreDeltaPct: number;
}

function fmtNum(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
function fmtNum2(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
function fmtPct(v: number) {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("pt-BR");
}
function mlbLink(itemId: string) {
  const clean = String(itemId).replace(/\D/g, "");
  return clean ? `https://produto.mercadolivre.com.br/MLB-${clean}` : "#";
}

type SortDir = "asc" | "desc";
function useSort<T>(rows: T[], initialKey: keyof T, initialDir: SortDir = "desc") {
  const [key, setKey] = useState<keyof T>(initialKey);
  const [dir, setDir] = useState<SortDir>(initialDir);
  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return arr;
  }, [rows, key, dir]);
  const toggle = (k: keyof T) => {
    if (k === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setKey(k);
      setDir("desc");
    }
  };
  return { sorted, key, dir, toggle };
}

function SortHeader<T>({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  align = "right",
}: {
  label: string;
  columnKey: keyof T;
  sortKey: keyof T;
  sortDir: SortDir;
  onSort: (k: keyof T) => void;
  align?: "left" | "right" | "center";
}) {
  const active = sortKey === columnKey;
  const alignCls =
    align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right";
  return (
    <TableHead className={alignCls}>
      <button
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          active ? "text-foreground" : ""
        }`}
      >
        {label}
        <ArrowUpDown className="w-3 h-3 opacity-60" />
        {active && (
          <span className="text-[10px] text-muted-foreground">
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </button>
    </TableHead>
  );
}

function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-8 flex-1 ${c === 0 ? "min-w-[180px]" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  hint,
  icon: Icon = Inbox,
}: {
  title: string;
  hint?: string;
  icon?: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-foreground">{title}</p>
      {hint && <p className="text-[11px] text-muted-foreground max-w-sm">{hint}</p>}
    </div>
  );
}

export default function AnaliseMLB() {
  const navigate = useNavigate();
  const { portfolios, loading: loadingPortfolios } = usePortfolios();
  const [portfolioId, setPortfolioId] = useState<string>("__all__");
  const [eligRows, setEligRows] = useState<EligRow[]>([]);
  const [qualityRows, setQualityRows] = useState<QualityRow[]>([]);
  const [sellerNickMap, setSellerNickMap] = useState<Record<string, string>>({});
  const [sellerOptions, setSellerOptions] = useState<{ id: string; nickname: string; custId: string }[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<"7" | "15" | "30" | "90">("7");

  // Cust IDs do escopo (todas as carteiras acessíveis ou a selecionada)
  const scopeCustIds = useMemo(() => {
    if (!portfolios.length) return [] as string[];
    if (portfolioId === "__all__") {
      return Array.from(new Set(portfolios.flatMap((p) => p.cust_ids || [])));
    }
    const p = portfolios.find((x) => x.id === portfolioId);
    return p ? Array.from(new Set(p.cust_ids || [])) : [];
  }, [portfolios, portfolioId]);

  useEffect(() => {
    if (loadingPortfolios) return;
    if (scopeCustIds.length === 0) {
      setEligRows([]);
      setQualityRows([]);
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);

      // Resolve sellers no escopo
      const { data: sellers } = await supabase
        .from("sellers")
        .select("id, cust_id, nickname")
        .in("cust_id", scopeCustIds);

      const nickMap: Record<string, string> = {};
      const sellerIds: string[] = [];
      const opts: { id: string; nickname: string; custId: string }[] = [];
      (sellers || []).forEach((s: any) => {
        nickMap[s.id] = (s.nickname || `Loja ${s.cust_id}`) as string;
        sellerIds.push(s.id);
        opts.push({ id: s.id, nickname: nickMap[s.id], custId: s.cust_id });
      });
      opts.sort((a, b) => a.nickname.localeCompare(b.nickname));

      if (sellerIds.length === 0) {
        if (!cancel) {
          setEligRows([]);
          setQualityRows([]);
          setSellerNickMap({});
          setLoading(false);
        }
        return;
      }

      // Elegibilidade — pega até 5000 linhas mais recentes do escopo
      const { data: elig } = await supabase
        .from("seller_eligibility")
        .select(
          "seller_id, item_id, item_name, data, pedidos_7d, estoque_medio_7d, media_tsi_diario_7d, vertical_item"
        )
        .in("seller_id", sellerIds)
        .order("data", { ascending: false })
        .limit(5000);

      // Qualidade — mesma janela para ter score histórico
      const { data: quality } = await supabase
        .from("seller_listings_quality")
        .select("seller_id, item_id, data, score_qualidade_final, visitas_clips")
        .in("seller_id", sellerIds)
        .order("data", { ascending: false })
        .limit(5000);

      if (cancel) return;
      setEligRows((elig as any as EligRow[]) || []);
      setQualityRows((quality as any as QualityRow[]) || []);
      setSellerNickMap(nickMap);
      setSellerOptions(opts);
      setSelectedSellerId((prev) => {
        if (prev && opts.some((o) => o.id === prev)) return prev;
        return opts[0]?.id || "";
      });
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [scopeCustIds.join(","), loadingPortfolios]);

  // Agrega por item_id (MLB): compara snapshot atual vs snapshot >= N dias antes
  const aggregates: MlbAggregate[] = useMemo(() => {
    if (eligRows.length === 0) return [];

    // Group eligibility rows by item_id, sorted desc by data
    const eligByItem = new Map<string, EligRow[]>();
    for (const r of eligRows) {
      if (!r.item_id) continue;
      if (!eligByItem.has(r.item_id)) eligByItem.set(r.item_id, []);
      eligByItem.get(r.item_id)!.push(r);
    }

    // Quality by item_id
    const qualByItem = new Map<string, QualityRow[]>();
    for (const q of qualityRows) {
      if (!q.item_id) continue;
      if (!qualByItem.has(q.item_id)) qualByItem.set(q.item_id, []);
      qualByItem.get(q.item_id)!.push(q);
    }

    const today = new Date();
    const periodDays = Number(periodo);
    const out: MlbAggregate[] = [];

    eligByItem.forEach((rows, itemId) => {
      const sorted = [...rows].sort((a, b) =>
        (b.data || "").localeCompare(a.data || "")
      );
      const cur = sorted[0];
      const curTime = cur?.data ? new Date(cur.data).getTime() : NaN;
      // snapshot anterior mais próximo do "cur - periodDays"
      const prev =
        !isNaN(curTime)
          ? sorted.find((r) => {
              if (!r.data || r.data === cur.data) return false;
              const diffDays =
                (curTime - new Date(r.data).getTime()) / (1000 * 60 * 60 * 24);
              return diffDays >= periodDays;
            }) || sorted.find((r) => r.data !== cur.data)
          : sorted.find((r) => r.data !== cur.data);
      if (!cur) return;

      const pedAt = Number(cur.pedidos_7d) || 0;
      const pedAnt = Number(prev?.pedidos_7d) || 0;
      const pedDelta = pedAnt > 0 ? ((pedAt - pedAnt) / pedAnt) * 100 : pedAt > 0 ? 100 : 0;

      const tsiAt = Number(cur.media_tsi_diario_7d) || 0;
      const tsiAnt = Number(prev?.media_tsi_diario_7d) || 0;
      const tsiDelta = tsiAnt > 0 ? ((tsiAt - tsiAnt) / tsiAnt) * 100 : 0;

      // "Última venda" — último snapshot com pedidos_7d > 0
      const ultimaComVenda = sorted.find((r) => (Number(r.pedidos_7d) || 0) > 0);
      const ultimaVenda = ultimaComVenda?.data || null;
      const diasSemVenda =
        pedAt > 0
          ? 0
          : ultimaVenda
            ? Math.floor(
                (today.getTime() - new Date(ultimaVenda).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;

      const qs = qualByItem.get(itemId);
      const qCur = qs?.[0];
      const qPrev = qs?.find((q) => q.data !== qCur?.data);
      const scoreAt = qCur ? Number(qCur.score_qualidade_final) : null;
      const scoreAnt = qPrev ? Number(qPrev.score_qualidade_final) : null;
      const scoreDelta =
        scoreAt !== null && scoreAnt !== null && scoreAnt > 0
          ? ((scoreAt - scoreAnt) / scoreAnt) * 100
          : 0;

      out.push({
        itemId,
        sellerId: cur.seller_id,
        itemName: cur.item_name || "",
        sellerNickname: sellerNickMap[cur.seller_id] || "—",
        vertical: cur.vertical_item || "",
        pedidosAtual: pedAt,
        pedidosAnterior: pedAnt,
        pedidosDeltaPct: pedDelta,
        dataAtual: cur.data,
        dataAnterior: prev?.data || "",
        estoque: Number(cur.estoque_medio_7d) || 0,
        diasSemVenda,
        ultimaVenda,
        tsiAtual: tsiAt,
        tsiAnterior: tsiAnt,
        tsiDeltaPct: tsiDelta,
        scoreAtual: scoreAt,
        scoreAnterior: scoreAnt,
        scoreDeltaPct: scoreDelta,
      });
    });

    return out;
  }, [eligRows, qualityRows, sellerNickMap, periodo]);

  // Filtro por loja (obrigatório — plotamos MLBs de uma única loja por vez)
  const aggregatesLoja = useMemo(
    () => {
      if (!selectedSellerId) return [];
      const base = aggregates.filter((a) => a.sellerId === selectedSellerId);
      const q = busca.trim().toLowerCase();
      if (!q) return base;
      return base.filter(
        (a) =>
          a.itemId.toLowerCase().includes(q) ||
          a.itemName.toLowerCase().includes(q) ||
          a.vertical.toLowerCase().includes(q)
      );
    },
    [aggregates, selectedSellerId, busca]
  );

  // Seções filtradas
  const quedaGmv = useMemo(
    () =>
      aggregatesLoja.filter(
        (a) => a.pedidosAnterior > 0 && a.pedidosDeltaPct < 0
      ),
    [aggregatesLoja]
  );
  const semVendas = useMemo(
    () =>
      aggregatesLoja.filter(
        (a) =>
          a.pedidosAtual === 0 &&
          a.estoque > 0 &&
          (a.diasSemVenda === null || a.diasSemVenda >= 15)
      ),
    [aggregatesLoja]
  );
  const quedaVisitas = useMemo(
    () =>
      aggregatesLoja.filter(
        (a) => a.tsiAnterior > 0 && a.tsiDeltaPct <= -20
      ),
    [aggregatesLoja]
  );

  const sortGmv = useSort<MlbAggregate>(quedaGmv, "pedidosDeltaPct", "asc");
  const sortSem = useSort<MlbAggregate>(semVendas, "diasSemVenda", "desc");
  const sortVis = useSort<MlbAggregate>(quedaVisitas, "tsiDeltaPct", "asc");

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Análise de MLB
              </h1>
              <p className="text-xs text-muted-foreground">
                Sinais por MLB — pedidos, atividade e movimento (fonte:{" "}
                <code className="px-1 rounded bg-muted">seller_eligibility</code>{" "}
                +{" "}
                <code className="px-1 rounded bg-muted">
                  seller_listings_quality
                </code>
                )
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Carteira:</span>
            <Select value={portfolioId} onValueChange={setPortfolioId}>
              <SelectTrigger className="h-9 w-[260px]">
                <SelectValue placeholder="Todas as carteiras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as carteiras</SelectItem>
                {portfolios.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({(p.cust_ids || []).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-2">Loja:</span>
            <Select
              value={selectedSellerId}
              onValueChange={setSelectedSellerId}
              disabled={sellerOptions.length === 0}
            >
              <SelectTrigger className="h-9 w-[260px]">
                <SelectValue placeholder="Selecione uma loja" />
              </SelectTrigger>
              <SelectContent>
                {sellerOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <div className="flex items-start gap-2 p-3 rounded-md border border-warning/40 bg-warning/10 text-[11px]">
          <Construction className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-foreground">
            <span className="font-semibold">Página em construção:</span>{" "}
            os dados abaixo são preliminares e podem sofrer alterações. Métricas
            e fontes ainda estão sendo validadas.
          </p>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-md border border-border/60 bg-muted/10 text-[11px]">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Metodologia:</span>{" "}
            comparação entre os dois snapshots (
            <code className="px-1 rounded bg-muted">data</code>) mais recentes de
            cada MLB no escopo.
            <br />
            GMV usa <span className="font-semibold">pedidos_7d</span> como proxy
            (banco não guarda GMV por item). "Visitas" usa{" "}
            <span className="font-semibold">média TSI diária 7d</span> como proxy
            de movimento — não há coluna de visitas por MLB.
          </p>
        </div>

        {!loading && !loadingPortfolios && scopeCustIds.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma carteira disponível.
          </div>
        ) : !loading && !loadingPortfolios && sellerOptions.length === 0 ? (
          <div className="glass-card p-6">
            <EmptyState
              icon={PackageSearch}
              title="Nenhuma loja encontrada nesta carteira"
              hint="Selecione outra carteira ou verifique se há sellers vinculados aos CUST IDs."
            />
          </div>
        ) : !loading && !loadingPortfolios && !selectedSellerId ? (
          <div className="glass-card p-6">
            <EmptyState
              icon={PackageSearch}
              title="Selecione uma loja"
              hint="Escolha uma loja no seletor acima para visualizar os MLBs."
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seção 1 — Queda de GMV (proxy: pedidos_7d) */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 space-y-3"
            >
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">
                  MLBs em queda de GMV
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  · {quedaGmv.length} itens · proxy: pedidos_7d snapshot atual vs
                  anterior
                </span>
              </div>
              {loading || loadingPortfolios ? (
                <TableSkeleton rows={6} cols={5} />
              ) : aggregatesLoja.length === 0 ? (
                <EmptyState
                  icon={PackageSearch}
                  title="Sem dados para esta loja"
                  hint="Ainda não há snapshots de elegibilidade suficientes para calcular queda de pedidos."
                />
              ) : quedaGmv.length === 0 ? (
                <EmptyState
                  title="Nenhum MLB em queda de pedidos"
                  hint="Todos os MLBs com histórico mantiveram ou aumentaram os pedidos entre os dois snapshots mais recentes."
                />
              ) : (
                <div className="overflow-x-auto max-h-[520px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <SortHeader<MlbAggregate>
                          label="MLB / Item"
                          columnKey="itemName"
                          sortKey={sortGmv.key}
                          sortDir={sortGmv.dir}
                          onSort={sortGmv.toggle}
                          align="left"
                        />
                        <SortHeader<MlbAggregate>
                          label="Loja"
                          columnKey="sellerNickname"
                          sortKey={sortGmv.key}
                          sortDir={sortGmv.dir}
                          onSort={sortGmv.toggle}
                          align="left"
                        />
                        <SortHeader<MlbAggregate>
                          label="Pedidos anterior"
                          columnKey="pedidosAnterior"
                          sortKey={sortGmv.key}
                          sortDir={sortGmv.dir}
                          onSort={sortGmv.toggle}
                        />
                        <SortHeader<MlbAggregate>
                          label="Pedidos atual"
                          columnKey="pedidosAtual"
                          sortKey={sortGmv.key}
                          sortDir={sortGmv.dir}
                          onSort={sortGmv.toggle}
                        />
                        <SortHeader<MlbAggregate>
                          label="Δ %"
                          columnKey="pedidosDeltaPct"
                          sortKey={sortGmv.key}
                          sortDir={sortGmv.dir}
                          onSort={sortGmv.toggle}
                        />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortGmv.sorted.slice(0, 200).map((r) => (
                        <TableRow key={r.itemId}>
                          <TableCell className="max-w-[320px]">
                            <a
                              href={mlbLink(r.itemId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              MLB{r.itemId}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {r.itemName}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.sellerNickname}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {fmtNum(r.pedidosAnterior)}
                            <div className="text-[10px] text-muted-foreground">
                              {fmtDate(r.dataAnterior)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {fmtNum(r.pedidosAtual)}
                            <div className="text-[10px] text-muted-foreground">
                              {fmtDate(r.dataAtual)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                r.pedidosDeltaPct <= -50
                                  ? "border-destructive/40 text-destructive"
                                  : r.pedidosDeltaPct <= -20
                                    ? "border-warning/40 text-warning"
                                    : "border-muted-foreground/30 text-muted-foreground"
                              }
                            >
                              {fmtPct(r.pedidosDeltaPct)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.section>

            {/* Seção 2 — Sem vendas 15+ dias */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 space-y-3"
            >
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-warning" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">
                  MLBs sem vendas há 15+ dias
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  · {semVendas.length} itens com estoque &gt; 0 e pedidos_7d = 0
                </span>
              </div>
              {loading || loadingPortfolios ? (
                <TableSkeleton rows={5} cols={5} />
              ) : aggregatesLoja.length === 0 ? (
                <EmptyState
                  icon={PackageSearch}
                  title="Sem dados para esta loja"
                  hint="Não há MLBs com histórico para detectar inatividade."
                />
              ) : semVendas.length === 0 ? (
                <EmptyState
                  title="Nenhum MLB inativo detectado"
                  hint="Todos os MLBs com estoque tiveram pedidos no último snapshot."
                />
              ) : (
                <div className="overflow-x-auto max-h-[520px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <SortHeader<MlbAggregate>
                          label="MLB / Item"
                          columnKey="itemName"
                          sortKey={sortSem.key}
                          sortDir={sortSem.dir}
                          onSort={sortSem.toggle}
                          align="left"
                        />
                        <SortHeader<MlbAggregate>
                          label="Loja"
                          columnKey="sellerNickname"
                          sortKey={sortSem.key}
                          sortDir={sortSem.dir}
                          onSort={sortSem.toggle}
                          align="left"
                        />
                        <SortHeader<MlbAggregate>
                          label="Última venda"
                          columnKey="ultimaVenda"
                          sortKey={sortSem.key}
                          sortDir={sortSem.dir}
                          onSort={sortSem.toggle}
                        />
                        <SortHeader<MlbAggregate>
                          label="Dias sem venda"
                          columnKey="diasSemVenda"
                          sortKey={sortSem.key}
                          sortDir={sortSem.dir}
                          onSort={sortSem.toggle}
                        />
                        <SortHeader<MlbAggregate>
                          label="Estoque"
                          columnKey="estoque"
                          sortKey={sortSem.key}
                          sortDir={sortSem.dir}
                          onSort={sortSem.toggle}
                        />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortSem.sorted.slice(0, 200).map((r) => (
                        <TableRow key={r.itemId}>
                          <TableCell className="max-w-[320px]">
                            <a
                              href={mlbLink(r.itemId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              MLB{r.itemId}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {r.itemName}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.sellerNickname}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs">
                            {fmtDate(r.ultimaVenda)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                (r.diasSemVenda ?? 0) >= 30
                                  ? "border-destructive/40 text-destructive"
                                  : "border-warning/40 text-warning"
                              }
                            >
                              {r.diasSemVenda === null
                                ? "s/ histórico"
                                : `${r.diasSemVenda} dias`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {fmtNum(r.estoque)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.section>

            {/* Seção 3 — Queda de visitas / movimento 20%+ */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-neon-blue" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">
                  MLBs com queda de visitas ≥ 20%
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  · {quedaVisitas.length} itens · proxy: média TSI diária 7d
                  (visitas por MLB não disponível)
                </span>
              </div>
              {loading || loadingPortfolios ? (
                <TableSkeleton rows={5} cols={6} />
              ) : aggregatesLoja.length === 0 ? (
                <EmptyState
                  icon={PackageSearch}
                  title="Sem dados para esta loja"
                  hint="Sem histórico de TSI para calcular variação de movimento."
                />
              ) : quedaVisitas.length === 0 ? (
                <EmptyState
                  title="Nenhum MLB com queda relevante de movimento"
                  hint="Nenhum item apresentou queda ≥ 20% na média TSI diária 7d entre os dois últimos snapshots."
                />
              ) : (
                <div className="overflow-x-auto max-h-[520px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <SortHeader<MlbAggregate>
                          label="MLB / Item"
                          columnKey="itemName"
                          sortKey={sortVis.key}
                          sortDir={sortVis.dir}
                          onSort={sortVis.toggle}
                          align="left"
                        />
                        <SortHeader<MlbAggregate>
                          label="Loja"
                          columnKey="sellerNickname"
                          sortKey={sortVis.key}
                          sortDir={sortVis.dir}
                          onSort={sortVis.toggle}
                          align="left"
                        />
                        <SortHeader<MlbAggregate>
                          label="TSI anterior"
                          columnKey="tsiAnterior"
                          sortKey={sortVis.key}
                          sortDir={sortVis.dir}
                          onSort={sortVis.toggle}
                        />
                        <SortHeader<MlbAggregate>
                          label="TSI atual"
                          columnKey="tsiAtual"
                          sortKey={sortVis.key}
                          sortDir={sortVis.dir}
                          onSort={sortVis.toggle}
                        />
                        <SortHeader<MlbAggregate>
                          label="Δ %"
                          columnKey="tsiDeltaPct"
                          sortKey={sortVis.key}
                          sortDir={sortVis.dir}
                          onSort={sortVis.toggle}
                        />
                        <SortHeader<MlbAggregate>
                          label="Score qualidade"
                          columnKey="scoreAtual"
                          sortKey={sortVis.key}
                          sortDir={sortVis.dir}
                          onSort={sortVis.toggle}
                        />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortVis.sorted.slice(0, 200).map((r) => (
                        <TableRow key={r.itemId}>
                          <TableCell className="max-w-[320px]">
                            <a
                              href={mlbLink(r.itemId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              MLB{r.itemId}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {r.itemName}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.sellerNickname}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {fmtNum2(r.tsiAnterior)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {fmtNum2(r.tsiAtual)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                r.tsiDeltaPct <= -50
                                  ? "border-destructive/40 text-destructive"
                                  : "border-warning/40 text-warning"
                              }
                            >
                              {fmtPct(r.tsiDeltaPct)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {r.scoreAtual !== null ? fmtNum(r.scoreAtual) : "—"}
                            {r.scoreAnterior !== null &&
                              r.scoreAnterior !== r.scoreAtual && (
                                <div className="text-[10px] text-muted-foreground">
                                  antes {fmtNum(r.scoreAnterior)}
                                </div>
                              )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.section>
          </div>
        )}
      </div>
    </div>
  );
}