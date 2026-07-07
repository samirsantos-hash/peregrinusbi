import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingDown, PauseCircle, Eye, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { usePortfolios } from "@/hooks/usePortfolios";

interface CppRow {
  cus_cust_id_sel: number;
  cus_nickname: string | null;
  mes_ref: string;
  tgmv_lc: number | null;
  tsi: number | null;
  visitas: number | null;
}

interface LiveRow {
  seller_id: string;
  data: string;
  itens: number | null;
}

interface SellerAggregate {
  custId: string;
  nickname: string;
  gmvAtual: number;
  gmvAnterior: number;
  gmvDeltaPct: number;
  visitasAtual: number;
  visitasAnterior: number;
  visitasDeltaPct: number;
  tsiAtual: number;
  mesAtual: string;
  mesAnterior: string;
  diasSemMovimento: number | null;
  ultimaMovimentacao: string | null;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
function fmtNum(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
function fmtPct(v: number) {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}
function fmtMes(m: string) {
  if (!m) return "—";
  const d = new Date(m);
  if (isNaN(d.getTime())) return m;
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export default function AnaliseMLB() {
  const navigate = useNavigate();
  const { portfolios, loading: loadingPortfolios } = usePortfolios();
  const [portfolioId, setPortfolioId] = useState<string>("__all__");
  const [cppRows, setCppRows] = useState<CppRow[]>([]);
  const [liveRows, setLiveRows] = useState<LiveRow[]>([]);
  const [sellerCustMap, setSellerCustMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Cust IDs do escopo (todas as carteiras acessíveis ou a selecionada)
  const scopeCustIds = useMemo(() => {
    if (!portfolios.length) return [] as string[];
    if (portfolioId === "__all__") {
      return Array.from(new Set(portfolios.flatMap((p) => p.cust_ids || [])));
    }
    const p = portfolios.find((x) => x.id === portfolioId);
    return p ? Array.from(new Set(p.cust_ids || [])) : [];
  }, [portfolios, portfolioId]);

  // Carrega cpp_mensal + live_listings do escopo
  useEffect(() => {
    if (loadingPortfolios) return;
    if (scopeCustIds.length === 0) {
      setCppRows([]);
      setLiveRows([]);
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      const custIdsNum = scopeCustIds
        .map((c) => Number(c))
        .filter((n) => Number.isFinite(n));

      // cpp_mensal
      const { data: cpp } = await supabase
        .from("cpp_mensal")
        .select("cus_cust_id_sel, cus_nickname, mes_ref, tgmv_lc, tsi, visitas")
        .in("cus_cust_id_sel", custIdsNum)
        .order("mes_ref", { ascending: false });

      // sellers → mapear seller_id (uuid) para cust_id
      const { data: sellers } = await supabase
        .from("sellers")
        .select("id, cust_id")
        .in("cust_id", scopeCustIds);

      const sMap: Record<string, string> = {};
      (sellers || []).forEach((s: any) => {
        sMap[s.id] = String(s.cust_id);
      });

      const sellerIds = Object.keys(sMap);
      let live: LiveRow[] = [];
      if (sellerIds.length > 0) {
        const { data: ll } = await supabase
          .from("live_listings")
          .select("seller_id, data, itens")
          .in("seller_id", sellerIds)
          .order("data", { ascending: false });
        live = (ll as any as LiveRow[]) || [];
      }

      if (cancel) return;
      setCppRows((cpp as any as CppRow[]) || []);
      setLiveRows(live);
      setSellerCustMap(sMap);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [scopeCustIds.join(","), loadingPortfolios]);

  // Agrega por seller: mês atual vs mês anterior
  const aggregates: SellerAggregate[] = useMemo(() => {
    if (cppRows.length === 0) return [];

    // group by cust_id
    const byCust = new Map<string, CppRow[]>();
    for (const r of cppRows) {
      const k = String(r.cus_cust_id_sel);
      if (!byCust.has(k)) byCust.set(k, []);
      byCust.get(k)!.push(r);
    }

    // last movement date per cust from live_listings (dias com estoque)
    const lastMovByCust = new Map<string, string>();
    for (const l of liveRows) {
      if (!l.data || (l.itens ?? 0) <= 0) continue;
      const cust = sellerCustMap[l.seller_id];
      if (!cust) continue;
      const prev = lastMovByCust.get(cust);
      if (!prev || prev < l.data) lastMovByCust.set(cust, l.data);
    }

    const today = new Date();

    const out: SellerAggregate[] = [];
    byCust.forEach((rows, cust) => {
      const sorted = [...rows].sort((a, b) =>
        (b.mes_ref || "").localeCompare(a.mes_ref || "")
      );
      const atual = sorted[0];
      const anterior = sorted[1];
      if (!atual) return;
      const gmvAtual = Number(atual.tgmv_lc) || 0;
      const gmvAnt = Number(anterior?.tgmv_lc) || 0;
      const vAt = Number(atual.visitas) || 0;
      const vAnt = Number(anterior?.visitas) || 0;
      const gmvDelta = gmvAnt > 0 ? ((gmvAtual - gmvAnt) / gmvAnt) * 100 : 0;
      const visDelta = vAnt > 0 ? ((vAt - vAnt) / vAnt) * 100 : 0;
      const lastMov = lastMovByCust.get(cust) || null;
      const dias =
        lastMov != null
          ? Math.floor(
              (today.getTime() - new Date(lastMov).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

      out.push({
        custId: cust,
        nickname: atual.cus_nickname || `Loja ${cust}`,
        gmvAtual,
        gmvAnterior: gmvAnt,
        gmvDeltaPct: gmvDelta,
        visitasAtual: vAt,
        visitasAnterior: vAnt,
        visitasDeltaPct: visDelta,
        tsiAtual: Number(atual.tsi) || 0,
        mesAtual: atual.mes_ref,
        mesAnterior: anterior?.mes_ref || "",
        diasSemMovimento: dias,
        ultimaMovimentacao: lastMov,
      });
    });

    return out;
  }, [cppRows, liveRows, sellerCustMap]);

  // Seções
  const quedaGmv = useMemo(
    () =>
      aggregates
        .filter((a) => a.gmvAnterior > 0 && a.gmvDeltaPct < 0)
        .sort((a, b) => a.gmvDeltaPct - b.gmvDeltaPct)
        .slice(0, 50),
    [aggregates]
  );

  const semVendas = useMemo(
    () =>
      aggregates
        .filter(
          (a) =>
            (a.diasSemMovimento !== null && a.diasSemMovimento >= 15) ||
            (a.tsiAtual === 0 && a.gmvAtual === 0)
        )
        .sort(
          (a, b) =>
            (b.diasSemMovimento ?? 999) - (a.diasSemMovimento ?? 999)
        )
        .slice(0, 50),
    [aggregates]
  );

  const quedaVisitas = useMemo(
    () =>
      aggregates
        .filter((a) => a.visitasAnterior > 0 && a.visitasDeltaPct <= -20)
        .sort((a, b) => a.visitasDeltaPct - b.visitasDeltaPct)
        .slice(0, 50),
    [aggregates]
  );

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
                Sinais de risco por seller — GMV, atividade e visitas (fonte:{" "}
                <code className="px-1 rounded bg-muted">cpp_mensal</code>,{" "}
                <code className="px-1 rounded bg-muted">cdp_mensal</code>,{" "}
                <code className="px-1 rounded bg-muted">live_listings</code>)
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
          </div>
        </motion.div>

        {loading || loadingPortfolios ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
            <span className="ml-2 text-sm text-muted-foreground">
              Carregando dados…
            </span>
          </div>
        ) : scopeCustIds.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma carteira disponível.
          </div>
        ) : (
          <div className="space-y-6">
            <SectionCard
              title="MLBs em queda de GMV"
              icon={<TrendingDown className="w-4 h-4 text-destructive" />}
              subtitle={`${quedaGmv.length} sellers com queda mês/mês vs mês anterior`}
              empty="Nenhum seller com queda de GMV no último mês."
              rows={quedaGmv}
              renderRow={(r) => (
                <TableRow key={r.custId}>
                  <TableCell>
                    <div className="font-medium">{r.nickname}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {r.custId}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtBRL(r.gmvAnterior)}
                    <div className="text-[10px] text-muted-foreground">
                      {fmtMes(r.mesAnterior)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtBRL(r.gmvAtual)}
                    <div className="text-[10px] text-muted-foreground">
                      {fmtMes(r.mesAtual)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        r.gmvDeltaPct <= -30
                          ? "border-destructive/40 text-destructive"
                          : r.gmvDeltaPct <= -10
                            ? "border-warning/40 text-warning"
                            : "border-muted-foreground/30 text-muted-foreground"
                      }
                    >
                      {fmtPct(r.gmvDeltaPct)}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
              headers={
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-right">GMV mês anterior</TableHead>
                  <TableHead className="text-right">GMV mês atual</TableHead>
                  <TableHead className="text-right">Δ %</TableHead>
                </TableRow>
              }
            />

            <SectionCard
              title="MLBs sem vendas há 15+ dias"
              icon={<PauseCircle className="w-4 h-4 text-warning" />}
              subtitle={`${semVendas.length} sellers sem movimentação recente (última data em live_listings ou TSI zerado no mês)`}
              empty="Nenhum seller inativo detectado."
              rows={semVendas}
              renderRow={(r) => (
                <TableRow key={r.custId}>
                  <TableCell>
                    <div className="font-medium">{r.nickname}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {r.custId}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.ultimaMovimentacao
                      ? new Date(r.ultimaMovimentacao).toLocaleDateString(
                          "pt-BR"
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.diasSemMovimento !== null
                      ? `${r.diasSemMovimento} dias`
                      : "s/ registro"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtNum(r.tsiAtual)}
                    <div className="text-[10px] text-muted-foreground">
                      TSI {fmtMes(r.mesAtual)}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              headers={
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-right">Última movimentação</TableHead>
                  <TableHead className="text-right">Dias sem mov.</TableHead>
                  <TableHead className="text-right">TSI mês atual</TableHead>
                </TableRow>
              }
            />

            <SectionCard
              title="MLBs com queda de visitas 20%+"
              icon={<Eye className="w-4 h-4 text-neon-blue" />}
              subtitle={`${quedaVisitas.length} sellers com queda ≥ 20% em visitas mês/mês`}
              empty="Nenhum seller com queda relevante de visitas."
              rows={quedaVisitas}
              renderRow={(r) => (
                <TableRow key={r.custId}>
                  <TableCell>
                    <div className="font-medium">{r.nickname}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {r.custId}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtNum(r.visitasAnterior)}
                    <div className="text-[10px] text-muted-foreground">
                      {fmtMes(r.mesAnterior)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtNum(r.visitasAtual)}
                    <div className="text-[10px] text-muted-foreground">
                      {fmtMes(r.mesAtual)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        r.visitasDeltaPct <= -40
                          ? "border-destructive/40 text-destructive"
                          : "border-warning/40 text-warning"
                      }
                    >
                      {fmtPct(r.visitasDeltaPct)}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
              headers={
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-right">Visitas anterior</TableHead>
                  <TableHead className="text-right">Visitas atual</TableHead>
                  <TableHead className="text-right">Δ %</TableHead>
                </TableRow>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard<T>({
  title,
  subtitle,
  icon,
  rows,
  headers,
  renderRow,
  empty,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: T[];
  headers: React.ReactNode;
  renderRow: (row: T) => React.ReactNode;
  empty: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 space-y-3"
    >
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          {title}
        </h2>
        <span className="text-[11px] text-muted-foreground">· {subtitle}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>{headers}</TableHeader>
            <TableBody>{rows.map((r) => renderRow(r))}</TableBody>
          </Table>
        </div>
      )}
    </motion.section>
  );
}