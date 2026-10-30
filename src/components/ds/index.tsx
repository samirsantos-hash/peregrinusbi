/**
 * Sistema de Design Peregrinus — componentes base.
 * Verde é o único destaque; vermelho só para alerta real; amarelo só preenchimento.
 */
import { ReactNode } from "react";
import { useNumeroAnimado } from "@/hooks/useNumeroAnimado";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Faixas ──────────────────────────────────────────────────────────────── */
export type Faixa = "critico" | "abaixo" | "intermediario" | "bom";

export const FAIXA_ROTULO: Record<Faixa, string> = {
  critico: "CRÍTICO",
  abaixo: "ABAIXO DO ESPERADO",
  intermediario: "INTERMEDIÁRIO",
  bom: "NO ESPERADO",
};
export const FAIXA_COR: Record<Faixa, string> = {
  critico: "hsl(var(--ec-vermelho))",
  abaixo: "hsl(var(--ec-laranja))",
  intermediario: "hsl(var(--ec-ambar))",
  bom: "hsl(var(--ec-verde))",
};
/** Cor de texto legível para cada faixa (verde em texto usa o tom escuro). */
export const FAIXA_TXT: Record<Faixa, string> = {
  critico: "hsl(var(--ec-vermelho))",
  abaixo: "hsl(var(--ec-laranja))",
  intermediario: "hsl(var(--ec-ambar))",
  bom: "hsl(var(--ec-verde-txt))",
};

/** Limiares crescentes [crit→abaixo, abaixo→interm., interm.→bom]; padrão 25/50/75. */
export function faixaDe(valor: number, limiares: [number, number, number] = [25, 50, 75], maiorMelhor = true): Faixa {
  const v = maiorMelhor ? valor : -valor;
  const l = maiorMelhor ? limiares : (limiares.map((x) => -x).reverse() as [number, number, number]);
  if (v < l[0]) return "critico";
  if (v < l[1]) return "abaixo";
  if (v < l[2]) return "intermediario";
  return "bom";
}

/* ─── Selo de status ─────────────────────────────────────────────────────── */
export function SeloFaixa({ faixa, className }: { faixa: Faixa; className?: string }) {
  const fundoForte = faixa === "critico";
  return (
    <span
      className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.10em]", className)}
      style={fundoForte
        ? { background: FAIXA_COR.critico, color: "hsl(0 0% 100%)" }
        : { background: "hsl(var(--ec-surface-2))", color: FAIXA_TXT[faixa] }}
    >
      {FAIXA_ROTULO[faixa]}
    </span>
  );
}

/* ─── KpiCard ────────────────────────────────────────────────────────────── */
export interface KpiCardProps {
  rotulo: string;
  valor: string;
  /** Referência obrigatória: meta, período anterior ou mediana da vertical. */
  referencia: ReactNode;
  focal?: boolean;
  faixa?: Faixa;
  /** Ex.: "meta 80–100" — mostrado ao lado do selo. */
  faixaTexto?: string;
  /** Regra ainda não confirmada: recebe marca. */
  naoConfirmado?: boolean;
  className?: string;
  onClick?: () => void;
  /** Variação contra o período anterior (% ou p.p.); define a seta. */
  variacao?: number | null;
  /** Se subir é bom (faturamento) ou se cair é bom (TACOS, cancelamento). */
  melhorQuando?: "subir" | "descer" | "neutro";
}

function SetaVariacao({ variacao, melhorQuando = "subir" }: { variacao: number; melhorQuando?: "subir" | "descer" | "neutro" }) {
  const sobe = variacao > 0, estavel = Math.abs(variacao) < 0.05;
  const bom = melhorQuando === "neutro" || estavel ? null : (sobe === (melhorQuando === "subir"));
  const Icone = estavel ? Minus : sobe ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn("ds-seta", bom === true && "ds-seta-bom", bom === false && "ds-seta-ruim")}
      aria-label={`${estavel ? "Estável" : sobe ? "Subiu" : "Caiu"}${bom === null ? "" : bom ? ", bom sinal" : ", ponto de atenção"}`}
    >
      <Icone className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );
}

export function KpiCard({ rotulo, valor, referencia, focal, faixa, faixaTexto, naoConfirmado, className, onClick, variacao, melhorQuando }: KpiCardProps) {
  const Comp = onClick ? "button" : "div";
  const valorAnimado = useNumeroAnimado(valor);
  return (
    <Comp
      onClick={onClick}
      className={cn("ds-kpi text-left rounded-2xl p-5 min-w-0", onClick && "cursor-pointer active:scale-[0.98]", className)}
    >
      <p className="ds-rotulo truncate" title={rotulo}>
        {rotulo}
        {naoConfirmado && <span title="Regra de cálculo ainda não confirmada" className="ml-1 text-ec-laranja">*</span>}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
        <span data-contando aria-label={valor} className={focal ? "ds-numero-focal" : "ds-numero-sec"} style={faixa ? { color: FAIXA_TXT[faixa] } : undefined}>
          {valorAnimado}
        </span>
        {variacao != null && Number.isFinite(variacao) && <SetaVariacao variacao={variacao} melhorQuando={melhorQuando} />}
        {faixa && <SeloFaixa faixa={faixa} />}
        {faixaTexto && <span className="ds-nota">{faixaTexto}</span>}
      </div>
      <p className="ds-nota mt-1">{referencia}</p>
    </Comp>
  );
}

/* ─── BandBar: barra com quatro faixas na trilha ─────────────────────────── */
export interface BandBarProps {
  valor: number | null;
  max?: number;
  limiares?: [number, number, number];
  maiorMelhor?: boolean;
  rotulo?: string;
  className?: string;
}

export function BandBar({ valor, max = 100, limiares = [25, 50, 75], maiorMelhor = true, rotulo, className }: BandBarProps) {
  if (valor === null || !Number.isFinite(valor)) {
    return <p className={cn("text-[12px] text-foreground/65", className)}>{rotulo ? `${rotulo}: ` : ""}sem dado no período</p>;
  }
  const f = faixaDe(valor, limiares, maiorMelhor);
  const w = Math.max(0, Math.min(100, (valor / max) * 100));
  const cortes = [0, ...limiares.map((l) => (l / max) * 100), 100];
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        {rotulo && <span className="text-[13px] font-medium text-foreground leading-tight min-w-0">{rotulo}</span>}
        <span className="shrink-0 inline-flex items-baseline gap-1.5 whitespace-nowrap" style={{ color: FAIXA_TXT[f] }}>
          <span className="text-base font-semibold tabular-nums">{Math.round(valor).toLocaleString("pt-BR")}</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.08em]">{FAIXA_ROTULO[f]}</span>
        </span>
      </div>
      <div className="relative h-2 rounded-sm bg-ec-surface-2 overflow-hidden">
        {cortes.slice(1, -1).map((c, i) => (
          <span key={i} className="absolute top-0 bottom-0 w-px bg-ec-line" style={{ left: `${c}%` }} />
        ))}
        <span className="absolute left-0 top-0 bottom-0 rounded-sm" style={{ width: `${w}%`, background: FAIXA_COR[f] }} />
      </div>
      <div className="relative h-3 ds-nota">
        {limiares.map((l, i) => (
          <span key={i} className="absolute -translate-x-1/2 tabular-nums text-[10px]" style={{ left: `${(l / max) * 100}%` }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── TargetBar: realizado × meta × mediana (substitui medidores) ─────────── */
export interface TargetBarProps {
  rotulo: string;
  realizado: number | null;
  meta?: number | null;
  mediana?: number | null;
  max?: number;
  formatar?: (v: number) => string;
  className?: string;
}

export function TargetBar({ rotulo, realizado, meta, mediana, max, formatar = (v) => v.toLocaleString("pt-BR"), className }: TargetBarProps) {
  const teto = max ?? Math.max(realizado ?? 0, meta ?? 0, mediana ?? 0, 1) * 1.1;
  const p = (v: number) => `${Math.max(0, Math.min(100, (v / teto) * 100))}%`;
  const abaixoMeta = realizado !== null && meta != null && realizado < meta;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="ds-corpo text-foreground">{rotulo}</span>
        <span className="ds-numero-sec !text-[14px]">{realizado === null ? "—" : formatar(realizado)}</span>
      </div>
      <div className="relative h-2.5 rounded-sm bg-ec-surface-2">
        {realizado !== null && (
          <span className="absolute left-0 top-0 bottom-0 rounded-sm"
            style={{ width: p(realizado), background: abaixoMeta ? "hsl(var(--ec-laranja))" : "hsl(var(--ec-verde))" }} />
        )}
        {mediana != null && <span title="Mediana da vertical" className="absolute -top-1 -bottom-1 w-0.5 bg-ec-text-sec/60" style={{ left: p(mediana) }} />}
        {meta != null && <span title="Meta" className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-ec-ink" style={{ left: p(meta) }} />}
      </div>
      <p className="ds-nota">
        {realizado === null ? "sem dado no período" : (
          <>
            {meta != null && <>meta {formatar(meta)}</>}
            {meta != null && mediana != null && " · "}
            {mediana != null && <>mediana da vertical {formatar(mediana)}</>}
          </>
        )}
      </p>
    </div>
  );
}

/* ─── Alert ──────────────────────────────────────────────────────────────── */
export function Alert({ children, critico, onDetalhe, className }: { children: ReactNode; critico?: boolean; onDetalhe?: () => void; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 border-b border-border py-2 ds-corpo [border-bottom-width:0.5px]", className)}>
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: critico ? "hsl(var(--ec-vermelho))" : "hsl(var(--ec-laranja))" }} />
      <span className="flex-1 text-foreground">{children}</span>
      {onDetalhe && (
        <button onClick={onDetalhe} className="shrink-0 text-ec-verde-txt text-[12px] font-medium hover:underline">ver detalhe</button>
      )}
    </div>
  );
}

/* ─── EmptyState ─────────────────────────────────────────────────────────── */
export function EmptyState({ falta, mostraria, acao, className }: { falta: string; mostraria?: string; acao?: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dashed border-border bg-ec-surface-2/60 p-4 ds-corpo", className)}>
      <p className="text-foreground font-medium">{falta}</p>
      {mostraria && <p className="ds-nota mt-1">Quando disponível, esta seção mostra {mostraria}.</p>}
      {acao && <p className="ds-nota mt-1">{acao}</p>}
    </div>
  );
}

/* ─── PageHeader ─────────────────────────────────────────────────────────── */
export function PageHeader({ titulo, periodo, atrasoFonte, acoes, className }: {
  titulo: string; periodo?: string; atrasoFonte?: string | null; acoes?: ReactNode; className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-3 flex-wrap", className)}>
      <div>
        <h1 className="ds-titulo-pagina">{titulo}</h1>
        {periodo && <p className="ds-nota mt-0.5">{periodo}</p>}
        {atrasoFonte && <p className="mt-1 text-[11px] text-ec-laranja">{atrasoFonte}</p>}
      </div>
      {acoes}
    </header>
  );
}

/* ─── Rótulo de seção / título de bloco ──────────────────────────────────── */
export const RotuloSecao = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("ds-rotulo", className)}>{children}</p>
);

/** Aviso de período parcial para rodapé de gráfico. */
export const NotaParcial = ({ dias, total }: { dias: number; total?: number }) => (
  <p className="ds-nota mt-1 flex items-center gap-1.5">
    <span className="inline-block h-2.5 w-4 rounded-sm ds-hachura border border-border" />
    PARCIAL · {dias}{total ? ` de ${total}` : ""} dias com dado
  </p>
);
