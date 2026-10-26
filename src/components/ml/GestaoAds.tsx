import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Megaphone, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { KpiCard, RotuloSecao } from "@/components/ds";
import { useAuth } from "@/hooks/useAuth";
import { brl, num, pctFracao } from "@/lib/format";
import { useSouConsultor } from "@/lib/mlFuncoes";
import { cn } from "@/lib/utils";

type Campanha = {
  id: string;
  nome: string;
  status: string | null;
  orcamento_diario: number | null;
  meta_acos: number | null;
  meta_roas: number | null;
  investimento: number | null;
  vendas: number | null;
  cliques: number | null;
  impressoes: number | null;
  roas: number | null;
  acos: number | null;
  cpc: number | null;
  ctr: number | null;
};

type Resumo = {
  investimento: number | null;
  vendas: number | null;
  unidades: number | null;
  cliques: number | null;
  impressoes: number | null;
  roas: number | null;
  acos: number | null;
  cpc: number | null;
  ctr: number | null;
};

const DIAS = [7, 14, 30, 60, 90] as const;

const periodoBr = (inicio?: string, fim?: string, dias?: number) =>
  inicio && fim
    ? `${inicio.split("-").reverse().join("/")} a ${fim.split("-").reverse().join("/")}`
    : `${dias ?? 30} dias`;

/**
 * Product Ads ao vivo (API Mercado Livre via ml-gestao-ads).
 * Macro → Micro: big numbers da conta → lista de campanhas.
 */
export default function GestaoAds({ custId }: { custId: string }) {
  const [dias, setDias] = useState<(typeof DIAS)[number]>(30);
  const [status, setStatus] = useState<"todas" | "active" | "paused">("todas");
  const navigate = useNavigate();
  const { user } = useAuth();
  const souConsultor = useSouConsultor(user?.id);

  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["ml-gestao-ads", custId, dias],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ml-gestao-ads", { body: { cust_id: custId, dias } });
      let msg = data?.error as string | undefined;
      if (error && !msg) {
        try {
          msg = (await (error as any).context?.json())?.error;
        } catch {
          /* sem detalhe */
        }
      }
      if (error || msg) throw new Error(msg ?? "Não foi possível consultar as campanhas agora.");
      return data as {
        usa_ads: boolean;
        completo: boolean;
        periodo?: { inicio: string; fim: string };
        resumo: Resumo | null;
        campanhas: Campanha[];
      };
    },
  });

  /** Faturamento 30d do ML (ml_sync_tema) — denominador do TACOS da loja. */
  const { data: faturamento30d } = useQuery({
    queryKey: ["ml-faturamento-30d", custId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_sync_tema")
        .select("dados")
        .eq("cust_id", custId)
        .eq("tema", "vendas")
        .maybeSingle();
      if (error) throw error;
      const fat = Number((data?.dados as { faturamento_30d?: unknown } | null)?.faturamento_30d);
      return Number.isFinite(fat) && fat > 0 ? fat : null;
    },
  });

  const campanhas = useMemo(() => {
    const lista = (data?.campanhas ?? []).filter((c) => status === "todas" || c.status === status);
    return [...lista].sort((a, b) => (b.investimento ?? -1) - (a.investimento ?? -1));
  }, [data?.campanhas, status]);

  const r = data?.resumo;
  const per = periodoBr(data?.periodo?.inicio, data?.periodo?.fim, dias);

  /** TACOS = investimento Ads ÷ faturamento da loja (30d ML). Só alinha limpo com janela 30d. */
  const tacos = useMemo(() => {
    if (r?.investimento == null || !faturamento30d || faturamento30d <= 0) return null;
    return r.investimento / faturamento30d;
  }, [r?.investimento, faturamento30d]);

  const tacosRef =
    faturamento30d == null
      ? "Sem faturamento 30d do ML — sincronize vendas"
      : dias === 30
        ? `Investimento ÷ faturamento ML 30d (${brl(faturamento30d)})`
        : `Investimento (${dias}d) ÷ faturamento ML 30d (${brl(faturamento30d)}) · janelas distintas`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <RotuloSecao>1 · Product Ads · {per}</RotuloSecao>
          <p className="text-xs text-muted-foreground">Conta conectada · métricas ao vivo da API do Mercado Livre</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DIAS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={dias === d ? "default" : "outline"}
              onClick={() => setDias(d)}
              className="transition-transform duration-[120ms] active:scale-[0.98]"
            >
              {d} dias
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isFetching && "animate-spin")} />
            Consultar
          </Button>
          {souConsultor && (
            <Button size="sm" onClick={() => navigate("/publicidade")}>
              <Megaphone className="mr-1.5 h-3.5 w-3.5" />
              Gerenciar
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Consultando Product Ads…</p>
      ) : !data.usa_ads ? (
        <p className="text-sm text-muted-foreground">Esta loja não tem Product Ads ativo no Mercado Livre.</p>
      ) : (
        <>
          {/* Macro — um card por métrica; sem ROAS/ACOS repetidos no mesmo bloco */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              focal
              rotulo="Investimento"
              valor={brl(r?.investimento, true)}
              referencia={`${num(data.campanhas.length)} campanhas no período`}
            />
            <KpiCard
              rotulo="Vendas por Ads"
              valor={brl(r?.vendas)}
              referencia={`${num(r?.unidades)} unidades atribuídas`}
            />
            <KpiCard
              rotulo="ROAS"
              valor={r?.roas == null ? "Sem dado" : `${num(r.roas, 2)}x`}
              referencia="Vendas Ads ÷ investimento"
            />
            <KpiCard
              rotulo="ACOS"
              valor={pctFracao(r?.acos, 1)}
              referencia="Investimento ÷ vendas Ads"
              melhorQuando="descer"
            />
            <KpiCard
              rotulo="TACOS"
              valor={pctFracao(tacos, 1)}
              referencia={tacosRef}
              melhorQuando="descer"
            />
            <KpiCard
              rotulo="CPC"
              valor={r?.cpc == null ? "Sem dado" : brl(r.cpc, true)}
              referencia={`${num(r?.cliques)} cliques · CTR ${pctFracao(r?.ctr, 2)}`}
              melhorQuando="descer"
            />
          </div>

          {/* Micro — campanhas */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <RotuloSecao>2 · Campanhas · {per}</RotuloSecao>
                <p className="text-xs text-muted-foreground">
                  Detalhe por campanha · Part. TACOS = investimento da campanha ÷ faturamento 30d da loja
                </p>
              </div>
              <div className="flex gap-1.5">
                {(["todas", "active", "paused"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={status === s ? "default" : "outline"}
                    onClick={() => setStatus(s)}
                    className="transition-transform duration-[120ms] active:scale-[0.98]"
                  >
                    {s === "todas" ? "Todas" : s === "active" ? "Ativas" : "Pausadas"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-border [border-width:0.5px]">
              <table className="w-full text-xs tnum">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    {[
                      "Campanha",
                      "Situação",
                      "Orçamento/dia",
                      "Meta",
                      "Investimento",
                      "Vendas",
                      "ROAS",
                      "ACOS",
                      "Part. TACOS",
                      "Cliques",
                      "CPC",
                      "Leitura",
                    ].map((h) => (
                      <th key={h} className="p-2 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campanhas.map((c) => {
                    const metaRoas = c.meta_roas;
                    const partTacos =
                      c.investimento != null && faturamento30d && faturamento30d > 0
                        ? c.investimento / faturamento30d
                        : null;
                    const leitura =
                      c.investimento == null
                        ? "Sem dado"
                        : c.investimento === 0
                          ? "Sem gasto"
                          : c.vendas === 0
                            ? "Gasto sem venda"
                            : metaRoas != null && c.roas != null && c.roas < metaRoas
                              ? "Abaixo da meta"
                              : metaRoas != null && c.roas != null
                                ? "Na meta"
                                : "Sem meta";
                    return (
                      <tr key={c.id}>
                        <td className="p-2 font-medium max-w-[220px]">
                          <span className="block truncate" title={c.nome}>
                            {c.nome}
                          </span>
                        </td>
                        <td className="p-2">
                          {c.status === "active" ? "Ativa" : c.status === "paused" ? "Pausada" : c.status ?? "Sem dado"}
                        </td>
                        <td className="p-2">{c.orcamento_diario == null ? "Sem dado" : brl(c.orcamento_diario)}</td>
                        <td className="p-2">
                          {metaRoas != null
                            ? `ROAS ${num(metaRoas, 2)}x`
                            : c.meta_acos != null
                              ? `ACOS ${num(c.meta_acos, 1)}%`
                              : "Sem dado"}
                        </td>
                        <td className="p-2">{brl(c.investimento, true)}</td>
                        <td className="p-2">{brl(c.vendas, true)}</td>
                        <td className="p-2">{c.roas == null ? "Sem dado" : `${num(c.roas, 2)}x`}</td>
                        <td className="p-2">{pctFracao(c.acos, 1)}</td>
                        <td className="p-2">{pctFracao(partTacos, 2)}</td>
                        <td className="p-2">{num(c.cliques)}</td>
                        <td className="p-2">{c.cpc == null ? "Sem dado" : brl(c.cpc, true)}</td>
                        <td
                          className={cn(
                            "p-2",
                            (leitura === "Gasto sem venda" || leitura === "Abaixo da meta") && "font-medium text-destructive",
                          )}
                        >
                          {leitura}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {campanhas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma campanha neste filtro.</p>}
            {!data.completo && (
              <p className="text-xs text-muted-foreground">Mostrando as primeiras 1.000 campanhas da API.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
