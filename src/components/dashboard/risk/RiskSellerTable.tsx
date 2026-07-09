import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskSeverityBadge } from "./RiskSeverityBadge";
import { RiskSignalChips } from "./RiskSignalChips";
import { abrirSellerNoMeli } from "@/lib/sellerLink";
import type { RiskSellerResult } from "@/lib/risk/riskAggregator";

function fmtNum(n: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function RiskSellerTable({ rows }: { rows: RiskSellerResult[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Nenhum seller com sinais de risco no período.
      </div>
    );
  }
  return (
    <div className="overflow-auto max-h-[65vh] rounded-md border border-border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead>Seller</TableHead>
            <TableHead>Vertical</TableHead>
            <TableHead className="text-right">GMV (fechado)</TableHead>
            <TableHead className="text-right">Δ vs mês ant.</TableHead>
            <TableHead>Sinais</TableHead>
            <TableHead className="text-center">Severidade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.sellerId} className="hover:bg-muted/30">
              <TableCell>
                <button
                  type="button"
                  onClick={() => abrirSellerNoMeli(Number(r.custId), r.nickname)}
                  className="text-primary hover:underline text-left font-medium"
                >
                  {r.nickname}
                </button>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  cust {r.custId}
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.vertical || "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">
                {fmtNum(r.gmvClosed)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">
                <span
                  className={
                    r.deltaPct === null
                      ? "text-muted-foreground"
                      : r.deltaPct < 0
                      ? "text-destructive"
                      : "text-emerald"
                  }
                >
                  {fmtPct(r.deltaPct)}
                </span>
              </TableCell>
              <TableCell>
                <RiskSignalChips signals={r.signals} />
              </TableCell>
              <TableCell className="text-center">
                <RiskSeverityBadge severity={r.severity} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}