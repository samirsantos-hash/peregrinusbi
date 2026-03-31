import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, Zap, TrendingUp, DollarSign, Target } from "lucide-react";
import { type ConsolidatedSeller } from "@/utils/cppAggregation";

interface Props {
  data: ConsolidatedSeller[];
  onSelectSeller: (seller: ConsolidatedSeller) => void;
}

function fmtCurrency(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmtCurrency(v);
}
function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(1)}%`;
}
function fmtRoas(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(1)}x`;
}
function fmtNum(v: number): string {
  return Math.round(v).toLocaleString("pt-BR");
}

interface CdpSellerRow {
  seller: ConsolidatedSeller;
  cdpTgmv: number;
  cdpInv: number;
  cdpRoas: number | null;
  shareCdp: number | null;
  itemsOptin: number;
  scoreCdp: number;
  opportunityScore: number;
  gap: number; // potential GMV gap
  action: string;
}

function computeOpportunity(data: ConsolidatedSeller[]): CdpSellerRow[] {
  // Compute portfolio-level CDP share as benchmark
  const totalGmv = data.reduce((s, r) => s + (Number(r.TGMV_LC) || 0), 0);
  const totalCdpGmv = data.reduce((s, r) => s + (Number(r.CDP_TGMV_LC) || 0), 0);
  const benchmarkShare = totalGmv > 0 ? (totalCdpGmv / totalGmv) * 100 : 0;

  return data.map(seller => {
    const tgmv = Number(seller.TGMV_LC) || 0;
    const cdpTgmv = Number(seller.CDP_TGMV_LC) || 0;
    const cdpInv = Number(seller.CDP_TGMV_INVESTIMENT_LC_SELLER) || 0;
    const cdpRoas = cdpInv > 0 ? cdpTgmv / cdpInv : null;
    const shareCdp = tgmv > 0 ? (cdpTgmv / tgmv) * 100 : null;
    const itemsOptin = Number(seller.ITEMS_OPTIN_CDP) || 0;
    const scoreCdp = Number(seller.SCORE_FINAL_CDP) || 0;

    // Gap: how much more CDP GMV the seller could generate if at benchmark share
    const expectedCdp = tgmv * (benchmarkShare / 100);
    const gap = Math.max(0, expectedCdp - cdpTgmv);

    // Opportunity score: weighted by gap size, low CDP share, and low score
    const gapNorm = totalCdpGmv > 0 ? (gap / totalCdpGmv) * 100 : 0;
    const shareDeficit = shareCdp !== null ? Math.max(0, benchmarkShare - shareCdp) : benchmarkShare;
    const opportunityScore = Math.round(gapNorm * 40 + shareDeficit * 30 + (100 - scoreCdp) * 30) / 100;

    let action = "Manter";
    if (shareCdp !== null && shareCdp < benchmarkShare * 0.5) action = "Ativar CDP";
    else if (shareCdp !== null && shareCdp < benchmarkShare) action = "Expandir Opt-in";
    else if (cdpRoas !== null && cdpRoas < 3) action = "Otimizar ROAS";

    return { seller, cdpTgmv, cdpInv, cdpRoas, shareCdp, itemsOptin, scoreCdp, opportunityScore, gap, action };
  }).sort((a, b) => b.opportunityScore - a.opportunityScore);
}

type SortCol = "opportunityScore" | "cdpTgmv" | "shareCdp" | "cdpRoas" | "gap" | "itemsOptin" | "scoreCdp";

export default function CppCdpPanel({ data, onSelectSeller }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("opportunityScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => computeOpportunity(data), [data]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = a[sortCol] ?? -Infinity;
      const vb = b[sortCol] ?? -Infinity;
      return sortDir === "desc" ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
  }, [rows, sortCol, sortDir]);

  const totals = useMemo(() => {
    const cdpGmv = data.reduce((s, r) => s + (Number(r.CDP_TGMV_LC) || 0), 0);
    const cdpInv = data.reduce((s, r) => s + (Number(r.CDP_TGMV_INVESTIMENT_LC_SELLER) || 0), 0);
    const totalGmv = data.reduce((s, r) => s + (Number(r.TGMV_LC) || 0), 0);
    const totalGap = rows.reduce((s, r) => s + r.gap, 0);
    return {
      cdpGmv,
      cdpInv,
      cdpRoas: cdpInv > 0 ? cdpGmv / cdpInv : null,
      shareCdp: totalGmv > 0 ? (cdpGmv / totalGmv) * 100 : null,
      totalGap,
      sellersAtivacao: rows.filter(r => r.action === "Ativar CDP").length,
    };
  }, [data, rows]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />;
  };

  const actionBadge = (action: string) => {
    switch (action) {
      case "Ativar CDP": return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">{action}</Badge>;
      case "Expandir Opt-in": return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">{action}</Badge>;
      case "Otimizar ROAS": return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">{action}</Badge>;
      default: return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">{action}</Badge>;
    }
  };

  const maxOpp = Math.max(...rows.map(r => r.opportunityScore), 1);

  return (
    <div className="space-y-4">
      {/* CDP Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">CDP GMV</span>
            </div>
            <p className="text-xl font-bold font-mono text-foreground">{fmtCompact(totals.cdpGmv)}</p>
            <span className="text-[10px] text-muted-foreground">Share: {fmtPct(totals.shareCdp)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-chart-3" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ROAS CDP</span>
            </div>
            <p className="text-xl font-bold font-mono text-foreground">{fmtRoas(totals.cdpRoas)}</p>
            <span className="text-[10px] text-muted-foreground">Inv: {fmtCompact(totals.cdpInv)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Gap Potencial</span>
            </div>
            <p className="text-xl font-bold font-mono text-foreground">{fmtCompact(totals.totalGap)}</p>
            <span className="text-[10px] text-muted-foreground">GMV adicional estimado</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Para Ativar</span>
            </div>
            <p className="text-xl font-bold font-mono text-foreground">{totals.sellersAtivacao}</p>
            <span className="text-[10px] text-muted-foreground">sellers com CDP sub-utilizado</span>
          </CardContent>
        </Card>
      </div>

      {/* CDP Ranking Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Ranking de Oportunidade CDP
          </CardTitle>
        </CardHeader>
        <div className="overflow-auto max-h-[55vh]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("opportunityScore")}>
                  <span className="inline-flex items-center gap-1">Oportunidade <SortIcon col="opportunityScore" /></span>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("cdpTgmv")}>
                  <span className="inline-flex items-center gap-1">CDP GMV <SortIcon col="cdpTgmv" /></span>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("shareCdp")}>
                  <span className="inline-flex items-center gap-1">Share CDP <SortIcon col="shareCdp" /></span>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("cdpRoas")}>
                  <span className="inline-flex items-center gap-1">ROAS CDP <SortIcon col="cdpRoas" /></span>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("gap")}>
                  <span className="inline-flex items-center gap-1">Gap (R$) <SortIcon col="gap" /></span>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("itemsOptin")}>
                  <span className="inline-flex items-center gap-1">Itens Opt-in <SortIcon col="itemsOptin" /></span>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("scoreCdp")}>
                  <span className="inline-flex items-center gap-1">Score CDP <SortIcon col="scoreCdp" /></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row, i) => (
                <TableRow
                  key={row.seller.CUS_CUST_ID_SEL}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => onSelectSeller(row.seller)}
                >
                  <TableCell className="text-xs text-muted-foreground font-mono">{i + 1}</TableCell>
                  <TableCell className="text-xs">
                    <span className="text-primary hover:underline font-medium">{row.seller.CUS_NICKNAME}</span>
                    <span className="block text-[10px] text-muted-foreground">{row.seller.CUS_CUST_ID_SEL}</span>
                  </TableCell>
                  <TableCell>{actionBadge(row.action)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={(row.opportunityScore / maxOpp) * 100} className="h-1.5 flex-1" />
                      <span className="text-xs font-mono text-foreground w-8 text-right">{row.opportunityScore.toFixed(0)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtCurrency(row.cdpTgmv)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtPct(row.shareCdp)}</TableCell>
                  <TableCell className={cn("text-right font-mono text-xs", row.cdpRoas !== null && row.cdpRoas < 3 ? "text-destructive" : row.cdpRoas !== null && row.cdpRoas > 8 ? "text-emerald-400" : "")}>
                    {fmtRoas(row.cdpRoas)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtCurrency(row.gap)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtNum(row.itemsOptin)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    <span className={cn(row.scoreCdp < 40 ? "text-destructive" : row.scoreCdp > 70 ? "text-emerald-400" : "text-amber-400")}>
                      {row.scoreCdp.toFixed(0)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
