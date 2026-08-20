import { useMemo, useState } from "react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell, BarChart,
} from "recharts";
import { AlertTriangle, Table as TableIcon, ExternalLink } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { fmtBRL, formatChartDate } from "@/utils/formatters";

/* Escala DIVERGENTE: quente = caro (ruim) · neutro = equivalente · frio = barato (bom).
 * Verde e vermelho são cores de status reservadas e não aparecem aqui. */
const HOT = "hsl(var(--price-hot))";
const NEUTRAL = "hsl(var(--price-neutral))";
const COOL = "hsl(var(--price-cool))";
const SURFACE = "hsl(var(--card))";
const GRID = "hsl(var(--border))";
const AXIS = "hsl(var(--muted-foreground))";

const LIMITE_CARO = 30;

const RESSALVA_UNIDADE =
  "As colunas VISITS_MATCH / VISITS_EXPENSIVE / VISITS_CHEAPER não são contagem de visitas: contêm valores decimais e somam muito acima de VISITAS. Por isso não existe denominador válido para calcular cobertura BPC, e o volume mostrado serve apenas para comparar meses entre si — nunca como número absoluto em relatório ou reunião.";

const AJUDA =
  "O QUE É ANALISADO\n" +
  "A composição de preço do seller frente ao concorrente direto, nas situações em que o Mercado Livre ativou a comparação de preço (BPC). Três faixas: mais barato, equivalente e preço alto. Elas somam sempre 100%.\n\n" +
  "COMO É MEDIDO\n" +
  "Cada faixa é a participação da respectiva coluna sobre a soma das três, por período. A área empilhada é 100% por construção — ela mostra composição, não volume.\n" +
  "Ressalva de unidade: " + RESSALVA_UNIDADE + "\n\n" +
  "POR QUE IMPORTA\n" +
  "O algoritmo cruza cliques e conversão. Anúncio que recebe visita e não converte por preço perde posição de forma progressiva e automática. Acima de 30% em preço alto, o efeito costuma ficar visível na exposição orgânica.\n\n" +
  "COMO LER E O QUE FAZER\n" +
  "Leia primeiro a faixa de volume abaixo do gráfico: mês com barra clara ou hachurada tem base pequena e não sustenta conclusão. Depois olhe a tendência da faixa laranja contra a linha de 30%. Se subir, priorize os itens da tabela abaixo, ordenados por visitas — é onde o preço custa mais tráfego. Onde a margem não permite baixar preço, avalie CDP com coparticipação.";

const pct = (v: number, d = 1) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
const int = (v: number) => Math.round(v).toLocaleString("pt-BR");

export interface PriceKpiLike {
  date: string;
  visits: number;
  visitsExpensive: number;
  visitsMatch: number;
  visitsCheaper: number;
  minPriceRival: number;
  productName: string;
  productId: string;
}

interface Props {
  kpis: PriceKpiLike[];
  granularity?: "consolidated" | "daily";
  tooltipBpc?: string;
}

interface Ponto {
  key: string;
  label: string;
  bpc: number;
  visits: number;
  cheaper: number | null;
  match: number | null;
  expensive: number | null;
  amostraPequena: boolean;
  parcial: boolean;
  hachura: number;
}

const PriceCompetitivenessChart = ({ kpis, granularity = "daily", tooltipBpc }: Props) => {
  const [verDados, setVerDados] = useState(false);
  const [verTodos, setVerTodos] = useState(false);

  const { pontos, totalBpc, volumeMax } = useMemo(() => {
    const map = new Map<string, { visits: number; exp: number; match: number; cheap: number }>();
    for (const k of kpis) {
      const cur = map.get(k.date) || { visits: 0, exp: 0, match: 0, cheap: 0 };
      cur.visits += k.visits || 0;
      cur.exp += k.visitsExpensive || 0;
      cur.match += k.visitsMatch || 0;
      cur.cheap += k.visitsCheaper || 0;
      map.set(k.date, cur);
    }
    const chaves = [...map.keys()].sort();
    const bpcs = chaves.map((c) => {
      const v = map.get(c)!;
      return v.exp + v.match + v.cheap;
    });
    const positivos = bpcs.filter((b) => b > 0).sort((a, b) => a - b);
    const mediana = positivos.length ? positivos[Math.floor(positivos.length / 2)] : 0;
    const hoje = new Date();
    const mesCorrente = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

    const ps: Ponto[] = chaves.map((c) => {
      const v = map.get(c)!;
      const bpc = v.exp + v.match + v.cheap;
      /* Soma exata de 100%: duas faixas arredondadas, a terceira fecha o resto. */
      const cheaper = bpc > 0 ? Math.round((v.cheap / bpc) * 1000) / 10 : null;
      const match = bpc > 0 ? Math.round((v.match / bpc) * 1000) / 10 : null;
      const expensive =
        bpc > 0 ? Math.round((100 - (cheaper as number) - (match as number)) * 10) / 10 : null;
      const parcial = c.slice(0, 7) === mesCorrente;
      const amostraPequena = bpc > 0 && mediana > 0 && bpc < mediana * 0.05;
      return {
        key: c,
        label: formatChartDate(c, granularity),
        bpc,
        visits: v.visits,
        cheaper,
        match,
        expensive: expensive != null ? Math.max(0, Math.min(100, expensive)) : null,
        amostraPequena,
        parcial,
        hachura: amostraPequena || parcial ? 100 : 0,
      };
    });

    return {
      pontos: ps,
      totalBpc: ps.reduce((s, p) => s + p.bpc, 0),
      volumeMax: ps.reduce((m, p) => Math.max(m, p.bpc), 0),
    };
  }, [kpis, granularity]);

  const ultimo = [...pontos].reverse().find((p) => p.bpc > 0) || null;

  /* Camada acionável: ordenada por visitas (perde-se mais onde há tráfego),
   * nunca pela maior diferença de preço. */
  const itensCaros = useMemo(() => {
    const map = new Map<string, { nome: string; visitas: number; caras: number; rivalSoma: number; rivalN: number }>();
    for (const k of kpis) {
      if (!(k.visitsExpensive > 0)) continue;
      const cur = map.get(k.productId) || { nome: k.productName, visitas: 0, caras: 0, rivalSoma: 0, rivalN: 0 };
      cur.visitas += k.visits || 0;
      cur.caras += k.visitsExpensive || 0;
      if (k.minPriceRival > 0) { cur.rivalSoma += k.minPriceRival; cur.rivalN++; }
      map.set(k.productId, cur);
    }
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        nome: v.nome,
        visitas: v.visitas,
        caras: v.caras,
        pctCaro: v.visitas > 0 ? (v.caras / v.visitas) * 100 : 0,
        rival: v.rivalN > 0 ? v.rivalSoma / v.rivalN : 0,
      }))
      .sort((a, b) => b.visitas - a.visitas);
  }, [kpis]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d: Ponto | undefined = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="glass-card p-3 !bg-card/95 text-xs space-y-1 tabular-nums">
        <p className="font-semibold text-foreground">{label}</p>
        <p style={{ color: HOT }}>% Preço Alto: {d.expensive != null ? pct(d.expensive) : "—"}</p>
        <p style={{ color: NEUTRAL }}>% Equivalente: {d.match != null ? pct(d.match) : "—"}</p>
        <p style={{ color: COOL }}>% Mais Barato: {d.cheaper != null ? pct(d.cheaper) : "—"}</p>
        <p className="text-muted-foreground pt-1 border-t border-border/50">
          Volume BPC do período: <span className="text-foreground">{int(d.bpc)}</span>
        </p>
        <p className="text-[10px] text-muted-foreground">unidade não confirmada pela fonte — comparar meses entre si</p>
        {d.amostraPequena && <p style={{ color: HOT }}>amostra pequena</p>}
        {d.parcial && <p style={{ color: HOT }}>mês parcial (em curso)</p>}
      </div>
    );
  };

  const VolumeTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d: Ponto = payload[0].payload;
    return (
      <div className="glass-card p-2 !bg-card/95 text-xs tabular-nums">
        <p className="font-semibold text-foreground">{d.label}</p>
        <p className="text-muted-foreground">Volume BPC: {int(d.bpc)}</p>
        {d.amostraPequena && <p style={{ color: HOT }}>volume abaixo de 5% da mediana</p>}
      </div>
    );
  };

  /* Rótulo direto no valor final de cada faixa. */
  const rotuloFinal = (cor: string) => (props: any) => {
    const { x, y, index, value } = props;
    if (index !== pontos.length - 1 || value == null) return null;
    if (pontos[pontos.length - 1]?.parcial) return null;
    return (
      <text x={x + 14} y={y + 4} fill={cor} fontSize={11} className="tabular-nums">
        {pct(Number(value), 0)}
      </text>
    );
  };

  if (!pontos.length) {
    return (
      <div className="glass-card p-5 text-xs text-muted-foreground">
        Sem dados de comparação de preço no período.
      </div>
    );
  }

  const margem = { top: 16, right: 64, left: 8, bottom: 0 };

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Evolução da Competitividade de Preço (%)
          </h3>
          <TooltipInfo text={tooltipBpc ? `${AJUDA}\n\n${tooltipBpc}` : AJUDA} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Sobre as visitas com comparação de preço ativa (BPC)
        </p>
      </div>

      {/* Universo do dado — cobertura BPC não é calculável nesta fonte */}
      <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
        <div className="flex items-center gap-1">
          <p className="text-sm text-foreground">Universo: situações com comparação de preço ativa (BPC).</p>
          <span className="rounded border border-border px-1 text-[9px] uppercase tracking-wide text-muted-foreground">der.</span>
          <TooltipInfo text={RESSALVA_UNIDADE} />
        </div>
        <p className="text-sm mt-1 tabular-nums text-foreground">
          Volume do período: <span className="text-2xl font-semibold">{int(totalBpc)}</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Unidade não confirmada pela fonte — use para comparar meses entre si, não como número absoluto.
        </p>
      </div>

      {/* Área empilhada 100% — sem suavização */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={pontos} margin={margem} stackOffset="none">
          <defs>
            <pattern id="hachuraMes" width={6} height={6} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="transparent" />
              <line x1="0" y1="0" x2="0" y2="6" stroke={AXIS} strokeWidth={2} strokeOpacity={0.55} />
            </pattern>
          </defs>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} stroke={GRID} />
          <YAxis
            domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: AXIS, fontSize: 11 }}
            tickLine={false} stroke={GRID} tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: GRID }} />
          <Legend wrapperStyle={{ color: AXIS, fontSize: 12 }} />
          <Area
            type="linear" dataKey="cheaper" name="% Mais Barato" stackId="p" connectNulls={false}
            stroke={SURFACE} strokeWidth={2} fill={COOL} fillOpacity={0.85} isAnimationActive={false}
            label={rotuloFinal(COOL)}
          />
          <Area
            type="linear" dataKey="match" name="% Equivalente" stackId="p" connectNulls={false}
            stroke={SURFACE} strokeWidth={2} fill={NEUTRAL} fillOpacity={0.85} isAnimationActive={false}
            label={rotuloFinal(NEUTRAL)}
          />
          <Area
            type="linear" dataKey="expensive" name="% Preço Alto" stackId="p" connectNulls={false}
            stroke={SURFACE} strokeWidth={2} fill={HOT} fillOpacity={0.85} isAnimationActive={false}
            label={rotuloFinal(HOT)}
          />
          {/* Meses hachurados: amostra pequena ou mês em curso */}
          <Bar dataKey="hachura" name="Amostra pequena / mês parcial" fill="url(#hachuraMes)" isAnimationActive={false} barSize={28} />
          <ReferenceLine
            y={LIMITE_CARO} stroke={HOT} strokeDasharray="5 4" strokeWidth={1.5} ifOverflow="extendDomain"
          
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Faixa de VOLUME BPC por período — escala sequencial azul */}
      <div>
        <p className="text-[11px] text-muted-foreground mb-1">Volume BPC por período (escala azul — mais escuro = maior volume)</p>
        <ResponsiveContainer width="100%" height={34}>
          <BarChart data={pontos} margin={{ ...margem, top: 0 }}>
            <XAxis dataKey="label" hide />
            <YAxis domain={[0, 1]} hide />
            <Tooltip content={<VolumeTooltip />} cursor={false} />
            <Bar dataKey={() => 1} barSize={16} isAnimationActive={false}>
              {pontos.map((p) => (
                <Cell
                  key={p.key}
                  fill={p.amostraPequena ? "url(#hachuraVolume)" : COOL}
                  fillOpacity={p.amostraPequena ? 1 : 0.15 + (volumeMax > 0 ? p.bpc / volumeMax : 0) * 0.8}
                />
              ))}
            </Bar>
            <defs>
              <pattern id="hachuraVolume" width={6} height={6} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="transparent" />
                <line x1="0" y1="0" x2="0" y2="6" stroke={AXIS} strokeWidth={2} strokeOpacity={0.55} />
              </pattern>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-2">
        <span className="inline-block w-6 border-t-2 border-dashed" style={{ borderColor: HOT }} />
        limite aceitável de preço alto: 30%
      </p>

      <p className="text-[11px] text-muted-foreground">
        Faixas hachuradas indicam período com amostra menor que 5% da mediana da série ou mês ainda em curso (parcial).
        {ultimo?.parcial && " O último período do eixo é parcial."}
      </p>

      {/* Tabela alternativa acessível */}
      <div>
        <button
          onClick={() => setVerDados((v) => !v)}
          className="text-xs inline-flex items-center gap-1 text-brand-blue hover:underline"
        >
          <TableIcon className="w-3.5 h-3.5" /> {verDados ? "Ocultar dados" : "Ver dados"}
        </button>
        {verDados && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <caption className="sr-only">Percentuais de faixa de preço e volume BPC por período</caption>
              <thead>
                <tr className="text-muted-foreground text-left border-b border-border/50">
                  <th className="py-1.5 pr-3 font-medium">Período</th>
                  <th className="py-1.5 pr-3 font-medium text-right">% Mais Barato</th>
                  <th className="py-1.5 pr-3 font-medium text-right">% Equivalente</th>
                  <th className="py-1.5 pr-3 font-medium text-right">% Preço Alto</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Volume BPC</th>
                  <th className="py-1.5 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody>
                {pontos.map((p) => (
                  <tr key={p.key} className="border-b border-border/30">
                    <td className="py-1.5 pr-3">{p.label}</td>
                    <td className="py-1.5 pr-3 text-right">{p.cheaper != null ? pct(p.cheaper) : "—"}</td>
                    <td className="py-1.5 pr-3 text-right">{p.match != null ? pct(p.match) : "—"}</td>
                    <td className="py-1.5 pr-3 text-right">{p.expensive != null ? pct(p.expensive) : "—"}</td>
                    <td className="py-1.5 pr-3 text-right">{int(p.bpc)}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {[p.amostraPequena && "amostra pequena", p.parcial && "parcial"].filter(Boolean).join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Camada acionável */}
      <div className="pt-2 border-t border-border/50">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
          Itens com preço acima do rival — top 10 por visitas perdidas
        </h4>
        <p className="text-[11px] text-muted-foreground mb-2">
          Ordenado por visitas (perde-se mais onde há mais tráfego), não pela maior diferença de preço.
        </p>
        {itensCaros.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum item com visitas em faixa de preço alto no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-muted-foreground text-left border-b border-border/50">
                  <th className="py-1.5 pr-3 font-medium">Item</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Menor preço rival</th>
                  <th className="py-1.5 pr-3 font-medium text-right">% visitas caras</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Visitas do período</th>
                  <th className="py-1.5 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {(verTodos ? itensCaros : itensCaros.slice(0, 10)).map((it) => (
                  <tr key={it.id} className="border-b border-border/30">
                    <td className="py-1.5 pr-3 max-w-[220px] truncate" title={it.nome}>{it.nome}</td>
                    <td className="py-1.5 pr-3 text-right">{it.rival > 0 ? fmtBRL(it.rival) : "—"}</td>
                    <td className="py-1.5 pr-3 text-right" style={{ color: it.pctCaro >= LIMITE_CARO ? HOT : undefined }}>
                      {pct(it.pctCaro)}
                    </td>
                    <td className="py-1.5 pr-3 text-right">{int(it.visitas)}</td>
                    <td className="py-1.5">
                      <span className="text-muted-foreground">
                        {it.pctCaro >= LIMITE_CARO ? "Revisar preço agora" : "Monitorar"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {itensCaros.length > 10 && (
              <button
                onClick={() => setVerTodos((v) => !v)}
                className="mt-2 text-xs inline-flex items-center gap-1 text-brand-blue hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {verTodos ? "Ver menos" : "Ver todos"}
              </button>
            )}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-2">
          A base diária não traz preço próprio nem MLB por anúncio nessa fonte — a comparação usa o menor preço rival
          informado pelo ML e o volume de visitas em faixa de preço alto.
        </p>
      </div>
    </div>
  );
};

export default PriceCompetitivenessChart;