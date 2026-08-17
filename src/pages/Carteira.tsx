import { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCarteiraData, type CarteiraDataset, type CarteiraSeller } from "@/hooks/carteira/useCarteiraData";
import { UploadCarteiraPanel, useCarteiraUpload } from "@/components/carteira/UploadCarteiraPanel";
import QualidadeFeeds from "@/components/dados/QualidadeFeeds";
import {
  describe, abc, linreg, movingAverage, histogram, median,
  fmtBRL, fmtBRLShort, fmtInt, fmtPct, type DescriptiveStats,
} from "@/lib/carteira/stats";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell, ReferenceLine, ComposedChart, Area, PieChart, Pie,
} from "recharts";
import "./carteira.css";

const NAVY = "#16233F", GOLD = "#C9A227", STEEL = "#5B7396", GREEN = "#2E7D5B", RED = "#B23A48";

/* ═══════════════ UI primitives ═══════════════ */
const SectionHead = ({ n, title, note }: { n: string; title: string; note?: string }) => (
  <div className="cart-sec-head">
    <span className="cart-sec-n">{n}</span>
    <h2>{title}</h2>
    {note && <span className="cart-sec-note">{note}</span>}
  </div>
);

const Card = ({ title, subtitle, children, className = "" }: any) => (
  <div className={`cart-card ${className}`}>
    {title && <div className="cart-card-head"><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>}
    <div className="cart-card-body">{children}</div>
  </div>
);

const Kpi = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="cart-kpi">
    <div className="cart-kpi-label">{label}</div>
    <div className="cart-kpi-value">{value}</div>
    {hint && <div className="cart-kpi-hint">{hint}</div>}
  </div>
);

const Reading = ({ children }: any) => <div className="cart-business">{children}</div>;

const StatBand = ({ s, fmt, phrase }: { s: DescriptiveStats; fmt: (n: number) => string; phrase: string }) => (
  <div className="cart-statband">
    <div className="cart-statband-nums">
      <span><i>N</i>{fmtInt(s.n)}</span>
      <span><i>Média</i>{fmt(s.mean)}</span>
      <span className="gold"><i>Mediana</i>{fmt(s.median)}</span>
      <span><i>σ</i>{fmt(s.sd)}</span>
      <span><i>CV</i>{(s.cv * 100).toFixed(1)}%</span>
      <span><i>Assimetria</i>{s.skewness.toFixed(2)}</span>
    </div>
    <p>{phrase}</p>
  </div>
);

function skewPhrase(s: DescriptiveStats, unidade: string) {
  if (s.n === 0) return "Sem dados suficientes no período.";
  if (s.skewness > 1)
    return `Distribuição fortemente assimétrica à direita: poucos casos puxam a média (${unidade}). Use a mediana como referência de ${unidade} típico.`;
  if (s.skewness < -1)
    return `Distribuição assimétrica à esquerda: a cauda baixa domina — a média subestima a maioria dos casos.`;
  if (s.cv > 0.6) return `Dispersão alta (CV ${(s.cv * 100).toFixed(0)}%): o comportamento não é homogêneo; trabalhe por faixas, não pela média.`;
  return `Distribuição comportada (CV ${(s.cv * 100).toFixed(0)}%): média e mediana são próximas e representam bem o conjunto.`;
}

/* Sort helper */
function useSort<T>(rows: T[], initial: keyof T, dir0: "asc" | "desc" = "desc") {
  const [key, setKey] = useState<keyof T>(initial);
  const [dir, setDir] = useState<"asc" | "desc">(dir0);
  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[key] as any, vb = b[key] as any;
      if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va;
      return dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [rows, key, dir]);
  const toggle = (k: keyof T) => {
    if (k === key) setDir(dir === "asc" ? "desc" : "asc");
    else { setKey(k); setDir("desc"); }
  };
  return { sorted, key, dir, toggle };
}

const Th = ({ label, k, sort, right }: any) => (
  <th onClick={() => sort.toggle(k)} className={`sortable ${right ? "right" : ""}`}>
    {label}{sort.key === k ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
  </th>
);

const SearchBox = ({ value, onChange, placeholder }: any) => (
  <div className="cart-search">
    <Search className="w-3.5 h-3.5" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

const brl = (v: any) => fmtBRL(Number(v));

/* ═══════════════ Drill-down (UF · categoria · loja) ═══════════════ */
export interface Drill { uf: string | null; categoria: string | null; sellerId: string | null; }
const EMPTY_DRILL: Drill = { uf: null, categoria: null, sellerId: null };
interface DrillCtx { drill: Drill; set: (p: Partial<Drill>) => void; clear: (k?: keyof Drill) => void; }
const DrillContext = createContext<DrillCtx>({ drill: EMPTY_DRILL, set: () => {}, clear: () => {} });
export const useDrill = () => useContext(DrillContext);

function applyDrill(ds: CarteiraDataset, drill: Drill): CarteiraDataset {
  if (!drill.uf && !drill.categoria && !drill.sellerId) return ds;

  let sellers = ds.sellers;
  if (drill.uf) sellers = sellers.filter((s) => s.uf === drill.uf);
  if (drill.sellerId) sellers = sellers.filter((s) => s.id === drill.sellerId);
  if (drill.categoria) {
    const withCat = new Set(
      ds.listings.filter((l) => l.categoria === drill.categoria).map((l) => l.sellerId)
    );
    sellers = sellers.filter((s) => withCat.has(s.id));
  }
  const ids = new Set(sellers.map((s) => s.id));
  const keep = (sid: string) => ids.has(sid);

  return {
    sellers,
    sellerById: new Map(sellers.map((s) => [s.id, s])),
    daily: ds.daily.filter((r) => keep(r.sellerId)),
    monthly: ds.monthly.filter((r) => keep(r.sellerId)),
    listings: ds.listings.filter(
      (l) => keep(l.sellerId) && (!drill.categoria || l.categoria === drill.categoria)
    ),
    eligibility: ds.eligibility.filter((e) => keep(e.sellerId)),
    grants: ds.grants.filter((g) => keep(g.sellerId)),
    refDate: ds.refDate,
  };
}

function DrillChips({ ds }: { ds: CarteiraDataset }) {
  const { drill, clear } = useDrill();
  const chips: Array<{ k: keyof Drill; label: string }> = [];
  if (drill.uf) chips.push({ k: "uf", label: `UF: ${drill.uf}` });
  if (drill.categoria) chips.push({ k: "categoria", label: `Categoria: ${drill.categoria}` });
  if (drill.sellerId) {
    const s = ds.sellerById.get(drill.sellerId);
    chips.push({ k: "sellerId", label: `Loja: ${s?.nick ?? drill.sellerId}` });
  }
  if (!chips.length) return null;
  return (
    <div className="cart-drillbar">
      <span className="cart-drillbar-title">Recorte ativo</span>
      {chips.map((c) => (
        <button key={c.k} className="cart-drillchip" onClick={() => clear(c.k)} title="Remover este recorte">
          {c.label} <X className="w-3 h-3" />
        </button>
      ))}
      <button className="cart-drillclear" onClick={() => clear()}>limpar tudo</button>
      <span className="cart-drillbar-note">
        Todos os cards, gráficos e tabelas desta aba consideram apenas o recorte selecionado.
      </span>
    </div>
  );
}

/* ═══════════════ Agregações compartilhadas ═══════════════ */
interface SellerAgg extends CarteiraSeller {
  gmv: number; tsi: number; visitas: number; ticket: number; conv: number;
  invPads: number; gmvPads: number; tsiPads: number;
  gmvPrev: number; delta: number; deltaPct: number; anuncios: number;
}

function useAgg(ds: CarteiraDataset) {
  return useMemo(() => {
    const months = Array.from(new Set(ds.monthly.map((m) => m.data))).sort();
    const last = months[months.length - 1];
    const prev = months[months.length - 2];

    const anunciosPorSeller = new Map<string, number>();
    const lastLl = ds.listings.length
      ? Array.from(new Set(ds.listings.map((l) => l.data))).sort().pop()
      : null;
    for (const l of ds.listings) {
      if (lastLl && l.data !== lastLl) continue;
      anunciosPorSeller.set(l.sellerId, (anunciosPorSeller.get(l.sellerId) ?? 0) + l.itens);
    }

    const base = new Map<string, SellerAgg>();
    for (const s of ds.sellers) {
      base.set(s.id, {
        ...s, gmv: 0, tsi: 0, visitas: 0, ticket: 0, conv: 0,
        invPads: 0, gmvPads: 0, tsiPads: 0, gmvPrev: 0, delta: 0, deltaPct: 0,
        anuncios: anunciosPorSeller.get(s.id) ?? 0,
      });
    }
    for (const m of ds.monthly) {
      const a = base.get(m.sellerId);
      if (!a) continue;
      if (m.data === last) {
        a.gmv += m.gmv; a.tsi += m.tsi; a.visitas += m.visitas;
        a.invPads += m.invPads; a.gmvPads += m.gmvPads; a.tsiPads += m.tsiPads;
      } else if (m.data === prev) a.gmvPrev += m.gmv;
    }
    const sellers = Array.from(base.values())
      .map((a) => ({
        ...a,
        ticket: a.tsi > 0 ? a.gmv / a.tsi : 0,
        conv: a.visitas > 0 ? a.tsi / a.visitas : 0,
        delta: a.gmv - a.gmvPrev,
        deltaPct: a.gmvPrev > 0 ? (a.gmv - a.gmvPrev) / a.gmvPrev : 0,
      }))
      .filter((a) => a.gmv > 0 || a.gmvPrev > 0 || a.anuncios > 0)
      .sort((x, y) => y.gmv - x.gmv);

    const ativos = sellers.filter((s) => s.gmv > 0);
    const totalGmv = ativos.reduce((s, r) => s + r.gmv, 0);
    const totalTsi = ativos.reduce((s, r) => s + r.tsi, 0);
    const totalVisitas = ativos.reduce((s, r) => s + r.visitas, 0);
    const totalAnuncios = sellers.reduce((s, r) => s + r.anuncios, 0);

    // curva ABC global por GMV
    const ranked = abc(ativos, (s) => s.gmv);
    const curva = new Map<string, "A" | "B" | "C">();
    ranked.forEach((r) => curva.set(r.item.id, r.klass));

    // série diária consolidada
    const dmap = new Map<string, { gmv: number; tsi: number }>();
    for (const d of ds.daily) {
      const cur = dmap.get(d.data) ?? { gmv: 0, tsi: 0 };
      cur.gmv += d.gmv; cur.tsi += d.tsi;
      dmap.set(d.data, cur);
    }
    const serie = Array.from(dmap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, v]) => ({ data, ...v }));

    return { months, last, prev, sellers, ativos, totalGmv, totalTsi, totalVisitas, totalAnuncios, curva, serie };
  }, [ds]);
}

type Agg = ReturnType<typeof useAgg>;

/* ═══════════════ 01 · Panorama ═══════════════ */
function Panorama({ ds, ag }: { ds: CarteiraDataset; ag: Agg }) {
  const { set } = useDrill();
  const catRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of ds.listings) m.set(l.categoria, (m.get(l.categoria) ?? 0) + l.itens);
    const arr = Array.from(m.entries()).map(([cat, itens]) => ({ cat, itens })).sort((a, b) => b.itens - a.itens);
    const tot = arr.reduce((s, r) => s + r.itens, 0) || 1;
    let cum = 0;
    return arr.slice(0, 14).map((r) => { cum += r.itens; return { ...r, acum: (cum / tot) * 100 }; });
  }, [ds.listings]);

  const sGmv = describe(ag.ativos.map((s) => s.gmv));
  const sCat = describe(catRows.map((c) => c.itens));
  const ticket = ag.totalTsi > 0 ? ag.totalGmv / ag.totalTsi : 0;
  const top10 = ag.ativos.slice(0, 10).reduce((s, r) => s + r.gmv, 0);

  return (
    <>
      <SectionHead n="01" title="Panorama" note={`Posição em ${fmtDate(ds.refDate)}`} />
      <div className="cart-kpi-cluster">
        <Kpi label="GMV total" value={fmtBRL(ag.totalGmv)} hint="mês corrente da base" />
        <Kpi label="Unidades (TSI)" value={fmtInt(ag.totalTsi)} hint="pedidos no período" />
        <Kpi label="Ticket médio" value={fmtBRL(ticket)} hint="GMV ÷ TSI" />
        <Kpi label="Lojas ativas" value={fmtInt(ag.ativos.length)} hint={`de ${fmtInt(ag.sellers.length)} na carteira`} />
        <Kpi label="Anúncios ativos" value={fmtInt(ag.totalAnuncios)} hint="live listings" />
      </div>

      <StatBand s={sGmv} fmt={(n) => fmtBRLShort(n)} phrase={skewPhrase(sGmv, "GMV por loja")} />

      <div className="cart-grid">
        <Card title="Pareto de categorias" subtitle="Clique em uma barra para filtrar a aba pela categoria · linha = % acumulado · tracejado dourado = mediana entre categorias">
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <ComposedChart data={catRows} margin={{ top: 8, right: 24, bottom: 60, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
                <XAxis dataKey="cat" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} height={70} />
                <YAxis yAxisId="l" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtInt(v)} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: any, n: any) => (n === "% acumulado" ? `${Number(v).toFixed(1)}%` : fmtInt(Number(v)))} />
                <Legend />
                <Bar yAxisId="l" dataKey="itens" name="Anúncios" fill={NAVY} cursor="pointer"
                  onClick={(d: any) => d?.cat && set({ categoria: d.cat })} />
                <Line yAxisId="r" type="monotone" dataKey="acum" name="% acumulado" stroke={GOLD} strokeWidth={2} dot={false} />
                <ReferenceLine yAxisId="l" y={sCat.median} stroke={GOLD} strokeDasharray="5 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Reading>
            As 3 primeiras categorias respondem por {catRows.slice(0, 3).reduce((s, r) => s + r.itens, 0) > 0
              ? `${(catRows[2]?.acum ?? catRows[catRows.length - 1]?.acum ?? 0).toFixed(0)}%` : "—"} do sortimento exposto.
            Concentração alta significa que qualquer perda de ranking nessas categorias derruba o GMV da rede inteira.
          </Reading>
        </Card>

        <Card title="Concentração de GMV entre lojas" subtitle="Curva ABC por GMV (A até 80%, B 80–95%, C 95–100%)">
          <div className="cart-inline-kpis">
            <div><b>{fmtPct(ag.totalGmv > 0 ? top10 / ag.totalGmv : 0)}</b><span>do GMV nas 10 maiores lojas</span></div>
            <div><b>{fmtInt(ag.ativos.filter((s) => ag.curva.get(s.id) === "A").length)}</b><span>lojas na curva A</span></div>
            <div><b>{fmtBRL(sGmv.median)}</b><span>GMV mediano por loja</span></div>
            <div><b>{fmtBRL(sGmv.q1)} – {fmtBRL(sGmv.q3)}</b><span>faixa interquartil</span></div>
          </div>
          <Reading>
            Mediana ({fmtBRL(sGmv.median)}) bem abaixo da média ({fmtBRL(sGmv.mean)}) confirma cauda longa:
            a maior parte das lojas fatura pouco e um grupo pequeno sustenta o resultado. Metas iguais para todas as lojas não funcionam.
          </Reading>
        </Card>
      </div>
    </>
  );
}

/* ═══════════════ 02 · Ritmo diário ═══════════════ */
function Ritmo({ ds, ag }: { ds: CarteiraDataset; ag: Agg }) {
  const s = describe(ag.serie.map((d) => d.gmv));
  const mm3 = movingAverage(ag.serie.map((d) => d.gmv), 3);
  const rows = ag.serie.map((d, i) => {
    const dt = new Date(`${d.data}T12:00:00`);
    const dow = dt.getDay();
    return {
      ...d, mm3: mm3[i], q1: s.q1, q3band: s.q3 - s.q1,
      fds: dow === 0 || dow === 6,
      label: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      desvio: s.median > 0 ? ((d.gmv - s.median) / s.median) * 100 : 0,
    };
  });
  const acima = rows.filter((r) => r.desvio > 0).length;

  return (
    <>
      <SectionHead n="02" title="Ritmo diário" note="Mediana e faixa interquartil como referência" />
      <StatBand s={s} fmt={(n) => fmtBRLShort(n)} phrase={skewPhrase(s, "GMV diário")} />

      <Card title="GMV por dia" subtitle="Banda dourada = Q1–Q3 · tracejado dourado = mediana · faixa clara = fim de semana">
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <ComposedChart data={rows} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(rows.length / 18))} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtBRLShort} />
              <Tooltip formatter={(v: any, n: any) => [brl(v), n]} labelFormatter={(l) => `Dia ${l}`} />
              <Legend />
              <Area type="monotone" dataKey="q1" stackId="iqr" stroke="none" fill="transparent" name=" " legendType="none" />
              <Area type="monotone" dataKey="q3band" stackId="iqr" stroke="none" fill={GOLD} fillOpacity={0.14} name="Faixa Q1–Q3" />
              <Line type="monotone" dataKey="gmv" name="GMV diário" stroke={NAVY} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="mm3" name="Média móvel 3d" stroke={STEEL} strokeWidth={1.5} dot={false} />
              <ReferenceLine y={s.median} stroke={GOLD} strokeDasharray="5 4"
                label={{ value: `Mediana ${fmtBRLShort(s.median)}`, position: "insideTopRight", fill: GOLD, fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <Reading>
          {acima} de {rows.length} dias ficaram acima da mediana. Dias fora da faixa Q1–Q3 são exceção estatística —
          antes de comemorar (ou alarmar) verifique se houve campanha, feriado ou fim de semana.
        </Reading>
      </Card>

      <Card title="Oscilação diária vs mediana" subtitle="Verde acima da mediana · vermelho abaixo · linha zero = mediana do período">
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(rows.length / 18))} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}% vs mediana`} />
              <ReferenceLine y={0} stroke={NAVY} />
              <Bar dataKey="desvio" name="Desvio vs mediana">
                {rows.map((r, i) => <Cell key={i} fill={r.desvio >= 0 ? GREEN : RED} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}

/* ═══════════════ 03 · Curva A por estado ═══════════════ */
function CurvaA({ ag }: { ag: Agg }) {
  const { drill, set } = useDrill();
  const ufs = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of ag.ativos) m.set(s.uf, (m.get(s.uf) ?? 0) + s.gmv);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([uf]) => uf);
  }, [ag.ativos]);
  const [uf, setUf] = useState<string>(ufs[0] ?? "ND");
  const ufAtual = ufs.includes(uf) ? uf : ufs[0] ?? "ND";

  const lojas = ag.ativos.filter((s) => s.uf === ufAtual);
  const ranked = abc(lojas, (s) => s.gmv);
  const curvaA = ranked.filter((r) => r.klass === "A");
  const gmvUf = lojas.reduce((s, r) => s + r.gmv, 0);
  const gmvA = curvaA.reduce((s, r) => s + r.value, 0);

  return (
    <>
      <SectionHead n="03" title="Curva A por estado" note="ABC por GMV — A concentra 80% do faturamento da UF" />
      <div className="cart-chips">
        {ufs.map((u) => (
          <button key={u} className={`cart-chip ${u === ufAtual ? "on" : ""}`} onClick={() => setUf(u)}>{u}</button>
        ))}
        {!drill.uf && ufAtual !== "ND" && (
          <button className="cart-chip gold" onClick={() => set({ uf: ufAtual })}>
            Filtrar aba por {ufAtual}
          </button>
        )}
      </div>
      <div className="cart-kpi-cluster">
        <Kpi label="Lojas curva A" value={`${fmtInt(curvaA.length)} / ${fmtInt(lojas.length)}`} hint={`${ufAtual}`} />
        <Kpi label="GMV curva A" value={fmtBRL(gmvA)} hint={`${fmtPct(gmvUf > 0 ? gmvA / gmvUf : 0)} do GMV da UF`} />
        <Kpi label="GMV total da UF" value={fmtBRL(gmvUf)} />
        <Kpi label="Ticket médio da UF" value={fmtBRL(lojas.reduce((s, r) => s + r.tsi, 0) > 0 ? gmvUf / lojas.reduce((s, r) => s + r.tsi, 0) : 0)} />
      </div>

      <Card title={`Composição de 80% do GMV — ${ufAtual}`} subtitle="Ordenado por GMV; a curva A termina onde o acumulado cruza 80%">
        <div className="cart-progress"><div style={{ width: `${Math.min(100, (gmvA / (gmvUf || 1)) * 100)}%` }} /></div>
        <div className="cart-table-wrap">
          <table className="cart-table">
            <thead><tr><th>#</th><th>Loja</th><th className="right">GMV</th><th className="right">Unid.</th><th className="right">Ticket</th><th className="right">Share</th><th className="right">Acum.</th><th>Curva</th></tr></thead>
            <tbody>
              {ranked.slice(0, 80).map((r, i) => (
                <tr key={r.item.id} className={drill.sellerId === r.item.id ? "sel" : ""}>
                  <td className="mono">{i + 1}</td>
                  <td>
                    <button className="cart-link" onClick={() => set({ sellerId: r.item.id })}>{r.item.nick}</button>
                  </td>
                  <td className="right mono">{fmtBRL(r.value)}</td>
                  <td className="right mono">{fmtInt(r.item.tsi)}</td>
                  <td className="right mono">{fmtBRL(r.item.ticket)}</td>
                  <td className="right mono">{fmtPct(gmvUf > 0 ? r.value / gmvUf : 0)}</td>
                  <td className="right mono">{(r.cumPct * 100).toFixed(1)}%</td>
                  <td><span className={`cart-badge cart-badge-${r.klass.toLowerCase()}`}>{r.klass}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Reading>
          Em {ufAtual}, {curvaA.length} loja(s) sustentam 80% do GMV do estado. Perder qualquer uma delas equivale a perder
          o efeito somado de dezenas de lojas da cauda — é aí que a régua de atendimento precisa ser mais fina.
        </Reading>
      </Card>
    </>
  );
}

/* ═══════════════ 04 · Categorias por região ═══════════════ */
function Categorias({ ds, ag }: { ds: CarteiraDataset; ag: Agg }) {
  const { set } = useDrill();
  const { rows, cats } = useMemo(() => {
    const totalCat = new Map<string, number>();
    for (const l of ds.listings) totalCat.set(l.categoria, (totalCat.get(l.categoria) ?? 0) + l.itens);
    const cats = Array.from(totalCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
    const reg = new Map<string, any>();
    for (const l of ds.listings) {
      const s = ds.sellerById.get(l.sellerId);
      const r = s?.regiao ?? "ND";
      const cur = reg.get(r) ?? { regiao: r, total: 0 };
      if (cats.includes(l.categoria)) cur[l.categoria] = (cur[l.categoria] ?? 0) + l.itens;
      cur.total += l.itens;
      reg.set(r, cur);
    }
    return { rows: Array.from(reg.values()).sort((a, b) => b.total - a.total), cats };
  }, [ds]);

  const s = describe(rows.map((r) => r.total));
  const colors = [NAVY, GOLD, STEEL, GREEN, RED];

  return (
    <>
      <SectionHead n="04" title="Categorias por região" note="Top 5 categorias · mediana entre regiões" />
      <StatBand s={s} fmt={fmtInt} phrase={skewPhrase(s, "sortimento por região")} />
      <Card title="Sortimento por região" subtitle="Clique em um segmento para filtrar a aba pela categoria · tracejado dourado = mediana regional">
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
              <XAxis dataKey="regiao" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtInt} />
              <Tooltip formatter={(v: any) => fmtInt(Number(v))} />
              <Legend />
              {cats.map((c, i) => (
                <Bar key={c} dataKey={c} stackId="c" fill={colors[i % colors.length]} name={c}
                  cursor="pointer" onClick={() => set({ categoria: c })} />
              ))}
              <ReferenceLine y={s.median} stroke={GOLD} strokeDasharray="5 4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Reading>
          Regiões acima da mediana concentram sortimento; abaixo dela há espaço de ativação — mesma marca, menos anúncios expostos.
          Compare sempre dentro da mesma categoria: mix diferente muda ticket e conversão.
        </Reading>
      </Card>
    </>
  );
}

/* ═══════════════ 05 · Ticket por UF ═══════════════ */
function TicketUF({ ag }: { ag: Agg }) {
  const { set } = useDrill();
  const rows = useMemo(() => {
    const m = new Map<string, { gmv: number; tsi: number }>();
    for (const s of ag.ativos) {
      const cur = m.get(s.uf) ?? { gmv: 0, tsi: 0 };
      cur.gmv += s.gmv; cur.tsi += s.tsi;
      m.set(s.uf, cur);
    }
    return Array.from(m.entries())
      .map(([uf, v]) => ({ uf, ticket: v.tsi > 0 ? v.gmv / v.tsi : 0, gmv: v.gmv, tsi: v.tsi }))
      .filter((r) => r.ticket > 0)
      .sort((a, b) => b.ticket - a.ticket);
  }, [ag.ativos]);

  const brasil = ag.totalTsi > 0 ? ag.totalGmv / ag.totalTsi : 0;
  const s = describe(rows.map((r) => r.ticket));

  return (
    <>
      <SectionHead n="05" title="Ticket por UF" note="GMV ÷ unidades — nunca preço de item" />
      <StatBand s={s} fmt={fmtBRL} phrase={skewPhrase(s, "ticket por UF")} />
      <Card title="Ticket médio por estado" subtitle="Clique em uma barra para filtrar a aba pela UF · dourado = acima do ticket Brasil · linha vermelha = Brasil · tracejado = mediana das UFs">
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
              <XAxis dataKey="uf" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtBRLShort} />
              <Tooltip formatter={(v: any) => brl(v)} />
              <Bar dataKey="ticket" name="Ticket médio" cursor="pointer"
                onClick={(d: any) => d?.uf && set({ uf: d.uf })}>
                {rows.map((r, i) => <Cell key={i} fill={r.ticket >= brasil ? GOLD : NAVY} />)}
              </Bar>
              <ReferenceLine y={brasil} stroke={RED} label={{ value: `Brasil ${fmtBRL(brasil)}`, position: "insideTopRight", fill: RED, fontSize: 10 }} />
              <ReferenceLine y={s.median} stroke={GOLD} strokeDasharray="5 4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Reading>
          Diferença de ticket entre estados reflete <b>mix de produto</b>, não política de preço: UF com mais peça de alto valor
          sobe o ticket sem vender mais unidades. Compare ticket sempre junto com TSI.
        </Reading>
      </Card>
    </>
  );
}

/* ═══════════════ 06 · Tracionadores ═══════════════ */
function Tracionadores({ ag }: { ag: Agg }) {
  const { set } = useDrill();
  const movs = ag.sellers.filter((s) => s.gmv > 0 || s.gmvPrev > 0);
  const altas = [...movs].sort((a, b) => b.delta - a.delta).filter((s) => s.delta > 0).slice(0, 8);
  const quedas = [...movs].sort((a, b) => a.delta - b.delta).filter((s) => s.delta < 0).slice(0, 8);
  const rows = [...altas].reverse().concat(quedas).map((s) => ({ id: s.id, nick: s.nick, delta: s.delta, uf: s.uf }));
  const nPos = movs.filter((s) => s.delta > 0).length;
  const nNeg = movs.filter((s) => s.delta < 0).length;

  return (
    <>
      <SectionHead n="06" title="Tracionadores e detratores" note={`${labelMes(ag.last)} vs ${labelMes(ag.prev)}`} />
      <div className="cart-kpi-cluster">
        <Kpi label="Impulsionadores" value={fmtInt(nPos)} hint="lojas com Δ GMV positivo" />
        <Kpi label="Detratores" value={fmtInt(nNeg)} hint="lojas com Δ GMV negativo" />
        <Kpi label="Δ líquido da carteira" value={fmtBRL(movs.reduce((s, r) => s + r.delta, 0))} />
      </div>
      <Card title="8 maiores altas × 8 maiores quedas" subtitle="Clique em uma barra para filtrar a aba pela loja · cor pelo sinal do delta · linha zero divide impulsionadores de detratores">
        <div style={{ width: "100%", height: Math.max(320, rows.length * 26) }}>
          <ResponsiveContainer>
            <BarChart data={rows} layout="vertical" margin={{ left: 120, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtBRLShort} />
              <YAxis type="category" dataKey="nick" tick={{ fontSize: 10 }} width={115} />
              <Tooltip formatter={(v: any) => brl(v)} />
              <ReferenceLine x={0} stroke={NAVY} />
              <Bar dataKey="delta" name="Δ GMV" cursor="pointer"
                onClick={(d: any) => d?.id && set({ sellerId: d.id })}>
                {rows.map((r, i) => <Cell key={i} fill={r.delta >= 0 ? GREEN : RED} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Reading>
          {nPos} impulsionadores × {nNeg} detratores. Atenção ao viés de campanha: se um dos períodos teve ação promocional
          concentrada, parte do delta é calendário e não performance estrutural da loja.
        </Reading>
      </Card>
    </>
  );
}

/* ═══════════════ 07 · Tráfego & conversão ═══════════════ */
function Trafego({ ag }: { ag: Agg }) {
  const { set } = useDrill();
  const rows = ag.ativos.filter((s) => s.visitas > 0).slice(0, 40)
    .map((s) => ({ id: s.id, nick: s.nick, conv: s.conv * 100, visitas: s.visitas, gmv: s.gmv }));
  const s = describe(ag.ativos.filter((x) => x.visitas > 0).map((x) => x.conv * 100));
  const convPond = ag.totalVisitas > 0 ? ag.totalTsi / ag.totalVisitas : 0;
  const alvo = rows.filter((r) => r.visitas >= median(rows.map((x) => x.visitas)) && r.conv < s.median);

  return (
    <>
      <SectionHead n="07" title="Tráfego & conversão" note="Conversão = unidades ÷ visitas" />
      <div className="cart-kpi-cluster">
        <Kpi label="Visitas" value={fmtInt(ag.totalVisitas)} />
        <Kpi label="Unidades" value={fmtInt(ag.totalTsi)} />
        <Kpi label="Conversão ponderada" value={`${(convPond * 100).toFixed(2)}%`} hint="TSI ÷ visitas da carteira" />
        <Kpi label="Mediana entre lojas" value={`${s.median.toFixed(2)}%`} hint={`Q1–Q3 ${s.q1.toFixed(2)}%–${s.q3.toFixed(2)}%`} />
      </div>
      <StatBand s={s} fmt={(n) => `${n.toFixed(2)}%`} phrase={skewPhrase(s, "conversão por loja")} />
      <Card title="Conversão por loja (40 maiores em GMV)" subtitle="Clique em uma barra para filtrar a aba pela loja · referência de mercado: <2% baixa · ~3% média · >3,5% ótima">
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 20, bottom: 80, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
              <XAxis dataKey="nick" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" interval={0} height={90} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(1)}%`} />
              <Tooltip formatter={(v: any, n: any) => (n === "Conversão" ? `${Number(v).toFixed(2)}%` : fmtInt(Number(v)))} />
              <Bar dataKey="conv" name="Conversão" cursor="pointer"
                onClick={(d: any) => d?.id && set({ sellerId: d.id })}>
                {rows.map((r, i) => <Cell key={i} fill={r.conv >= s.median ? NAVY : RED} />)}
              </Bar>
              <ReferenceLine y={s.median} stroke={GOLD} strokeDasharray="5 4" label={{ value: "Mediana", position: "insideTopRight", fill: GOLD, fontSize: 10 }} />
              <ReferenceLine y={s.q1} stroke={GOLD} strokeDasharray="2 3" />
              <ReferenceLine y={s.q3} stroke={GOLD} strokeDasharray="2 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Reading>
          Alvo de trabalho: {alvo.length} loja(s) com tráfego acima da mediana e conversão abaixo dela — já têm audiência,
          perdem na página (preço, foto, ficha, frete ou estoque). É o ganho mais barato da carteira.
        </Reading>
      </Card>
    </>
  );
}

/* ═══════════════ 08 · PADS ═══════════════ */
function Pads({ ds, ag }: { ds: CarteiraDataset; ag: Agg }) {
  const [q, setQ] = useState("");
  const elig = ds.eligibility;

  const porSeller = useMemo(() => {
    const m = new Map<string, { produtos: number; desc: number; pedidos: number; tsiD: number; optIn: number }>();
    for (const e of elig) {
      const cur = m.get(e.sellerId) ?? { produtos: 0, desc: 0, pedidos: 0, tsiD: 0, optIn: 0 };
      cur.produtos += 1; cur.desc += e.descontoTotal; cur.pedidos += e.pedidos7d;
      cur.tsiD += e.tsiDiario; cur.optIn += e.optIn ? 1 : 0;
      m.set(e.sellerId, cur);
    }
    return ag.sellers
      .map((s) => {
        const p = m.get(s.id);
        return {
          nick: s.nick, custId: s.custId, uf: s.uf,
          produtos: p?.produtos ?? 0,
          desconto: p && p.produtos > 0 ? p.desc / p.produtos : 0,
          pedidos: p?.pedidos ?? 0,
          tsiDiario: p?.tsiD ?? 0,
          cofin: s.invPads,
          rebate: s.invPads + (p?.pedidos ?? 0) * 0,
          gmvPads: s.gmvPads,
        };
      })
      .filter((r) => r.produtos > 0 || r.cofin > 0);
  }, [elig, ag.sellers]);

  const sort = useSort(porSeller, "cofin" as any);
  const filtered = sort.sorted.filter((r) => r.nick.toLowerCase().includes(q.toLowerCase()) || r.custId.includes(q));

  const totalCofin = porSeller.reduce((s, r) => s + r.cofin, 0);
  const totalProd = porSeller.reduce((s, r) => s + r.produtos, 0);
  const totalPedidos = porSeller.reduce((s, r) => s + r.pedidos, 0);
  const descMedio = elig.length ? elig.reduce((s, e) => s + e.descontoTotal, 0) / elig.length : 0;
  const optIn = elig.filter((e) => e.optIn).length;

  const faixas = useMemo(() => {
    const defs: [string, number, number][] = [
      ["0–5%", 0, 5], ["5–10%", 5, 10], ["10–15%", 10, 15],
      ["15–20%", 15, 20], ["20–30%", 20, 30], ["30%+", 30, Infinity],
    ];
    return defs.map(([faixa, a, b]) => ({ faixa, itens: elig.filter((e) => e.descontoTotal >= a && e.descontoTotal < b).length }));
  }, [elig]);

  const mecanicas = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of elig) m.set(e.campaignType, (m.get(e.campaignType) ?? 0) + 1);
    return Array.from(m.entries()).map(([tipo, itens]) => ({ tipo, itens })).sort((a, b) => b.itens - a.itens).slice(0, 8);
  }, [elig]);

  const sProd = describe(porSeller.filter((r) => r.produtos > 0).map((r) => r.produtos));

  return (
    <>
      <SectionHead n="08" title="PADS" note="Participação, desconto e co-financiamento — sem atribuição de GMV por campanha" />
      <div className="cart-kpi-cluster">
        <Kpi label="Vendedores participantes" value={fmtInt(porSeller.filter((r) => r.produtos > 0).length)} />
        <Kpi label="Produtos elegíveis" value={fmtInt(totalProd)} />
        <Kpi label="Desconto médio" value={`${descMedio.toFixed(2)}%`} />
        <Kpi label="Pedidos (7D)" value={fmtInt(totalPedidos)} />
        <Kpi label="Co-financiamento Mercado Livre" value={fmtBRL(totalCofin)} hint="parte do investimento bancada pelo ML" />
        <Kpi label="Itens com opt-in" value={fmtPct(elig.length ? optIn / elig.length : 0)} />
      </div>
      <StatBand s={sProd} fmt={fmtInt} phrase={skewPhrase(sProd, "produtos participantes por loja")} />

      <div className="cart-grid-2">
        <Card title="Itens por faixa de desconto">
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={faixas}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
                <XAxis dataKey="faixa" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtInt} />
                <Tooltip formatter={(v: any) => fmtInt(Number(v))} />
                <Bar dataKey="itens" name="Itens" fill={NAVY} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Adesão (opt-in)">
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={[{ name: "Com opt-in", value: optIn }, { name: "Sem opt-in", value: Math.max(0, elig.length - optIn) }]}
                  dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={2}>
                  <Cell fill={GOLD} /><Cell fill={STEEL} />
                </Pie>
                <Tooltip formatter={(v: any) => fmtInt(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <Reading>Item elegível sem opt-in é desconto disponível que a loja não está usando — conversão perdida sem custo adicional de mídia.</Reading>
        </Card>
      </div>

      <Card title="Campanhas ativas dos anúncios" subtitle="Distribuição por mecânica — códigos internos de campanha não são exibidos">
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={mecanicas} layout="vertical" margin={{ left: 110 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtInt} />
              <YAxis type="category" dataKey="tipo" tick={{ fontSize: 10 }} width={105} />
              <Tooltip formatter={(v: any) => fmtInt(Number(v))} />
              <Bar dataKey="itens" name="Itens" fill={GOLD} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Reading>
          A maioria dos anúncios participa de mais de uma campanha ao mesmo tempo. Por isso o GMV <b>não</b> pode ser atribuído
          a uma campanha isolada — a leitura de resultado é por vendedor, participação e investimento.
        </Reading>
      </Card>

      <Card title="PADS por vendedor" subtitle="Busca, ordenação por qualquer coluna e totalizador no rodapé">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar loja ou cust_id…" />
        <div className="cart-table-wrap">
          <table className="cart-table">
            <thead><tr>
              <Th label="Loja" k="nick" sort={sort} /><Th label="Cust ID" k="custId" sort={sort} /><Th label="UF" k="uf" sort={sort} />
              <Th label="Produtos" k="produtos" sort={sort} right /><Th label="Desc. médio" k="desconto" sort={sort} right />
              <Th label="Pedidos 7D" k="pedidos" sort={sort} right /><Th label="TSI diário" k="tsiDiario" sort={sort} right />
              <Th label="Co-fin. ML" k="cofin" sort={sort} right />
            </tr></thead>
            <tbody>
              {filtered.slice(0, 200).map((r) => (
                <tr key={r.custId}>
                  <td>{r.nick}</td><td className="mono">{r.custId}</td><td>{r.uf}</td>
                  <td className="right mono">{fmtInt(r.produtos)}</td>
                  <td className="right mono">{r.desconto.toFixed(2)}%</td>
                  <td className="right mono">{fmtInt(r.pedidos)}</td>
                  <td className="right mono">{r.tsiDiario.toFixed(1)}</td>
                  <td className="right mono">{fmtBRL(r.cofin)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan={3}>{fmtInt(filtered.length)} vendedores</td>
              <td className="right mono">{fmtInt(filtered.reduce((s, r) => s + r.produtos, 0))}</td>
              <td className="right mono">—</td>
              <td className="right mono">{fmtInt(filtered.reduce((s, r) => s + r.pedidos, 0))}</td>
              <td className="right mono">—</td>
              <td className="right mono">{fmtBRL(filtered.reduce((s, r) => s + r.cofin, 0))}</td>
            </tr></tfoot>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ═══════════════ 09 · Análise estatística ═══════════════ */
type VarKey = "gmv" | "ticket" | "conv";
function Estatistica({ ag }: { ag: Agg }) {
  const [v, setV] = useState<VarKey>("gmv");
  const conf: Record<VarKey, { label: string; get: (s: any) => number; fmt: (n: number) => string }> = {
    gmv: { label: "GMV por loja", get: (s) => s.gmv, fmt: fmtBRLShort },
    ticket: { label: "Ticket por loja", get: (s) => s.ticket, fmt: fmtBRL },
    conv: { label: "Conversão por loja (%)", get: (s) => s.conv * 100, fmt: (n) => `${n.toFixed(2)}%` },
  };
  const c = conf[v];
  const vals = ag.ativos.map(c.get).filter((n) => n > 0);
  const s = describe(vals);
  const bins = histogram(vals, 18).map((b) => ({ ...b, label: c.fmt(b.mid) }));

  const serie = ag.serie;
  const xs = serie.map((_, i) => i);
  const reg = linreg(xs, serie.map((d) => d.gmv));
  const mm3 = movingAverage(serie.map((d) => d.gmv), 3);
  const trend = serie.map((d, i) => ({
    label: new Date(`${d.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    gmv: d.gmv, mm3: mm3[i], reta: reg.intercept + reg.slope * i,
  }));

  return (
    <>
      <SectionHead n="09" title="Análise estatística" note="Distribuição, normalidade e tendência" />
      <div className="cart-chips">
        {(Object.keys(conf) as VarKey[]).map((k) => (
          <button key={k} className={`cart-chip ${k === v ? "on" : ""}`} onClick={() => setV(k)}>{conf[k].label}</button>
        ))}
      </div>

      <div className="cart-grid-2">
        <Card title={`Distribuição — ${c.label}`} subtitle="Barras = observado · linha dourada = curva normal teórica · vermelha = média · dourada = mediana">
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <ComposedChart data={bins} margin={{ top: 8, right: 16, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} interval={1} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val: any, n: any) => [Number(val).toFixed(1), n]} />
                <Bar dataKey="count" name="Lojas" fill={NAVY} />
                <Line type="monotone" dataKey="normal" name="Normal teórica" stroke={GOLD} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="cart-stat-line">
            <span className="cart-stat-lbl">N</span><span className="cart-stat-val">{fmtInt(s.n)}</span>
            <span className="cart-stat-lbl">Média</span><span className="cart-stat-val">{c.fmt(s.mean)}</span>
            <span className="cart-stat-lbl">Mediana</span><span className="cart-stat-val">{c.fmt(s.median)}</span>
            <span className="cart-stat-lbl">σ</span><span className="cart-stat-val">{c.fmt(s.sd)}</span>
            <span className="cart-stat-lbl">CV</span><span className="cart-stat-val">{(s.cv * 100).toFixed(1)}%</span>
            <span className="cart-stat-lbl">Assimetria</span><span className="cart-stat-val">{s.skewness.toFixed(2)}</span>
            <span className="cart-stat-lbl">Q1–Q3</span><span className="cart-stat-val">{c.fmt(s.q1)} – {c.fmt(s.q3)}</span>
          </div>
          <Reading>{skewPhrase(s, c.label.toLowerCase())}</Reading>
        </Card>

        <Card title={`Tendência do GMV diário · R² ${reg.r2.toFixed(3)}`} subtitle="Reta = regressão linear · linha aço = média móvel 3 dias">
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <ComposedChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(trend.length / 14))} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtBRLShort} />
                <Tooltip formatter={(val: any) => brl(val)} />
                <Legend />
                <Line type="monotone" dataKey="gmv" name="GMV" stroke={NAVY} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mm3" name="MM 3d" stroke={STEEL} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="reta" name="Tendência" stroke={GOLD} strokeWidth={2} strokeDasharray="6 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Reading>
            {reg.r2 < 0.3
              ? `R² baixo (${reg.r2.toFixed(3)}): quase toda a variação é sazonalidade de calendário (dia da semana, campanha), não tendência estrutural.`
              : `R² de ${reg.r2.toFixed(3)}: há tendência consistente de ${reg.slope >= 0 ? "alta" : "queda"} de ${fmtBRL(Math.abs(reg.slope))} por dia.`}
          </Reading>
        </Card>
      </div>
    </>
  );
}

/* ═══════════════ 10 · Grant ═══════════════ */
const GRANT_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "venc", label: "Vencidos" },
  { id: "15", label: "A vencer ≤15d" },
  { id: "30", label: "A vencer ≤30d" },
  { id: "60", label: "A vencer ≤60d" },
  { id: "ok", label: "Saudáveis >60d" },
] as const;

function grantColor(d: number) {
  if (d < 0) return "#7A1F2B";
  if (d <= 15) return RED;
  if (d <= 30) return "#D9822B";
  if (d <= 60) return "#E0B93C";
  return GREEN;
}

function Grant({ ds, ag }: { ds: CarteiraDataset; ag: Agg }) {
  const [f, setF] = useState<string>("todos");
  const [q, setQ] = useState("");
  const gmvById = new Map(ag.sellers.map((s) => [s.id, s]));

  const rows = useMemo(() => ds.grants.map((g) => {
    const s = gmvById.get(g.sellerId);
    return {
      nick: s?.nick ?? g.custId, uf: s?.uf ?? "ND", regiao: s?.regiao ?? "ND",
      custId: g.custId, expiracao: g.expiracao, dias: g.dias,
      grupo: (ag.curva.get(g.sellerId) ?? "C") as string,
      gmv: s?.gmv ?? 0,
      status: g.dias < 0 ? "Vencido" : g.dias <= 15 ? "Crítico" : g.dias <= 30 ? "Atenção" : g.dias <= 60 ? "Monitorar" : "Saudável",
      url: g.url,
    };
  }), [ds.grants, ag]);

  const count = (id: string) => rows.filter((r) =>
    id === "todos" ? true :
    id === "venc" ? r.dias < 0 :
    id === "15" ? r.dias >= 0 && r.dias <= 15 :
    id === "30" ? r.dias >= 0 && r.dias <= 30 :
    id === "60" ? r.dias >= 0 && r.dias <= 60 : r.dias > 60
  ).length;

  const base = rows.filter((r) =>
    f === "todos" ? true :
    f === "venc" ? r.dias < 0 :
    f === "15" ? r.dias >= 0 && r.dias <= 15 :
    f === "30" ? r.dias >= 0 && r.dias <= 30 :
    f === "60" ? r.dias >= 0 && r.dias <= 60 : r.dias > 60
  );
  const sort = useSort(base, "dias" as any, "asc");
  const filtered = sort.sorted.filter((r) => r.nick.toLowerCase().includes(q.toLowerCase()) || r.custId.includes(q));

  const semGrant = ag.ativos.filter((s) => !ds.grants.some((g) => g.sellerId === s.id));
  const semGrantRegiao = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of semGrant) m.set(s.regiao, (m.get(s.regiao) ?? 0) + s.gmv);
    return Array.from(m.entries()).map(([regiao, gmv]) => ({ regiao, gmv })).sort((a, b) => b.gmv - a.gmv);
  }, [semGrant]);

  const chart = [...rows].sort((a, b) => a.dias - b.dias).slice(0, 40);

  return (
    <>
      <SectionHead n="10" title="Grant — ativação & renovação" note={`Posição em ${fmtDate(ds.refDate)}`} />
      <div className="cart-kpi-cluster">
        <Kpi label="Lojas com grant" value={fmtInt(rows.length)} />
        <Kpi label="Vencidos" value={fmtInt(count("venc"))} />
        <Kpi label="Críticos ≤15d" value={fmtInt(count("15"))} />
        <Kpi label="Atenção ≤30d" value={fmtInt(count("30"))} />
        <Kpi label="Saudáveis >60d" value={fmtInt(count("ok"))} />
        <Kpi label="Sem grant" value={fmtInt(semGrant.length)} hint="lojas ativas a ativar" />
      </div>

      <Card title="Calendário de expiração" subtitle="40 vencimentos mais próximos · linha = corte de 30 dias">
        <div style={{ width: "100%", height: Math.max(320, chart.length * 20) }}>
          <ResponsiveContainer>
            <BarChart data={chart} layout="vertical" margin={{ left: 130, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="nick" tick={{ fontSize: 9 }} width={125} />
              <Tooltip formatter={(v: any) => `${Number(v)} dias`} />
              <ReferenceLine x={30} stroke={NAVY} strokeDasharray="4 4" />
              <ReferenceLine x={0} stroke={RED} />
              <Bar dataKey="dias" name="Dias p/ expirar">
                {chart.map((r, i) => <Cell key={i} fill={grantColor(r.dias)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Tabela de renovação">
        <div className="cart-filters">
          {GRANT_FILTERS.map((btn) => (
            <button key={btn.id} className={`cart-filter ${f === btn.id ? "on" : ""}`} onClick={() => setF(btn.id)}>
              {btn.label} <b>{count(btn.id)}</b>
            </button>
          ))}
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Buscar loja ou cust_id…" />
        <div className="cart-table-wrap">
          <table className="cart-table">
            <thead><tr>
              <Th label="Loja" k="nick" sort={sort} /><Th label="UF" k="uf" sort={sort} /><Th label="Região" k="regiao" sort={sort} />
              <Th label="Cust ID" k="custId" sort={sort} /><Th label="Grupo" k="grupo" sort={sort} />
              <Th label="Expiração" k="expiracao" sort={sort} /><Th label="Dias" k="dias" sort={sort} right />
              <Th label="Status" k="status" sort={sort} /><Th label="GMV" k="gmv" sort={sort} right />
            </tr></thead>
            <tbody>
              {filtered.slice(0, 250).map((r, i) => (
                <tr key={`${r.custId}-${i}`}>
                  <td>{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="cart-link">{r.nick}</a> : r.nick}</td>
                  <td>{r.uf}</td><td>{r.regiao}</td><td className="mono">{r.custId}</td>
                  <td><span className={`cart-badge cart-badge-${r.grupo.toLowerCase()}`}>{r.grupo}</span></td>
                  <td className="mono">{fmtDate(r.expiracao)}</td>
                  <td className="right mono" style={{ color: grantColor(r.dias), fontWeight: 600 }}>{r.dias}</td>
                  <td>{r.status}</td>
                  <td className="right mono">{fmtBRL(r.gmv)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan={8}>{fmtInt(filtered.length)} lojas no filtro ativo</td>
              <td className="right mono">{fmtBRL(filtered.reduce((s, r) => s + r.gmv, 0))}</td>
            </tr></tfoot>
          </table>
        </div>
      </Card>

      <Card title="Sem grant — lojas a ativar" subtitle="GMV sem concessão, por região">
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={semGrantRegiao}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EC" />
              <XAxis dataKey="regiao" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtBRLShort} />
              <Tooltip formatter={(v: any) => brl(v)} />
              <Bar dataKey="gmv" name="GMV sem grant" fill={GOLD} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="cart-table-wrap" style={{ maxHeight: 300 }}>
          <table className="cart-table">
            <thead><tr><th>Loja</th><th>UF</th><th>Região</th><th>Grupo</th><th className="right">GMV</th></tr></thead>
            <tbody>
              {semGrant.slice(0, 200).map((s) => (
                <tr key={s.id}>
                  <td>{s.nick}</td><td>{s.uf}</td><td>{s.regiao}</td>
                  <td><span className={`cart-badge cart-badge-${(ag.curva.get(s.id) ?? "C").toLowerCase()}`}>{ag.curva.get(s.id) ?? "C"}</span></td>
                  <td className="right mono">{fmtBRL(s.gmv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Reading>
          Lojas com GMV relevante e sem concessão vigente são o alvo prioritário de ativação: já vendem sem apoio comercial,
          o incremento tende a ser imediato.
        </Reading>
      </Card>
    </>
  );
}

/* ═══════════════ 11 · Loja a loja ═══════════════ */
function LojaALoja({ ds, ag }: { ds: CarteiraDataset; ag: Agg }) {
  const { set } = useDrill();
  const [q, setQ] = useState("");
  const [uf, setUf] = useState("todas");
  const [curva, setCurva] = useState("todas");
  const [sel, setSel] = useState<string | null>(null);

  const rows = ag.sellers.map((s) => ({
    id: s.id, nick: s.nick, uf: s.uf, gmv: s.gmv,
    share: ag.totalGmv > 0 ? s.gmv / ag.totalGmv : 0,
    tsi: s.tsi, ticket: s.ticket, anuncios: s.anuncios,
    delta: s.delta, deltaPct: s.deltaPct, curva: ag.curva.get(s.id) ?? "C",
  }));
  const sort = useSort(rows, "gmv" as any);
  const filtered = sort.sorted.filter((r) =>
    (uf === "todas" || r.uf === uf) &&
    (curva === "todas" || r.curva === curva) &&
    (r.nick.toLowerCase().includes(q.toLowerCase()))
  );
  const ufs = Array.from(new Set(rows.map((r) => r.uf))).sort();

  const selSeller = sel ? ag.sellers.find((s) => s.id === sel) : null;
  const daily = useMemo(() => {
    if (!sel) return [];
    return ds.daily.filter((d) => d.sellerId === sel)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((d) => ({ label: new Date(`${d.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), gmv: d.gmv }));
  }, [sel, ds.daily]);
  const sSel = describe(daily.map((d) => d.gmv));

  const topCats = useMemo(() => {
    if (!sel) return [];
    const m = new Map<string, number>();
    for (const l of ds.listings.filter((l) => l.sellerId === sel)) m.set(l.categoria, (m.get(l.categoria) ?? 0) + l.itens);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [sel, ds.listings]);

  const topItens = useMemo(() => {
    if (!sel) return [];
    return ds.eligibility.filter((e) => e.sellerId === sel)
      .sort((a, b) => b.pedidos7d - a.pedidos7d).slice(0, 3);
  }, [sel, ds.eligibility]);

  return (
    <>
      <SectionHead n="11" title="Loja a loja" note="Clique no nome da loja para abrir a ficha de diagnóstico" />
      <Card title="Ranking completo da carteira">
        <div className="cart-filters">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar loja…" />
          <select className="cart-select" value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="todas">Todas as UFs</option>
            {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className="cart-select" value={curva} onChange={(e) => setCurva(e.target.value)}>
            <option value="todas">Todas as curvas</option>
            <option value="A">Curva A</option><option value="B">Curva B</option><option value="C">Curva C</option>
          </select>
        </div>
        <div className="cart-table-wrap">
          <table className="cart-table">
            <thead><tr>
              <Th label="Loja" k="nick" sort={sort} /><Th label="UF" k="uf" sort={sort} />
              <Th label="GMV" k="gmv" sort={sort} right /><Th label="Share" k="share" sort={sort} right />
              <Th label="Unid." k="tsi" sort={sort} right /><Th label="Ticket" k="ticket" sort={sort} right />
              <Th label="Anúncios" k="anuncios" sort={sort} right /><Th label="Δ período" k="delta" sort={sort} right />
              <Th label="Curva" k="curva" sort={sort} />
            </tr></thead>
            <tbody>
              {filtered.slice(0, 300).map((r) => (
                <tr key={r.id} className={sel === r.id ? "sel" : ""}>
                  <td><button className="cart-link" onClick={() => setSel(r.id)}>{r.nick}</button></td>
                  <td><button className="cart-link muted" onClick={() => set({ uf: r.uf })} title="Filtrar aba por esta UF">{r.uf}</button></td>
                  <td className="right mono">{fmtBRL(r.gmv)}</td>
                  <td className="right mono">{fmtPct(r.share)}</td>
                  <td className="right mono">{fmtInt(r.tsi)}</td>
                  <td className="right mono">{fmtBRL(r.ticket)}</td>
                  <td className="right mono">{fmtInt(r.anuncios)}</td>
                  <td className="right mono" style={{ color: r.delta >= 0 ? GREEN : RED }}>{fmtBRL(r.delta)}</td>
                  <td><span className={`cart-badge cart-badge-${r.curva.toLowerCase()}`}>{r.curva}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan={2}>{fmtInt(filtered.length)} lojas</td>
              <td className="right mono">{fmtBRL(filtered.reduce((s, r) => s + r.gmv, 0))}</td>
              <td colSpan={2} className="right mono">{fmtInt(filtered.reduce((s, r) => s + r.tsi, 0))}</td>
              <td colSpan={4} />
            </tr></tfoot>
          </table>
        </div>
      </Card>

      {selSeller && (
        <div className="cart-ficha">
          <div className="cart-ficha-head">
            <h3>{selSeller.nick}</h3>
            <span>{selSeller.uf} · {selSeller.regiao} · cust_id {selSeller.custId}</span>
            <button onClick={() => setSel(null)}>fechar</button>
          </div>
          <div className="cart-kpi-cluster" style={{ borderRadius: 0 }}>
            <Kpi label="GMV" value={fmtBRL(selSeller.gmv)} />
            <Kpi label="Unidades" value={fmtInt(selSeller.tsi)} />
            <Kpi label="Ticket" value={fmtBRL(selSeller.ticket)} />
            <Kpi label="Conversão" value={`${(selSeller.conv * 100).toFixed(2)}%`} />
            <Kpi label="Δ período" value={fmtBRL(selSeller.delta)} hint={fmtPct(selSeller.deltaPct)} />
            <Kpi label="Anúncios" value={fmtInt(selSeller.anuncios)} />
          </div>
          <div className="cart-ficha-body">
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <ComposedChart data={daily} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3A5E" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#A9BAD8" }} interval={Math.max(0, Math.floor(daily.length / 12))} />
                  <YAxis tick={{ fontSize: 9, fill: "#A9BAD8" }} tickFormatter={fmtBRLShort} />
                  <Tooltip formatter={(v: any) => brl(v)} />
                  <Line type="monotone" dataKey="gmv" name="GMV diário" stroke={GOLD} strokeWidth={2} dot={false} />
                  <ReferenceLine y={sSel.median} stroke="#fff" strokeDasharray="5 4" label={{ value: "Mediana da loja", fill: "#fff", fontSize: 9, position: "insideTopRight" }} />
                  <ReferenceLine y={sSel.q1} stroke="#A9BAD8" strokeDasharray="2 3" />
                  <ReferenceLine y={sSel.q3} stroke="#A9BAD8" strokeDasharray="2 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="cart-ficha-cols">
              <div>
                <h4>Top 3 categorias</h4>
                {topCats.length ? topCats.map(([c, n]) => <p key={c}>{c} <b>{fmtInt(n)} anúncios</b></p>) : <p>Sem dados de sortimento.</p>}
              </div>
              <div>
                <h4>Top 3 produtos (pedidos 7D)</h4>
                {topItens.length ? topItens.map((e) => <p key={e.itemId}>{e.itemName.slice(0, 48)} <b>{fmtInt(e.pedidos7d)}</b></p>) : <p>Sem dados de itens.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════ helpers ═══════════════ */
function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(`${d}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("pt-BR");
}
function labelMes(d?: string) {
  if (!d) return "—";
  const dt = new Date(`${d}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

const TABS = [
  { id: "upload", label: "Upload de dados" },
  { id: "panorama", label: "Panorama" },
  { id: "ritmo", label: "Ritmo diário" },
  { id: "curva", label: "Curva A por estado" },
  { id: "categorias", label: "Categorias" },
  { id: "ticket", label: "Ticket por UF" },
  { id: "tracionadores", label: "Tracionadores" },
  { id: "trafego", label: "Tráfego & conversão" },
  { id: "pads", label: "PADS" },
  { id: "stats", label: "Análise estatística" },
  { id: "grant", label: "Grant / Renovação" },
  { id: "lojas", label: "Loja a loja" },
  { id: "qualidade", label: "Qualidade dos dados" },
];

/* ═══════════════ Painel reutilizável ═══════════════ */
interface BoardProps {
  custIds?: string[];
  title?: string;
  subtitle?: string;
  embedded?: boolean;
  onBack?: () => void;
}

export function CarteiraBoard({ custIds, title, subtitle, embedded = false, onBack }: BoardProps) {
  const { data, loading, error, hasData, refresh } = useCarteiraData(custIds);
  const [tab, setTab] = useState("upload");
  const scopeKey = custIds?.length ? custIds.slice().sort().join(",") : "all";
  const up = useCarteiraUpload(scopeKey, data.sellers, data);
  const source = up.built?.dataset ?? data;
  const [drill, setDrill] = useState<Drill>(EMPTY_DRILL);
  const drillCtx = useMemo<DrillCtx>(() => ({
    drill,
    set: (p) => setDrill((d) => ({ ...d, ...p })),
    clear: (k) => setDrill((d) => (k ? { ...d, [k]: null } : EMPTY_DRILL)),
  }), [drill]);
  const view = useMemo(() => applyDrill(source, drill), [source, drill]);
  const ag = useAgg(view);
  const ex = up.active;
  const badge = ex
    ? `posição em ${fmtDate(ex.extractedAt?.slice(0, 10) ?? ex.periodEnd)}, período ${fmtDate(ex.periodStart)}–${fmtDate(ex.periodEnd)}`
    : `posição em ${fmtDate(data.refDate)}`;

  return (
   <DrillContext.Provider value={drillCtx}>
    <div className={`cart-page ${embedded ? "cart-embedded" : ""}`}>
      <header className="cart-header">
        <div className="cart-header-inner">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="cart-back">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          )}
          <div>
            <h1>{title ?? "Gestão de Carteira · Carteira"}</h1>
            <p>
              {subtitle ?? "Painel analítico da rede"} · mediana e faixa interquartil como referência · {badge}
              {ex && <span className="cart-refbadge">extração ativa{up.storeFilter ? ` · ${up.storeFilter}` : ""}</span>}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="ml-auto gap-2"
            title="Limpa o cache e recarrega as lojas da carteira"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <div className="cart-tabs-sticky">
        <nav className="cart-tabnav">
          {TABS.map((t) => (
            <button key={t.id} className={`cart-tabbtn ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="cart-main">
        {tab === "upload" && !loading && <UploadCarteiraPanel up={up} master={data.sellers} />}
        {tab === "qualidade" && <QualidadeFeeds />}
        {loading && <div className="cart-loading"><Loader2 className="w-5 h-5 animate-spin" /> Carregando dados da carteira…</div>}
        {error && !loading && <div className="cart-error">Erro ao carregar: {error}</div>}
        {tab !== "upload" && tab !== "qualidade" && !loading && !error && !hasData && (
          <div className="cart-empty">
            <h2>Nenhum dado disponível para esta carteira.</h2>
            <p>Suba as bases de performance em <code>Admin → Upload</code> ou verifique as lojas liberadas no seu acesso.</p>
          </div>
        )}
        {tab !== "upload" && tab !== "qualidade" && !loading && hasData && (
          <>
            <DrillChips ds={data} />
            {tab === "panorama" && <Panorama ds={view} ag={ag} />}
            {tab === "ritmo" && <Ritmo ds={view} ag={ag} />}
            {tab === "curva" && <CurvaA ag={ag} />}
            {tab === "categorias" && <Categorias ds={view} ag={ag} />}
            {tab === "ticket" && <TicketUF ag={ag} />}
            {tab === "tracionadores" && <Tracionadores ag={ag} />}
            {tab === "trafego" && <Trafego ag={ag} />}
            {tab === "pads" && <Pads ds={view} ag={ag} />}
            {tab === "stats" && <Estatistica ag={ag} />}
            {tab === "grant" && <Grant ds={view} ag={ag} />}
            {tab === "lojas" && <LojaALoja ds={view} ag={ag} />}
          </>
        )}
      </main>

      <footer className="cart-footer">
        <p>
          Valores de GMV/TSI são forecast e sujeitos a consolidação. Tendência central = mediana; variação = faixa interquartil (Q1–Q3).
          Curva ABC por GMV (A até 80%, B 80–95%, C 95–100%). Conversão = unidades ÷ visitas.
          Co-financiamento = parte do investimento bancada pelo Mercado Livre. Códigos internos de campanha da Central de Promoções
          são confidenciais e não são exibidos nesta interface.
        </p>
      </footer>
    </div>
   </DrillContext.Provider>
  );
}

/* ═══════════════ Página ═══════════════ */
export default function Carteira() {
  const navigate = useNavigate();
  return <CarteiraBoard onBack={() => navigate(-1)} />;
}
