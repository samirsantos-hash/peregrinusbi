import { Alert, KpiCard, RotuloSecao } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { associacoes, investimentoEmRisco, type PainelAds, variacao } from "@/lib/adsAnalise";
import { brl, delta, num, pctFracao, vezes } from "@/lib/format";
import { dataHoraBr } from "@/lib/mlFuncoes";
import { alertaOrcamento, alertasDesempenho, DIAS_MES } from "../../../../supabase/functions/_shared/mlAdsGestao";

export const dataCurta = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

/** "antes: X (+Y%)" do período anterior de mesmo tamanho. */
function comparacao(atual: number | null, anterior: number | null, fmt: (v: number | null) => string) {
  const v = variacao(atual, anterior);
  return `antes: ${fmt(anterior)}${v != null ? ` (${delta(v * 100)})` : ""}`;
}

export function VisaoGeralAds({ painel, faturamentoEm, aoVerAnuncios }: {
  painel: PainelAds;
  faturamentoEm: string | null;
  aoVerAnuncios: (filtro: string) => void;
}) {
  const { conta, limites, periodo } = painel;
  const a = conta.atual;
  const ant = conta.anterior;
  const per = `${dataCurta(periodo.atual.de)} a ${dataCurta(periodo.atual.ate)}`;
  const semDados = conta.somas.dias === 0;

  const mensal = painel.orcamentoAtivo * DIAS_MES;
  const limiteMensal = painel.faturamento != null ? painel.faturamento * limites.meta_investimento_ads : null;
  const alertaConta = [
    ...alertasDesempenho(a, limites),
    alertaOrcamento(painel.orcamentoAtivo, painel.faturamento, limites.meta_investimento_ads),
  ].filter((x): x is string => !!x);

  const alertas = painel.grupos.flatMap((g) => g.alertas.map((al) => ({ g, al })));
  const conta3 = (n: string) => alertas.filter((x) => x.al.nivel === n).length;
  const principais = alertas.filter((x) => x.al.nivel === "alto").sort((x, y) => y.g.ind.investimento - x.g.ind.investimento).slice(0, 8);
  const risco = investimentoEmRisco(painel.grupos);
  const assoc = associacoes(painel.grupos);

  return (
    <div className="space-y-6">
      {semDados && (
        <p className="text-sm text-muted-foreground">Sem métricas de campanha nos últimos {painel.dias} dias. Se a conta anuncia, clique em Atualizar.</p>
      )}

      <section className="space-y-2">
        <RotuloSecao>Conta · {per} · comparado com os {painel.dias} dias anteriores</RotuloSecao>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard focal rotulo="Investimento" valor={brl(a.investimento, true)} referencia={comparacao(a.investimento, ant.investimento, (v) => brl(v, true))} />
          <KpiCard rotulo="Receita de Ads" valor={brl(a.receita, true)} referencia={comparacao(a.receita, ant.receita, (v) => brl(v, true))} />
          <KpiCard
            rotulo="ROAS"
            valor={vezes(a.roas)}
            faixa={a.roas == null ? undefined : a.roas < limites.alerta_roas ? "critico" : "bom"}
            faixaTexto={`limite ${vezes(limites.alerta_roas)}`}
            referencia={comparacao(a.roas, ant.roas, (v) => vezes(v))}
          />
          <KpiCard
            rotulo="ACOS"
            valor={pctFracao(a.acos)}
            faixa={a.acos == null ? undefined : a.acos > limites.alerta_acos ? "critico" : "bom"}
            faixaTexto={`até ${pctFracao(limites.alerta_acos)}`}
            referencia={comparacao(a.acos, ant.acos, (v) => pctFracao(v))}
          />
          <KpiCard
            rotulo="TACOS"
            valor={pctFracao(a.tacos)}
            faixa={a.tacos == null ? undefined : a.tacos > limites.alerta_tacos ? "critico" : "bom"}
            faixaTexto={`até ${pctFracao(limites.alerta_tacos)}`}
            referencia={painel.faturamento != null
              ? `investimento ÷ faturamento ML de 30 dias (${brl(painel.faturamento)}${faturamentoEm ? `, lido em ${dataHoraBr(faturamentoEm)}` : ""})`
              : "sem faturamento de 30 dias do ML; conecte a loja e sincronize"}
          />
          <KpiCard
            rotulo="CTR"
            valor={pctFracao(a.ctr, 2)}
            faixa={a.ctr == null ? undefined : a.ctr < limites.alerta_ctr ? "critico" : "bom"}
            faixaTexto={`mín. ${pctFracao(limites.alerta_ctr, 2)}`}
            referencia={comparacao(a.ctr, ant.ctr, (v) => pctFracao(v, 2))}
          />
          <KpiCard
            rotulo="CPC"
            valor={brl(a.cpc, true)}
            faixa={a.cpc == null ? undefined : a.cpc > limites.alerta_cpc ? "critico" : "bom"}
            faixaTexto={`até ${brl(limites.alerta_cpc, true)}`}
            referencia={comparacao(a.cpc, ant.cpc, (v) => brl(v, true))}
          />
          <KpiCard
            rotulo="Orçamento mensal projetado"
            valor={brl(mensal)}
            faixa={limiteMensal == null ? undefined : mensal > limiteMensal ? "critico" : "bom"}
            faixaTexto={`meta ${pctFracao(limites.meta_investimento_ads, 0)} do faturamento`}
            referencia={`soma dos orçamentos diários das campanhas ativas × ${DIAS_MES}${limiteMensal != null ? ` · meta ${brl(limiteMensal)}` : ""}`}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Indicadores calculados das somas do período (receita ÷ investimento etc.). Receita de Ads soma vendas diretas e indiretas atribuídas pelo Mercado Livre. Limites vêm das configurações da conta.
        </p>
      </section>

      {alertaConta.length > 0 && (
        <section className="space-y-1">
          <RotuloSecao>Alertas da conta · {per}</RotuloSecao>
          {alertaConta.map((t) => <Alert key={t} critico>{t}.</Alert>)}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <RotuloSecao>Alertas por anúncio · {per}</RotuloSecao>
          <span className="text-xs text-muted-foreground tabular-nums">
            {conta3("alto")} críticos · {conta3("medio")} de atenção · {conta3("oportunidade")} oportunidades
          </span>
        </div>
        {principais.length === 0 && <p className="text-sm text-muted-foreground">Nenhum alerta crítico nos anúncios do período.</p>}
        {principais.map(({ g, al }) => (
          <Alert key={`${g.ad_group_id}-${al.id}`} critico>
            <span className="font-medium">{g.titulo ?? g.external_id ?? g.ad_group_id}</span> — {al.texto} <span className="text-muted-foreground">{al.acao}</span>
          </Alert>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => aoVerAnuncios("alto")}>Ver críticos</Button>
          <Button size="sm" variant="outline" onClick={() => aoVerAnuncios("medio")}>Ver de atenção</Button>
          <Button size="sm" variant="outline" onClick={() => aoVerAnuncios("oportunidade")}>Ver oportunidades</Button>
        </div>
      </section>

      <section className="space-y-2">
        <RotuloSecao>Onde está o investimento · {per}</RotuloSecao>
        <p className="text-xs text-muted-foreground">
          Investimento em anúncios com problemas de qualidade, fotos, ficha ou estoque. Gasto que não converte sobe ACOS e TACOS da conta.
        </p>
        <div className="overflow-x-auto border border-border [border-width:0.5px]">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border">
                <th className="py-2 px-2">Situação do anúncio</th>
                <th className="pr-2 text-right">Anúncios</th>
                <th className="pr-2 text-right">Investimento</th>
                <th className="pr-2 text-right">% do investimento</th>
                <th className="pr-2" />
              </tr>
            </thead>
            <tbody>
              {risco.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-1.5 px-2">{r.rotulo}</td>
                  <td className="pr-2 text-right">{num(r.anuncios)}</td>
                  <td className="pr-2 text-right">{brl(r.custo, true)}</td>
                  <td className={`pr-2 text-right ${(r.fracao ?? 0) >= 0.2 && r.id !== "sem_analise" ? "text-ec-ambar font-medium" : ""}`}>{pctFracao(r.fracao)}</td>
                  <td className="pr-2 py-1 text-right">
                    {r.anuncios > 0 && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => aoVerAnuncios(r.id)}>Ver</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Qualidade, fotos e ficha vêm da última análise da aba Melhorias (os 10 mais vendidos de cada conta são analisados por dia; os demais, ao abrir Melhorias no anúncio).
        </p>
      </section>

      <section className="space-y-2">
        <RotuloSecao>Associações na conta · mediana por grupo de anúncios · {per}</RotuloSecao>
        <div className="grid md:grid-cols-2 gap-3">
          {assoc.map((x) => (
            <div key={x.id} className="border border-border [border-width:0.5px] p-3 space-y-1.5">
              <p className="font-medium text-sm">{x.titulo}</p>
              <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
                <Lado rotulo={x.com.rotulo} valor={formatar(x.metrica, x.com.mediana)} n={x.com.n} destaque={x.pior === true} />
                <Lado rotulo={x.sem.rotulo} valor={formatar(x.metrica, x.sem.mediana)} n={x.sem.n} />
              </div>
              <p className={`text-xs ${x.pior ? "text-ec-ambar" : "text-muted-foreground"}`}>{x.leitura}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Só entram anúncios com volume para julgar: ROAS com investimento, ACOS com receita, CTR com 1.000 impressões ou mais, conversão com 50 cliques ou mais.
        </p>
      </section>
    </div>
  );
}

const formatar = (m: "roas" | "acos" | "ctr" | "cvr", v: number | null) => (m === "roas" ? vezes(v) : pctFracao(v, m === "ctr" ? 2 : 1));

function Lado({ rotulo, valor, n, destaque }: { rotulo: string; valor: string; n: number; destaque?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground">{rotulo}</p>
      <p className={`text-base font-semibold ${destaque ? "text-ec-ambar" : ""}`}>{valor}</p>
      <p className="text-muted-foreground">{num(n)} anúncio(s)</p>
    </div>
  );
}
