import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PedidoML } from "@/lib/multilojas/parse";
import { fBRL, fShort, fInt, fPct, median } from "@/lib/multilojas/stats";

/* Ticker de bolsa das lojas: camada de varredura acima da tabela analítica.
 * Regras duras: "(sem loja oficial)" não é loja; delta ausente ≠ zero;
 * base pequena não entra na ordenação por movimento. */

const SEM_LOJA = "(sem loja oficial)";
const LARGURA = 220;
const GAP = 12;
const VELOCIDADE = 40; // px/s

type MetricaId = "gmv" | "liq" | "pedidos" | "margem" | "ticket";

const METRICAS: { id: MetricaId; label: string }[] = [
  { id: "gmv", label: "GMV" },
  { id: "liq", label: "Líquido" },
  { id: "pedidos", label: "Pedidos" },
  { id: "margem", label: "Margem" },
  { id: "ticket", label: "Ticket" },
];

const FORMULA: Record<MetricaId, string> = {
  gmv: "GMV = soma do valor bruto dos pedidos",
  liq: "Líquido = soma do valor líquido recebido",
  pedidos: "Pedidos = contagem de pedidos únicos",
  margem: "Margem = líquido ÷ GMV",
  ticket: "Ticket = GMV ÷ pedidos",
};

interface Bloco {
  gmv: number; liq: number; pedidos: number; margem: number; ticket: number;
}

const vazio = (): Bloco => ({ gmv: 0, liq: 0, pedidos: 0, margem: 0, ticket: 0 });

function agregarBloco(ps: PedidoML[]): Bloco {
  const gmv = ps.reduce((s, p) => s + p.gmv, 0);
  const liq = ps.reduce((s, p) => s + p.liq, 0);
  const pedidos = new Set(ps.map((p) => p.id)).size;
  return { gmv, liq, pedidos, margem: gmv ? liq / gmv : 0, ticket: pedidos ? gmv / pedidos : 0 };
}

function agrupar(ps: PedidoML[]) {
  const m = new Map<string, PedidoML[]>();
  ps.forEach((p) => {
    if (p.loja === SEM_LOJA) return;
    const arr = m.get(p.loja);
    if (arr) arr.push(p); else m.set(p.loja, [p]);
  });
  return m;
}

function formatar(metrica: MetricaId, v: number): string {
  if (metrica === "pedidos") return fInt(v);
  if (metrica === "margem") return fPct(v);
  if (metrica === "ticket") return fBRL(v);
  return fShort(v);
}

function rotuloValorAria(metrica: MetricaId, v: number): string {
  if (metrica === "pedidos") return `${fInt(v)} pedidos`;
  if (metrica === "margem") return `margem de ${fPct(v)}`;
  return `${formatar(metrica, v)}`;
}

/* ── sparkline com quebra em período sem dado ── */
const Sparkline = ({ pontos }: { pontos: (number | null)[] }) => {
  const w = 190, h = 24;
  const validos = pontos.filter((v): v is number => v != null);
  if (validos.length < 2) return <div style={{ height: h }} aria-hidden />;
  const min = Math.min(...validos), max = Math.max(...validos);
  const span = max - min || 1;
  const dx = pontos.length > 1 ? w / (pontos.length - 1) : w;
  const segs: string[] = [];
  let atual: string[] = [];
  pontos.forEach((v, i) => {
    if (v == null) { if (atual.length > 1) segs.push(atual.join(" ")); atual = []; return; }
    atual.push(`${(i * dx).toFixed(1)},${(h - ((v - min) / span) * (h - 3) - 1.5).toFixed(1)}`);
  });
  if (atual.length > 1) segs.push(atual.join(" "));
  return (
    <svg width={w} height={h} aria-hidden className="mt-1">
      {segs.map((s, i) => (
        <polyline key={i} points={s} fill="none" stroke="hsl(var(--brand-blue))" strokeWidth={1.5} />
      ))}
    </svg>
  );
};

interface LinhaLoja {
  loja: string;
  valor: number;
  delta: number | null;
  basePequena: boolean;
  pedidos: number;
  spark: (number | null)[];
  anterior: number | null;
}

interface Props {
  base: PedidoML[];
  prev: PedidoML[];
  dias: string[];
  periodoAtual: { ini: string; fim: string };
  periodoAnterior: { ini: string; fim: string } | null;
  onSelecionarLoja?: (loja: string) => void;
}

const TickerLojas = ({ base, prev, dias, periodoAtual, periodoAnterior, onSelecionarLoja }: Props) => {
  const [params, setParams] = useSearchParams();
  const metrica = (METRICAS.find((m) => m.id === params.get("tickerMetrica"))?.id ?? "gmv") as MetricaId;
  const [modo, setModo] = useState<"todas" | "altas" | "baixas">("todas");
  const [rodando, setRodando] = useState<boolean>(() => localStorage.getItem("ml_ticker_play") !== "0");
  const [pausadoPorFoco, setPausadoPorFoco] = useState(false);
  const [verTodasMobile, setVerTodasMobile] = useState(false);

  const reduzirMovimento = useRef(false);
  const [semAnimacao, setSemAnimacao] = useState(true);
  const vieportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);

  useEffect(() => {
    reduzirMovimento.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const linhas = useMemo<LinhaLoja[]>(() => {
    const atuais = agrupar(base);
    const antes = agrupar(prev);
    const buckets = Math.min(8, Math.max(6, Math.floor(dias.length / 3) || 6));
    const tamanho = Math.max(1, Math.ceil(dias.length / buckets));

    const out: LinhaLoja[] = Array.from(atuais.entries()).map(([loja, ps]) => {
      const ag = agregarBloco(ps);
      const ant = antes.has(loja) ? agregarBloco(antes.get(loja)!) : null;
      const valor = ag[metrica];
      const antVal = ant ? ant[metrica] : null;
      const delta = ant && antVal ? (valor - antVal) / Math.abs(antVal) : null;

      const porDia = new Map<string, PedidoML[]>();
      ps.forEach((p) => {
        const arr = porDia.get(p.dia);
        if (arr) arr.push(p); else porDia.set(p.dia, [p]);
      });
      const spark: (number | null)[] = [];
      for (let i = 0; i < dias.length; i += tamanho) {
        const janela = dias.slice(i, i + tamanho).flatMap((dia) => porDia.get(dia) ?? []);
        spark.push(janela.length ? agregarBloco(janela)[metrica] : null);
      }
      return { loja, valor, delta, basePequena: false, pedidos: ag.pedidos, spark, anterior: antVal };
    });

    const medPed = median(out.map((l) => l.pedidos));
    out.forEach((l) => { l.basePequena = medPed > 0 && l.pedidos < medPed * 0.05; });
    return out;
  }, [base, prev, dias, metrica]);

  const ordenadas = useMemo(() => {
    const filtradas = linhas.filter((l) => {
      if (modo === "altas") return (l.delta ?? 0) > 0;
      if (modo === "baixas") return (l.delta ?? 0) < 0;
      return true;
    });
    const mov = filtradas.filter((l) => l.delta != null && !l.basePequena)
      .sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!));
    const resto = filtradas.filter((l) => l.delta == null || l.basePequena)
      .sort((a, b) => b.valor - a.valor);
    return [...mov, ...resto];
  }, [linhas, modo]);

  const indice = useMemo(() => {
    const validas = linhas.filter((l) => l.delta != null && !l.basePequena);
    const alta = validas.filter((l) => l.delta! > 0).length;
    const baixa = validas.filter((l) => l.delta! < 0).length;
    const gmvAtual = linhas.reduce((s, l) => s + (metrica === "gmv" ? l.valor : 0), 0);
    const atual = base.filter((p) => p.loja !== SEM_LOJA).reduce((s, p) => s + p.gmv, 0);
    const anterior = prev.filter((p) => p.loja !== SEM_LOJA).reduce((s, p) => s + p.gmv, 0);
    const dGrupo = anterior > 0 ? (atual - anterior) / anterior : null;
    return { alta, baixa, dGrupo, gmvAtual };
  }, [linhas, base, prev, metrica]);

  /* Só anima se houver overflow real. */
  const medir = useCallback(() => {
    const vp = vieportRef.current;
    if (!vp) return;
    const total = ordenadas.length * (LARGURA + GAP);
    setSemAnimacao(reduzirMovimento.current || total <= vp.clientWidth || vp.clientWidth < 1280);
  }, [ordenadas.length]);

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);

  useEffect(() => {
    if (semAnimacao || !rodando || pausadoPorFoco) return;
    let raf = 0;
    let anterior = performance.now();
    const largura = ordenadas.length * (LARGURA + GAP);
    const passo = (t: number) => {
      const dt = (t - anterior) / 1000;
      anterior = t;
      offset.current = (offset.current + VELOCIDADE * dt) % (largura || 1);
      if (trackRef.current) trackRef.current.style.transform = `translateX(${-offset.current}px)`;
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [semAnimacao, rodando, pausadoPorFoco, ordenadas.length]);

  const alternarPlay = () => {
    setRodando((r) => { localStorage.setItem("ml_ticker_play", r ? "0" : "1"); return !r; });
  };

  const rolar = (dir: -1 | 1) => {
    vieportRef.current?.scrollBy({ left: dir * (LARGURA + GAP) * 2, behavior: "smooth" });
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const cartoes = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>("[data-cartao]"),
    );
    const i = cartoes.indexOf(document.activeElement as HTMLElement);
    const prox = cartoes[Math.min(cartoes.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)))];
    prox?.focus();
  };

  if (!linhas.length) return null;

  const Cartao = ({ l }: { l: LinhaLoja }) => {
    const estavel = l.delta != null && Math.abs(l.delta) < 0.005;
    const seta = l.delta == null || estavel ? "►" : l.delta > 0 ? "▲" : "▼";
    const cor = l.basePequena || l.delta == null || estavel
      ? "text-muted-foreground"
      : l.delta > 0 ? "text-emerald" : "text-destructive";
    const textoDelta = l.delta == null ? "—" : `${l.delta > 0 ? "+" : ""}${(l.delta * 100).toFixed(1)}%`;
    const aria = `${l.loja}, ${METRICAS.find((m) => m.id === metrica)!.label} ${rotuloValorAria(metrica, l.valor)}, ${
      l.delta == null ? "sem base de comparação" : estavel ? "estável" : l.delta > 0 ? `alta de ${(l.delta * 100).toFixed(1)} por cento` : `queda de ${(Math.abs(l.delta) * 100).toFixed(1)} por cento`
    }${l.basePequena ? ", base pequena" : ""}`;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-cartao
            role="link"
            tabIndex={0}
            aria-label={aria}
            onClick={() => onSelecionarLoja?.(l.loja)}
            onKeyDown={(e) => { if (e.key === "Enter") onSelecionarLoja?.(l.loja); }}
            style={{ width: LARGURA, height: 88 }}
            className="shrink-0 cursor-pointer rounded-lg border border-border/50 bg-card/70 px-3 py-2 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="truncate text-[13px] font-semibold leading-tight">{l.loja}</div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[18px] font-bold tabular-nums leading-tight">{formatar(metrica, l.valor)}</span>
              <span className={`text-[13px] font-semibold tabular-nums ${cor}`}>
                <span aria-hidden>{seta} </span>{textoDelta}
              </span>
            </div>
            {l.basePequena && <div className="text-[10px] text-muted-foreground leading-none">base pequena</div>}
            <Sparkline pontos={l.spark} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px] text-xs">
          <span className="mr-1 rounded border border-border px-1 text-[9px] uppercase tracking-wide">derivado</span>
          {FORMULA[metrica]}. Δ = (atual − anterior) ÷ anterior.
          <br />Atual: {periodoAtual.ini} a {periodoAtual.fim}.
          <br />Anterior: {periodoAnterior ? `${periodoAnterior.ini} a ${periodoAnterior.fim}` : "sem base de comparação"}.
          {l.basePequena && <><br />Base pequena: {fInt(l.pedidos)} pedidos — variação percentual é ruído.</>}
        </TooltipContent>
      </Tooltip>
    );
  };

  const listaMobile = verTodasMobile ? ordenadas : ordenadas.slice(0, 5);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mb-3">
        {/* linha de índice */}
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="tabular-nums text-muted-foreground">
            <strong className="text-foreground">{indice.alta}</strong> lojas em alta ·{" "}
            <strong className="text-foreground">{indice.baixa}</strong> em baixa · GMV do grupo{" "}
            {indice.dGrupo == null ? (
              <span>sem base de comparação</span>
            ) : (
              <span className={indice.dGrupo >= 0 ? "text-emerald" : "text-destructive"}>
                <span aria-hidden>{indice.dGrupo >= 0 ? "▲" : "▼"} </span>
                {indice.dGrupo >= 0 ? "+" : ""}{(indice.dGrupo * 100).toFixed(1)}% vs. período anterior
              </span>
            )}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {METRICAS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  const p = new URLSearchParams(params);
                  p.set("tickerMetrica", m.id);
                  setParams(p, { replace: true });
                }}
                className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
                  metrica === m.id ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >{m.label}</button>
            ))}
            <span className="mx-1 h-3 w-px bg-border" />
            {(["todas", "altas", "baixas"] as const).map((k) => (
              <button key={k} onClick={() => setModo(k)}
                className={`rounded px-2 py-0.5 text-[10px] capitalize transition-colors ${
                  modo === k ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >{k === "todas" ? "Todas" : k === "altas" ? "Maiores altas" : "Maiores baixas"}</button>
            ))}
          </div>
        </div>

        {/* faixa — desktop/tablet */}
        <div className="hidden items-center gap-2 md:flex">
          <div
            ref={vieportRef}
            role="list"
            aria-label="Variação por loja"
            onKeyDown={aoTeclar}
            onMouseEnter={() => setPausadoPorFoco(true)}
            onMouseLeave={() => setPausadoPorFoco(false)}
            onFocusCapture={() => setPausadoPorFoco(true)}
            onBlurCapture={() => setPausadoPorFoco(false)}
            className={`min-w-0 flex-1 overflow-hidden ${semAnimacao ? "overflow-x-auto" : ""}`}
          >
            <div ref={trackRef} className="flex" style={{ gap: GAP, willChange: "transform" }}>
              {ordenadas.map((l) => (
                <div role="listitem" key={l.loja}><Cartao l={l} /></div>
              ))}
              {!semAnimacao && ordenadas.map((l) => (
                <div aria-hidden key={`dup-${l.loja}`}><Cartao l={l} /></div>
              ))}
            </div>
          </div>

          {semAnimacao ? (
            <div className="flex shrink-0 gap-1">
              <button onClick={() => rolar(-1)} aria-label="Rolar para a esquerda"
                className="rounded-md border border-border/60 p-1.5 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => rolar(1)} aria-label="Rolar para a direita"
                className="rounded-md border border-border/60 p-1.5 text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={alternarPlay} aria-label={rodando ? "Pausar rolagem" : "Retomar rolagem"}
              className="shrink-0 rounded-md border border-border/60 p-1.5 text-muted-foreground hover:text-foreground">
              {rodando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* mobile — lista vertical dos maiores movimentos */}
        <div className="space-y-2 md:hidden" role="list" aria-label="Variação por loja">
          {listaMobile.map((l) => (
            <div role="listitem" key={l.loja} className="w-full"><Cartao l={l} /></div>
          ))}
          {ordenadas.length > 5 && (
            <button onClick={() => setVerTodasMobile((v) => !v)}
              className="text-[11px] text-primary hover:underline">
              {verTodasMobile ? "ver menos" : "ver todas"}
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TickerLojas;