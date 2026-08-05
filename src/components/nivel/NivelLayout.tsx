import { cn } from "@/lib/utils";
import BreadcrumbSeletor, { type SegmentoBreadcrumb } from "./BreadcrumbSeletor";
import SemaforoStatus from "@/components/programas/base/SemaforoStatus";
import { useContextoNavegacao } from "@/contexts/ContextoNavegacao";
import type { StatusOkr } from "@/types/programas";

const TAMANHO_HEROI: Record<number, string> = {
  0: "text-6xl",
  1: "text-5xl",
  2: "text-5xl",
  3: "text-4xl",
  4: "text-4xl",
};

export interface Kpi {
  rotulo: string;
  valor: string;
  detalhe?: string;
}

export interface Aba {
  id: string;
  rotulo: string;
}

interface Props {
  nivel: number;
  breadcrumb: SegmentoBreadcrumb[];
  contextoExtra?: React.ReactNode;
  status?: StatusOkr;
  heroi?: { valor: string; rotulo: string } | null;
  kpis?: Kpi[];
  abas?: Aba[];
  abaAtiva?: string;
  onAba?: (id: string) => void;
  corpo: React.ReactNode;
  confianca?: React.ReactNode;
  carregando?: boolean;
  erro?: string | null;
  acoesTopo?: React.ReactNode;
}

function BarraContexto({ status, extra }: { status?: StatusOkr; extra?: React.ReactNode }) {
  const { periodo } = useContextoNavegacao();
  return (
    <div className="flex items-center gap-3 flex-wrap px-4 md:px-6 py-2 border-b border-border bg-muted/20 text-xs">
      <span className="text-muted-foreground font-mono tabular-nums">
        {periodo.inicio} → {periodo.fim}
      </span>
      {extra}
      {status && <SemaforoStatus status={status} />}
    </div>
  );
}

function SkeletonZonas() {
  return (
    <div className="animate-pulse space-y-4 px-4 md:px-6 py-6">
      <div className="h-12 w-64 bg-muted rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-11 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}

/** Esqueleto único das 5 zonas. Nenhuma tela pode ter cabeçalho/rodapé próprio. */
export default function NivelLayout({
  nivel,
  breadcrumb,
  contextoExtra,
  status,
  heroi,
  kpis = [],
  abas,
  abaAtiva,
  onAba,
  corpo,
  confianca,
  carregando,
  erro,
  acoesTopo,
}: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Zona 1 — breadcrumb + seletor (sticky) */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5">
          <BreadcrumbSeletor segmentos={breadcrumb} />
          {acoesTopo}
        </div>
      </div>

      {/* Zona 2 — barra de contexto */}
      <BarraContexto status={status} extra={contextoExtra} />

      {/* Zona 3 — herói + KPIs */}
      {(heroi || kpis.length > 0) && nivel !== 5 && (
        <div className="px-4 md:px-6 pt-6 pb-4">
          {heroi && (
            <div className="mb-4">
              <div className={cn("font-mono tabular-nums font-semibold leading-none", TAMANHO_HEROI[nivel])}>
                {heroi.valor}
              </div>
              <div className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{heroi.rotulo}</div>
            </div>
          )}
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpis.slice(0, 4).map((k) => (
                <div key={k.rotulo} className="rounded-lg border border-border px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">{k.rotulo}</div>
                  <div className="font-mono tabular-nums text-lg">{k.valor}</div>
                  {k.detalhe && <div className="text-[11px] text-muted-foreground">{k.detalhe}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Abas — apenas em L2, nível único */}
      {abas && nivel === 2 && (
        <div className="px-4 md:px-6 border-b border-border flex gap-1 overflow-x-auto">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => onAba?.(a.id)}
              className={cn(
                "px-3 py-2 text-xs whitespace-nowrap border-b-2 -mb-px transition-colors",
                abaAtiva === a.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      )}

      {/* Zona 4 — corpo */}
      <main className="flex-1 px-4 md:px-6 py-4 pb-24">
        {carregando ? (
          <SkeletonZonas />
        ) : erro ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {erro}
          </div>
        ) : (
          corpo
        )}
      </main>

      {/* Zona 5 — faixa de confiança */}
      <div className="sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-2 text-[11px] text-muted-foreground">
        {confianca}
      </div>
    </div>
  );
}
