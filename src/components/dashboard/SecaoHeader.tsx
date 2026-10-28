import { useEffect, useRef } from "react";
import { getSecao } from "@/config/sellerTabs";

interface Props {
  /** id da aba ativa */
  ativa: string;
  /** nome da loja selecionada, se houver */
  loja?: string | null;
  /** linha de contexto (ex.: período) */
  contexto?: string | null;
  /** substitui a descrição fixa (ex.: briefing do período) */
  resumo?: string | null;
}

/** Título da seção — único <h1> da página, com foco e anúncio em troca de seção. */
export default function SecaoHeader({ ativa, loja, contexto, resumo }: Props) {
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
  }, [ativa]);

  return (
    <header className="mb-5 min-w-0">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="text-[28px] leading-tight font-bold tracking-tight text-foreground break-words outline-none"
        >
          {label}
        </h1>
        {/* Metadados em chips discretos, uma linha: loja · período */}
        {(loja || contexto) && (
          <p className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Contexto da seção">
            {loja && (
              <span className="inline-flex max-w-[16rem] items-center truncate rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground" title={loja}>
                {loja}
              </span>
            )}
            {contexto && (
              <span className="inline-flex max-w-full items-center truncate rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground" title={contexto}>
                {contexto}
              </span>
            )}
          </p>
        )}
      </div>
      {descricao && (
        <p className="mt-1 text-[13px] font-normal text-muted-foreground break-words">{descricao}</p>
      )}
      <span aria-live="polite" className="sr-only">{`${label} carregado`}</span>
    </header>
  );
}
