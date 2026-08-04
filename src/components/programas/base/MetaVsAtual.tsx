import ValorMetrica from "./ValorMetrica";
import type { Metrica } from "@/types/programas";

interface Props {
  atual: Metrica;
  meta: Metrica;
  rotuloMeta?: string;
}

/** Regra 4.3 — meta sempre ao lado do realizado, na mesma linha. */
const MetaVsAtual = ({ atual, meta, rotuloMeta = "meta" }: Props) => (
  <div className="flex items-baseline gap-2 text-sm">
    <ValorMetrica metrica={atual} className="text-foreground font-semibold" />
    <span className="text-[11px] text-muted-foreground">
      {rotuloMeta} <ValorMetrica metrica={meta} className="text-[11px] text-muted-foreground" />
    </span>
  </div>
);

export default MetaVsAtual;
