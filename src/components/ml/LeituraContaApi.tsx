// Leitura da conta conectada na Visão geral: reputação, preço, publicidade,
// logística (mix) e ruptura de estoque — tudo da API do Mercado Livre.
// Métrica ausente aparece como "Sem dado"; nada é estimado.
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Megaphone, PackageX, ShieldCheck, Tag, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { brl, num, pctFracao } from "@/lib/format";
import { LOGISTICA } from "@/lib/mlRotulos";
import { avaliarRuptura } from "@/lib/rupturaApi";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { useContaMl } from "@/components/dashboard/RupturaApi";

const NIVEL: Record<string, string> = { "5_green": "Verde", "4_light_green": "Verde-clara", "3_yellow": "Amarela", "2_orange": "Laranja", "1_red": "Vermelha" };
const soDigitos = (s: string) => String(s).replace(/\D/g, "");
const META_FULL = 0.4;

type Props = { custId: string; faturamento30d: number; ticketDelta: number | null };

function Bloco({ icone: I, titulo, children }: { icone: typeof Tag; titulo: string; children: React.ReactNode }) {
  return (
    <div className="glass-card flex min-w-0 flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <I className="h-4 w-4 text-primary" aria-hidden />
        <h4 className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h4>
      </div>
      {children}
    </div>
  );
}
const Linha = ({ r, v, ruim }: { r: string; v: string; ruim?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3 text-sm">
    <span className="truncate text-muted-foreground">{r}</span>
    <span className={`shrink-0 font-medium tabular-nums ${ruim ? "text-destructive" : "text-foreground"}`}>{v}</span>
  </div>
);

export default function LeituraContaApi({ custId, faturamento30d, ticketDelta }: Props) {
  const conta = useContaMl(custId);
  const accountId = conta.data ?? undefined;

  const temas = useQuery({
    queryKey: ["ml-sync-tema", custId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("ml_sync_tema").select("tema, dados, erro, atualizado_em").eq("cust_id", custId);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.tema, r])) as Record<string, { dados: any; erro: string | null; atualizado_em: string }>;
    },
  });

  const anuncios = useQuery({
    queryKey: ["visao-geral-anuncios", accountId],
    enabled: !!accountId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await fetchAllRows((de, ate) => (supabase as any).from("ml_listings")
        .select("item_id, titulo, estoque, preco, preco_original, saude, logistica").eq("account_id", accountId).eq("status", "active")
        .order("item_id").range(de, ate));
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Mesma chave do quadro de ruptura: reaproveita a leitura de vendas 7d.
  const vendas = useQuery({
    queryKey: ["ruptura-vendas7d", custId],
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ml-analise-loja", { body: { cust_id: custId, modo: "vendas7d" } });
      if (error || !data?.itens) throw error ?? new Error("sem vendas");
      return data.itens as { id: string; unidades: number }[];
    },
  });

  if (temas.isLoading || conta.isLoading) return <Skeleton className="h-56 w-full rounded-2xl" />;
  const d = (t: string) => temas.data?.[t]?.dados ?? null;
  const rep = d("reputacao"), ads = d("ads"), env = d("envios");

  // Preço: desconto ativo (preço atual abaixo do original) e ticket.
  const lista = anuncios.data ?? [];
  const comDesconto = lista.filter((a) => a.preco_original != null && a.preco != null && Number(a.preco) < Number(a.preco_original));
  const descMedio = comDesconto.length
    ? comDesconto.reduce((s, a) => s + (1 - Number(a.preco) / Number(a.preco_original)), 0) / comDesconto.length : null;

  // Publicidade: totais ponderados do período.
  const inv = ads?.investimento ?? null, vAds = ads?.vendas_ads ?? null;
  const roas = inv && vAds != null ? vAds / inv : null;
  const acos = vAds ? (inv ?? 0) / vAds : null;
  const tacos = inv != null && faturamento30d ? inv / faturamento30d : null;
  const ativas = (ads?.campanhas ?? []).filter((c: any) => c.status === "active").length;

  // Logística: participação por faturamento.
  const mix = Object.entries((env?.mix ?? {}) as Record<string, { pedidos: number; faturamento: number }>).sort((a, b) => b[1].faturamento - a[1].faturamento);
  const totMix = mix.reduce((s, [, v]) => s + v.faturamento, 0);
  const full = mix.find(([k]) => k === "fulfillment")?.[1].faturamento ?? 0;
  // "sem_info" = modalidade não informada pelo ML: fica fora da base do Full para não inventar 0%.
  const semInfo = mix.find(([k]) => k === "sem_info")?.[1].faturamento ?? 0;
  const baseConhecida = totMix - semInfo;
  const partFull = baseConhecida > 0 && semInfo / (totMix || 1) < 0.5 ? full / baseConhecida : null;

  // Ruptura: vendas pagas 7d por anúncio.
  const v7 = new Map<string, number>((vendas.data ?? []).map((i) => [soDigitos(i.id), i.unidades]));
  const rupt = lista.map((a) => avaliarRuptura({
    itemId: a.item_id, titulo: a.titulo ?? a.item_id, estoque: a.estoque, preco: a.preco != null ? Number(a.preco) : null,
    saude: a.saude != null ? Number(a.saude) : null, logistica: a.logistica,
    vendas7d: vendas.data ? (v7.get(soDigitos(a.item_id)) ?? 0) : null,
    perguntas30d: 0, emPromocao: false, promocaoDisponivel: false,
  }));
  const criticos = rupt.filter((r) => r.severidade === "critical").sort((x, y) => (x.cobertura ?? 0) - (y.cobertura ?? 0));
  const baixa = rupt.filter((r) => r.severidade === "warn").length;

  // Breve leitura: frases só com números reais.
  const leitura: { t: string; ruim: boolean }[] = [];
  if (rep?.nivel) leitura.push({ t: `Reputação ${NIVEL[rep.nivel] ?? rep.nivel}${rep.reclamacoes > 0.02 ? `, reclamações em ${pctFracao(rep.reclamacoes, 2)} (acima de 2%)` : ""}.`, ruim: !String(rep.nivel).startsWith("5") || rep.reclamacoes > 0.02 });
  if (ticketDelta != null) leitura.push({ t: `Ticket por pedido ${ticketDelta >= 0 ? "subiu" : "caiu"} ${num(Math.abs(ticketDelta), 1)}% vs 30 dias anteriores.`, ruim: ticketDelta < 0 });
  if (tacos != null) leitura.push({ t: `Publicidade consome ${pctFracao(tacos, 2)} do faturamento (TACOS)${roas != null ? ` com ROAS ${num(roas, 1)}x` : ""}.`, ruim: tacos > 0.1 });
  if (partFull != null) leitura.push({ t: `Full responde por ${pctFracao(partFull)} das vendas${partFull < META_FULL ? " — abaixo da meta de 40%" : ""}.`, ruim: partFull < META_FULL });
  if (vendas.data) leitura.push({ t: criticos.length ? `${num(criticos.length)} anúncio(s) com ruptura iminente de estoque.` : "Nenhum anúncio com ruptura iminente.", ruim: criticos.length > 0 });

  return (
    <section className="space-y-3" aria-label="Leitura da conta pela API">
      <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">Leitura da conta · Mercado Livre</p>

      <div className="glass-card p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Breve leitura</h4>
        {leitura.length ? (
          <ul className="space-y-1.5 text-sm">
            {leitura.map((l, i) => (
              <li key={i} className="flex gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${l.ruim ? "bg-destructive" : "bg-primary"}`} aria-hidden />
                <span className="tabular-nums">{l.t}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Sem dado suficiente para a leitura.</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Bloco icone={ShieldCheck} titulo="Reputação">
          {rep ? (<>
            <Linha r="Termômetro" v={NIVEL[rep.nivel] ?? "Sem dado"} ruim={!!rep.nivel && !String(rep.nivel).startsWith("5")} />
            <Linha r="Reclamações (meta < 2%)" v={pctFracao(rep.reclamacoes, 2)} ruim={rep.reclamacoes > 0.02} />
            <Linha r="Atrasos (meta < 5%)" v={pctFracao(rep.atrasos, 2)} ruim={rep.atrasos > 0.05} />
            <Linha r="Cancelamentos" v={pctFracao(rep.cancelamentos, 2)} />
          </>) : <p className="text-sm text-muted-foreground">Sem dado</p>}
        </Bloco>

        <Bloco icone={Tag} titulo="Variação de preço">
          <Linha r="Ticket por pedido vs anterior" v={ticketDelta == null ? "Sem dado" : `${ticketDelta >= 0 ? "▲" : "▼"} ${num(Math.abs(ticketDelta), 1)}%`} ruim={ticketDelta != null && ticketDelta < 0} />
          <Linha r="Anúncios com preço reduzido" v={anuncios.data ? `${num(comDesconto.length)} de ${num(lista.length)}` : "Sem dado"} />
          <Linha r="Redução média sobre o original" v={descMedio == null ? "Sem dado" : pctFracao(descMedio, 1)} />
        </Bloco>

        <Bloco icone={Megaphone} titulo="Publicidade">
          {ads ? (<>
            <Linha r="Investimento" v={brl(inv)} />
            <Linha r="Vendas por Ads" v={brl(vAds)} />
            <Linha r="ROAS" v={roas == null ? "Sem dado" : `${num(roas, 1)}x`} />
            <Linha r="ACOS" v={pctFracao(acos, 2)} />
            <Linha r="TACOS" v={pctFracao(tacos, 2)} ruim={tacos != null && tacos > 0.1} />
            <Linha r="Campanhas ativas" v={num(ativas)} />
          </>) : <p className="text-sm text-muted-foreground">Sem dado</p>}
        </Bloco>

        <Bloco icone={Truck} titulo="Logística e mix">
          {mix.length ? (<>
            <Linha r="Participação Full (meta ≥ 40%)" v={pctFracao(partFull)} ruim={partFull != null && partFull < META_FULL} />
            <div className="space-y-2">
              {mix.map(([k, v]) => {
                const p = totMix ? v.faturamento / totMix : 0;
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between gap-2 text-xs tabular-nums">
                      <span className="truncate">{k === "sem_info" ? "Não informada" : LOGISTICA[k] ?? "Outro"}</span>
                      <span className="text-muted-foreground">{pctFracao(p)} · {num(v.pedidos)} pedidos</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary transition-[width] duration-200" style={{ width: `${p * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </>) : <p className="text-sm text-muted-foreground">Sem dado</p>}
        </Bloco>

        <Bloco icone={PackageX} titulo="Estoque · alerta de ruptura">
          {anuncios.isLoading || vendas.isLoading ? <Skeleton className="h-20 w-full" /> : !vendas.data || !anuncios.data ? (
            <p className="text-sm text-muted-foreground">Sem dado de vendas por anúncio agora.</p>
          ) : (<>
            <Linha r="Ruptura iminente" v={num(criticos.length)} ruim={criticos.length > 0} />
            <Linha r="Baixa cobertura" v={num(baixa)} />
            <Linha r="Anúncios ativos" v={num(lista.length)} />
            {criticos.slice(0, 3).map((r) => (
              <div key={r.itemId} className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
                <div className="min-w-0">
                  <a href={`https://produto.mercadolivre.com.br/MLB-${soDigitos(r.itemId)}`} target="_blank" rel="noreferrer" className="block truncate font-medium text-primary hover:underline">{r.titulo}</a>
                  <span className="tabular-nums text-muted-foreground">Estoque {num(r.estoque)} · cobre {num(r.cobertura, 1)} dias</span>
                </div>
              </div>
            ))}
          </>)}
        </Bloco>
      </div>
    </section>
  );
}
