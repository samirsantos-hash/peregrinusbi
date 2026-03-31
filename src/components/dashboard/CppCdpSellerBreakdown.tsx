import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, Package, Layers } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { type CppRow, cleanCustId, parseBrNumber } from "@/utils/cppAggregation";

interface Props {
  custId: string;
  rawRows: CppRow[];
  startDate: Date;
  endDate: Date;
}

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmtCurrency(v);
}
function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

interface DailyCdp {
  date: string;
  label: string;
  cdpGmv: number;
  cdpInv: number;
  rebate: number;
  semRebate: number;
  tgmv: number;
}

export default function CppCdpSellerBreakdown({ custId, rawRows, startDate, endDate }: Props) {
  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");

  const { daily, totals } = useMemo(() => {
    const sellerRows = rawRows.filter(r => {
      if (cleanCustId(r["CUS_CUST_ID_SEL"]) !== custId) return false;
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      return d >= startStr && d <= endStr;
    });

    const dayMap = new Map<string, DailyCdp>();
    let totalCdpGmv = 0, totalCdpInv = 0, totalRebate = 0, totalSemRebate = 0, totalTgmv = 0, totalItemsOptin = 0;

    for (const r of sellerRows) {
      const d = String(r["TIM_DAY"] || r["DATA"] || "").trim();
      const cdpGmv = parseBrNumber(r["CDP_TGMV_LC"]);
      const cdpInv = parseBrNumber(r["CDP_TGMV_INVESTIMENT_LC_SELLER"]);
      const rebate = parseBrNumber(r["CDP_TGMV_INVESTIMENT_SELLER_LC_REBATE"]);
      const semRebate = parseBrNumber(r["CDP_TGMV_INVESTIMENT_SELLER_LC_SEM_REBATE"]);
      const tgmv = parseBrNumber(r["TGMV_LC"]);

      totalCdpGmv += cdpGmv;
      totalCdpInv += cdpInv;
      totalRebate += rebate;
      totalSemRebate += semRebate;
      totalTgmv += tgmv;
      totalItemsOptin += parseBrNumber(r["ITEMS_OPTIN_CDP"]);

      if (!dayMap.has(d)) {
        dayMap.set(d, { date: d, label: format(new Date(d + "T12:00:00"), "dd/MM"), cdpGmv: 0, cdpInv: 0, rebate: 0, semRebate: 0, tgmv: 0 });
      }
      const entry = dayMap.get(d)!;
      entry.cdpGmv += cdpGmv;
      entry.cdpInv += cdpInv;
      entry.rebate += rebate;
      entry.semRebate += semRebate;
      entry.tgmv += tgmv;
    }

    return {
      daily: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      totals: {
        cdpGmv: totalCdpGmv,
        cdpInv: totalCdpInv,
        rebate: totalRebate,
        semRebate: totalSemRebate,
        tgmv: totalTgmv,
        itemsOptin: totalItemsOptin,
        cdpRoas: totalCdpInv > 0 ? totalCdpGmv / totalCdpInv : null,
        shareCdp: totalTgmv > 0 ? (totalCdpGmv / totalTgmv) * 100 : null,
        shareRebate: totalCdpInv > 0 ? (totalRebate / totalCdpInv) * 100 : null,
      },
    };
  }, [rawRows, custId, startStr, endStr]);

  if (totals.cdpGmv === 0 && totals.cdpInv === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Sem dados de campanha CDP para este seller no período selecionado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        Breakdown de Campanha CDP
      </h3>

      {/* CDP KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase">CDP GMV</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{fmtCompact(totals.cdpGmv)}</p>
            <span className="text-[10px] text-muted-foreground">Share: {fmtPct(totals.shareCdp)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-muted-foreground uppercase">ROAS CDP</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{totals.cdpRoas !== null ? `${totals.cdpRoas.toFixed(1)}x` : "—"}</p>
            <span className="text-[10px] text-muted-foreground">Inv: {fmtCompact(totals.cdpInv)}</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-muted-foreground uppercase">Rebate</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{fmtCompact(totals.rebate)}</p>
            <span className="text-[10px] text-muted-foreground">{fmtPct(totals.shareRebate)} do inv.</span>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Package className="w-3 h-3 text-chart-4" />
              <span className="text-[10px] text-muted-foreground uppercase">Itens Opt-in</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{Math.round(totals.itemsOptin).toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily CDP Chart */}
      {daily.length > 1 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              CDP GMV vs Investimento diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    formatter={(value: number, name: string) => [
                      fmtCurrency(value),
                      name === "cdpGmv" ? "CDP GMV" : name === "rebate" ? "Rebate" : "Sem Rebate",
                    ]}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "cdpGmv" ? "CDP GMV" : value === "rebate" ? "Inv. Rebate" : "Inv. Sem Rebate"
                    }
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                  <Bar dataKey="cdpGmv" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="rebate" fill="hsl(45, 80%, 55%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="semRebate" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment Split */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Composição do Investimento CDP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Com Rebate</span>
                <span className="font-mono text-foreground">{fmtCurrency(totals.rebate)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${totals.cdpInv > 0 ? (totals.rebate / totals.cdpInv) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Sem Rebate</span>
                <span className="font-mono text-foreground">{fmtCurrency(totals.semRebate)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-muted-foreground/50 rounded-full"
                  style={{ width: `${totals.cdpInv > 0 ? (totals.semRebate / totals.cdpInv) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
