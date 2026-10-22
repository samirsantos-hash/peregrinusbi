import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ds";
import { FormCampanha } from "@/components/ml/ads/FormCampanha";
import { dataCurta } from "@/components/ml/ads/VisaoGeralAds";
import { type CampanhaLinha, orcamentoDiario, type PainelAds } from "@/lib/adsAnalise";
import { type AcaoEmLote } from "@/lib/mlAcoes";
import { brl, num, pctFracao, vezes } from "@/lib/format";
import { alertasDesempenho, type Estrategia, NOME_ESTRATEGIA } from "../../../../supabase/functions/_shared/mlAdsGestao";

const nomeEstrategia = (s: string | null) => NOME_ESTRATEGIA[(s ?? "").toLowerCase() as Estrategia] ?? s ?? "—";
const ativa = (s: string | null) => (s ?? "").toLowerCase() === "active";

export function CampanhasAds({ painel, acao }: { painel: PainelAds; acao: AcaoEmLote }) {
  const [form, setForm] = useState<{ campanha: CampanhaLinha | null } | null>(null);
  const per = `${dataCurta(painel.periodo.atual.de)} a ${dataCurta(painel.periodo.atual.ate)}`;
  const anuncios = new Map<number, { ativos: number; total: number }>();
  for (const g of painel.grupos) {
    if (g.campaign_id == null) continue;
    const x = anuncios.get(g.campaign_id) ?? { ativos: 0, total: 0 };
    x.total++;
    if (g.status === "active") x.ativos++;
    anuncios.set(g.campaign_id, x);
  }
  const ordenadas = [...painel.campanhas].sort((a, b) =>
    Number(ativa(b.status)) - Number(ativa(a.status)) ||
    (painel.porCampanha.get(b.campaign_id)?.atual.investimento ?? 0) - (painel.porCampanha.get(a.campaign_id)?.atual.investimento ?? 0));

  const alternar = (c: CampanhaLinha) =>
    acao.previa({ tipo: "campanha_editar", campaign_id: c.campaign_id, campanha: { status: ativa(c.status) ? "paused" : "active" } });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Desempenho de {per}. Alterações passam por prévia, releem a campanha no Mercado Livre e ficam no histórico de auditoria.</p>
        <Button size="sm" onClick={() => setForm({ campanha: null })}><Plus className="h-3.5 w-3.5 mr-1.5" /> Nova campanha</Button>
      </div>

      {ordenadas.length === 0 ? (
        <EmptyState falta="Nenhuma campanha nesta conta." acao="Crie uma campanha e inclua anúncios na aba Anúncios." />
      ) : (
        <div className="overflow-x-auto border border-border [border-width:0.5px]">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border">
                <th className="py-2 px-2">Campanha</th>
                <th className="pr-2">Estratégia</th>
                <th className="pr-2 text-right">Orçamento/dia</th>
                <th className="pr-2 text-right">ROAS alvo</th>
                <th className="pr-2 text-right">Anúncios</th>
                <th className="pr-2 text-right">Investimento</th>
                <th className="pr-2 text-right">Receita</th>
                <th className="pr-2 text-right">ROAS</th>
                <th className="pr-2 text-right">ACOS</th>
                <th className="pr-2 text-right">CTR</th>
                <th className="pr-2 text-right">CPC</th>
                <th className="pr-2">Alertas</th>
                <th className="pr-2" />
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((c) => {
                const m = painel.porCampanha.get(c.campaign_id);
                const i = m?.atual;
                const al = i ? alertasDesempenho(i, painel.limites) : [];
                const ad = anuncios.get(c.campaign_id);
                const abaixoAlvo = i?.roas != null && c.roas_target != null && i.roas < c.roas_target;
                return (
                  <tr key={c.campaign_id} className="border-t border-border align-top">
                    <td className="py-1.5 px-2 min-w-[180px]">
                      <span className="block font-medium">{c.name ?? `Campanha ${c.campaign_id}`}</span>
                      <span className={ativa(c.status) ? "text-ec-verde-txt" : "text-muted-foreground"}>{ativa(c.status) ? "Ativa" : "Pausada"}</span>
                      <span className="text-muted-foreground"> · {c.campaign_id}</span>
                    </td>
                    <td className="pr-2 py-1.5">{nomeEstrategia(c.strategy)}</td>
                    <td className="pr-2 py-1.5 text-right">{brl(orcamentoDiario(c), true)}</td>
                    <td className="pr-2 py-1.5 text-right">
                      {c.roas_target != null ? vezes(c.roas_target) : c.acos_target != null ? `ACOS ${num(c.acos_target, 1)}%` : "—"}
                    </td>
                    <td className="pr-2 py-1.5 text-right">{ad ? `${num(ad.ativos)} / ${num(ad.total)}` : "0"}</td>
                    <td className="pr-2 py-1.5 text-right">{brl(i?.investimento, true)}</td>
                    <td className="pr-2 py-1.5 text-right">{brl(i?.receita, true)}</td>
                    <td className={`pr-2 py-1.5 text-right ${abaixoAlvo ? "text-ec-ambar font-medium" : ""}`} title={abaixoAlvo ? "Abaixo do ROAS alvo da campanha" : undefined}>{vezes(i?.roas)}</td>
                    <td className="pr-2 py-1.5 text-right">{pctFracao(i?.acos)}</td>
                    <td className="pr-2 py-1.5 text-right">{pctFracao(i?.ctr, 2)}</td>
                    <td className="pr-2 py-1.5 text-right">{brl(i?.cpc, true)}</td>
                    <td className="pr-2 py-1.5 max-w-[240px]">
                      {m && m.somas.dias === 0 ? <span className="text-muted-foreground">sem métrica no período</span>
                        : al.length ? <span className="text-destructive">{al.join(" · ")}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="pr-2 py-1 whitespace-nowrap text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setForm({ campanha: c })}>Editar</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => alternar(c)}>{ativa(c.status) ? "Pausar" : "Ativar"}</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Anúncios: ativos / total na campanha. ROAS em âmbar: abaixo do ROAS alvo da campanha. O orçamento é média diária; o Mercado Livre pode gastar até o dobro num dia.
      </p>

      <FormCampanha
        campanha={form?.campanha ?? null}
        aberto={!!form}
        aoFechar={() => setForm(null)}
        aoRevisar={(dados) => {
          const c = form?.campanha;
          setForm(null);
          if (c) acao.previa({ tipo: "campanha_editar", campaign_id: c.campaign_id, campanha: dados });
          else acao.previa({ tipo: "campanha_criar", campanha: dados });
        }}
      />
    </div>
  );
}
