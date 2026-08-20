import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Store, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import UploadPlanilha from "@/components/multilojas/UploadPlanilha";
import CentralDados from "@/components/multilojas/CentralDados";
import CadastroLojas from "@/components/multilojas/CadastroLojas";
import MinhaLoja from "@/components/multilojas/MinhaLoja";
import { usePerfilMultilojas } from "@/hooks/multilojas/usePerfilMultilojas";
import { carregarPedidos, listarCargas, diagnosticoDaBase } from "@/lib/multilojas/persist";
import FiltersBar, { type Filtros } from "@/components/multilojas/FiltersBar";
import TooltipInfo from "@/components/dashboard/TooltipInfo";
import GmvMesVsMes from "@/components/charts/GmvMesVsMes";
import TickerLojas from "@/components/multilojas/TickerLojas";
import type { Diagnostico, PedidoML } from "@/lib/multilojas/parse";
import { rangeDias } from "@/lib/multilojas/parse";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, ScatterChart, Scatter, ZAxis, AreaChart, Area, ReferenceLine,
} from "recharts";
import {
  sum, mean, median, sd, hhi, gini, pearson, linreg, mm, decompor, cusum, diff,
  forecast, backtest, faixaHHI, fBRL, fShort, fInt, fPct, fDelta,
} from "@/lib/multilojas/stats";
import { UF_INFO, POP_TOTAL } from "@/lib/geoBrasil";

/* Paleta 60/30/10 — Navy domina, Blue apoia, Green é acento.
 * Vermelho fica reservado a valores negativos/alertas. */
const COLORS = [
  "hsl(var(--brand-navy))",
  "hsl(var(--brand-blue))",
  "hsl(var(--brand-accent))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--brand-blue) / 0.6)",
];

/* ───────── primitives ───────── */
const Card = ({ title, hint, children, className = "" }: { title?: string; hint?: string; children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-border/50 bg-card/60 p-4 lg:p-5 min-w-0 ${className}`}>
    {title && (
      <h3 className="text-xs lg:text-[13px] font-semibold text-foreground mb-3 flex items-center gap-1">
        {title}{hint && <TooltipInfo text={hint} />}
      </h3>
    )}
    {children}
  </div>
);

const Kpi = ({ label, value, delta, hint }: { label: string; value: string; delta?: number; hint?: string }) => (
  <div className="rounded-lg border border-border/40 bg-card/50 p-3 min-w-0">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 leading-tight">
      {label}{hint && <TooltipInfo text={hint} />}
    </div>
    <div className="text-lg lg:text-xl font-semibold tabular-nums mt-1 truncate">{value}</div>
    {delta !== undefined && Number.isFinite(delta) && (
      <div className={`text-[11px] tabular-nums ${delta >= 0 ? "text-emerald" : "text-destructive"}`}>
        {fDelta(delta)} vs período anterior
      </div>
    )}
  </div>
);

const Empty = ({ msg = "Sem dados para o filtro selecionado." }) => (
  <div className="py-10 text-center text-xs text-muted-foreground">{msg}</div>
);

/* ───────── agregações ───────── */
type Agg = ReturnType<typeof agregar>;
function agregar(ps: PedidoML[], cancelados: PedidoML[] = []) {
  const gmv = sum(ps.map((p) => p.gmv));
  const liq = sum(ps.map((p) => p.liq));
  const tarifa = sum(ps.map((p) => p.tarifa));
  const frete = sum(ps.map((p) => p.freteCusto));
  const pedidos = new Set(ps.map((p) => p.id)).size;
  const devolucoes = new Set(ps.filter((p) => p.devol).map((p) => p.id)).size;
  return {
    gmv, liq, tarifa, frete,
    acre: sum(ps.map((p) => p.acre)),
    freteRec: sum(ps.map((p) => p.freteRec)),
    desc: sum(ps.map((p) => p.desc)),
    estorno: sum(ps.map((p) => p.estorno)),
    pedidos, un: sum(ps.map((p) => p.un)),
    compradores: new Set(ps.map((p) => p.doc)).size,
    anuncios: new Set(ps.map((p) => p.mlb).filter(Boolean)).size,
    take: gmv ? tarifa / gmv : 0,
    margem: gmv ? liq / gmv : 0,
    ticket: pedidos ? gmv / pedidos : 0,
    devolRate: pedidos ? devolucoes / pedidos : 0,
    cancRate: pedidos + cancelados.length ? cancelados.length / (pedidos + cancelados.length) : 0,
    adsShare: gmv ? sum(ps.filter((p) => p.ads).map((p) => p.gmv)) / gmv : 0,
    nfeRate: ps.length ? ps.filter((p) => p.nfeOk).length / ps.length : 0,
    freteShare: gmv ? frete / gmv : 0,
  };
}

const serieDiaria = (ps: PedidoML[], ini: string, fim: string) => {
  const m = new Map<string, number>();
  ps.forEach((p) => m.set(p.dia, (m.get(p.dia) || 0) + p.gmv));
  return rangeDias(ini, fim).map((d) => ({ dia: d, gmv: m.get(d) || 0 }));
};

function porChave<T extends string>(ps: PedidoML[], key: (p: PedidoML) => T) {
  const m = new Map<T, PedidoML[]>();
  ps.forEach((p) => {
    const k = key(p);
    const arr = m.get(k);
    if (arr) arr.push(p); else m.set(k, [p]);
  });
  return m;
}

/* ═══════════════════ página ═══════════════════ */
const TABS_ANALITICAS = [
  "Diretoria", "Minha loja", "Lojas", "Séries", "Projeção", "Concentração",
  "Geografia", "Clientes", "Operação", "Publicidade", "Alertas",
] as const;
type Tab = string;

const Multilojas = () => {
  const navigate = useNavigate();
  const perfilML = usePerfilMultilojas();
  const { perfil, escopoRede, podeCarregar, podeConfigurar, temAcesso, lojas, minhasLojas, rotuloPerfil } = perfilML;

  const [dados, setDados] = useState<{ pedidos: PedidoML[]; diag: Diagnostico } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroBase, setErroBase] = useState<string | null>(null);
  const [modoLocal, setModoLocal] = useState(false);
  const [lojaSel, setLojaSel] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Diretoria");
  const [filtros, setFiltros] = useState<Filtros>({
    lojas: [], ini: "", fim: "", uf: "", logi: "", tipo: "", origem: "todos", cancelados: false,
  });

  /* Carga publicada — o recorte por perfil já vem do RLS; o filtro abaixo é
   * conveniência de renderização, não fronteira de segurança. */
  const carregarDoBanco = useCallback(async () => {
    if (!temAcesso) { setCarregando(false); return; }
    setCarregando(true); setErroBase(null);
    try {
      const [{ pedidos }, cargas] = await Promise.all([
        carregarPedidos(),
        listarCargas(perfil === "admin").catch(() => [] as Awaited<ReturnType<typeof listarCargas>>),
      ]);
      if (!pedidos.length) { setDados(null); setCarregando(false); return; }
      const diag = diagnosticoDaBase(pedidos, cargas);
      setDados({ pedidos, diag });
      setFiltros((f) => ({ ...f, lojas: [], ini: diag.ini, fim: diag.fim }));
    } catch (e) {
      setErroBase(e instanceof Error ? e.message : "Falha ao ler as cargas publicadas.");
    } finally {
      setCarregando(false);
    }
  }, [temAcesso, perfil]);

  useEffect(() => { if (!perfilML.loading && !modoLocal) carregarDoBanco(); }, [perfilML.loading, modoLocal, carregarDoBanco]);

  /* Ao trocar de perfil ou de loja, o recorte anterior não sobrevive. */
  useEffect(() => {
    setFiltros((f) => ({ ...f, lojas: [], uf: "", logi: "", tipo: "", origem: "todos" }));
  }, [perfil, lojaSel]);

  useEffect(() => {
    if (!lojaSel) setLojaSel((escopoRede ? lojas[0]?.id : minhasLojas[0]?.id) ?? null);
  }, [lojas, minhasLojas, escopoRede, lojaSel]);

  const lojasVisiveis = escopoRede ? lojas : minhasLojas;
  const lojaAtual = lojasVisiveis.find((l) => l.id === lojaSel) || lojasVisiveis[0] || null;

  const TABS = useMemo(() => {
    const t = TABS_ANALITICAS.filter((x) => (escopoRede ? true : x !== "Lojas"));
    const extras: string[] = [];
    if (podeCarregar) extras.push("Central de dados");
    if (podeConfigurar) extras.push("Cadastro de lojas");
    return [...t, ...extras];
  }, [escopoRede, podeCarregar, podeConfigurar]);

  useEffect(() => { if (!TABS.includes(tab)) setTab(TABS[0]); }, [TABS, tab]);

  const opcoes = useMemo(() => {
    const ps = dados?.pedidos || [];
    const u = (f: (p: PedidoML) => string) => Array.from(new Set(ps.map(f).filter(Boolean))).sort();
    return {
      lojas: u((p) => p.loja), ufs: u((p) => p.uf), logis: u((p) => p.logi), tipos: u((p) => p.tipoAnun),
      ini: dados?.diag.ini || "", fim: dados?.diag.fim || "",
    };
  }, [dados]);

  const aplicarFiltros = (ps: PedidoML[], ini: string, fim: string, incluirCanc: boolean) =>
    ps.filter((p) =>
      p.dia >= ini && p.dia <= fim &&
      (!filtros.lojas.length || filtros.lojas.includes(p.loja)) &&
      (!filtros.uf || p.uf === filtros.uf) &&
      (!filtros.logi || p.logi === filtros.logi) &&
      (!filtros.tipo || p.tipoAnun === filtros.tipo) &&
      (filtros.origem === "todos" || (filtros.origem === "ads" ? p.ads : !p.ads)) &&
      (incluirCanc || !p.canc));

  const ctx = useMemo(() => {
    if (!dados) return null;
    const ini = filtros.ini || dados.diag.ini;
    const fim = filtros.fim || dados.diag.fim;
    const dias = rangeDias(ini, fim);
    const dur = dias.length;
    const prevFim = new Date(Date.parse(`${ini}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const prevIni = new Date(Date.parse(`${prevFim}T00:00:00Z`) - (dur - 1) * 86400000).toISOString().slice(0, 10);

    const base = aplicarFiltros(dados.pedidos, ini, fim, filtros.cancelados);
    const canc = aplicarFiltros(dados.pedidos, ini, fim, true).filter((p) => p.canc);
    const prev = aplicarFiltros(dados.pedidos, prevIni, prevFim, filtros.cancelados);
    const prevCanc = aplicarFiltros(dados.pedidos, prevIni, prevFim, true).filter((p) => p.canc);

    /* Série completa da base (ignora só o recorte de datas) — usada na
     * comparação mês a mês, que precisa de todos os meses disponíveis. */
    const baseTotal = aplicarFiltros(dados.pedidos, dados.diag.ini, dados.diag.fim, filtros.cancelados);

    return {
      ini, fim, prevIni, prevFim, dias, base, canc, prev,
      a: agregar(base, canc), p: agregar(prev, prevCanc),
      serie: serieDiaria(base, ini, fim),
      serieTotal: serieDiaria(baseTotal, dados.diag.ini, dados.diag.fim),
    };
  }, [dados, filtros]);

  const Topo = ({ titulo, sub }: { titulo: string; sub?: string }) => (
    <header className="border-b border-border/40 px-4 py-3 flex items-center gap-3 flex-wrap">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" />Voltar</Button>
      <Store className="w-5 h-5 text-primary" />
      <div className="min-w-0">
        <h1 className="text-sm font-semibold truncate">{titulo}</h1>
        {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
      </div>
      <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground">{rotuloPerfil}</span>
    </header>
  );

  if (perfilML.loading || (carregando && !modoLocal)) {
    return (
      <div className="min-h-screen bg-background">
        <Topo titulo="Multilojas · gestão consolidada de rede" />
        <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" /> Carregando as cargas publicadas…
        </div>
      </div>
    );
  }

  if (!temAcesso) {
    return (
      <div className="min-h-screen bg-background">
        <Topo titulo="Multilojas" />
        <div className="py-24 text-center text-xs text-muted-foreground">
          Esta aba é restrita a Administrador, Consultor e Gestor de Loja Oficial.
        </div>
      </div>
    );
  }

  const painelAdmin = (
    <>
      {tab === "Central de dados" && podeCarregar && (
        <CentralDados perfilAdmin={perfil === "super"} onPublicado={() => { setModoLocal(false); carregarDoBanco(); }} />
      )}
      {tab === "Cadastro de lojas" && podeConfigurar && <CadastroLojas />}
    </>
  );

  if (!dados) {
    return (
      <div className="min-h-screen bg-background">
        <Topo titulo="Multilojas · gestão consolidada de rede" sub={erroBase || "Nenhuma carga publicada"} />
        <nav className="flex gap-1 overflow-x-auto px-3 py-2 border-b border-border/40">
          {TABS.filter((t) => t === "Central de dados" || t === "Cadastro de lojas").map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-[11px] whitespace-nowrap transition-colors ${
                tab === t ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}>{t}</button>
          ))}
        </nav>
        <main className="max-w-5xl mx-auto p-6 space-y-4">
          {podeCarregar ? (
            tab === "Cadastro de lojas" ? <CadastroLojas /> : (
              <CentralDados perfilAdmin={perfil === "super"} onPublicado={() => { setModoLocal(false); carregarDoBanco(); }} />
            )
          ) : (
            <p className="text-xs text-muted-foreground text-center py-16">
              O painel ainda não foi publicado pela equipe de consultoria.
            </p>
          )}
          {podeCarregar && (
            <div className="rounded-xl border border-border/50 bg-card/40 p-4">
              <h3 className="text-xs font-semibold mb-2">Análise local (sem publicar)</h3>
              <p className="text-[11px] text-muted-foreground mb-3">
                Processa a planilha apenas no seu navegador, sem gravar nada no banco — útil para conferir um arquivo antes de publicá-lo.
              </p>
              <UploadPlanilha onReady={(pedidos, diag) => {
                setModoLocal(true);
                setDados({ pedidos, diag });
                setTab("Diretoria");
                setFiltros((f) => ({ ...f, ini: diag.ini, fim: diag.fim }));
              }} />
            </div>
          )}
        </main>
      </div>
    );
  }

  const d = ctx!;
  const delta = (a: number, b: number) => (b ? (a - b) / b : NaN);

  const exportarCsv = () => {
    const cols: (keyof PedidoML)[] = ["id", "dia", "loja", "mlb", "sku", "titulo", "uf", "cidade", "logi", "tipoAnun", "un", "gmv", "tarifa", "freteCusto", "estorno", "liq", "status"];
    const linhas = [cols.join(";"), ...d.base.map((p) => cols.map((c) => String(p[c] ?? "")).join(";"))];
    const url = URL.createObjectURL(new Blob(["\ufeff" + linhas.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `multilojas_${d.ini}_${d.fim}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5 py-3 flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" />Voltar</Button>
        <Store className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--brand-blue))" }} />
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold truncate leading-tight">
            Multilojas · {escopoRede ? `${dados.diag.lojas.length} lojas` : lojaAtual?.nome_publico || "minha loja"}
          </h1>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5 tabular-nums">
            {fInt(dados.diag.validas)} pedidos · {dados.diag.ini} → {dados.diag.fim} · {modoLocal ? "análise local, não publicada" : dados.diag.arquivo}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground">{rotuloPerfil}</span>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportarCsv}><Download className="w-4 h-4" />CSV do recorte</Button>
          {modoLocal && (
            <Button variant="ghost" size="sm" onClick={() => { setModoLocal(false); setDados(null); }}>Voltar à base publicada</Button>
          )}
        </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5">
        <FiltersBar filtros={filtros} set={(f) => setFiltros((s) => ({ ...s, ...f }))} opcoes={opcoes} />
      </div>

      <nav className="border-b border-border/40">
        <div className="mx-auto w-full max-w-[1600px] flex gap-1 overflow-x-auto px-3 sm:px-5 py-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? "page" : undefined}
              className={`px-3 py-1.5 rounded-md text-[11px] whitespace-nowrap transition-colors border ${
                tab === t
                  ? "border-transparent font-semibold text-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue)/0.14)]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1600px] px-3 sm:px-5 py-4 space-y-4">
        {painelAdmin}
        {tab === "Minha loja" && (
          <MinhaLoja
            loja={lojaAtual}
            lojasDisponiveis={lojasVisiveis}
            onTrocarLoja={setLojaSel}
            pedidos={d.base}
            ini={d.ini}
            fim={d.fim}
          />
        )}
        {!d.base.length ? (tab !== "Minha loja" && tab !== "Central de dados" && tab !== "Cadastro de lojas" ? <Empty /> : null) : (
          <>
            {tab === "Diretoria" && (
              <Diretoria d={d} delta={delta} onSelecionarLoja={(loja) => setFiltros((f) => ({ ...f, lojas: [loja] }))} />
            )}
            {tab === "Lojas" && escopoRede && <Lojas d={d} />}
            {tab === "Séries" && <Series d={d} />}
            {tab === "Projeção" && <Projecao d={d} />}
            {tab === "Concentração" && <Concentracao d={d} />}
            {tab === "Geografia" && <Geografia d={d} />}
            {tab === "Clientes" && <Clientes d={d} />}
            {tab === "Operação" && <Operacao d={d} />}
            {tab === "Publicidade" && <Publicidade d={d} />}
            {tab === "Alertas" && <Alertas d={d} />}
          </>
        )}
      </main>
    </div>
  );
};

type Ctx = NonNullable<ReturnType<typeof useCtxType>>;
function useCtxType() { return null as null | {
  ini: string; fim: string; prevIni: string; prevFim: string;
  dias: string[]; base: PedidoML[]; canc: PedidoML[]; prev: PedidoML[];
  a: Agg; p: Agg; serie: { dia: string; gmv: number }[];
  serieTotal: { dia: string; gmv: number }[];
}; }

/* ═══════════════ 3.1 Diretoria ═══════════════ */
const Diretoria = ({ d, delta, onSelecionarLoja }: { d: Ctx; delta: (a: number, b: number) => number; onSelecionarLoja?: (loja: string) => void }) => {
  const { a, p } = d;
  const gmvs = d.serie.map((s) => s.gmv);
  const mm7 = mm(gmvs, 7), mm28 = mm(gmvs, 28);
  const last = (arr: (number | null)[]) => [...arr].reverse().find((v) => v != null) ?? 0;
  const momentum = last(mm28) ? (last(mm7) as number) / (last(mm28) as number) : 1;

  const porLoja = Array.from(porChave(d.base, (x) => x.loja).entries())
    .map(([loja, ps]) => ({ loja, ...agregar(ps) }))
    .sort((x, y) => y.gmv - x.gmv);
  const hhiLojas = hhi(porLoja.map((l) => l.gmv));
  /* Coluna "venda por publicidade" ausente na base atual: nenhum pedido marcado
   * como ads. Sem base → "—", nunca 0,0%. */
  const temBaseAds = d.base.some((p) => p.ads);
  const fx = faixaHHI(hhiLojas);

  const cascata = [
    { nome: "GMV", v: a.gmv }, { nome: "Acréscimo", v: a.acre }, { nome: "Receita envio", v: a.freteRec },
    { nome: "Tarifas", v: -a.tarifa }, { nome: "Frete", v: -a.frete }, { nome: "Estornos", v: -a.estorno },
    { nome: "Descontos", v: a.desc }, { nome: "Líquido", v: a.liq },
  ];

  const dowMedia = [0, 1, 2, 3, 4, 5, 6].map((dw) => {
    const dias = d.serie.filter((s) => new Date(`${s.dia}T12:00:00Z`).getUTCDay() === dw);
    return { dow: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dw], idx: mean(gmvs) ? mean(dias.map((x) => x.gmv)) / mean(gmvs) : 0 };
  });

  let acc = 0;
  const curva = porLoja.map((l) => { acc += l.gmv; return { loja: l.loja, acum: a.gmv ? acc / a.gmv : 0 }; });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="GMV bruto" value={fShort(a.gmv)} delta={delta(a.gmv, p.gmv)} />
        <Kpi label="Receita líquida" value={fShort(a.liq)} delta={delta(a.liq, p.liq)} />
        <Kpi label="Take rate efetivo" value={fPct(a.take)} hint="Tarifa de venda e impostos ÷ GMV. É padronizado pela plataforma — diferença de margem entre lojas não é comissionamento." />
        <Kpi label="Pedidos" value={fInt(a.pedidos)} delta={delta(a.pedidos, p.pedidos)} />
        <Kpi label="Unidades" value={fInt(a.un)} delta={delta(a.un, p.un)} />
        <Kpi label="Compradores únicos" value={fInt(a.compradores)} delta={delta(a.compradores, p.compradores)} />
        <Kpi label="Anúncios ativos" value={fInt(a.anuncios)} delta={delta(a.anuncios, p.anuncios)} />
        <Kpi label="Momentum (MM7÷MM28)" value={momentum.toFixed(2)} hint="Abaixo de 0,88 indica desaceleração da rede." />
        <Kpi label="Devolução" value={fPct(a.devolRate)} />
        <Kpi label="Cancelamentos" value={fPct(a.cancRate)} hint="Calculado sobre pedidos + cancelados, não sobre o total filtrado." />
        <Kpi label="Estornos" value={fShort(a.estorno)} />
        <Kpi label="HHI entre lojas" value={fInt(hhiLojas)} hint={`Faixa ${fx.label}. Acima de 2.500 a rede depende de uma única conta.`} />
      </div>

      {hhiLojas > 2500 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Dependência crítica: HHI entre lojas em {fInt(hhiLojas)} — a maior conta responde por{" "}
          {fPct(porLoja[0] ? porLoja[0].gmv / a.gmv : 0)} do GMV da rede.
        </div>
      )}

      <Card title="GMV diário com MM7 e MM28">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={d.serie.map((s, i) => ({ ...s, mm7: mm7[i], mm28: mm28[i] }))}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={30} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
            <Tooltip formatter={(v: number) => fBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
            <Bar dataKey="gmv" name="GMV" fill={COLORS[0]} opacity={0.5} />
            <Line dataKey="mm7" name="MM7" stroke={COLORS[1]} dot={false} strokeWidth={2} connectNulls />
            <Line dataKey="mm28" name="MM28" stroke={COLORS[3]} dot={false} strokeWidth={2} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <GmvMesVsMes
        pontos={d.serieTotal.map((s) => ({ date: s.dia, gmv: s.gmv }))}
        titulo="GMV mês vs mês (comparação anual)"
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Cascata do resultado">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cascata}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-20} height={50} textAnchor="end" />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
              <Tooltip formatter={(v: number) => fBRL(v)} />
              <Bar dataKey="v" name="Valor">
                {cascata.map((c, i) => <Cell key={i} fill={c.v >= 0 ? COLORS[2] : COLORS[4]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Participação por loja">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={porLoja} dataKey="gmv" nameKey="loja" innerRadius={55} outerRadius={90}>
                {porLoja.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Margem líquida por loja" hint="Verde ≥ 72% · âmbar ≥ 68% · vermelho abaixo. Como o take é padronizado, diferença de margem é mix logístico, devolução ou estorno.">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porLoja} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <YAxis type="category" dataKey="loja" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={100} />
              <Tooltip formatter={(v: number) => fPct(v)} />
              <Bar dataKey="margem" name="Margem">
                {porLoja.map((l, i) => <Cell key={i} fill={l.margem >= 0.72 ? COLORS[2] : l.margem >= 0.68 ? COLORS[1] : COLORS[4]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Índice de sazonalidade semanal" hint="GMV médio do dia ÷ GMV médio geral. Comparar dias sem dessazonalizar produz conclusão errada.">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dowMedia}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="dow" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip formatter={(v: number) => v.toFixed(2)} />
              <ReferenceLine y={1} stroke={COLORS[3]} strokeDasharray="4 4" />
              <Bar dataKey="idx" name="Índice" fill={COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Curva acumulada de contribuição">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={curva}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="loja" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
            <Tooltip formatter={(v: number) => fPct(v)} />
            <Area dataKey="acum" name="Acumulado" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Tabela
        titulo="Resumo por loja"
        topo={
          <TickerLojas
            base={d.base}
            prev={d.prev}
            dias={d.dias}
            periodoAtual={{ ini: d.ini, fim: d.fim }}
            periodoAnterior={d.prev.length ? { ini: d.prevIni, fim: d.prevFim } : null}
            onSelecionarLoja={onSelecionarLoja}
          />
        }
        cols={["Loja", "Pedidos", "GMV", "Líquido", "Margem", "Take", "Ticket", "Un/ped", "Anúncios", "Clientes", "% ads", "% devol", "% NF-e", "GMV/dia"]}
        rows={porLoja.map((l) => [
          l.loja, fInt(l.pedidos), fShort(l.gmv), fShort(l.liq), fPct(l.margem), fPct(l.take), fBRL(l.ticket),
          (l.pedidos ? l.un / l.pedidos : 0).toFixed(2), fInt(l.anuncios), fInt(l.compradores),
          temBaseAds ? fPct(l.adsShare) : "—", fPct(l.devolRate), fPct(l.nfeRate), fShort(l.gmv / Math.max(1, d.dias.length)),
        ])}
      />
    </div>
  );
};

/* ═══════════════ tabela ordenável ═══════════════ */
const parseVal = (s: string) => {
  const t = s.replace(/[R$\s%]/g, "").replace(/\./g, "").replace(",", ".");
  if (/M$/.test(s)) return parseFloat(t) * 1e6;
  if (/k$/i.test(s)) return parseFloat(t) * 1e3;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
};

const Tabela = ({ titulo, cols, rows, topo }: { titulo: string; cols: string[]; rows: (string | number)[][]; topo?: React.ReactNode }) => {
  const [sort, setSort] = useState<{ i: number; dir: 1 | -1 } | null>(null);
  const data = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const av = parseVal(String(a[sort.i])), bv = parseVal(String(b[sort.i]));
      if (Number.isFinite(av) && Number.isFinite(bv)) return (av - bv) * sort.dir;
      return String(a[sort.i]).localeCompare(String(b[sort.i])) * sort.dir;
    });
  }, [rows, sort]);

  return (
    <Card title={titulo}>
      {topo}
      {!rows.length ? <Empty /> : (
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-card">
              <tr>
                {cols.map((c, i) => (
                  <th key={c} onClick={() => setSort((s) => ({ i, dir: s?.i === i && s.dir === -1 ? 1 : -1 }))}
                    className="text-left px-2 py-1.5 font-medium text-muted-foreground cursor-pointer whitespace-nowrap hover:text-foreground">
                    {c}{sort?.i === i ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i} className="border-t border-border/30">
                  {r.map((c, j) => (
                    <td key={j} className={`px-2 py-1 whitespace-nowrap ${j === 0 ? "" : "tabular-nums"}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

/* ═══════════════ 3.2 Lojas ═══════════════ */
const Lojas = ({ d }: { d: Ctx }) => {
  const lojas = Array.from(porChave(d.base, (p) => p.loja).entries()).map(([loja, ps]) => {
    const a = agregar(ps);
    const docs = porChave(ps, (p) => p.doc);
    const recompra = docs.size ? Array.from(docs.values()).filter((v) => new Set(v.map((x) => x.id)).size > 1).length / docs.size : 0;
    return {
      loja, ...a, recompra,
      giro: a.anuncios ? a.pedidos / a.anuncios : 0,
      fretePed: a.pedidos ? a.frete / a.pedidos : 0,
    };
  }).sort((x, y) => y.gmv - x.gmv);

  const eixos = [
    { k: "ticket", label: "Ticket", inv: false },
    { k: "margem", label: "Margem", inv: false },
    { k: "giro", label: "Giro", inv: false },
    { k: "devolRate", label: "Devolução", inv: true },
    { k: "fretePed", label: "Custo de frete", inv: true },
    { k: "adsShare", label: "Ads", inv: false },
    { k: "recompra", label: "Recompra", inv: false },
    { k: "nfeRate", label: "NF-e", inv: false },
  ] as const;

  const score = lojas.map((l) => {
    const zs = eixos.map((e) => {
      const vals = lojas.map((x) => (x as any)[e.k] as number);
      const s = sd(vals) || 1;
      const z = (((l as any)[e.k] as number) - mean(vals)) / s;
      return Math.max(0, Math.min(100, 50 + (e.inv ? -z : z) * 20));
    });
    return { loja: l.loja, score: mean(zs), eixos: zs };
  }).sort((a, b) => b.score - a.score);

  const prevPorLoja = porChave(d.prev, (p) => p.loja);
  const decomp = lojas.map((l) => {
    const ant = agregar(prevPorLoja.get(l.loja) || []);
    return {
      loja: l.loja,
      volume: (l.pedidos - ant.pedidos) * ant.ticket,
      ticket: (l.ticket - ant.ticket) * l.pedidos,
    };
  });

  const mmPorLoja = lojas.slice(0, 6).map((l) => {
    const s = serieDiaria(d.base.filter((p) => p.loja === l.loja), d.ini, d.fim);
    return { loja: l.loja, mm: mm(s.map((x) => x.gmv), 7) };
  });
  const trajetorias = d.dias.map((dia, i) => {
    const row: Record<string, number | string | null> = { dia };
    mmPorLoja.forEach((m) => { row[m.loja] = m.mm[i]; });
    return row;
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Score de saúde composto" hint="Média de 8 eixos normalizados por z-score contra a rede, reescalados 0–100. Devolução e custo de frete têm o sinal invertido — em todos os eixos maior é melhor.">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={score} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="loja" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={100} />
              <Tooltip formatter={(v: number) => v.toFixed(1)} />
              <Bar dataKey="score" name="Score" fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Escala × rentabilidade" hint="X = GMV em log10, Y = margem líquida, tamanho = pedidos.">
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis type="number" dataKey="x" name="log10 GMV" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="number" dataKey="y" name="Margem" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <ZAxis type="number" dataKey="z" range={[60, 400]} />
              <Tooltip formatter={(v: number, n: string) => (n === "Margem" ? fPct(v) : v.toFixed(2))} />
              <Scatter data={lojas.map((l) => ({ x: Math.log10(Math.max(1, l.gmv)), y: l.margem, z: l.pedidos, loja: l.loja }))} fill={COLORS[1]} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Trajetórias de GMV em MM7">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={trajetorias}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={30} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
            <Tooltip formatter={(v: number) => fBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
            {mmPorLoja.map((m, i) => (
              <Line key={m.loja} dataKey={m.loja} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} connectNulls />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Decomposição do crescimento" hint="Efeito volume = Δpedidos × ticket anterior. Efeito ticket/mix = Δticket × pedidos atuais. A soma reconstrói a variação de GMV.">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={decomp}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="loja" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
            <Tooltip formatter={(v: number) => fBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
            <Bar dataKey="volume" name="Efeito volume" stackId="a" fill={COLORS[0]} />
            <Bar dataKey="ticket" name="Efeito ticket/mix" stackId="a" fill={COLORS[1]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Tabela
        titulo="Matriz de indicadores por loja"
        cols={["Loja", "Pedidos", "GMV", "Líquido", "Margem", "Take", "Ticket", "Un", "Un/ped", "Anúncios", "Giro", "Clientes", "Recompra", "% ads", "% devol", "Frete/ped", "% NF-e"]}
        rows={lojas.map((l) => [
          l.loja, fInt(l.pedidos), fShort(l.gmv), fShort(l.liq), fPct(l.margem), fPct(l.take), fBRL(l.ticket),
          fInt(l.un), (l.pedidos ? l.un / l.pedidos : 0).toFixed(2), fInt(l.anuncios), l.giro.toFixed(2),
          fInt(l.compradores), fPct(l.recompra), fPct(l.adsShare), fPct(l.devolRate), fBRL(l.fretePed), fPct(l.nfeRate),
        ])}
      />
    </div>
  );
};

/* ═══════════════ 3.3 Séries ═══════════════ */
const Series = ({ d }: { d: Ctx }) => {
  const y = d.serie.map((s) => s.gmv);
  const mm7 = mm(y, 7), mm28 = mm(y, 28);
  const vel = diff(mm7), acel = diff(vel);
  const reg = linreg(y);
  const dec = decompor(y, 7);
  const cs = cusum(y);
  const cv = mean(y) ? sd(y) / mean(y) : 0;

  const linha = d.serie.map((s, i) => ({
    ...s, mm7: mm7[i], mm28: mm28[i], tend: reg.intercept + reg.slope * i,
    vel: vel[i], acel: acel[i], cusum: cs[i], resid: dec.resid[i], dsz: dec.dsz[i],
  }));

  const porMes = Array.from(porChave(d.base, (p) => p.mes).entries())
    .map(([mes, ps]) => ({ mes, ...agregar(ps) })).sort((a, b) => a.mes.localeCompare(b.mes));

  const horas = Array.from({ length: 24 }, (_, h) => ({
    hora: `${String(h).padStart(2, "0")}h`,
    gmv: sum(d.base.filter((p) => p.hora === h).map((p) => p.gmv)),
  }));

  const heat = [0, 1, 2, 3, 4, 5, 6].map((dw) => ({
    dow: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dw],
    cells: Array.from({ length: 24 }, (_, h) => sum(d.base.filter((p) => p.dow === dw && p.hora === h).map((x) => x.gmv))),
  }));
  const maxHeat = Math.max(1, ...heat.flatMap((r) => r.cells));

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="GMV médio/dia" value={fShort(mean(y))} />
        <Kpi label="Coef. de variação" value={cv.toFixed(2)} />
        <Kpi label="Velocidade (1ª deriv.)" value={fShort(Number([...vel].reverse().find((v) => v != null) ?? 0))} hint="Variação diária da MM7, em R$/dia." />
        <Kpi label="Aceleração (2ª deriv.)" value={fShort(Number([...acel].reverse().find((v) => v != null) ?? 0))} hint="Indicador antecedente: a 2ª derivada muda de sinal antes de a série virar." />
        <Kpi label="Força sazonal" value={dec.forcaSaz.toFixed(2)} />
        <Kpi label="Tendência (R²)" value={`${fShort(reg.slope)}/dia · R² ${reg.r2.toFixed(2)}`} />
      </div>

      <Card title="Nível: GMV diário, MM7, MM28 e tendência">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={linha}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={30} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
            <Tooltip formatter={(v: number) => fBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
            <Bar dataKey="gmv" name="GMV" fill={COLORS[0]} opacity={0.4} />
            <Line dataKey="mm7" name="MM7" stroke={COLORS[1]} dot={false} strokeWidth={2} connectNulls />
            <Line dataKey="mm28" name="MM28" stroke={COLORS[3]} dot={false} strokeWidth={2} connectNulls />
            <Line dataKey="tend" name="Tendência" stroke={COLORS[4]} dot={false} strokeDasharray="5 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Derivadas: velocidade sobre aceleração" hint="A 2ª derivada muda de sinal antes de a série virar — use-a como alerta antecedente, não como enfeite.">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={linha}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={30} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
            <Tooltip formatter={(v: number) => fBRL(v)} />
            <ReferenceLine y={0} stroke={COLORS[3]} />
            <Bar dataKey="acel" name="Aceleração">
              {linha.map((r, i) => <Cell key={i} fill={(r.acel ?? 0) >= 0 ? COLORS[2] : COLORS[4]} />)}
            </Bar>
            <Line dataKey="vel" name="Velocidade" stroke={COLORS[1]} dot={false} strokeWidth={2} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Decomposição aditiva" hint={`Força sazonal ${dec.forcaSaz.toFixed(2)} · força de tendência ${dec.forcaTend.toFixed(2)}.`}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={linha}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={30} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
              <Tooltip formatter={(v: number) => fBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
              <Line dataKey="dsz" name="Dessazonalizado" stroke={COLORS[0]} dot={false} connectNulls />
              <Line dataKey="resid" name="Resíduo" stroke={COLORS[4]} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="CUSUM dos z-scores" hint="Inflexões prolongadas marcam quebra estrutural de regime.">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={linha}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={30} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip formatter={(v: number) => v.toFixed(1)} />
              <ReferenceLine y={0} stroke={COLORS[3]} />
              <Area dataKey="cusum" name="CUSUM" stroke={COLORS[5]} fill={COLORS[5]} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Curva intradiária">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={horas}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
              <Tooltip formatter={(v: number) => fBRL(v)} />
              <Bar dataKey="gmv" name="GMV" fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Mapa de calor · dia da semana × hora">
          <div className="overflow-x-auto">
            <table className="text-[9px]">
              <tbody>
                {heat.map((r) => (
                  <tr key={r.dow}>
                    <td className="pr-2 text-muted-foreground whitespace-nowrap">{r.dow}</td>
                    {r.cells.map((c, i) => (
                      <td key={i} title={`${String(i).padStart(2, "0")}h · ${fBRL(c)}`}
                        className="w-3.5 h-3.5"
                        style={{ background: `hsla(var(--primary) / ${(c / maxHeat).toFixed(3)})` }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Tabela
        titulo="Consolidado mensal"
        cols={["Mês", "Pedidos", "GMV", "MoM", "Líquido", "Margem", "Ticket", "% devol"]}
        rows={porMes.map((m, i) => [
          m.mes, fInt(m.pedidos), fShort(m.gmv),
          i === 0 ? "—" : fDelta((m.gmv - porMes[i - 1].gmv) / (porMes[i - 1].gmv || 1)),
          fShort(m.liq), fPct(m.margem), fBRL(m.ticket), fPct(m.devolRate),
        ])}
      />
    </div>
  );
};

/* ═══════════════ 3.4 Projeção ═══════════════ */
const Projecao = ({ d }: { d: Ctx }) => {
  const y = d.serie.map((s) => s.gmv);
  const H = 30;
  const fc = forecast(y, H);
  const bt = backtest(y);
  const viesMedio = bt.length ? mean(bt.map((b) => Math.abs(b.vies))) : NaN;
  const mapeMedio = bt.length ? mean(bt.map((b) => b.mape)) : NaN;

  const futuros = rangeDias(
    new Date(Date.parse(`${d.fim}T00:00:00Z`) + 86400000).toISOString().slice(0, 10),
    new Date(Date.parse(`${d.fim}T00:00:00Z`) + H * 86400000).toISOString().slice(0, 10),
  );
  const chart = [
    ...d.serie.map((s) => ({ dia: s.dia, real: s.gmv })),
    ...futuros.map((dia, i) => ({ dia, proj: fc.valores[i], lo: fc.lower[i], hi: fc.upper[i] })),
  ];
  const total = sum(fc.valores);

  const adsDia = d.dias.map((dia) => sum(d.base.filter((p) => p.dia === dia && p.ads).map((p) => p.gmv)));
  const corrMidia = pearson(adsDia, y);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Kpi label="Projeção 30 dias" value={fShort(total)} />
        <Kpi label="Cenário base/dia" value={fShort(mean(fc.valores))} />
        <Kpi label="Erro medido em backtest" value={Number.isFinite(viesMedio) ? fPct(viesMedio) : "—"} hint="Viés absoluto médio no walk-forward. O erro dentro da amostra sempre parece melhor do que é." />
        <Kpi label="MAPE diário (backtest)" value={Number.isFinite(mapeMedio) ? fPct(mapeMedio) : "—"} />
      </div>

      <Card title="Projeção com banda de 95%" hint="Dessazonalização robusta (mediana dos desvios contra MM7 centrada) + Holt com tendência amortecida. Parâmetros calibrados por walk-forward: janela 28, φ 0,70, α 0,10, β 0,05.">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chart}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={30} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
            <Tooltip formatter={(v: number) => fBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
            <Area dataKey="hi" name="IC 95% sup." stroke="none" fill={COLORS[0]} fillOpacity={0.12} />
            <Area dataKey="lo" name="IC 95% inf." stroke="none" fill="hsl(var(--background))" fillOpacity={0.9} />
            <Line dataKey="real" name="Realizado" stroke={COLORS[3]} dot={false} />
            <Line dataKey="proj" name="Projeção" stroke={COLORS[1]} dot={false} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Cenários (30 dias)">
          <div className="grid grid-cols-3 gap-2">
            <Kpi label="Pessimista" value={fShort(sum(fc.lower))} />
            <Kpi label="Base" value={fShort(total)} />
            <Kpi label="Otimista" value={fShort(sum(fc.upper))} />
          </div>
        </Card>
        <Tabela
          titulo="Backtest walk-forward"
          cols={["Corte (dias)", "Viés", "MAPE diário", "RMSE"]}
          rows={bt.map((b) => [String(b.corte), fDelta(b.vies), fPct(b.mape), fShort(b.rmse)])}
        />
      </div>

      <Card title="Regressão do GMV de mídia contra o GMV total">
        <p className="text-xs text-muted-foreground mb-2">
          Correlação de Pearson: <span className="tabular-nums text-foreground font-medium">{corrMidia.toFixed(3)}</span>.
          Leitura estritamente <strong>correlacional</strong> — o relatório não traz custo de mídia, então não existe ROI
          calculável aqui. Serve para dimensionar teste A/B, não para justificar orçamento.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
            <XAxis type="number" dataKey="x" name="GMV mídia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
            <YAxis type="number" dataKey="y" name="GMV total" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
            <Tooltip formatter={(v: number) => fBRL(v)} />
            <Scatter data={y.map((v, i) => ({ x: adsDia[i], y: v }))} fill={COLORS[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

/* ═══════════════ 3.5 Concentração ═══════════════ */
const dimensoes = [
  { nome: "Loja", key: (p: PedidoML) => p.loja },
  { nome: "Anúncio", key: (p: PedidoML) => p.mlb || "(sem MLB)" },
  { nome: "SKU", key: (p: PedidoML) => p.sku || "(sem SKU)" },
  { nome: "UF", key: (p: PedidoML) => p.uf || "(sem UF)" },
  { nome: "Cliente", key: (p: PedidoML) => p.doc },
  { nome: "Cidade", key: (p: PedidoML) => p.cidade || "(sem cidade)" },
];

const Concentracao = ({ d }: { d: Ctx }) => {
  const total = d.a.gmv;
  const resumo = dimensoes.map((dim) => {
    const m = porChave(d.base, dim.key);
    const vals = Array.from(m.values()).map((ps) => sum(ps.map((p) => p.gmv))).sort((a, b) => b - a);
    const share = (n: number) => (total ? sum(vals.slice(0, n)) / total : 0);
    let acc = 0, n80 = 0;
    for (const v of vals) { acc += v; n80++; if (acc >= total * 0.8) break; }
    return { dim: dim.nome, itens: vals.length, hhi: hhi(vals), gini: gini(vals), t1: share(1), t5: share(5), t10: share(10), n80 };
  });

  const anuncios = Array.from(porChave(d.base, (p) => p.mlb || "(sem MLB)").entries())
    .map(([mlb, ps]) => {
      const a = agregar(ps);
      return { mlb, titulo: ps[0].titulo, gmv: a.gmv, share: total ? a.gmv / total : 0, devol: a.devolRate };
    }).sort((a, b) => b.gmv - a.gmv);
  let accA = 0;
  const pareto = anuncios.slice(0, 40).map((x) => { accA += x.share; return { ...x, acum: accA }; });

  const valsA = anuncios.map((a) => a.gmv).sort((a, b) => a - b);
  let accL = 0;
  const lorenz = valsA.map((v, i) => { accL += v; return { x: (i + 1) / valsA.length, y: total ? accL / total : 0, ref: (i + 1) / valsA.length }; });

  const estresse = [1, 3, 5, 10].map((n) => ({ n: `top ${n}`, perda: total ? sum(anuncios.slice(0, n).map((a) => a.gmv)) / total : 0 }));

  const intra = Array.from(porChave(d.base, (p) => p.loja).entries()).map(([loja, ps]) => ({
    loja,
    hhi: hhi(Array.from(porChave(ps, (x) => x.mlb || "-").values()).map((g) => sum(g.map((x) => x.gmv)))),
  })).sort((a, b) => b.hhi - a.hhi);

  return (
    <div className="space-y-3">
      <Tabela
        titulo="Concentração por dimensão"
        cols={["Dimensão", "Itens", "HHI", "Faixa", "Gini", "Top 1", "Top 5", "Top 10", "Itens p/ 80%"]}
        rows={resumo.map((r) => [r.dim, fInt(r.itens), fInt(r.hhi), faixaHHI(r.hhi).label, r.gini.toFixed(3), fPct(r.t1), fPct(r.t5), fPct(r.t10), fInt(r.n80)])}
      />
      <p className="text-[11px] text-muted-foreground">
        Faixas: HHI &gt; 2.500 crítico · &gt; 1.500 elevado · &gt; 800 moderado · abaixo diluído.
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Pareto dos 40 maiores anúncios">
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={pareto}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="mlb" tick={{ fontSize: 8 }} interval={3} />
              <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
              <Tooltip formatter={(v: number, n: string) => (n === "Acumulado" ? fPct(v) : fBRL(v))} />
              <Bar yAxisId="l" dataKey="gmv" name="GMV" fill={COLORS[0]} />
              <Line yAxisId="r" dataKey="acum" name="Acumulado" stroke={COLORS[1]} dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Curva de Lorenz por anúncio">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={lorenz}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="x" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v: number) => fPct(v)} />
              <Area dataKey="y" name="Lorenz" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.2} />
              <Line dataKey="ref" name="Igualdade" stroke={COLORS[3]} dot={false} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Teste de estresse: perda se os top anúncios saírem do ar">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={estresse}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="n" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v: number) => fPct(v)} />
              <Bar dataKey="perda" name="Perda de GMV" fill={COLORS[4]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="HHI intra-loja" hint="Loja que vende bem apoiada em pouca coisa.">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={intra} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="loja" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={100} />
              <Tooltip formatter={(v: number) => fInt(v)} />
              <Bar dataKey="hhi" name="HHI" fill={COLORS[5]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Tabela
        titulo="Top 25 anúncios"
        cols={["MLB", "Título", "GMV", "Share", "Acumulado", "% devolução"]}
        rows={pareto.slice(0, 25).map((a) => [a.mlb, a.titulo.slice(0, 60), fShort(a.gmv), fPct(a.share), fPct(a.acum), fPct(a.devol)])}
      />
    </div>
  );
};

/* ═══════════════ 3.7 Geografia ═══════════════ */
const Geografia = ({ d }: { d: Ctx }) => {
  const total = d.a.gmv;
  const ufs = Array.from(porChave(d.base, (p) => p.uf || "—").entries())
    .filter(([uf]) => UF_INFO[uf])
    .map(([uf, ps]) => {
      const a = agregar(ps);
      const info = UF_INFO[uf];
      const sharePop = info.pop / POP_TOTAL;
      const shareGmv = total ? a.gmv / total : 0;
      return {
        uf, nome: info.nome, regiao: info.regiao, pop: info.pop, shareGmv, sharePop,
        idx: sharePop ? shareGmv / sharePop : 0,
        potencial: Math.max(0, sharePop * total - a.gmv),
        gmv: a.gmv, perCap: a.gmv / (info.pop * 1e6),
        fretePed: a.pedidos ? a.frete / a.pedidos : 0,
        ticket: a.ticket, devol: a.devolRate, pedidos: a.pedidos,
      };
    }).sort((a, b) => b.gmv - a.gmv);

  const corr = pearson(ufs.map((u) => u.pop), ufs.map((u) => u.gmv));
  const potencialTotal = sum(ufs.map((u) => u.potencial));

  const regioes = Array.from(new Set(ufs.map((u) => u.regiao))).map((r) => ({
    regiao: r, gmv: sum(ufs.filter((u) => u.regiao === r).map((u) => u.gmv)),
  })).sort((a, b) => b.gmv - a.gmv);

  const cidades = Array.from(porChave(d.base, (p) => `${p.cidade}/${p.uf}`).entries())
    .map(([c, ps]) => ({ cidade: c, ...agregar(ps) }))
    .sort((a, b) => b.gmv - a.gmv).slice(0, 20);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Kpi label="UFs atendidas" value={fInt(ufs.length)} />
        <Kpi label="Correlação GMV × população" value={corr.toFixed(3)} hint="Próxima de 1 significa que a demanda segue o mapa demográfico — desvios grandes merecem investigação individual, não campanha genérica." />
        <Kpi label="Potencial não capturado" value={fShort(potencialTotal)} hint="Σ max(0, share populacional × GMV total − GMV da UF)." />
        <Kpi label="Índice mediano" value={median(ufs.map((u) => u.idx)).toFixed(2)} />
      </div>

      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-[11px] text-muted-foreground">
        Índice de penetração baixo não vira meta comercial automaticamente. Leia sempre cruzado com a coluna de frete
        médio: parte do vão em UFs distantes é restrição logística, não falta de demanda.
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="População × GMV">
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis type="number" dataKey="pop" name="População (mi)" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="number" dataKey="gmv" name="GMV" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
              <Tooltip formatter={(v: number, n: string) => (n === "GMV" ? fBRL(v) : v.toFixed(1))} />
              <Scatter data={ufs} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Consolidação por macrorregião">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={regioes}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="regiao" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
              <Tooltip formatter={(v: number) => fBRL(v)} />
              <Bar dataKey="gmv" name="GMV" fill={COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Tabela
        titulo="Penetração por UF"
        cols={["UF", "Estado", "GMV", "Share GMV", "Share pop.", "Índice", "GMV per capita", "Ticket", "Frete/pedido", "% devol", "Potencial"]}
        rows={ufs.map((u) => [
          u.uf, u.nome, fShort(u.gmv), fPct(u.shareGmv), fPct(u.sharePop), u.idx.toFixed(2),
          u.perCap.toFixed(2), fBRL(u.ticket), fBRL(u.fretePed), fPct(u.devol), fShort(u.potencial),
        ])}
      />

      <Tabela
        titulo="Top 20 cidades"
        cols={["Cidade/UF", "Pedidos", "GMV", "Ticket", "% devolução"]}
        rows={cidades.map((c) => [c.cidade, fInt(c.pedidos), fShort(c.gmv), fBRL(c.ticket), fPct(c.devolRate)])}
      />
    </div>
  );
};

/* ═══════════════ 3.8 Clientes ═══════════════ */
const Clientes = ({ d }: { d: Ctx }) => {
  const porDoc = porChave(d.base, (p) => p.doc);
  const clientes = Array.from(porDoc.entries()).map(([doc, ps]) => {
    const pedidos = new Set(ps.map((p) => p.id)).size;
    const gmv = sum(ps.map((p) => p.gmv));
    const ultima = ps.reduce((m, p) => (p.dia > m ? p.dia : m), ps[0].dia);
    const primeira = ps.reduce((m, p) => (p.dia < m ? p.dia : m), ps[0].dia);
    return { doc, pedidos, gmv, ultima, safra: primeira.slice(0, 7), lojas: new Set(ps.map((p) => p.loja)).size, b2b: ps.some((p) => p.b2b) };
  });

  const unicos = clientes.length;
  const recorrentes = clientes.filter((c) => c.pedidos > 1);
  const cross = clientes.filter((c) => c.lojas > 1);
  const gmvRec = sum(recorrentes.map((c) => c.gmv));

  const fimTs = Date.parse(`${d.fim}T00:00:00Z`);
  const rec = clientes.map((c) => (fimTs - Date.parse(`${c.ultima}T00:00:00Z`)) / 86400000);
  const q = [0.25, 0.5, 0.75].map((x) => quantileSafe(rec, x));
  const qv = [0.25, 0.5, 0.75].map((x) => quantileSafe(clientes.map((c) => c.gmv), x));

  const seg = (c: typeof clientes[number], r: number) => {
    const recente = r <= q[1];
    const alto = c.gmv >= qv[2];
    if (c.pedidos >= 3 && recente && alto) return "Campeões";
    if (c.pedidos >= 2 && recente) return "Leais";
    if (c.pedidos === 1 && r <= q[0]) return "Novos promissores";
    if (!recente && alto) return "Em risco (alto valor)";
    if (r > q[2]) return "Hibernando";
    return "Regulares";
  };
  const segCount = new Map<string, { n: number; gmv: number }>();
  clientes.forEach((c, i) => {
    const s = seg(c, rec[i]);
    const cur = segCount.get(s) || { n: 0, gmv: 0 };
    segCount.set(s, { n: cur.n + 1, gmv: cur.gmv + c.gmv });
  });
  const ACOES: Record<string, string> = {
    "Campeões": "prioridade 1 — programa de fidelidade e ofertas exclusivas",
    "Leais": "prioridade 2 — cross-sell entre lojas da rede",
    "Novos promissores": "prioridade 2 — segunda compra em até 30 dias",
    "Regulares": "prioridade 3 — manter no fluxo padrão",
    "Em risco (alto valor)": "prioridade 1 — reativação com abordagem individual",
    "Hibernando": "prioridade 4 — campanha de baixo custo",
  };

  /* coorte em varredura única O(n) */
  const safraDe = new Map(clientes.map((c) => [c.doc, c.safra]));
  const coorte = new Map<string, Map<string, { n: Set<string>; gmv: number }>>();
  d.base.forEach((p) => {
    const s = safraDe.get(p.doc)!;
    let linha = coorte.get(s);
    if (!linha) { linha = new Map(); coorte.set(s, linha); }
    let cel = linha.get(p.mes);
    if (!cel) { cel = { n: new Set(), gmv: 0 }; linha.set(p.mes, cel); }
    cel.n.add(p.doc); cel.gmv += p.gmv;
  });
  const meses = Array.from(new Set(d.base.map((p) => p.mes))).sort();
  const safras = Array.from(coorte.keys()).sort();

  const decis = (() => {
    const ord = [...clientes].sort((a, b) => b.gmv - a.gmv);
    const total = sum(ord.map((c) => c.gmv));
    const tam = Math.max(1, Math.ceil(ord.length / 10));
    let acc = 0;
    return Array.from({ length: 10 }, (_, i) => {
      const g = sum(ord.slice(i * tam, (i + 1) * tam).map((c) => c.gmv));
      acc += g;
      return { decil: `D${i + 1}`, share: total ? g / total : 0, acum: total ? acc / total : 0 };
    });
  })();

  const freq = [1, 2, 3, 4].map((f) => ({
    faixa: f === 4 ? "4+" : String(f),
    n: clientes.filter((c) => (f === 4 ? c.pedidos >= 4 : c.pedidos === f)).length,
  }));

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Compradores únicos" value={fInt(unicos)} hint="Pedidos sem documento recebem identificador anônimo distinto — colapsá-los num único comprador inflaria a recompra." />
        <Kpi label="Taxa de recompra" value={fPct(unicos ? recorrentes.length / unicos : 0)} />
        <Kpi label="LTV médio" value={fBRL(mean(clientes.map((c) => c.gmv)))} />
        <Kpi label="LTV mediano" value={fBRL(median(clientes.map((c) => c.gmv)))} />
        <Kpi label="GMV de recorrentes" value={fPct(d.a.gmv ? gmvRec / d.a.gmv : 0)} />
        <Kpi label="Compra cross-loja" value={`${fInt(cross.length)} · ${fPct(unicos ? cross.length / unicos : 0)}`} />
      </div>

      {unicos > 0 && cross.length / unicos < 0.01 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
          Não existe efeito de rede: menos de 1% dos compradores compram em mais de uma loja. São negócios paralelos,
          não um ecossistema. O CAC precisa se pagar no primeiro pedido, porque não há cauda de recompra para amortizá-lo.
        </div>
      )}

      <Tabela
        titulo="Segmentação RFM"
        cols={["Segmento", "Clientes", "% base", "GMV", "Ação"]}
        rows={Array.from(segCount.entries()).map(([s, v]) => [s, fInt(v.n), fPct(unicos ? v.n / unicos : 0), fShort(v.gmv), ACOES[s] || "—"])}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Concentração por decil de cliente">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={decis}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="decil" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v: number) => fPct(v)} />
              <Bar dataKey="share" name="Share" fill={COLORS[0]} />
              <Line dataKey="acum" name="Acumulado" stroke={COLORS[1]} dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Distribuição de frequência de compra">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={freq}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="faixa" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fInt(v)} />
              <Tooltip formatter={(v: number) => fInt(v)} />
              <Bar dataKey="n" name="Clientes" fill={COLORS[3]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Tabela
        titulo="Matriz de coorte (clientes ativos por safra × mês)"
        cols={["Safra", ...meses]}
        rows={safras.map((s) => [s, ...meses.map((m) => fInt(coorte.get(s)?.get(m)?.n.size || 0))])}
      />
    </div>
  );
};

function quantileSafe(a: number[], q: number) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/* ═══════════════ 3.9 Operação ═══════════════ */
const Operacao = ({ d }: { d: Ctx }) => {
  const a = d.a;
  const modais = Array.from(porChave(d.base, (p) => p.logi || "(não informado)").entries())
    .map(([modal, ps]) => {
      const g = agregar(ps);
      return { modal, ticket: g.ticket, fretePed: g.pedidos ? g.frete / g.pedidos : 0, devol: g.devolRate, freteShare: g.freteShare, pedidos: g.pedidos, gmv: g.gmv };
    }).sort((x, y) => y.gmv - x.gmv);

  const mixLoja = Array.from(porChave(d.base, (p) => p.loja).entries()).map(([loja, ps]) => {
    const row: Record<string, number | string> = { loja };
    modais.forEach((m) => { row[m.modal] = sum(ps.filter((p) => (p.logi || "(não informado)") === m.modal).map((p) => p.gmv)); });
    return row;
  });

  const porLoja = Array.from(porChave(d.base, (p) => p.loja).entries()).map(([loja, ps]) => ({ loja, ...agregar(ps) }));
  const statusTop = Array.from(porChave(d.base.filter((p) => p.devol || p.medi || p.recl || p.canc), (p) => p.status || "—").entries())
    .map(([status, ps]) => ({ status, n: ps.length })).sort((x, y) => y.n - x.n).slice(0, 10);

  const tipos = Array.from(porChave(d.base, (p) => p.tipoAnun || "(não informado)").entries())
    .map(([tipo, ps]) => ({ tipo, ...agregar(ps) }));

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Custo total de frete" value={fShort(a.frete)} />
        <Kpi label="Frete líquido/pedido" value={fBRL(a.pedidos ? (a.frete - a.freteRec) / a.pedidos : 0)} />
        <Kpi label="Devolução" value={`${fPct(a.devolRate)} · ${fShort(sum(d.base.filter((p) => p.devol).map((p) => p.gmv)))}`} />
        <Kpi label="Cancelamentos" value={`${fInt(d.canc.length)} · ${fPct(a.cancRate)}`} />
        <Kpi label="NF-e autorizada" value={fPct(a.nfeRate)} />
        <Kpi label="Reclamações / mediações" value={`${fInt(d.base.filter((p) => p.recl).length)} / ${fInt(d.base.filter((p) => p.medi).length)}`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Economia de cada modal">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={modais}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="modal" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-15} height={50} textAnchor="end" />
              <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
              <Bar yAxisId="l" dataKey="ticket" name="Ticket" fill={COLORS[0]} />
              <Bar yAxisId="l" dataKey="fretePed" name="Frete/pedido" fill={COLORS[1]} />
              <Line yAxisId="r" dataKey="devol" name="% devolução" stroke={COLORS[4]} dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Mix logístico por loja">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mixLoja}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="loja" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
              <Tooltip formatter={(v: number) => fBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {modais.slice(0, 6).map((m, i) => (
                <Bar key={m.modal} dataKey={m.modal} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Tabela
        titulo="Custo de frete e exceções por modal"
        cols={["Modal", "Pedidos", "GMV", "Ticket", "Frete/pedido", "Frete % do GMV", "% devolução"]}
        rows={modais.map((m) => [m.modal, fInt(m.pedidos), fShort(m.gmv), fBRL(m.ticket), fBRL(m.fretePed), fPct(m.freteShare), fPct(m.devol)])}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Tabela
          titulo="NF-e e devolução por loja"
          cols={["Loja", "% NF-e autorizada", "% devolução", "Estornos"]}
          rows={porLoja.map((l) => [l.loja, fPct(l.nfeRate), fPct(l.devolRate), fShort(l.estorno)])}
        />
        <Tabela
          titulo="Principais status de exceção"
          cols={["Status", "Ocorrências"]}
          rows={statusTop.map((s) => [s.status, fInt(s.n)])}
        />
      </div>

      <Tabela
        titulo="Clássico × Premium"
        cols={["Tipo de anúncio", "Pedidos", "GMV", "Take", "Margem", "Ticket", "% devolução"]}
        rows={tipos.map((t) => [t.tipo, fInt(t.pedidos), fShort(t.gmv), fPct(t.take), fPct(t.margem), fBRL(t.ticket), fPct(t.devolRate)])}
      />
    </div>
  );
};

/* ═══════════════ 3.10 Publicidade ═══════════════ */
const Publicidade = ({ d }: { d: Ctx }) => {
  const pago = d.base.filter((p) => p.ads), org = d.base.filter((p) => !p.ads);
  const ap = agregar(pago), ao = agregar(org);

  /* Welch sobre o ticket por pedido */
  const ticketsDe = (ps: PedidoML[]) => Array.from(porChave(ps, (p) => p.id).values()).map((g) => sum(g.map((x) => x.gmv)));
  const t1 = ticketsDe(pago), t2 = ticketsDe(org);
  const v1 = sd(t1) ** 2 / Math.max(1, t1.length), v2 = sd(t2) ** 2 / Math.max(1, t2.length);
  const tStat = v1 + v2 > 0 ? (mean(t1) - mean(t2)) / Math.sqrt(v1 + v2) : 0;
  const signif = Math.abs(tStat) > 1.96;
  const deltaTicket = ao.ticket ? (ap.ticket - ao.ticket) / ao.ticket : 0;

  const total = d.a.gmv;
  const expostos = Array.from(porChave(d.base, (p) => p.mlb || "—").entries())
    .map(([mlb, ps]) => {
      const g = sum(ps.map((p) => p.gmv));
      const gAds = sum(ps.filter((p) => p.ads).map((p) => p.gmv));
      return { mlb, titulo: ps[0].titulo, gmv: g, shareAds: g ? gAds / g : 0, shareRede: total ? g / total : 0 };
    })
    .filter((x) => x.shareAds > 0.4)
    .sort((a, b) => b.gmv - a.gmv).slice(0, 30);

  const comp = [
    { m: "GMV", pago: ap.gmv, org: ao.gmv },
    { m: "Pedidos", pago: ap.pedidos, org: ao.pedidos },
    { m: "Ticket", pago: ap.ticket, org: ao.ticket },
    { m: "Un/pedido", pago: ap.pedidos ? ap.un / ap.pedidos : 0, org: ao.pedidos ? ao.un / ao.pedidos : 0 },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Kpi label="Share de GMV pago" value={fPct(d.a.adsShare)} />
        <Kpi label="Ticket pago × orgânico" value={fDelta(deltaTicket)} />
        <Kpi label="Teste t de Welch" value={`t = ${tStat.toFixed(2)}`} hint={signif ? "Diferença estatisticamente significante a 95%." : "Diferença dentro do ruído — não é significante a 95%."} />
        <Kpi label="Anúncios expostos a verba" value={fInt(expostos.length)} hint="Mais de 40% do GMV vindo de mídia." />
      </div>

      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-[11px] text-muted-foreground">
        A marcação nativa é last-click do próprio marketplace e não separa incremental de canibalizado. Trate share de
        mídia como <strong>exposição a risco de verba</strong>, nunca como prova de retorno.
      </div>

      <Card title="Pago × orgânico">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={comp}>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fShort(v)} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
            <Bar dataKey="pago" name="Pago" fill={COLORS[1]} />
            <Bar dataKey="org" name="Orgânico" fill={COLORS[3]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Tabela
        titulo="Comparativo detalhado"
        cols={["Origem", "Pedidos", "GMV", "Ticket", "Un/pedido", "Margem", "% devolução", "Compradores"]}
        rows={[
          ["Pago", fInt(ap.pedidos), fShort(ap.gmv), fBRL(ap.ticket), (ap.pedidos ? ap.un / ap.pedidos : 0).toFixed(2), fPct(ap.margem), fPct(ap.devolRate), fInt(ap.compradores)],
          ["Orgânico", fInt(ao.pedidos), fShort(ao.gmv), fBRL(ao.ticket), (ao.pedidos ? ao.un / ao.pedidos : 0).toFixed(2), fPct(ao.margem), fPct(ao.devolRate), fInt(ao.compradores)],
        ]}
      />

      <Tabela
        titulo="Anúncios com mais de 40% do GMV vindo de mídia"
        cols={["MLB", "Título", "GMV", "% do GMV via ads", "Share na rede"]}
        rows={expostos.map((e) => [e.mlb, e.titulo.slice(0, 60), fShort(e.gmv), fPct(e.shareAds), fPct(e.shareRede)])}
      />
    </div>
  );
};

/* ═══════════════ 3.11 Alertas ═══════════════ */
type Sev = "crítico" | "atenção" | "oportunidade" | "positivo";
const TONE: Record<Sev, string> = {
  "crítico": "border-destructive/50 bg-destructive/10 text-destructive",
  "atenção": "border-warning/50 bg-warning/10 text-warning",
  "oportunidade": "border-primary/50 bg-primary/10 text-primary",
  "positivo": "border-emerald/50 bg-emerald/10 text-emerald",
};

const Alertas = ({ d }: { d: Ctx }) => {
  const a = d.a;
  const y = d.serie.map((s) => s.gmv);
  const mm7 = mm(y, 7), mm28 = mm(y, 28);
  const last = (arr: (number | null)[]) => Number([...arr].reverse().find((v) => v != null) ?? 0);
  const alertas: { sev: Sev; regra: string; numero: string; acao: string }[] = [];

  if (last(mm28) && last(mm7) < last(mm28) * 0.88)
    alertas.push({ sev: "crítico", regra: "Desaceleração da rede", numero: `MM7 ${fShort(last(mm7))} vs MM28 ${fShort(last(mm28))}`, acao: "Revisar campanhas ativas e estoque dos top anúncios nesta semana." });

  const porLoja = Array.from(porChave(d.base, (p) => p.loja).entries()).map(([loja, ps]) => ({ loja, ...agregar(ps) }));
  const hhiL = hhi(porLoja.map((l) => l.gmv));
  if (hhiL > 2500)
    alertas.push({ sev: "crítico", regra: "Dependência de uma loja", numero: `HHI ${fInt(hhiL)}`, acao: "Planejar diversificação de receita entre contas." });

  const anun = Array.from(porChave(d.base, (p) => p.mlb || "—").entries()).map(([mlb, ps]) => ({ mlb, ...agregar(ps) })).sort((x, y2) => y2.gmv - x.gmv);
  const top5 = a.gmv ? sum(anun.slice(0, 5).map((x) => x.gmv)) / a.gmv : 0;
  if (top5 > 0.2)
    alertas.push({ sev: "atenção", regra: "Receita em poucos anúncios", numero: `top 5 = ${fPct(top5)} do GMV`, acao: "Ampliar catálogo relevante e proteger estoque dos cinco principais." });

  porLoja.forEach((l) => {
    if (l.devolRate > 0.07 && l.pedidos > 50)
      alertas.push({ sev: "crítico", regra: `Devolução alta · ${l.loja}`, numero: `${fPct(l.devolRate)} em ${fInt(l.pedidos)} pedidos`, acao: "Auditar anúncios com maior devolução e descrição de produto." });
    if (l.margem < 0.68 && a.gmv && l.gmv / a.gmv > 0.03)
      alertas.push({ sev: "atenção", regra: `Margem comprimida · ${l.loja}`, numero: fPct(l.margem), acao: "Revisar mix logístico, estornos e devoluções — o take é padronizado." });
    if (a.gmv && l.gmv / a.gmv > 0.03 && l.adsShare > 0.35)
      alertas.push({ sev: "atenção", regra: `Exposição a mídia · ${l.loja}`, numero: `${fPct(l.adsShare)} do GMV via ads`, acao: "Testar redução controlada de verba para medir incrementalidade." });
  });

  anun.forEach((x) => {
    if (x.devolRate > 0.2 && a.gmv && x.gmv / a.gmv > 0.003)
      alertas.push({ sev: "atenção", regra: `Devolução crítica · ${x.mlb}`, numero: fPct(x.devolRate), acao: "Revisar ficha, foto e grade do anúncio." });
  });

  const modais = Array.from(porChave(d.base, (p) => p.logi || "—").entries()).map(([m, ps]) => ({ m, ...agregar(ps) }));
  modais.forEach((m) => {
    if (m.freteShare > 0.06 && m.pedidos > 100)
      alertas.push({ sev: "atenção", regra: `Frete caro · ${m.m}`, numero: `${fPct(m.freteShare)} do GMV`, acao: "Revisar faixa de peso e política de frete grátis neste modal." });
  });

  if (1 - a.nfeRate > 0.15)
    alertas.push({ sev: "crítico", regra: "Pendência fiscal", numero: `${fPct(1 - a.nfeRate)} sem NF-e autorizada`, acao: "Conferir integração fiscal e reprocessar pendências." });

  const docs = porChave(d.base, (p) => p.doc);
  const umPedido = Array.from(docs.values()).filter((v) => new Set(v.map((x) => x.id)).size === 1).length;
  if (docs.size && umPedido / docs.size > 0.9)
    alertas.push({ sev: "atenção", regra: "Base sem recompra", numero: fPct(umPedido / docs.size), acao: "CAC precisa se pagar no primeiro pedido — revisar meta de aquisição." });

  const cross = Array.from(docs.values()).filter((v) => new Set(v.map((x) => x.loja)).size > 1).length;
  if (docs.size && cross / docs.size < 0.01)
    alertas.push({ sev: "oportunidade", regra: "Ausência de efeito de rede", numero: `${fPct(cross / docs.size)} cross-loja`, acao: "Testar cross-sell entre contas antes de assumir sinergia." });

  const totalGmv = a.gmv;
  const vao = sum(Object.entries(UF_INFO).map(([uf, info]) => {
    const g = sum(d.base.filter((p) => p.uf === uf).map((p) => p.gmv));
    return Math.max(0, (info.pop / POP_TOTAL) * totalGmv - g);
  }));
  if (totalGmv && vao / totalGmv > 0.01)
    alertas.push({ sev: "oportunidade", regra: "Mercado sub-penetrado", numero: `${fShort(vao)} de vão populacional`, acao: "Cruzar com frete médio por UF antes de virar meta comercial." });

  const medGmv = median(anun.map((x) => x.gmv)), medMg = median(anun.map((x) => x.margem));
  const cauda = anun.filter((x) => x.gmv < medGmv && x.margem < medMg).length;
  if (anun.length && cauda / anun.length > 0.2)
    alertas.push({ sev: "oportunidade", regra: "Cauda de baixo retorno", numero: `${fPct(cauda / anun.length)} dos anúncios`, acao: "Repricing ou descontinuação seletiva." });

  if (!alertas.length) alertas.push({ sev: "positivo", regra: "Nenhum limiar ultrapassado", numero: "—", acao: "Manter o acompanhamento semanal." });

  const ordem: Sev[] = ["crítico", "atenção", "oportunidade", "positivo"];
  alertas.sort((x, y2) => ordem.indexOf(x.sev) - ordem.indexOf(y2.sev));

  return (
    <div className="space-y-3">
      <div className="grid gap-2 grid-cols-4">
        {ordem.map((s) => (
          <Kpi key={s} label={s} value={fInt(alertas.filter((x) => x.sev === s).length)} />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Os limiares são referências de trabalho, não normas do marketplace. Calibre-os contra o histórico da própria
        rede antes de transformá-los em meta contratual.
      </p>
      <div className="space-y-2">
        {alertas.map((al, i) => (
          <div key={i} className={`rounded-lg border p-3 ${TONE[al.sev]}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold">{al.regra}</span>
              <span className="text-[11px] tabular-nums">{al.numero}</span>
            </div>
            <p className="text-[11px] mt-1 text-muted-foreground">{al.acao}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Multilojas;