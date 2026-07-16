import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Granularity = "month" | "day";

interface SourceMeta {
  key: string;
  label: string;
  granularity: Granularity;
  window: number; // periods to render
}

const SOURCES: SourceMeta[] = [
  { key: "cpp_mensal",         label: "CPP Mensal",             granularity: "month", window: 12 },
  { key: "cdp_mensal",         label: "CDP Mensal",             granularity: "month", window: 12 },
  { key: "sellers_kpi",        label: "Sellers KPI (mensal)",   granularity: "month", window: 12 },
  { key: "sellers_kpi_daily",  label: "Sellers KPI (diária)",   granularity: "day",   window: 30 },
  { key: "live_listings",      label: "Live Listings",          granularity: "day",   window: 30 },
  { key: "seller_eligibility", label: "Elegibilidade",          granularity: "day",   window: 30 },
  { key: "meli_campaigns",     label: "Meli Campanhas",         granularity: "day",   window: 30 },
];

interface CoverageRow { source: string; period: string; rows: number }

function formatMonth(id: string) {
  // id = YYYYMM
  if (!/^\d{6}$/.test(id)) return id;
  return `${id.slice(4, 6)}/${id.slice(0, 4)}`;
}

function formatDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function expectedMonths(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function expectedDays(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default function DataVerifierPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CoverageRow[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("get_data_coverage" as any);
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data as any[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const perSource = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (!map.has(r.source)) map.set(r.source, new Map());
      map.get(r.source)!.set(r.period, Number(r.rows) || 0);
    }
    return map;
  }, [rows]);

  return (
    <Card className="glass-card border-glass-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Verificador de Dados
        </CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Atualizar</span>
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-destructive mb-3">Erro: {error}</div>
        )}
        {loading && rows.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Analisando bases…
          </div>
        ) : (
          <div className="space-y-4">
            {SOURCES.map((src) => {
              const map = perSource.get(src.key) ?? new Map<string, number>();
              const expected = src.granularity === "month"
                ? expectedMonths(src.window)
                : expectedDays(src.window);
              const present = expected.filter((p) => (map.get(p) ?? 0) > 0);
              const missing = expected.length - present.length;
              const totalRows = Array.from(map.values()).reduce((s, n) => s + n, 0);
              const values = expected.map((p) => map.get(p) ?? 0);
              const max = Math.max(1, ...values);
              const latestPeriod = [...map.keys()].sort().pop();

              const statusOk = missing === 0 && totalRows > 0;
              return (
                <div key={src.key} className="rounded-lg border border-glass-border bg-background/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {statusOk ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald" />
                      ) : (
                        <AlertTriangle className={`w-4 h-4 ${totalRows === 0 ? "text-destructive" : "text-warning"}`} />
                      )}
                      <span className="font-medium text-sm">{src.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {src.granularity === "month" ? "mensal" : "diário"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {totalRows.toLocaleString("pt-BR")} linhas · última {latestPeriod
                        ? (src.granularity === "month" ? formatMonth(latestPeriod) : formatDay(latestPeriod))
                        : "—"}
                      {missing > 0 && (
                        <span className="ml-2 text-warning">{missing} período(s) faltando</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end gap-[3px] h-10">
                    {expected.map((p, i) => {
                      const v = values[i];
                      const h = v > 0 ? Math.max(6, Math.round((v / max) * 40)) : 2;
                      const missingBar = v === 0;
                      return (
                        <div
                          key={p}
                          className={`flex-1 rounded-sm ${
                            missingBar
                              ? "bg-destructive/40"
                              : "bg-primary/70"
                          }`}
                          style={{ height: `${h}px` }}
                          title={`${src.granularity === "month" ? formatMonth(p) : formatDay(p)}: ${v.toLocaleString("pt-BR")} linhas${missingBar ? " (sem dados)" : ""}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground tabular-nums">
                    <span>
                      {src.granularity === "month"
                        ? formatMonth(expected[0])
                        : formatDay(expected[0])}
                    </span>
                    <span>
                      {src.granularity === "month"
                        ? formatMonth(expected[expected.length - 1])
                        : formatDay(expected[expected.length - 1])}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}