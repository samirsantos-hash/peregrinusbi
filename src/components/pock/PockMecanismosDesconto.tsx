import { useMemo } from "react";
import { Info } from "lucide-react";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PockMecanismo } from "@/hooks/usePockData";

interface Props {
  mecanismos: PockMecanismo[];
  /** F_TGMV_LC do período — base do percentual */
  base: number;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Sparkline({ pontos }: { pontos: { mes: string; valor: number }[] }) {
  if (pontos.length < 2) return <div className="w-[72px] h-[18px]" aria-hidden />;
  const max = Math.max(...pontos.map((p) => p.valor), 0);
  const w = 72;
  const h = 18;
  const d = pontos
    .map((p, i) => {
      const x = (i / (pontos.length - 1)) * w;
      const y = max > 0 ? h - (p.valor / max) * (h - 2) - 1 : h - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0" role="img" aria-label="tendência de 12 meses">
      <path d={d} fill="none" stroke="hsl(var(--brand-blue))" strokeWidth={1.4} strokeOpacity={0.85} />
    </svg>
  );
}

export default function PockMecanismosDesconto({ mecanismos, base }: Props) {
  const ordenados = useMemo(() => {
    const comValor = mecanismos.filter((m) => m.valor > 0).sort((a, b) => b.valor - a.valor);
    const zerados = mecanismos.filter((m) => !(m.valor > 0));
    return [...comValor, ...zerados];
  }, [mecanismos]);

  const maiorValor = Math.max(...ordenados.map((m) => m.valor), 0);
  const meses = Math.max(0, ...ordenados.map((m) => m.historico.length));
  const semMeses = meses === 0;
  const totalTocado = ordenados.reduce((s, m) => s + m.valor, 0);
  const usados = ordenados.filter((m) => m.valor > 0).length;

  return (
    <div className="rounded-lg border border-border p-3 space-y-3 bg-card/40">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-[13px] font-semibold">Faturamento tocado por mecanismo de desconto</h4>
            <UiTooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button type="button" aria-label="Como ler os mecanismos de desconto" className="text-muted-foreground hover:text-foreground shrink-0">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[320px] leading-relaxed space-y-1.5">
                <p><span className="font-semibold">O que mostra: </span>quanto do faturamento passou por cada tipo de desconto no período.</p>
                <p><span className="font-semibold">Unidade: </span>R$ e % do faturamento do período.</p>
                <p><span className="font-semibold">Como ler: </span>cada barra é independente. O mesmo pedido pode ter mais de um mecanismo, então a soma das barras pode ultrapassar o faturamento total — não é uma divisão de um bolo.</p>
                <p><span className="font-semibold">Base insuficiente: </span>meses sem informação não entram na conta; mecanismos sem uso aparecem com R$ 0 em vez de sumir da lista.</p>
              </TooltipContent>
            </UiTooltip>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Cada barra é independente — a soma pode passar de 100% do faturamento
          </p>
        </div>
        <div className="text-right text-[10px] text-muted-foreground tnum">
          <div>
            Faturamento do período:{" "}
            <span className="text-foreground font-semibold">{base > 0 ? fmtBRL(base) : "—"}</span>
          </div>
          <div>
            {semMeses ? "Nenhum mês com informação" : `${meses} ${meses === 1 ? "mês" : "meses"} com informação`}
            {" · "}
            {usados} de {ordenados.length} mecanismos em uso
          </div>
        </div>
      </div>

      {semMeses && (
        <p className="text-[11px] text-muted-foreground rounded-md border border-border/60 px-2.5 py-1.5">
          Base insuficiente: ainda não há meses com informação de descontos para esta loja. Os
          mecanismos aparecem com R$ 0 até a carga chegar.
        </p>
      )}

      <ul className="space-y-1.5">
        {ordenados.map((m) => {
          const pct = base > 0 ? (m.valor / base) * 100 : null;
          const largura = maiorValor > 0 ? (m.valor / maiorValor) * 100 : 0;
          const zerado = !(m.valor > 0);
          return (
            <li key={m.chave} className="flex items-center gap-2">
              <span
                className={`w-[110px] sm:w-[150px] shrink-0 text-[11px] truncate ${zerado ? "text-muted-foreground/70" : "text-foreground"}`}
                title={m.rotulo}
              >
                {m.rotulo}
              </span>
              <div className="flex-1 h-[14px] rounded-sm bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-sm transition-[width] duration-700"
                  style={{ width: `${largura}%`, background: "hsl(var(--brand-blue))" }}
                />
              </div>
              <span className="w-[120px] sm:w-[150px] shrink-0 text-right text-[11px] tnum">
                <span className={zerado ? "text-muted-foreground" : "font-semibold"}>
                  {zerado ? "R$ 0" : fmtBRL(m.valor)}
                </span>
                <span className="text-muted-foreground">
                  {" · "}
                  {pct === null ? "—" : `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                </span>
              </span>
              <span className="hidden sm:block">
                <Sparkline pontos={m.historico} />
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-[10px] text-muted-foreground">
        Percentual sobre o faturamento do período. Faturamento tocado somado (com sobreposição):{" "}
        <span className="tnum">{totalTocado > 0 ? fmtBRL(totalTocado) : "R$ 0"}</span>.
      </p>
    </div>
  );
}
