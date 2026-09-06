import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Granularidade = "month" | "day";

interface Fonte {
  key: string;
  label: string;
  granularidade: Granularidade;
  /** Atraso tolerado: dias (diário) ou meses (mensal). */
  tolerancia: number;
}

const FONTES: Fonte[] = [
  { key: "sellers_kpi", label: "KPIs mensais", granularidade: "month", tolerancia: 1 },
  { key: "cpp_mensal", label: "CPP mensal", granularidade: "month", tolerancia: 1 },
  { key: "cdp_mensal", label: "CDP mensal", granularidade: "month", tolerancia: 1 },
  { key: "sellers_kpi_daily", label: "KPIs diários", granularidade: "day", tolerancia: 3 },
  { key: "live_listings", label: "Anúncios ativos", granularidade: "day", tolerancia: 7 },
  { key: "seller_eligibility", label: "Elegibilidade", granularidade: "day", tolerancia: 3 },
  { key: "meli_campaigns", label: "Campanhas Meli", granularidade: "day", tolerancia: 7 },
];

interface CoverageRow { source: string; period: string; rows: number }

interface Atraso {
  label: string;
  ultimo: string | null;
  atraso: number;
  granularidade: Granularidade;
}

function rotuloMes(id: string) {
  if (!/^\d{6}$/.test(id)) return id;
  return `${id.slice(4, 6)}/${id.slice(0, 4)}`;
}

function rotuloDia(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function mesesDeAtraso(periodo: string) {
  const ano = Number(periodo.slice(0, 4));
  const mes = Number(periodo.slice(4, 6));
  const hoje = new Date();
  return (hoje.getFullYear() - ano) * 12 + (hoje.getMonth() + 1 - mes);
}

function diasDeAtraso(periodo: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(`${periodo}T00:00:00`);
  return Math.round((hoje.getTime() - d.getTime()) / 86_400_000);
}

/**
 * Aviso de bases desatualizadas — visível apenas para o administrador geral.
 * Somente leitura: usa a cobertura já publicada por `get_data_coverage()`.
 */
export default function AvisoDadosDesatualizados() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase.rpc("get_data_coverage" as any);
    if (error) {
      setErro(error.message);
      setRows([]);
    } else {
      setRows((data as any[]) ?? []);
    }
    setCarregando(false);
  };

  useEffect(() => {
    if (!authLoading && isAdmin) carregar();
  }, [authLoading, isAdmin]);

  const atrasos = useMemo<Atraso[]>(() => {
    const ultimoPor = new Map<string, string>();
    for (const r of rows) {
      if ((Number(r.rows) || 0) <= 0) continue;
      const atual = ultimoPor.get(r.source);
      if (!atual || r.period > atual) ultimoPor.set(r.source, r.period);
    }
    const out: Atraso[] = [];
    for (const f of FONTES) {
      const ultimo = ultimoPor.get(f.key) ?? null;
      if (!ultimo) {
        out.push({ label: f.label, ultimo: null, atraso: Infinity, granularidade: f.granularidade });
        continue;
      }
      const atraso = f.granularidade === "month" ? mesesDeAtraso(ultimo) : diasDeAtraso(ultimo);
      if (atraso > f.tolerancia) {
        out.push({ label: f.label, ultimo, atraso, granularidade: f.granularidade });
      }
    }
    return out;
  }, [rows]);

  if (authLoading || !isAdmin) return null;
  if (!erro && atrasos.length === 0) return null;

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-warning shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Dados desatualizados <span className="text-[11px] font-normal text-muted-foreground">· visível só para o admin geral</span>
            </p>
            {erro ? (
              <p className="text-xs text-destructive">Não foi possível verificar as bases: {erro}</p>
            ) : (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {atrasos.map((a) => (
                  <li key={a.label} className="tabular-nums">
                    <span className="text-foreground">{a.label}</span>{" "}
                    {a.ultimo
                      ? `— último dado em ${a.granularidade === "month" ? rotuloMes(a.ultimo) : rotuloDia(a.ultimo)} (${a.atraso} ${a.granularidade === "month" ? "mês(es)" : "dia(s)"} de atraso)`
                      : "— sem nenhum dado carregado"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={carregar} disabled={carregando}>
          {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2 hidden sm:inline">Reverificar</span>
        </Button>
      </div>
    </div>
  );
}
