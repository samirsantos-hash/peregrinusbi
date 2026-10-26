import { useMemo } from "react";
import { BadgeDollarSign, ShoppingBag, MousePointerClick, Receipt } from "lucide-react";
import { brlCurto, num, pct } from "@/lib/format";

type K = { date?: string; gmv?: number; tgmv?: number; tsi?: number; visits?: number };

const soma = (ks: K[], f: (k: K) => number) => ks.reduce((a, k) => a + (Number(f(k)) || 0), 0);
const totais = (ks: K[]) => {
  const fat = soma(ks, (k) => k.tgmv || k.gmv || 0);
  const vendas = soma(ks, (k) => k.tsi || 0);
  const visitas = soma(ks, (k) => k.visits || 0);
  return { fat, vendas, conv: visitas > 0 ? (vendas / visitas) * 100 : null, ticket: vendas > 0 ? fat / vendas : null };
};

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/** Topo da página inicial (Glass Verde): saudação e 4 indicadores com comparação ao período anterior de mesma duração. */
export default function HomeResumo({ nome, loja, todos, de, ate }: { nome?: string; loja?: string | null; todos: K[]; de?: string; ate?: string }) {
  const d = useMemo(() => {
    if (!de || !ate) return null;
    const ini = new Date(de + "T00:00:00"), fim = new Date(ate + "T00:00:00");
    const dias = Math.round((fim.getTime() - ini.getTime()) / 864e5) + 1;
    const pIni = new Date(ini.getTime() - dias * 864e5).toISOString().slice(0, 10);
    const atual = todos.filter((k) => k.date && k.date >= de && k.date <= ate);
    const ant = todos.filter((k) => k.date && k.date >= pIni && k.date < de);
    return { a: totais(atual), p: ant.length ? totais(ant) : null };
  }, [todos, de, ate]);

  const br = (s?: string) => (s ? s.split("-").reverse().join("/") : "");
  const varia = (a: number | null, p: number | null | undefined, pp = false) => {
    if (a == null || p == null || (!pp && p === 0)) return null;
    return pp ? a - p : ((a - p) / p) * 100;
  };
  const itens = d ? [
    { rot: "Faturamento", ic: BadgeDollarSign, val: brlCurto(d.a.fat), un: "", v: varia(d.a.fat, d.p?.fat), cor: "text-[#0B7A4D]" },
    { rot: "Vendas", ic: ShoppingBag, val: num(d.a.vendas), un: "unidades", v: varia(d.a.vendas, d.p?.vendas), cor: "" },
    { rot: "Conversão", ic: MousePointerClick, val: d.a.conv == null ? "Sem dado" : pct(d.a.conv, 2), un: "das visitas", v: varia(d.a.conv, d.p?.conv, true), pp: true, cor: "" },
    { rot: "Ticket médio", ic: Receipt, val: d.a.ticket == null ? "Sem dado" : brlCurto(d.a.ticket), un: "por unidade", v: varia(d.a.ticket, d.p?.ticket), cor: "" },
  ] : [];

  return (
    <section className="glass-card p-5 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          {saudacao()}{nome ? <>, <span className="font-extrabold">{nome}</span></> : null}
        </h1>
        <p className="text-[11px] text-white/60">
          {loja ?? "Carteira consolidada"}{de && ate ? `, de ${br(de)} a ${br(ate)} comparado ao período anterior` : ""}
        </p>
      </div>
      {d && (
        <div className="grid grid-cols-1 min-[481px]:grid-cols-2 lg:grid-cols-4 gap-3">
          {itens.map((i) => {
            const Ic = i.ic;
            const ruim = i.v != null && i.v < 0;
            return (
              <div key={i.rot} className="cartao-branco p-4 min-h-[112px] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{i.rot}</span>
                  <span className="grid place-items-center w-5 h-5 rounded-lg bg-[rgba(20,168,108,.14)] text-[#0B7A4D]"><Ic className="w-[11px] h-[11px]" strokeWidth={2.4} /></span>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`text-xl font-extrabold tabular-nums ${ruim ? "text-[#D62410]" : i.cor}`}>{i.val}</span>
                    {i.un && <span className="ml-1 text-[10px] text-[#6B706D]">{i.un}</span>}
                  </div>
                  {i.v == null ? (
                    <span className="text-[10px] text-[#6B706D]">sem comparação</span>
                  ) : (
                    <span className={`h-[22px] px-2 rounded-full inline-flex items-center text-[11px] font-extrabold tabular-nums ${ruim ? "bg-[#D62410] text-white" : "bg-[rgba(20,168,108,.14)] text-[#0B7A4D]"}`}>
                      {i.v > 0 ? "+" : i.v < 0 ? "−" : ""}{Math.abs(i.v).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}{i.pp ? " p.p." : "%"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
