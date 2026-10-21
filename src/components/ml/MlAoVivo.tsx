// Bloco "Direto do Mercado Livre": mostra, em cada aba, o tema importado pela
// conexão da própria loja (ml_sync_tema). Só aparece quando a loja está conectada.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { KpiCard, RotuloSecao } from "@/components/ds";
import CopiarAnuncio from "@/components/ds/CopiarAnuncio";
import { brl, num, pctFracao } from "@/lib/format";
import { toast } from "sonner";

export type SecaoMl = "resumo" | "reputacao" | "qualidade" | "logistica" | "oportunidades" | "publicidade";

const TEMAS: Record<SecaoMl, string[]> = {
  resumo: ["vendas", "visitas"],
  reputacao: ["reputacao", "perguntas"],
  qualidade: ["anuncios"],
  logistica: ["envios"],
  oportunidades: ["promocoes"],
  publicidade: ["ads"],
};

const MODAL: Record<string, string> = {
  fulfillment: "Full", self_service: "Flex", xd_drop_off: "Agência", cross_docking: "Coleta",
  drop_off: "Correios", sem_info: "Sem informação",
};
const NIVEL: Record<string, string> = {
  "5_green": "Verde", "4_light_green": "Verde-claro", "3_yellow": "Amarela", "2_orange": "Laranja", "1_red": "Vermelha",
};
const MEDALHA: Record<string, string> = { platinum: "Platinum", gold: "Gold", silver: "Silver" };

const dataBr = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");

export default function MlAoVivo({ custId, secao }: { custId?: string; secao: SecaoMl }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [atualizando, setAtualizando] = useState(false);
  const temas = TEMAS[secao];

  const { data } = useQuery({
    queryKey: ["ml-sync-tema", custId],
    enabled: !!custId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("ml_sync_tema").select("tema, dados, erro, atualizado_em").eq("cust_id", custId!);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.tema, r])) as Record<string, { dados: any; erro: string | null; atualizado_em: string }>;
    },
  });
  if (!custId || !data || !temas.some((t) => data[t])) return null;

  const atualizar = async () => {
    setAtualizando(true);
    const { error } = await supabase.functions.invoke("ml-sync-loja", { body: { cust_id: custId } });
    setAtualizando(false);
    if (error) return toast.error("Não foi possível atualizar agora.");
    toast.success("Dados do Mercado Livre atualizados.");
    qc.invalidateQueries({ queryKey: ["ml-sync-tema", custId] });
  };

  const d = (t: string) => data[t]?.dados ?? null;
  const ultima = temas.map((t) => data[t]?.atualizado_em).filter(Boolean).sort().pop();

  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-4 [border-width:0.5px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <RotuloSecao>Direto do Mercado Livre</RotuloSecao>
          <p className="text-xs text-muted-foreground">Conta conectada · atualizado em {dataBr(ultima)}</p>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={atualizar} disabled={atualizando}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${atualizando ? "animate-spin" : ""}`} />
            {atualizando ? "Atualizando…" : "Atualizar"}
          </Button>
        )}
      </div>
      {temas.map((t) => data[t]?.erro && !data[t]?.dados ? (
        <p key={t} className="text-xs text-muted-foreground">Este dado não veio do Mercado Livre na última atualização.</p>
      ) : null)}
      {secao === "resumo" && <Resumo vendas={d("vendas")} visitas={d("visitas")} />}
      {secao === "reputacao" && <Reputacao r={d("reputacao")} p={d("perguntas")} />}
      {secao === "qualidade" && <Qualidade a={d("anuncios")} />}
      {secao === "logistica" && <Logistica e={d("envios")} />}
      {secao === "oportunidades" && <Promocoes p={d("promocoes")} />}
      {secao === "publicidade" && <Ads a={d("ads")} fat={d("vendas")?.faturamento_30d} />}
    </section>
  );
}

const Grade = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
);

function Resumo({ vendas, visitas }: { vendas: any; visitas: any }) {
  if (!vendas && !visitas) return null;
  const vis = new Map<string, number>((visitas?.serie ?? []).map((x: any) => [x.data, x.visitas]));
  const serie = (vendas?.serie ?? []).map((x: any) => ({ ...x, visitas: vis.get(x.data) ?? null, label: x.data.slice(8, 10) + "/" + x.data.slice(5, 7) }));
  const conv = vendas?.pedidos_30d && visitas?.total_30d ? vendas.pedidos_30d / visitas.total_30d : null;
  return (
    <>
      <Grade>
        <KpiCard focal rotulo="Faturamento 30 dias" valor={brl(vendas?.faturamento_30d)} referencia={`${num(vendas?.pedidos_30d)} pedidos`} />
        <KpiCard rotulo="Ticket médio" valor={brl(vendas?.ticket_medio, true)} referencia="faturamento ÷ pedidos" />
        <KpiCard rotulo="Visitas 30 dias" valor={num(visitas?.total_30d)} referencia="todos os anúncios" />
        <KpiCard rotulo="Conversão" valor={pctFracao(conv, 2)} referencia={`${num(vendas?.cancelados_30d)} cancelados no período`} />
      </Grade>
      {serie.length > 0 && (
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={serie} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis yAxisId="f" tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => brl(v)} />
              <YAxis yAxisId="v" orientation="right" tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number, n: string) => (n === "Faturamento" ? brl(v, true) : num(v))} />
              <Line yAxisId="f" type="monotone" dataKey="faturamento" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line yAxisId="v" type="monotone" dataKey="visitas" name="Visitas" stroke="hsl(var(--chart-2, 200 80% 50%))" strokeWidth={1.5} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

function Reputacao({ r, p }: { r: any; p: any }) {
  if (!r && !p) return null;
  return (
    <>
      <Grade>
        <KpiCard focal rotulo="Termômetro" valor={NIVEL[r?.nivel] ?? "Sem dado"} referencia={r?.medalha ? `Medalha ${MEDALHA[r.medalha] ?? r.medalha}` : "Sem medalha"} />
        <KpiCard rotulo="Reclamações" valor={pctFracao(r?.reclamacoes, 2)} referencia="meta abaixo de 2%" faixa={r?.reclamacoes > 0.02 ? "critico" : "bom"} />
        <KpiCard rotulo="Atrasos no envio" valor={pctFracao(r?.atrasos, 2)} referencia="meta abaixo de 5%" faixa={r?.atrasos > 0.05 ? "critico" : "bom"} />
        <KpiCard rotulo="Cancelamentos" valor={pctFracao(r?.cancelamentos, 2)} referencia={`${num(r?.vendas_concluidas_60d)} vendas em 60 dias`} />
      </Grade>
      {p && (
        <Grade>
          <KpiCard rotulo="Perguntas sem resposta" valor={num(p.sem_resposta)} referencia={`${num(p.total)} perguntas no total`} faixa={p.sem_resposta > 0 ? "abaixo" : "bom"} />
          <KpiCard rotulo="Tempo de resposta" valor={p.mediana_horas_resposta == null ? "Sem dado" : p.mediana_horas_resposta < 1 ? `${num(p.mediana_horas_resposta * 60)} min` : `${num(p.mediana_horas_resposta, 1)} h`} referencia="mediana das últimas 50" />
        </Grade>
      )}
    </>
  );
}

function Qualidade({ a }: { a: any }) {
  if (!a) return null;
  const itens: any[] = a.itens ?? [];
  const saude = itens.filter((i) => i.saude != null);
  const mediaSaude = saude.length ? saude.reduce((s, i) => s + i.saude, 0) / saude.length : null;
  return (
    <>
      <Grade>
        <KpiCard focal rotulo="Anúncios ativos" valor={num(a.total_ativos)} referencia="conta conectada" />
        <KpiCard rotulo="Sem estoque" valor={num(a.sem_estoque)} referencia="ativos com estoque zero" faixa={a.sem_estoque > 0 ? "abaixo" : "bom"} />
        <KpiCard rotulo="Menos de 3 fotos" valor={num(a.poucas_fotos)} referencia="recomendado: 3 ou mais" faixa={a.poucas_fotos > 0 ? "abaixo" : "bom"} />
        <KpiCard rotulo="Saúde média" valor={mediaSaude == null ? "Sem dado" : num(mediaSaude * 100)} referencia="nota do ML, 0 a 100" />
      </Grade>
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead className="text-muted-foreground text-left">
            <tr><th className="py-1.5">Anúncio</th><th>Preço</th><th>Estoque</th><th>Vendidos</th><th>Envio</th><th>Saúde</th></tr>
          </thead>
          <tbody>
            {itens.slice(0, 10).map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="py-1.5 pr-2 max-w-[280px]">
                  <div className="flex items-center gap-1.5">
                    <a href={i.link} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">{i.titulo}</a>
                    <CopiarAnuncio itemId={i.id} titulo={i.titulo} />
                  </div>
                </td>
                <td>{brl(i.preco, true)}</td><td>{num(i.estoque)}</td><td>{num(i.vendidos)}</td>
                <td>{MODAL[i.envio] ?? "Outro"}</td><td>{i.saude == null ? "—" : num(i.saude * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Logistica({ e }: { e: any }) {
  if (!e?.mix) return null;
  const linhas = Object.entries(e.mix as Record<string, { pedidos: number; faturamento: number }>).sort((a, b) => b[1].faturamento - a[1].faturamento);
  const total = linhas.reduce((s, [, v]) => s + v.faturamento, 0);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Vendas dos últimos 30 dias por modalidade de envio · meta Full ≥ 40%</p>
      {linhas.map(([k, v]) => {
        const p = total ? v.faturamento / total : 0;
        return (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-xs tabular-nums"><span>{MODAL[k] ?? "Outro"}</span><span>{pctFracao(p)} · {brl(v.faturamento)} · {num(v.pedidos)} pedidos</span></div>
            <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${p * 100}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function Promocoes({ p }: { p: any }) {
  if (!p) return null;
  return (
    <>
      <Grade>
        <KpiCard focal rotulo="Promoções ativas" valor={num(p.ativas)} referencia={`${num(p.total)} disponíveis para a loja`} />
      </Grade>
      <ul className="text-xs divide-y divide-border">
        {(p.lista ?? []).slice(0, 12).map((x: any) => (
          <li key={x.id} className="py-1.5 flex justify-between gap-2">
            <span>{x.nome ?? x.tipo}</span>
            <span className="text-muted-foreground">{x.status === "started" ? "Ativa" : x.status === "pending" ? "Programada" : "Disponível"}{x.fim ? ` · até ${new Date(x.fim).toLocaleDateString("pt-BR")}` : ""}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Ads({ a, fat }: { a: any; fat?: number }) {
  if (!a) return null;
  if (!a.usa_ads) return <p className="text-sm text-muted-foreground">A loja não usa Product Ads.</p>;
  const acos = a.vendas_ads ? a.investimento / a.vendas_ads : null;
  const roas = a.investimento ? a.vendas_ads / a.investimento : null;
  const share = fat ? a.investimento / fat : null;
  return (
    <>
      <Grade>
        <KpiCard focal rotulo="Investimento 30 dias" valor={brl(a.investimento, true)} referencia={`${pctFracao(share, 2)} do faturamento · Meta Peregrinus 3%`} />
        <KpiCard rotulo="Vendas por Ads" valor={brl(a.vendas_ads)} referencia={`${num(a.unidades)} unidades`} />
        <KpiCard rotulo="ROAS" valor={roas == null ? "Sem dado" : `${num(roas, 1)}x`} referencia={`ACOS ${pctFracao(acos)}`} />
        <KpiCard rotulo="Cliques" valor={num(a.cliques)} referencia={`${num(a.impressoes)} impressões`} />
      </Grade>
      {(a.campanhas ?? []).length > 0 && (
        <ul className="text-xs divide-y divide-border tabular-nums">
          {a.campanhas.map((c: any, i: number) => (
            <li key={i} className="py-1.5 flex justify-between gap-2">
              <span>{c.nome} <span className="text-muted-foreground">({c.status === "active" ? "ativa" : "pausada"})</span></span>
              <span>{brl(c.investimento, true)} → {brl(c.vendas)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
