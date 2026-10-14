import NumeroAnimado from "@/components/ds/NumeroAnimado";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { brl, num, pct } from "@/lib/format";
import TooltipInfo from "./TooltipInfo";
import { planoFunil } from "@/lib/planoFunil";

interface KpiFunil {
  visits: number;
  visitsMatch: number;
  visitsCheaper: number;
  tsi: number;
  gmv: number;
  tgmv?: number;
}


/** Funil de vendas do período: visitas → visitas com preço competitivo → unidades vendidas. */
export default function FunilVendas({ kpis }: { kpis: KpiFunil[] }) {
  const d = useMemo(() => {
    const s = (f: (k: KpiFunil) => number) => kpis.reduce((a, k) => a + (Number(f(k)) || 0), 0);
    const visitas = s((k) => k.visits);
    const competitivas = s((k) => (k.visitsMatch || 0) + (k.visitsCheaper || 0));
    const unidades = s((k) => k.tsi);
    const fat = s((k) => k.tgmv || k.gmv);
    return { visitas, competitivas, unidades, fat };
  }, [kpis]);

  if (d.visitas <= 0) {
    return (
      <div className="glass-card p-5 text-xs text-muted-foreground">
        Funil de vendas: sem visitas registradas no período — carregue a base de visitas para ver a conversão.
      </div>
    );
  }

  const etapas = [
    { nome: "Visitas", valor: d.visitas, fmt: num(d.visitas) },
    ...(d.competitivas > 0 && d.competitivas <= d.visitas
      ? [{ nome: "Visitas com preço competitivo", valor: d.competitivas, fmt: num(d.competitivas) }]
      : []),
    { nome: "Unidades vendidas", valor: d.unidades, fmt: num(d.unidades) },
  ];
  const conversao = d.unidades / d.visitas;
  const ticket = d.unidades > 0 ? d.fat / d.unidades : 0;
  const receitaVisita = d.fat / d.visitas;

  const taxaPreco = d.competitivas > 0 && d.competitivas <= d.visitas ? d.competitivas / d.visitas : null;
  const convComp = taxaPreco !== null && d.competitivas > 0 ? d.unidades / d.competitivas : conversao;
  // Perda relativa de cada etapa (quanto não passa para a seguinte)
  const perdas = [
    { k: "atrair", v: 0 },
    { k: "preco", v: taxaPreco === null ? -1 : 1 - taxaPreco },
    { k: "fechar", v: 1 - Math.min(1, convComp) },
  ];
  const foco = perdas.reduce((m, p) => (p.v > m.v ? p : m)).k;
  const alavancas = [
    {
      k: "atrair", etapa: "1. Atrair visitas", foco: false,
      indicador: `${num(d.visitas)} visitas · ${brl(receitaVisita, true)} por visita`,
      acoes: ["Título com termos de busca e foto principal limpa", "Publicidade nos anúncios com melhor conversão", "Selo de vendidos e reputação visíveis no resultado"],
    },
    {
      k: "preco", etapa: "2. Preço que convence", foco: foco === "preco",
      indicador: taxaPreco === null ? "Sem dado de competitividade" : `${pct(taxaPreco * 100, 1)} das visitas viram preço competitivo`,
      acoes: ["Preço de/por com desconto real (âncora riscada)", "Parcelamento sem juros em destaque", "Entrar em campanha com prazo de até 30 dias"],
    },
    {
      k: "fechar", etapa: "3. Fechar a compra", foco: foco === "fechar",
      indicador: `${pct(convComp * 100, 2)} ${taxaPreco === null ? "das visitas" : "das visitas competitivas"} compram`,
      acoes: ["Frete grátis e entrega rápida (Full)", "Opiniões de compradores e respostas a perguntas", "Estoque e urgência reais: oferta com prazo"],
    },
  ];

  const plano = planoFunil(d);
  const passos = plano.map((p) => ({ ...p, a: alavancas.find((x) => x.k === p.etapa)! }));

  // Largura em % (escala de raiz, mínimo 46% para os números caberem dentro do desenho)
  const larg = (i: number) => Math.max(46, Math.sqrt(Math.min(1, etapas[i].valor / d.visitas)) * 100);

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Funil de vendas</h3>
        <TooltipInfo text="Soma do período selecionado. Cada etapa mostra quantos seguiram da etapa anterior e do total de visitas. A largura usa escala de raiz para que as etapas pequenas continuem visíveis." />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col items-center gap-1.5" role="img" aria-label="Funil de vendas">
          {etapas.map((e, i) => {
            const w = larg(i);
            const prox = i < etapas.length - 1 ? larg(i + 1) : w * 0.88;
            const recuo = ((w - prox) / 2 / w) * 100; // afunilamento lateral em % da própria largura
            const daAnterior = i > 0 ? e.valor / etapas[i - 1].valor : 1;
            return (
              <motion.div
                key={e.nome}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                title={`${e.nome}: ${e.fmt} · ${pct((e.valor / d.visitas) * 100, 2)} das visitas`}
                className="group relative flex min-h-[74px] flex-col items-center justify-center px-6 py-3 text-center transition-[filter] duration-200 hover:brightness-125"
                style={{ width: `${w}%` }}
              >
                <div
                  className="absolute inset-0 border border-cyan-400/60 bg-gradient-to-b from-cyan-400/40 to-cyan-400/10 shadow-[0_0_18px_rgb(34_211_238/0.25)]"
                  style={{
                    opacity: 1 - i * 0.15,
                    clipPath: `polygon(0 0, 100% 0, ${100 - recuo}% 100%, ${recuo}% 100%)`,
                    borderRadius: "18px 18px 28px 28px",
                  }}
                />
                <p className="relative text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/75">{e.nome}</p>
                <p className="relative text-xl font-semibold tabular-nums leading-tight text-foreground">
                  <NumeroAnimado valor={String(e.fmt)} />
                </p>
                {i > 0 && (
                  <p className="relative text-[10px] tabular-nums text-neon-blue">{pct(daAnterior * 100, 2)} da etapa anterior</p>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-cyan-400/20 bg-black/40 p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Conversão (unidades ÷ visitas)</p>
            <p className="text-3xl font-medium tabular-nums tracking-tight text-neon-blue drop-shadow-[0_0_10px_rgb(34_211_238/0.5)]"><NumeroAnimado valor={pct(conversao * 100, 2)} /></p>
            <p className="text-[11px] text-muted-foreground">a cada 100 visitas, {num(conversao * 100, 1)} unidades vendidas</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Faturamento", brl(d.fat)],
              ["Ticket por unidade", brl(ticket, true)],
              ["Receita por visita", brl(receitaVisita, true)],
              ["Visitas sem compra", num(Math.max(0, d.visitas - d.unidades))],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/10 bg-white/5 p-2.5 transition-colors hover:border-cyan-400/40">
                <dt className="text-[11px] text-muted-foreground">{k}</dt>
                <dd className="font-medium tabular-nums text-foreground"><NumeroAnimado valor={String(v)} /></dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Plano de ação automático: etapas ordenadas pela perda de clientes */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">Plano de ação da loja — por ordem de prioridade</h4>
          <TooltipInfo text="Gerado automaticamente: a etapa onde a loja perde mais clientes vem primeiro. Atrair mais visitas fica por último, depois de estancar as perdas." />
        </div>
        <ol className="grid gap-2 md:grid-cols-3">
          {passos.map((p, i) => (
            <li key={p.etapa} className={`rounded-lg border p-3 text-xs ${p.prioridade === "Alta" ? "border-cyan-400/60 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">Passo {i + 1} · {p.a.etapa.replace(/^\d\.\s*/, "")}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.prioridade === "Alta" ? "bg-cyan-400/20 text-neon-blue" : "bg-white/10 text-muted-foreground"}`}>Prioridade {p.prioridade.toLowerCase()}</span>
              </div>
              <p className="mt-0.5 tabular-nums text-muted-foreground">{p.a.indicador}</p>
              {p.perdidos > 0 && <p className="mt-1 tabular-nums text-foreground">{num(p.perdidos)} clientes perdidos aqui ({pct(p.perda * 100, 1)})</p>}
              {p.unidadesPotenciais >= 1 && <p className="tabular-nums text-neon-blue">+{num(p.unidadesPotenciais)} unidades se chegar à meta de 70% de preço competitivo</p>}
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {p.a.acoes.map((t) => <li key={t}>• {t}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
