import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MapPin } from "lucide-react";
import type { SellerWithKpi } from "@/hooks/usePortfolios";

function safePct(num: number, den: number): number {
  if (!den || den === 0) return 0;
  return (num / den) * 100;
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

type FilterPill = "all" | "platinum" | "ads3" | "full" | "growth";
type SortKey = "nickname" | "cusState" | "repCurrentLevel" | "tgmvLc" | "pctFlex" | "pctFull" | "pctAds" | "scoreQualidadeFinal";

interface Props {
  sellers: SellerWithKpi[];
}

export default function RaioXTable({ sellers }: Props) {
  const [filter, setFilter] = useState<FilterPill>("all");
  const [sortKey, setSortKey] = useState<SortKey>("tgmvLc");
  const [sortAsc, setSortAsc] = useState(false);

  const enriched = useMemo(() =>
    sellers.map((s) => ({
      ...s,
      pctFlex: safePct(s.tgmvLcFlex, s.tgmvLc),
      pctFull: safePct(s.tgmvLcFull, s.tgmvLc),
      pctAds: safePct(s.invPads, s.tgmvLc),
    })),
    [sellers]
  );

  const filtered = useMemo(() => {
    let list = enriched;
    switch (filter) {
      case "platinum":
        list = list.filter((s) => s.repCurrentLevel?.toLowerCase().includes("platinum"));
        break;
      case "ads3":
        list = list.filter((s) => s.pctAds > 3);
        break;
      case "full":
        list = list.filter((s) => s.pctFull > 20);
        break;
      case "growth":
        list = list.filter((s) => s.fTgmvLc > s.tgmvLc);
        break;
    }
    return list;
  }, [enriched, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof typeof a];
      const bv = b[sortKey as keyof typeof b];
      const cmp = typeof av === "string"
        ? (av || "").localeCompare(bv as string || "")
        : (Number(av) || 0) - (Number(bv) || 0);
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const pills: { key: FilterPill; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "platinum", label: "Apenas Platinum" },
    { key: "ads3", label: "Gasto Ads > 3%" },
    { key: "full", label: "Alta Adoção Full" },
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
    <div className="space-y-3">
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

      <div className="overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Seller" k="nickname" />
              <SortHeader label="Região" k="cusState" />
              <SortHeader label="Reputação" k="repCurrentLevel" />
              <SortHeader label="Faturamento" k="tgmvLc" />
              <SortHeader label="% Flex" k="pctFlex" />
              <SortHeader label="% Full" k="pctFull" />
              <SortHeader label="% Ads" k="pctAds" />
              <SortHeader label="Saúde Catálogo" k="scoreQualidadeFinal" />
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
              sorted.map((s) => (
                <TableRow key={s.custId}>
                  <TableCell className="font-medium text-sm">{s.nickname}</TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {s.cusState || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 border border-border">
                      {s.repCurrentLevel || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{fmtBRL(s.tgmvLc)}</TableCell>
                  <TableCell className="font-mono text-sm">{s.pctFlex.toFixed(1)}%</TableCell>
                  <TableCell className="font-mono text-sm">{s.pctFull.toFixed(1)}%</TableCell>
                  <TableCell className="font-mono text-sm">{s.pctAds.toFixed(2)}%</TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
