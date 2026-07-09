import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { useSellerRiskPanel } from "@/hooks/useSellerRiskPanel";
import { RiskSellerTable } from "./RiskSellerTable";
import type { SignalKind } from "@/lib/risk/riskAggregator";

const SIGNAL_OPTIONS: { value: SignalKind | "all"; label: string }[] = [
  { value: "all", label: "Todos os sinais" },
  { value: "bpc", label: "BPC baixo" },
  { value: "reputacao_claims", label: "Reclamações" },
  { value: "reputacao_delayed", label: "Atrasos" },
  { value: "churn_relativo", label: "Queda MoM" },
  { value: "churn_absoluto", label: "Churn absoluto" },
];

function fmtMonth(iso: string) {
  const [y, m] = iso.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[Number(m) - 1] || m}/${y.slice(2)}`;
}

export function SellerRiskPanel() {
  const { data, isLoading, error } = useSellerRiskPanel();
  const [vertical, setVertical] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [signalKind, setSignalKind] = useState<string>("all");

  const verticalOptions = useMemo(() => {
    if (!data) return [] as string[];
    return Array.from(new Set(data.results.map((r) => r.vertical || "SEM_VERTICAL"))).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.results.filter((r) => {
      if (vertical !== "all" && (r.vertical || "SEM_VERTICAL") !== vertical) return false;
      if (severity !== "all" && r.severity !== severity) return false;
      if (signalKind !== "all" && !r.signals.some((s) => s.kind === signalKind)) return false;
      return true;
    });
  }, [data, vertical, severity, signalKind]);

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Calculando painel de risco…</span>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Não foi possível carregar o painel de risco (dados insuficientes ou erro de rede).
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div>
              <h2 className="text-lg font-semibold">Alertas & Riscos — Painel Consolidado</h2>
              <p className="text-xs text-muted-foreground">
                Cruzamento de BPC (μ − 1,2816·σ por vertical, piso 0,55), reputação
                (claims/atrasos ≥ 2% alerta, ≥ 5% crítico) e churn (z-score MoM por vertical &lt; −1).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-destructive/40 text-destructive">
              Alta {data.totals.alta}
            </Badge>
            <Badge variant="outline" className="border-warning/40 text-warning">
              Média {data.totals.media}
            </Badge>
            <Badge variant="secondary">Total {data.totals.total}</Badge>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Base: <strong>{fmtMonth(data.months.closed)}</strong> (mês fechado) vs{" "}
            <strong>{fmtMonth(data.months.prior)}</strong>. Mês corrente{" "}
            <strong>{fmtMonth(data.months.current)}</strong> está parcial e é usado apenas
            para detectar churn absoluto (GMV zerado com histórico).
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas severidades</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
            </SelectContent>
          </Select>

          <Select value={vertical} onValueChange={setVertical}>
            <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue placeholder="Vertical" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas verticais</SelectItem>
              {verticalOptions.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={signalKind} onValueChange={setSignalKind}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Tipo de sinal" /></SelectTrigger>
            <SelectContent>
              {SIGNAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
            {filtered.length} de {data.totals.total} sellers
          </span>
        </div>
      </Card>

      <RiskSellerTable rows={filtered} />
    </div>
  );
}