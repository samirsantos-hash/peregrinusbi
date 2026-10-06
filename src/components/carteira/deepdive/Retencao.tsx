import { useNavigate } from "react-router-dom";
import type { DiagnosticoLoja } from "@/lib/carteiraDeepDive/calculo";
import { pct } from "./fmt";

interface Props { ads: DiagnosticoLoja[]; promocao: DiagnosticoLoja[]; full: DiagnosticoLoja[]; vezes: Map<string, number> }

function Bloco({ titulo, itens, vezes }: { titulo: string; itens: DiagnosticoLoja[]; vezes: Map<string, number> }) {
  const nav = useNavigate();
  return (
    <div className="rounded-lg border border-border/50 bg-card/60 p-3 min-w-0">
      <h3 className="text-xs font-semibold mb-2">{titulo}</h3>
      {!itens.length ? <p className="text-[11px] text-muted-foreground">Nenhuma loja.</p> : (
        <ul className="space-y-1">
          {itens.map((d) => {
            const v = vezes.get(d.loja.id) ?? 1;
            return (
              <li key={d.loja.id} onClick={() => nav(`/lojas/${d.loja.id}`)}
                className={`flex justify-between gap-2 text-[11px] cursor-pointer rounded px-1.5 py-1 hover:bg-muted/40 ${v === 3 ? "border border-[hsl(var(--crit))]/60" : v === 2 ? "border border-[hsl(var(--attention-text))]/50" : ""}`}>
                <span className="truncate">{d.loja.nickname}{v > 1 && <span className="ml-1 font-semibold text-[hsl(var(--crit))]">×{v}</span>}</span>
                <span className="tabular-nums text-[hsl(var(--crit))]">{pct(d.queda)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Retencao({ ads, promocao, full, vezes }: Props) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold">Oportunidades de retenção</h2>
        <span className="text-[11px] text-muted-foreground">×2 / ×3 = a loja aparece em mais de um bloco (×3 é o caso mais grave)</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Bloco titulo="Queda + Ads baixo" itens={ads} vezes={vezes} />
        <Bloco titulo="Queda + Promoção baixa" itens={promocao} vezes={vezes} />
        <Bloco titulo="Queda + Full baixo" itens={full} vezes={vezes} />
      </div>
    </section>
  );
}
