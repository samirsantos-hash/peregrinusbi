import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { getSecao } from "@/config/sellerTabs";
import { abrirSellerNoMeli } from "@/lib/sellerLink";

interface Props {
  /** id da aba ativa */
  ativa: string;
  subTitulo?: string;
  /** nome da loja selecionada, se houver */
  loja?: string | null;
  /** linha de contexto (ex.: período) */
  contexto?: string | null;
  /** substitui a descrição fixa (ex.: briefing do período) */
  resumo?: string | null;
  /** Cust ID da loja selecionada */
  custId?: number | null;
}

/** Título da seção — único <h1> da página, com foco e anúncio em troca de seção. */
export default function SecaoHeader({ ativa, subTitulo, loja, contexto, resumo, custId }: Props) {
  const { label, descricao: fixa } = getSecao(ativa);
  const descricao = resumo || fixa;
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const primeiro = useRef(true);

  useEffect(() => {
    document.title = loja ? `${label} · ${loja} · Peregrinus` : `${label} · Peregrinus`;
  }, [label, loja]);

  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    h1Ref.current?.focus();
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [ativa, subTitulo]);

  return (
    <header className="panel-section-header mb-5 min-w-0 font-sans" data-secao={ativa}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="panel-section-title break-words outline-none"
        >
          {label}
        </h1>
        {/* Metadados em chips discretos, uma linha: loja · período */}
        {(loja || contexto) && (
          <p className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Contexto da seção">
            {loja && (
              <button
                type="button"
                onClick={() => custId && abrirSellerNoMeli(custId, loja)}
                disabled={!custId}
                className="inline-flex max-w-[20rem] items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-base font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={`Abrir a página do vendedor ${loja}`}
              >
                <span className="truncate">{loja}</span>
                <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
              </button>
            )}
            {custId != null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-base font-semibold tabular-nums text-foreground">
                <span className="text-sm font-medium text-muted-foreground">Cust ID:</span>{custId}
              </span>
            )}
            {contexto && (
              <span className="inline-flex max-w-full items-center truncate rounded-full border px-3 py-1.5 text-base font-semibold tabular-nums" style={{ color: "hsl(var(--ec-amarelo))", borderColor: "hsl(var(--ec-amarelo) / 0.5)", background: "hsl(var(--ec-amarelo) / 0.08)" }} title={contexto}>
                {contexto}
              </span>
            )}
          </p>
        )}
      </div>
      {subTitulo && <p className="mt-2 text-sm font-medium text-primary">{subTitulo}</p>}
      {descricao && (
        <p className="panel-section-briefing mt-3 font-normal tabular-nums break-words">
          {resumo && <strong className="panel-section-summary-label">Resumo: </strong>}
          {descricao}
        </p>
      )}
      <span aria-live="polite" className="sr-only">{`${label} carregado`}</span>
    </header>
  );
}
