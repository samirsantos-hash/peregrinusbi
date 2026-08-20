import { useEffect, useRef } from "react";
import { getSecao } from "@/config/sellerTabs";

interface Props {
  /** id da aba ativa */
  ativa: string;
  /** nome da loja selecionada, se houver */
  loja?: string | null;
  /** linha de contexto (ex.: período) */
  contexto?: string | null;
}

/** Título da seção — único <h1> da página, com foco e anúncio em troca de seção. */
export default function SecaoHeader({ ativa, loja, contexto }: Props) {
  const { label, descricao } = getSecao(ativa);
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
    <header className="mb-6">
      <h1
        ref={h1Ref}
        tabIndex={-1}
        className="text-[28px] leading-tight font-bold text-foreground break-words outline-none"
      >
        {label}
      </h1>
      {descricao && (
        <p className="mt-1 text-[13px] font-normal text-muted-foreground break-words">{descricao}</p>
      )}
      {(loja || contexto) && (
        <p className="mt-1 text-xs text-muted-foreground break-words">
          {[loja, contexto].filter(Boolean).join(" · ")}
        </p>
      )}
      <span aria-live="polite" className="sr-only">{`${label} carregado`}</span>
    </header>
  );
}
