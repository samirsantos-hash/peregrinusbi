import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Camera, AlertTriangle, TrendingUp, TrendingDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SellerWithKpi } from "@/hooks/usePortfolios";
import type { SellerTrend } from "@/hooks/usePortfolioTrends";
import { toast } from "sonner";

function safePct(num: number, den: number): number {
  if (!den || den === 0) return 0;
  return (num / den) * 100;
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function getMedalStyle(level: string | null): { label: string; className: string } {
  const l = (level || "").toLowerCase();
  if (l.includes("platinum")) return { label: "Platinum", className: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
  if (l.includes("gold")) return { label: "Gold", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" };
  if (l.includes("silver")) return { label: "Silver", className: "bg-gray-400/20 text-gray-300 border-gray-400/30" };
  if (l.includes("leader") || l.includes("líder")) return { label: "Líder", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  return { label: level || "—", className: "bg-muted/30 text-muted-foreground border-border" };
}

function getModalPrincipal(tsi: number, fTsi: number, tsiFlex: number): { label: string; emoji: string; className: string } {
  const tsiOther = Math.max(0, tsi - fTsi - tsiFlex);
  if (fTsi >= tsiFlex && fTsi >= tsiOther) return { label: "FULL", emoji: "⚡", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" };
  if (tsiFlex >= fTsi && tsiFlex >= tsiOther) return { label: "FLEX", emoji: "🏍️", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  return { label: "AGÊNCIA / CROSS", emoji: "📦", className: "bg-muted/30 text-muted-foreground border-border" };
}

type FilterPill = "all" | "platinum" | "ads3" | "growth" | "trending_up" | "trending_down";
type SortKey = "nickname" | "repCurrentLevel" | "tgmvLc" | "roas" | "modalPrincipal" | "pctAds" | "scoreQualidadeFinal";

interface Props {
  sellers: SellerWithKpi[];
  trends?: Record<string, SellerTrend>;
  portfolioName?: string;
}

function TrendArrow({ value }: { value: number | undefined }) {
  if (value === undefined) return null;
  if (value > 0) return <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />;
  if (value < 0) return <TrendingDown className="w-3 h-3 text-destructive shrink-0" />;
  return null;
}

type EnrichedSeller = SellerWithKpi & {
  pctAds: number;
  roas: number;
  modalPrincipal: ReturnType<typeof getModalPrincipal>;
  alertQuality: boolean;
  alertHighAds: boolean;
};

function enrichRows(sellers: SellerWithKpi[]): EnrichedSeller[] {
  return sellers.map((s) => {
    const pctAds = safePct(s.invPads, s.tgmvLc);
    const roas = s.invPads > 0 ? (s.tgmvLcPads || 0) / s.invPads : 0;
    const modalPrincipal = getModalPrincipal(s.tsi, s.fTsi, s.tsiFlex);
    const alertQuality = s.scoreQualidadeFinal < 50;
    const alertHighAds = pctAds > 5;
    return { ...s, pctAds, roas, modalPrincipal, alertQuality, alertHighAds };
  });
}

function getExportRows(data: EnrichedSeller[], trends?: Record<string, SellerTrend>) {
  return data.map((s) => {
    const t = trends?.[s.sellerId];
    return {
      Seller: s.nickname,
      Medalha: getMedalStyle(s.repCurrentLevel).label,
      "Faturamento (R$)": s.tgmvLc,
      "Tendência Fat. (%)": t ? Number(t.tgmvTrend.toFixed(1)) : "—",
      ROAS: Number(s.roas.toFixed(1)),
      "Modal Principal": `${s.modalPrincipal.emoji} ${s.modalPrincipal.label}`,
      "% Ads": Number(s.pctAds.toFixed(2)),
      "Saúde Catálogo": Number(s.scoreQualidadeFinal.toFixed(0)),
      Alertas: [
        s.alertQuality ? "📸 Fotos" : "",
        s.alertHighAds ? "⚠ Alto Ads" : "",
      ].filter(Boolean).join(", ") || "✓",
    };
  });
}

export default function RaioXTable({ sellers, trends, portfolioName = "Carteira" }: Props) {
  const [filter, setFilter] = useState<FilterPill>("all");
  const [sortKey, setSortKey] = useState<SortKey>("tgmvLc");
  const [sortAsc, setSortAsc] = useState(false);

  const enriched = useMemo(() => enrichRows(sellers), [sellers]);

  const filtered = useMemo(() => {
    let list = enriched;
    switch (filter) {
      case "platinum":
        list = list.filter((s) => s.repCurrentLevel?.toLowerCase().includes("platinum"));
        break;
      case "ads3":
        list = list.filter((s) => s.pctAds > 3);
        break;
      case "growth":
        list = list.filter((s) => s.fTgmvLc > s.tgmvLc);
        break;
      case "trending_up":
        list = list.filter((s) => {
          const t = trends?.[s.sellerId];
          return t && t.tgmvTrend > 0;
        });
        break;
      case "trending_down":
        list = list.filter((s) => {
          const t = trends?.[s.sellerId];
          return t && (t.tgmvTrend < 0 || t.visitsTrend < 0);
        });
        break;
    }
    return list;
  }, [enriched, filter, trends]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp: number;
      if (sortKey === "modalPrincipal") {
        cmp = a.modalPrincipal.label.localeCompare(b.modalPrincipal.label);
      } else {
        const av = a[sortKey as keyof typeof a];
        const bv = b[sortKey as keyof typeof b];
        cmp = typeof av === "string"
          ? (av || "").localeCompare(bv as string || "")
          : (Number(av) || 0) - (Number(bv) || 0);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = getExportRows(sorted, trends);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Raio-X");
    XLSX.writeFile(wb, `${portfolioName}_RaioX.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  const handleExportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Raio-X — ${portfolioName}`, 14, 18);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 14, 24);

    const rows = getExportRows(sorted, trends);
    const headers = Object.keys(rows[0] || {});
    const body = rows.map((r) => headers.map((h) => String((r as any)[h] ?? "")));

    autoTable(doc, { head: [headers], body, startY: 28, styles: { fontSize: 7 }, headStyles: { fillColor: [30, 30, 30] } });
    doc.save(`${portfolioName}_RaioX.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  const pills: { key: FilterPill; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "trending_up", label: "📈 Em Crescimento" },
    { key: "trending_down", label: "📉 Em Queda" },
    { key: "platinum", label: "Apenas Platinum" },
    { key: "ads3", label: "Gasto Ads > 3%" },
    { key: "growth", label: "Oportunidade Crescimento" },
  ];

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
      </span>
    </TableHead>
  );

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {pills.map((p) => (
              <Button
                key={p.key}
                variant={filter === p.key ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setFilter(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf} className="gap-2 cursor-pointer">
                <FileText className="w-4 h-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Seller" k="nickname" />
                <SortHeader label="Medalha" k="repCurrentLevel" />
                <SortHeader label="Faturamento" k="tgmvLc" />
                <SortHeader label="ROAS" k="roas" />
                <SortHeader label="Modal Principal" k="modalPrincipal" />
                <SortHeader label="% Ads" k="pctAds" />
                <SortHeader label="Saúde" k="scoreQualidadeFinal" />
                <TableHead className="whitespace-nowrap">Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum seller encontrado com esse filtro.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((s) => {
                  const medal = getMedalStyle(s.repCurrentLevel);
                  const trend = trends?.[s.sellerId];
                  return (
                    <TableRow key={s.custId}>
                      <TableCell className="font-medium text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          {s.alertQuality && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Camera className="w-3.5 h-3.5 text-destructive shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>📸 Melhorar Fotos / Catálogo</TooltipContent>
                            </Tooltip>
                          )}
                          {s.nickname}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs border ${medal.className}`}>
                          {medal.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          {fmtBRL(s.tgmvLc)}
                          <TrendArrow value={trend?.tgmvTrend} />
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{s.roas.toFixed(1)}x</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs border ${s.modalPrincipal.className}`}>
                          {s.modalPrincipal.emoji} {s.modalPrincipal.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          {s.pctAds.toFixed(2)}%
                          <TrendArrow value={trend?.adsTrend} />
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(s.scoreQualidadeFinal, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono">{s.scoreQualidadeFinal.toFixed(0)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {s.alertHighAds && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              </TooltipTrigger>
                              <TooltipContent>Vazamento de Margem (Ads {'>'} 5%)</TooltipContent>
                            </Tooltip>
                          )}
                          {trend && (trend.tgmvTrend < -15 || trend.visitsTrend < -15) && (
                            <Tooltip>
                              <TooltipTrigger>
                                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>🚨 Queda severa detectada</TooltipContent>
                            </Tooltip>
                          )}
                          {!s.alertHighAds && !s.alertQuality && !(trend && (trend.tgmvTrend < -15 || trend.visitsTrend < -15)) && (
                            <span className="text-xs text-muted-foreground">✓</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
