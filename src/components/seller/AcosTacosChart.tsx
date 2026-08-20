import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HelpCircle, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type PontoAds = {
  mes: string; // "2026-05"
  acos: number;
  tacos: number;
  inv: number;
  gmv_ads: number;
};

const META_TACOS = 3;

const ACOS_COLOR = "hsl(var(--brand-purple))";
const TACOS_COLOR = "hsl(var(--brand-blue))";

function rotuloMes(mes: string) {
  const [a, m] = String(mes).split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(m) - 1] ?? mes}/${(a ?? "").slice(2)}`;
}

const pct = (v: number | null | undefined, casas = 1) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

function percentil(vals: number[], p: number): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export default function AcosTacosChart({ pontos }: { pontos: PontoAds[] }) {
  const dados = useMemo(
    () =>
      pontos.map((p) => {
        const semDado = !(p.inv > 0) && !(p.gmv_ads > 0);
        const acos = semDado || !Number.isFinite(p.acos) || p.acos <= 0 ? null : p.acos;
        const tacos = semDado || !Number.isFinite(p.tacos) || p.tacos <= 0 ? null : p.tacos;
        return {
          mes: p.mes,
          label: rotuloMes(p.mes),
          acos,
          tacos,
          share: acos && tacos ? (tacos / acos) * 100 : null,
          roas: acos ? 100 / acos : null,
        };
      }),
    [pontos],
  );

  // Teto do eixo: percentil 95 da janela (nunca o máximo)
  const teto = useMemo(() => {
    const vals = dados.flatMap((d) => [d.acos, d.tacos].filter((v): v is number => v != null));
    if (!vals.length) return 10;
    const p95 = percentil(vals, 0.95);
    return Math.max(META_TACOS * 1.6, Math.ceil((p95 * 1.1) / 5) * 5);
  }, [dados]);

  // Valores recortados para desenho; o valor real fica no tooltip/rótulo
  const plot = useMemo(
    () =>
      dados.map((d) => ({
        ...d,
        acosPlot: d.acos == null ? null : Math.min(d.acos, teto),
        tacosPlot: d.tacos == null ? null : Math.min(d.tacos, teto),
        acosAcimaTeto: d.acos != null && d.acos > teto,
        tacosAcimaTeto: d.tacos != null && d.tacos > teto,
        faixa:
          d.acos == null || d.tacos == null
            ? null
            : ([Math.min(d.tacos, teto), Math.min(d.acos, teto)] as [number, number]),
      })),
    [dados, teto],
  );

  const ultimo = [...dados].reverse().find((d) => d.acos != null);
  const roasAtual = ultimo?.roas ?? null;
  const shareAtual = ultimo?.share ?? null;

  const dotFactory = (cor: string, campoAcima: "acosAcimaTeto" | "tacosAcimaTeto") =>
    (props: any) => {
      const { cx, cy, payload, index } = props;
      if (cx == null || cy == null) return <g key={`d-${index}`} />;
      const acima = payload?.[campoAcima];
      return (
        <g key={`d-${campoAcima}-${index}`}>
          <circle cx={cx} cy={cy} r={3.5} fill={cor} stroke="hsl(var(--card))" strokeWidth={1} />
          {acima && <circle cx={cx} cy={cy} r={7} fill="none" stroke={cor} strokeWidth={1.5} />}
        </g>
      );
    };

  // rótulo direto na ponta direita de cada linha (codificação secundária ao par de cores)
  const RotulosPonta = (props: any) => {
    const { xAxisMap, yAxisMap, offset } = props;
    const xA: any = Object.values(xAxisMap ?? {})[0];
    const yA: any = Object.values(yAxisMap ?? {})[0];
    if (!xA || !yA) return null;
    const ultimoIdx = [...plot].map((d, i) => (d.acos != null ? i : -1)).filter((i) => i >= 0).pop();
    if (ultimoIdx == null) return null;
    const d = plot[ultimoIdx];
    const x = xA.scale(d.label) + (xA.bandSize ? xA.bandSize / 2 : 0);
    const itens = [
      { v: d.acosPlot, real: d.acos, cor: ACOS_COLOR, txt: "ACOS" },
      { v: d.tacosPlot, real: d.tacos, cor: TACOS_COLOR, txt: "TACOS" },
    ].filter((i) => i.v != null);
    return (
      <g>
        {itens.map((i, k) => (
          <text
            key={k}
            x={Math.min(x + 8, (offset?.left ?? 0) + (offset?.width ?? 0) + 34)}
            y={yA.scale(i.v as number) + 4}
            fontSize={10}
            fontWeight={600}
            fill={i.cor}
          >
            {`${i.txt} ${pct(i.real, 1)}`}
          </text>
        ))}
      </g>
    );
  };

  if (!dados.some((d) => d.acos != null || d.tacos != null)) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        <Info className="h-4 w-4" />
        Sem meses com investimento em Ads registrado para montar a série.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Título + stat tiles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h4 className="text-[13px] font-semibold">ACOS x TACOS — eficiência e peso da mídia</h4>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Como ler este gráfico"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] space-y-2 text-xs leading-relaxed">
              <p><span className="font-semibold">ACOS</span> — de cada R$ 100 vendidos por anúncio pago, quanto foi gasto em mídia. Mede a eficiência da campanha.</p>
              <p><span className="font-semibold">TACOS</span> — de cada R$ 100 vendidos no total, quanto foi gasto em mídia. Mede a dependência do negócio em relação à mídia.</p>
              <p><span className="font-semibold">ROAS</span> — quantos reais vendidos por real investido. É exatamente o inverso do ACOS (ROAS = 100 / ACOS), por isso aparece como número e não como linha.</p>
              <p className="font-semibold">Como ler</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>ACOS estável + TACOS subindo → a mídia continua eficiente, mas cresce como fatia do negócio: aumenta a dependência.</li>
                <li>ACOS subindo + TACOS estável → a mídia ficou mais cara, mas está contida: revisar campanha, não o orçamento.</li>
                <li>Ambos subindo → perda de eficiência com aumento de exposição: revisar campanha e orçamento juntos.</li>
                <li>Ambos caindo → mídia mais barata e menos dependência: há espaço para escalar.</li>
              </ul>
              <p className="text-muted-foreground">
                Meses sem investimento ficam vazios e a linha é interrompida. Pontos acima do teto do eixo
                aparecem na borda com um anel — o valor real está sempre no rótulo e no tooltip.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-wrap gap-2">
          <UiTooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-1.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  ROAS
                  <span className="rounded-full border border-border px-1 text-[9px] leading-4">derivado</span>
                </div>
                <div className="tnum text-sm font-semibold">
                  {roasAtual == null ? "—" : `${roasAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-xs">
              ROAS = 100 / ACOS. É o inverso exato do ACOS, por isso não é plotado como linha.
            </TooltipContent>
          </UiTooltip>

          <UiTooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-1.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Faturamento vindo de Ads
                  <span className="rounded-full border border-border px-1 text-[9px] leading-4">derivado</span>
                </div>
                <div className="tnum text-sm font-semibold">{pct(shareAtual, 1)}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-xs">
              % do faturamento vindo de Ads = TACOS / ACOS. Responde “se eu desligar a mídia, quanto sobra?”.
            </TooltipContent>
          </UiTooltip>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={plot} margin={{ top: 12, right: 78, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis
            domain={[0, teto]}
            allowDataOverflow
            tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              fontSize: 12,
            }}
            formatter={(_v: any, _n: any, item: any) => {
              const p = item?.payload ?? {};
              if (item?.dataKey === "acosPlot")
                return [`${pct(p.acos)}${p.acosAcimaTeto ? " (acima do teto do eixo)" : ""}`, "ACOS"];
              if (item?.dataKey === "tacosPlot")
                return [`${pct(p.tacos)}${p.tacosAcimaTeto ? " (acima do teto do eixo)" : ""}`, "TACOS"];
              return [pct(p.share), "% do faturamento vindo de Ads"];
            }}
          />
          <ReferenceLine
            y={META_TACOS}
            stroke={TACOS_COLOR}
            strokeDasharray="5 4"
            label={{
              value: `meta de investimento em Ads: ${META_TACOS}% do faturamento`,
              position: "insideBottomLeft",
              fontSize: 9,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
          <Area
            dataKey="faixa"
            fill={TACOS_COLOR}
            fillOpacity={0.1}
            stroke="none"
            connectNulls={false}
            isAnimationActive={false}
            activeDot={false}
            name="% do faturamento vindo de Ads"
          />
          <Line
            type="linear"
            dataKey="acosPlot"
            name="ACOS"
            stroke={ACOS_COLOR}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
            dot={dotFactory(ACOS_COLOR, "acosAcimaTeto")}
            activeDot={{ r: 5 }}
          />
          <Line
            type="linear"
            dataKey="tacosPlot"
            name="TACOS"
            stroke={TACOS_COLOR}
            strokeWidth={2}
            strokeDasharray="6 3"
            connectNulls={false}
            isAnimationActive={false}
            dot={dotFactory(TACOS_COLOR, "tacosAcimaTeto")}
            activeDot={{ r: 5 }}
          />
          <Customized component={RotulosPonta} />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Linha sólida roxa: <span className="font-semibold">ACOS</span> (investimento ÷ vendas por Ads). Linha tracejada azul:{" "}
        <span className="font-semibold">TACOS</span> (investimento ÷ faturamento total). A área entre elas é o{" "}
        <span className="font-semibold">% do faturamento vindo de Ads (TACOS ÷ ACOS)</span>. Unidade: % do faturamento.
        Eixo limitado ao percentil 95 da janela; meses acima aparecem na borda com anel e valor real no rótulo.
      </p>
    </div>
  );
}
