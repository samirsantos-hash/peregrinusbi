import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCarteiraData } from "@/hooks/carteira/useCarteiraData";
import { describe, abc, linreg, movingAverage, fmtBRL, fmtInt, fmtPct, median } from "@/lib/carteira/stats";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ScatterChart, Scatter, ReferenceLine, ComposedChart, Area,
} from "recharts";
import "./carteira.css";

// ── UI helpers ────────────────────────────────────────
const CardBase = ({ title, subtitle, children, className = "" }: any) => (
  <div className={`cart-card ${className}`}>
    {title && <div className="cart-card-head"><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>}
    <div className="cart-card-body">{children}</div>
  </div>
);
const KpiTile = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="cart-kpi">
    <div className="cart-kpi-label">{label}</div>
    <div className="cart-kpi-value">{value}</div>
    {hint && <div className="cart-kpi-hint">{hint}</div>}
  </div>
);
const StatLine = ({ label, values }: { label: string; values: string[] }) => (
  <div className="cart-stat-line">
    <span className="cart-stat-lbl">{label}</span>
    {values.map((v, i) => <span key={i} className="cart-stat-val">{v}</span>)}
  </div>
);
const Business = ({ children }: any) => <div className="cart-business">{children}</div>;
const StatReading = ({ stats, unit = "R$" }: { stats: ReturnType<typeof describe>; unit?: string }) => (
  <div className="cart-stat-reading">
    <span>N = {fmtInt(stats.n)}</span>
    <span>μ = {unit === "R$" ? fmtBRL(stats.mean) : fmtInt(stats.mean)}</span>
    <span>mediana = {unit === "R$" ? fmtBRL(stats.median) : fmtInt(stats.median)}</span>
    <span>σ = {unit === "R$" ? fmtBRL(stats.sd) : fmtInt(stats.sd)}</span>
    <span>CV = {(stats.cv * 100).toFixed(1)}%</span>
    <span>skew = {stats.skewness.toFixed(2)}</span>
  </div>
);

// ── Aggregation helpers ────────────────────────────────
function groupSum<T>(rows: T[], key: (r: T) => string, val: (r: T) => number): { key: string; value: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + (val(r) ?? 0));
  }
  return Array.from(m.entries()).map(([key, value]) => ({ key, value }));
}

// ══════════════════════════════════════════════════════
// TAB 1 · Panorama
// ══════════════════════════════════════════════════════
function TabPanorama({ ds }: any) {
  const cppD: any[] = ds.cppDiario;
  const cppM: any[] = ds.cppMensal;
  const bv: any[] = ds.baseVendedores;

  const gmvPorSeller = useMemo(() => groupSum(cppM, (r) => String(r.cust_id), (r) => Number(r.tgmv_lc ?? 0)), [cppM]);
  const stats = useMemo(() => describe(gmvPorSeller.map((r) => r.value)), [gmvPorSeller]);
  const totalGmv = gmvPorSeller.reduce((s, r) => s + r.value, 0);
  const totalTsi = cppM.reduce((s, r) => s + Number(r.tsi ?? 0), 0);
  const totalVisitas = cppM.reduce((s, r) => s + Number(r.visitas ?? 0), 0);
  const totalItens = ds.liveListings.reduce((s: number, r: any) => s + Number(r.itens ?? 0), 0);

  return (
    <div className="cart-grid">
      <div className="cart-kpi-cluster">
        <KpiTile label="Sellers ativos" value={fmtInt(gmvPorSeller.length)} />
        <KpiTile label="GMV total" value={fmtBRL(totalGmv)} />
        <KpiTile label="TSI (pedidos)" value={fmtInt(totalTsi)} />
        <KpiTile label="Visitas" value={fmtInt(totalVisitas)} />
        <KpiTile label="Anúncios ativos" value={fmtInt(totalItens)} />
        <KpiTile label="Cadastro (Base Vendedores)" value={fmtInt(bv.length)} />
      </div>

      <CardBase title="Distribuição de GMV por seller" subtitle="Mediana e IQR são as referências">
        <StatReading stats={stats} />
        <Business>
          {stats.skewness > 1
            ? `Distribuição bastante assimétrica (skew ${stats.skewness.toFixed(2)}): poucos sellers concentram grande parte do GMV; olhar mediana (${fmtBRL(stats.median)}) e não média (${fmtBRL(stats.mean)}) para representar o "seller típico".`
            : `Distribuição relativamente simétrica; mediana ${fmtBRL(stats.median)} representa bem o seller típico.`}
        </Business>
      </CardBase>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TAB 2 · Ritmo Diário
// ══════════════════════════════════════════════════════
function TabRitmoDiario({ ds }: any) {
  const daily = useMemo(() => {
    const m = new Map<string, { gmv: number; fgmv: number; tsi: number }>();
    for (const r of ds.cppDiario) {
      if (!r.data) continue;
      const cur = m.get(r.data) ?? { gmv: 0, fgmv: 0, tsi: 0 };
      cur.gmv += Number(r.gmv ?? 0);
      cur.fgmv += Number(r.f_gmv ?? 0);
      cur.tsi += Number(r.tsi ?? 0);
      m.set(r.data, cur);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([data, v]) => ({ data, ...v }));
  }, [ds.cppDiario]);

  const mm3 = movingAverage(daily.map((d) => d.gmv), 7);
  const chartData = daily.map((d, i) => ({ ...d, mm7: mm3[i] }));
  const med = median(daily.map((d) => d.gmv));
  const stats = describe(daily.map((d) => d.gmv));

  return (
    <div className="cart-grid">
      <CardBase title="GMV realizado × forecast (dia a dia)" subtitle="Linha dourada tracejada = mediana; linha contínua = MM7">
        <StatReading stats={stats} />
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="data" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v)} />
              <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
              <Legend />
              <Bar dataKey="gmv" name="GMV realizado" fill="#16233F" />
              <Line type="monotone" dataKey="fgmv" name="Forecast" stroke="#5B7396" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="mm7" name="Média móvel 7d" stroke="#C9A227" dot={false} strokeWidth={2} />
              <ReferenceLine y={med} stroke="#C9A227" strokeDasharray="4 4" label={{ value: `Mediana ${fmtBRL(med)}`, position: "insideTopRight", fill: "#C9A227", fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <Business>
          {stats.cv > 0.5 ? "Ritmo instável: alta variabilidade dia a dia (CV > 50%) — investigar picos/vales." : "Ritmo estável no período."}
        </Business>
      </CardBase>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TAB 3 · Curva A por estado (ABC 80/95/100 de itens × UF)
// ══════════════════════════════════════════════════════
function TabCurvaA({ ds }: any) {
  const porUf = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of ds.liveListings) {
      const uf = r.cus_state || "N/D";
      const list = m.get(uf) ?? [];
      list.push(r);
      m.set(uf, list);
    }
    return Array.from(m.entries()).map(([uf, items]) => {
      const ranked = abc(items, (it: any) => Number(it.itens ?? 0));
      const a = ranked.filter((x) => x.klass === "A").length;
      const b = ranked.filter((x) => x.klass === "B").length;
      const c = ranked.filter((x) => x.klass === "C").length;
      return { uf, total: items.length, A: a, B: b, C: c };
    }).sort((x, y) => y.total - x.total);
  }, [ds.liveListings]);

  return (
    <CardBase title="Curva ABC de anúncios por UF" subtitle="A = 80% do volume; B = próximos 15%; C = cauda longa">
      <div style={{ width: "100%", height: Math.max(240, porUf.length * 22) }}>
        <ResponsiveContainer>
          <BarChart data={porUf} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="uf" tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="A" stackId="k" fill="#C9A227" name="A (80%)" />
            <Bar dataKey="B" stackId="k" fill="#5B7396" name="B (15%)" />
            <Bar dataKey="C" stackId="k" fill="#16233F" name="C (5%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Business>Priorize esforço comercial na cauda A/B de cada UF. C é cauda longa, geralmente sem ROI incremental.</Business>
    </CardBase>
  );
}

// ══════════════════════════════════════════════════════
// TAB 4 · Categorias por região
// ══════════════════════════════════════════════════════
function TabCategorias({ ds }: any) {
  const catUf = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ds.liveListings) {
      const k = `${r.cus_state || "N/D"}|${r.dom_domain_agg1 || r.vertical || "N/D"}`;
      m.set(k, (m.get(k) ?? 0) + Number(r.itens ?? 0));
    }
    return Array.from(m.entries()).map(([k, v]) => {
      const [uf, cat] = k.split("|");
      return { uf, cat, itens: v };
    }).sort((a, b) => b.itens - a.itens).slice(0, 40);
  }, [ds.liveListings]);
  return (
    <CardBase title="Top 40 pares UF × Categoria" subtitle="Onde está o volume de anúncios">
      <div className="cart-table-wrap">
        <table className="cart-table">
          <thead><tr><th>UF</th><th>Categoria</th><th style={{ textAlign: "right" }}>Anúncios</th></tr></thead>
          <tbody>
            {catUf.map((r, i) => (
              <tr key={i}><td>{r.uf}</td><td>{r.cat}</td><td style={{ textAlign: "right" }} className="mono">{fmtInt(r.itens)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardBase>
  );
}

// ══════════════════════════════════════════════════════
// TAB 5 · Ticket por UF (GMV ÷ TSI, agregado por seller)
// ══════════════════════════════════════════════════════
function TabTicketUF({ ds }: any) {
  const rows = useMemo(() => {
    const m = new Map<string, { gmv: number; tsi: number }>();
    for (const r of ds.cppMensal) {
      const uf = r.cus_state || "N/D";
      const cur = m.get(uf) ?? { gmv: 0, tsi: 0 };
      cur.gmv += Number(r.tgmv_lc ?? 0);
      cur.tsi += Number(r.tsi ?? 0);
      m.set(uf, cur);
    }
    return Array.from(m.entries()).map(([uf, v]) => ({ uf, ticket: v.tsi > 0 ? v.gmv / v.tsi : 0, gmv: v.gmv, tsi: v.tsi }))
      .sort((a, b) => b.ticket - a.ticket);
  }, [ds.cppMensal]);
  const stats = describe(rows.map((r) => r.ticket));
  return (
    <CardBase title="Ticket médio por UF" subtitle="GMV ÷ TSI (loja), nunca por item">
      <StatReading stats={stats} />
      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="uf" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v)} />
            <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
            <Bar dataKey="ticket" fill="#16233F" name="Ticket médio" />
            <ReferenceLine y={stats.median} stroke="#C9A227" strokeDasharray="4 4" label={{ value: `Mediana ${fmtBRL(stats.median)}`, position: "insideTopRight", fill: "#C9A227", fontSize: 10 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardBase>
  );
}

// ══════════════════════════════════════════════════════
// TAB 6 · Tracionadores × Detratores
// ══════════════════════════════════════════════════════
function TabTracionadores({ ds }: any) {
  const byMonth = useMemo(() => {
    const arr = [...ds.cppMensal].filter((r) => r.tim_month_id);
    const months = Array.from(new Set(arr.map((r) => r.tim_month_id))).sort();
    if (months.length < 2) return [];
    const last = months[months.length - 1];
    const prev = months[months.length - 2];
    const map = new Map<string, { curr: number; prev: number; nick: string }>();
    for (const r of arr) {
      const cur = map.get(String(r.cust_id)) ?? { curr: 0, prev: 0, nick: r.cus_nickname ?? String(r.cust_id) };
      if (r.tim_month_id === last) cur.curr += Number(r.tgmv_lc ?? 0);
      else if (r.tim_month_id === prev) cur.prev += Number(r.tgmv_lc ?? 0);
      map.set(String(r.cust_id), cur);
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v, delta: v.curr - v.prev }))
      .filter((r) => r.prev > 0 || r.curr > 0);
  }, [ds.cppMensal]);

  const top = [...byMonth].sort((a, b) => b.delta - a.delta).slice(0, 15);
  const bot = [...byMonth].sort((a, b) => a.delta - b.delta).slice(0, 15);

  return (
    <div className="cart-grid-2">
      <CardBase title="Top 15 tracionadores (Δ GMV vs mês anterior)">
        <div className="cart-table-wrap"><table className="cart-table">
          <thead><tr><th>Seller</th><th style={{ textAlign: "right" }}>Δ GMV</th></tr></thead>
          <tbody>{top.map((r) => <tr key={r.id}><td>{r.nick}</td><td style={{ textAlign: "right", color: "#2E7D5B" }} className="mono">{fmtBRL(r.delta)}</td></tr>)}</tbody>
        </table></div>
      </CardBase>
      <CardBase title="Top 15 detratores">
        <div className="cart-table-wrap"><table className="cart-table">
          <thead><tr><th>Seller</th><th style={{ textAlign: "right" }}>Δ GMV</th></tr></thead>
          <tbody>{bot.map((r) => <tr key={r.id}><td>{r.nick}</td><td style={{ textAlign: "right", color: "#B23A48" }} className="mono">{fmtBRL(r.delta)}</td></tr>)}</tbody>
        </table></div>
      </CardBase>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TAB 7 · Tráfego × Conversão
// ══════════════════════════════════════════════════════
function TabTrafego({ ds }: any) {
  const rows = useMemo(() => {
    return ds.cppMensal
      .filter((r: any) => r.visitas > 0)
      .map((r: any) => ({
        nick: r.cus_nickname ?? String(r.cust_id),
        visitas: Number(r.visitas ?? 0),
        conv: Number(r.tsi ?? 0) / Math.max(1, Number(r.visitas ?? 0)),
        gmv: Number(r.tgmv_lc ?? 0),
      }));
  }, [ds.cppMensal]);
  const stats = describe(rows.map((r: any) => r.conv));
  return (
    <CardBase title="Tráfego × Conversão (visitas × TSI/Visitas)" subtitle="Referência de mercado: <2% baixa · ~3% média · >3,5% ótima">
      <StatReading stats={stats} unit="unid" />
      <div style={{ width: "100%", height: 380 }}>
        <ResponsiveContainer>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" dataKey="visitas" name="Visitas" tick={{ fontSize: 10 }} />
            <YAxis type="number" dataKey="conv" name="Conversão" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
            <Tooltip formatter={(v: any, k: any) => k === "conv" ? fmtPct(Number(v)) : fmtInt(Number(v))} />
            <ReferenceLine y={0.02} stroke="#B23A48" strokeDasharray="3 3" label={{ value: "2%", fill: "#B23A48", fontSize: 10 }} />
            <ReferenceLine y={0.035} stroke="#2E7D5B" strokeDasharray="3 3" label={{ value: "3,5%", fill: "#2E7D5B", fontSize: 10 }} />
            <Scatter data={rows} fill="#16233F" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </CardBase>
  );
}

// ══════════════════════════════════════════════════════
// TAB 8 · PADS
// ══════════════════════════════════════════════════════
function TabPads({ ds }: any) {
  const rows = useMemo(() => ds.cppMensal.map((r: any) => ({
    nick: r.cus_nickname ?? String(r.cust_id),
    invPads: Number(r.inv_pads ?? 0),
    tgmvPads: Number(r.tgmv_lc_pads ?? 0),
    tsiPads: Number(r.tsi_pads ?? 0),
    sellerInvest: Number(r.sellers_invest_pads ?? 0),
  })).filter((r: any) => r.invPads > 0 || r.tgmvPads > 0), [ds.cppMensal]);

  const totalInv = rows.reduce((s: number, r: any) => s + r.invPads, 0);
  const totalGmv = rows.reduce((s: number, r: any) => s + r.tgmvPads, 0);
  const totalTsi = rows.reduce((s: number, r: any) => s + r.tsiPads, 0);
  const acos = totalGmv > 0 ? totalInv / totalGmv : 0;

  return (
    <div className="cart-grid">
      <div className="cart-kpi-cluster">
        <KpiTile label="Investimento PADS" value={fmtBRL(totalInv)} />
        <KpiTile label="GMV atribuído a PADS" value={fmtBRL(totalGmv)} />
        <KpiTile label="TSI PADS" value={fmtInt(totalTsi)} />
        <KpiTile label="ACoS agregado" value={fmtPct(acos)} hint="Investimento ÷ GMV PADS" />
      </div>
      <CardBase title="PADS por seller" subtitle="Nomes de campanhas não são expostos por confidencialidade">
        <div className="cart-table-wrap"><table className="cart-table">
          <thead><tr><th>Seller</th><th style={{ textAlign: "right" }}>Investimento</th><th style={{ textAlign: "right" }}>GMV PADS</th><th style={{ textAlign: "right" }}>TSI PADS</th><th style={{ textAlign: "right" }}>ACoS</th></tr></thead>
          <tbody>{rows.slice(0, 60).map((r: any, i: number) => (
            <tr key={i}><td>{r.nick}</td>
              <td style={{ textAlign: "right" }} className="mono">{fmtBRL(r.invPads)}</td>
              <td style={{ textAlign: "right" }} className="mono">{fmtBRL(r.tgmvPads)}</td>
              <td style={{ textAlign: "right" }} className="mono">{fmtInt(r.tsiPads)}</td>
              <td style={{ textAlign: "right" }} className="mono">{r.tgmvPads > 0 ? fmtPct(r.invPads / r.tgmvPads) : "—"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </CardBase>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TAB 9 · Análise estatística
// ══════════════════════════════════════════════════════
function TabStats({ ds }: any) {
  const gmv = ds.cppMensal.map((r: any) => Number(r.tgmv_lc ?? 0));
  const tsi = ds.cppMensal.map((r: any) => Number(r.tsi ?? 0));
  const visitas = ds.cppMensal.map((r: any) => Number(r.visitas ?? 0));
  const bpc = ds.cppMensal.map((r: any) => Number(r.bpc ?? 0)).filter((v: number) => v > 0);
  const s = { gmv: describe(gmv), tsi: describe(tsi), visitas: describe(visitas), bpc: describe(bpc) };

  const reg = linreg(ds.cppMensal.map((r: any) => Number(r.visitas ?? 0)), ds.cppMensal.map((r: any) => Number(r.tgmv_lc ?? 0)));

  return (
    <div className="cart-grid">
      <CardBase title="Estatística descritiva (mensal por seller)">
        <StatLine label="GMV" values={["μ " + fmtBRL(s.gmv.mean), "mediana " + fmtBRL(s.gmv.median), "σ " + fmtBRL(s.gmv.sd), "CV " + (s.gmv.cv * 100).toFixed(1) + "%", "skew " + s.gmv.skewness.toFixed(2)]} />
        <StatLine label="TSI" values={["μ " + fmtInt(s.tsi.mean), "mediana " + fmtInt(s.tsi.median), "σ " + fmtInt(s.tsi.sd), "CV " + (s.tsi.cv * 100).toFixed(1) + "%"]} />
        <StatLine label="Visitas" values={["μ " + fmtInt(s.visitas.mean), "mediana " + fmtInt(s.visitas.median), "σ " + fmtInt(s.visitas.sd)]} />
        <StatLine label="BPC" values={["μ " + s.bpc.mean.toFixed(3), "mediana " + s.bpc.median.toFixed(3), "σ " + s.bpc.sd.toFixed(3)]} />
      </CardBase>
      <CardBase title="Regressão Visitas → GMV" subtitle="Elasticidade linear no portfólio">
        <StatLine label="y = a + b·x" values={[`a = ${fmtBRL(reg.intercept)}`, `b = ${fmtBRL(reg.slope)}`, `R² = ${reg.r2.toFixed(3)}`]} />
        <Business>{reg.r2 > 0.5 ? "Forte associação: cada visita adicional agrega ~" + fmtBRL(reg.slope) + " de GMV, em média." : "Associação fraca: visitas não explicam bem o GMV — outros fatores (mix, ticket, conversão) dominam."}</Business>
      </CardBase>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TAB 10 · Grant / Renovação
// ══════════════════════════════════════════════════════
function TabGrant({ ds }: any) {
  const today = new Date();
  const rows = useMemo(() => ds.baseVendedores.map((r: any) => {
    const d = r.fecha_out ? new Date(r.fecha_out) : null;
    const dias = d ? Math.round((d.getTime() - today.getTime()) / 86400000) : null;
    return {
      nick: r.cus_nickname ?? String(r.cust_id),
      nivel: r.nivel_solucion ?? "—",
      inicio: r.fecha_in ?? "—",
      fim: r.fecha_out ?? "—",
      dias,
      status: dias == null ? "s/data" : dias < 0 ? "expirado" : dias < 30 ? "crítico" : dias < 90 ? "atenção" : "ok",
    };
  }).sort((a: any, b: any) => (a.dias ?? 9999) - (b.dias ?? 9999)), [ds.baseVendedores]);

  return (
    <CardBase title="Grants por seller" subtitle="Dias até expiração e nível de solução">
      <div className="cart-table-wrap"><table className="cart-table">
        <thead><tr><th>Seller</th><th>Nível</th><th>Início</th><th>Fim</th><th style={{ textAlign: "right" }}>Dias</th><th>Status</th></tr></thead>
        <tbody>{rows.slice(0, 200).map((r: any, i: number) => (
          <tr key={i}><td>{r.nick}</td><td>{r.nivel}</td><td className="mono">{r.inicio}</td><td className="mono">{r.fim}</td>
            <td style={{ textAlign: "right" }} className="mono">{r.dias ?? "—"}</td>
            <td><span className={`cart-badge cart-badge-${r.status}`}>{r.status}</span></td>
          </tr>
        ))}</tbody>
      </table></div>
    </CardBase>
  );
}

// ══════════════════════════════════════════════════════
// TAB 11 · Loja a loja
// ══════════════════════════════════════════════════════
function TabLojas({ ds }: any) {
  const [sel, setSel] = useState<string | null>(null);
  const rows = useMemo(() => {
    const m = new Map<string, { nick: string; gmv: number; tsi: number; visitas: number; uf: string }>();
    for (const r of ds.cppMensal) {
      const id = String(r.cust_id);
      const cur = m.get(id) ?? { nick: r.cus_nickname ?? id, gmv: 0, tsi: 0, visitas: 0, uf: r.cus_state ?? "—" };
      cur.gmv += Number(r.tgmv_lc ?? 0);
      cur.tsi += Number(r.tsi ?? 0);
      cur.visitas += Number(r.visitas ?? 0);
      m.set(id, cur);
    }
    return Array.from(m.entries()).map(([id, v]) => ({ id, ...v, ticket: v.tsi > 0 ? v.gmv / v.tsi : 0 })).sort((a, b) => b.gmv - a.gmv);
  }, [ds.cppMensal]);

  const selRow = sel ? rows.find((r) => r.id === sel) : null;
  const daily = useMemo(() => {
    if (!sel) return [];
    return ds.cppDiario.filter((d: any) => String(d.cust_id) === sel)
      .map((d: any) => ({ data: d.data, gmv: Number(d.gmv ?? 0) }))
      .sort((a: any, b: any) => a.data.localeCompare(b.data));
  }, [sel, ds.cppDiario]);
  const medSel = median(daily.map((d: any) => d.gmv));

  return (
    <div className="cart-grid-2">
      <CardBase title="Lojas do portfólio" subtitle="Clique para abrir a ficha">
        <div className="cart-table-wrap" style={{ maxHeight: 480 }}>
          <table className="cart-table">
            <thead><tr><th>Loja</th><th>UF</th><th style={{ textAlign: "right" }}>GMV</th><th style={{ textAlign: "right" }}>TSI</th><th style={{ textAlign: "right" }}>Ticket</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} onClick={() => setSel(r.id)} style={{ cursor: "pointer", background: sel === r.id ? "#16233F0d" : undefined }}>
                <td>{r.nick}</td><td>{r.uf}</td>
                <td style={{ textAlign: "right" }} className="mono">{fmtBRL(r.gmv)}</td>
                <td style={{ textAlign: "right" }} className="mono">{fmtInt(r.tsi)}</td>
                <td style={{ textAlign: "right" }} className="mono">{fmtBRL(r.ticket)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </CardBase>
      <CardBase title={selRow ? `Ficha · ${selRow.nick}` : "Selecione uma loja"}>
        {!selRow && <p style={{ color: "#5B7396" }}>A ficha aparecerá aqui com KPIs, série diária, top categorias e top produtos.</p>}
        {selRow && (
          <>
            <div className="cart-kpi-cluster">
              <KpiTile label="GMV" value={fmtBRL(selRow.gmv)} />
              <KpiTile label="TSI" value={fmtInt(selRow.tsi)} />
              <KpiTile label="Visitas" value={fmtInt(selRow.visitas)} />
              <KpiTile label="Ticket" value={fmtBRL(selRow.ticket)} />
            </div>
            <div style={{ width: "100%", height: 240, marginTop: 8 }}>
              <ResponsiveContainer>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtBRL(v)} />
                  <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                  <Line type="monotone" dataKey="gmv" stroke="#16233F" dot={false} strokeWidth={2} />
                  <ReferenceLine y={medSel} stroke="#C9A227" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardBase>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Página
// ══════════════════════════════════════════════════════
export default function Carteira() {
  const navigate = useNavigate();
  const { data, loading, error } = useCarteiraData();

  const hasData = data.cppMensal.length + data.cppDiario.length + data.liveListings.length + data.baseVendedores.length > 0;

  return (
    <div className="cart-page">
      <div className="cart-header">
        <div className="cart-header-inner">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="cart-back"><ArrowLeft className="w-4 h-4" /> Voltar</Button>
          <div>
            <h1>Carteira</h1>
            <p>Painel analítico da carteira de sellers · leitura estatística, mediana e IQR como referência</p>
          </div>
        </div>
      </div>

      <main className="cart-main">
        {loading && (
          <div className="cart-loading"><Loader2 className="w-5 h-5 animate-spin" /> Carregando dataset da carteira…</div>
        )}
        {error && !loading && (
          <div className="cart-error">Erro ao carregar: {error}</div>
        )}
        {!loading && !hasData && (
          <div className="cart-empty">
            <h2>Ainda não há dados de Carteira carregados.</h2>
            <p>Suba os CSVs SFTP (CPP_DIARIZADO, CPP_MENSAL, CDP_DIARIZADO, CDP_MENSAL, CPP_LIVELISTINGS, ELEGIBILIDADE, CPP_BASE_VENDEDORES) via <code>Admin → Upload → Carteira</code>.</p>
          </div>
        )}
        {!loading && hasData && (
          <Tabs defaultValue="panorama">
            <div className="cart-tabs-sticky">
              <TabsList className="cart-tabs">
                <TabsTrigger value="panorama">Panorama</TabsTrigger>
                <TabsTrigger value="ritmo">Ritmo diário</TabsTrigger>
                <TabsTrigger value="curva">Curva A · UF</TabsTrigger>
                <TabsTrigger value="categorias">Categorias · Região</TabsTrigger>
                <TabsTrigger value="ticket">Ticket · UF</TabsTrigger>
                <TabsTrigger value="tracionadores">Tracionadores</TabsTrigger>
                <TabsTrigger value="trafego">Tráfego · Conversão</TabsTrigger>
                <TabsTrigger value="pads">PADS</TabsTrigger>
                <TabsTrigger value="stats">Análise estatística</TabsTrigger>
                <TabsTrigger value="grant">Grant · Renovação</TabsTrigger>
                <TabsTrigger value="lojas">Loja a loja</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="panorama"><TabPanorama ds={data} /></TabsContent>
            <TabsContent value="ritmo"><TabRitmoDiario ds={data} /></TabsContent>
            <TabsContent value="curva"><TabCurvaA ds={data} /></TabsContent>
            <TabsContent value="categorias"><TabCategorias ds={data} /></TabsContent>
            <TabsContent value="ticket"><TabTicketUF ds={data} /></TabsContent>
            <TabsContent value="tracionadores"><TabTracionadores ds={data} /></TabsContent>
            <TabsContent value="trafego"><TabTrafego ds={data} /></TabsContent>
            <TabsContent value="pads"><TabPads ds={data} /></TabsContent>
            <TabsContent value="stats"><TabStats ds={data} /></TabsContent>
            <TabsContent value="grant"><TabGrant ds={data} /></TabsContent>
            <TabsContent value="lojas"><TabLojas ds={data} /></TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="cart-footer">
        <p>
          Nota metodológica · <b>Tendência central</b>: mediana (dourada tracejada) · <b>Variação</b>: IQR Q1–Q3 ·{" "}
          <b>Curva ABC</b>: 80/95/100 · <b>Conversão de referência</b>: {"<2%"} baixa · ~3% média · {">3,5%"} ótima ·{" "}
          <b>Co-financiamento</b>: nomes de campanha não são expostos por confidencialidade · Forecast usa o campo{" "}
          <code>F_TGMV_LC</code> do plano CPP.
        </p>
      </footer>
    </div>
  );
}