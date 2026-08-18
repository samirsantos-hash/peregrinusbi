import { useMemo, useState } from "react";
import { Target, Save, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TooltipInfo from "./TooltipInfo";
import { useToast } from "@/hooks/use-toast";
import { useEligibility } from "@/hooks/useEligibility";
import { useMetasLoja, useSalvarMeta, useRemoverMeta } from "@/hooks/useMetasLoja";
import { fmtBRL } from "@/utils/formatters";
import type { SellerKPI } from "@/hooks/useSellerData";

interface Props {
  sellerId: string;
  /** KPIs mensais consolidados da loja selecionada */
  kpis: SellerKPI[];
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function rotuloMes(mes: string) {
  const [ano, m] = mes.split("-");
  const idx = Number(m) - 1;
  return `${MESES[idx] ?? m}/${ano}`;
}

function pctAtingido(real: number, meta: number | null): number | null {
  if (meta == null || meta <= 0) return null;
  return (real / meta) * 100;
}

function corAtingimento(pct: number | null, inverso = false): string {
  if (pct == null) return "bg-muted/30 text-muted-foreground border-muted/40";
  const ok = inverso ? pct <= 100 : pct >= 100;
  const meio = inverso ? pct <= 130 : pct >= 80;
  if (ok) return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  if (meio) return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

function numeroOuNull(v: string): number | null {
  const limpo = v.replace(/\./g, "").replace(",", ".").trim();
  if (limpo === "") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

const MetasPanel = ({ sellerId, kpis }: Props) => {
  const { toast } = useToast();
  const { data: metas = [], isLoading } = useMetasLoja(sellerId);
  const salvar = useSalvarMeta();
  const remover = useRemoverMeta();
  const { data: eligibility = [] } = useEligibility(sellerId);

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  const [mes, setMes] = useState(mesAtual);
  const [fat, setFat] = useState("");
  const [clips, setClips] = useState("");
  const [repo, setRepo] = useState("");

  /** Real por mês, a partir dos KPIs mensais da loja */
  const realPorMes = useMemo(() => {
    const mapa = new Map<string, { faturamento: number; clips: number }>();
    for (const k of kpis) {
      const chave = String(k.date || "").slice(0, 7);
      if (!chave) continue;
      const atual = mapa.get(chave) || { faturamento: 0, clips: 0 };
      atual.faturamento += Number(k.tgmv || k.revenue || 0);
      atual.clips += Number(k.tgmvLcClips || 0);
      mapa.set(chave, atual);
    }
    return mapa;
  }, [kpis]);

  /** MLBs em risco de ruptura (snapshot atual da elegibilidade) */
  const mlbsEmRisco = useMemo(() => {
    const porMlb = new Map<string, { pedidos: number; estoque: number }>();
    for (const it of eligibility) {
      porMlb.set(String(it.itemId), {
        pedidos: Number(it.pedidos7d || 0),
        estoque: Number(it.estoqueMedio7d || 0),
      });
    }
    let risco = 0;
    porMlb.forEach(({ pedidos, estoque }) => {
      const diaria = pedidos / 7;
      if (diaria <= 0) return;
      if (estoque / diaria < 14) risco += 1;
    });
    return risco;
  }, [eligibility]);

  const linhas = useMemo(
    () =>
      metas.map((m) => {
        const real = realPorMes.get(m.mes) || { faturamento: 0, clips: 0 };
        const ehMesAtual = m.mes === mesAtual;
        return {
          ...m,
          realFaturamento: real.faturamento,
          realClips: real.clips,
          realReposicao: ehMesAtual ? mlbsEmRisco : null,
        };
      }),
    [metas, realPorMes, mesAtual, mlbsEmRisco],
  );

  const aoSalvar = async () => {
    if (!sellerId) return;
    try {
      await salvar.mutateAsync({
        sellerId,
        mes,
        metaFaturamento: numeroOuNull(fat),
        metaClips: numeroOuNull(clips),
        metaReposicao: numeroOuNull(repo),
      });
      toast({ title: "Meta salva", description: `Metas de ${rotuloMes(mes)} atualizadas.` });
      setFat("");
      setClips("");
      setRepo("");
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e?.message ?? "Erro desconhecido", variant: "destructive" });
    }
  };

  if (!sellerId) {
    return (
      <div className="rounded-lg border border-muted/20 bg-surface-alt p-6 text-sm text-muted-foreground">
        Selecione uma loja para definir e acompanhar metas.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Formulário */}
      <div className="rounded-lg border border-muted/20 bg-surface-alt p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-brand-blue" />
          <h3 className="text-sm font-semibold">Definir metas do mês</h3>
          <TooltipInfo text={"Metas por loja e por mês.\n\nFaturamento: meta de GMV total (TGMV) no mês — real vem dos KPIs mensais.\nClips: meta de faturamento atribuído a Clips (TGMV via Clips) no mês.\nReposição: teto de MLBs em risco de ruptura no Full (cobertura < 14 dias) — quanto menor o real, melhor.\n\nSalvar novamente o mesmo mês sobrescreve os valores."} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="col-span-2 lg:col-span-1">
            <label className="text-[11px] text-muted-foreground">Mês</label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Meta faturamento (R$)</label>
            <Input inputMode="decimal" placeholder="ex.: 250000" value={fat} onChange={(e) => setFat(e.target.value)} className="h-9 tnum" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Meta clips (R$)</label>
            <Input inputMode="decimal" placeholder="ex.: 30000" value={clips} onChange={(e) => setClips(e.target.value)} className="h-9 tnum" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Meta reposição (máx. MLBs em risco)</label>
            <Input inputMode="numeric" placeholder="ex.: 5" value={repo} onChange={(e) => setRepo(e.target.value)} className="h-9 tnum" />
          </div>
          <div className="flex items-end">
            <Button onClick={aoSalvar} disabled={salvar.isPending} className="h-9 w-full gap-1.5">
              {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Comparativo meta x real */}
      <div className="rounded-lg border border-muted/20 bg-surface-alt p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold">Meta x Real</h3>
          <TooltipInfo text={"Comparativo automático: a coluna Real usa os dados carregados na base (KPIs mensais e elegibilidade de estoque).\n\nReposição só tem real no mês corrente, porque a base de estoque é um retrato atual (últimos 7 dias)."} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando metas…</p>
        ) : linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada para esta loja.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-muted/20">
                  <th className="py-2 pr-3 font-medium">Mês</th>
                  <th className="py-2 pr-3 font-medium">Meta faturamento</th>
                  <th className="py-2 pr-3 font-medium">Real</th>
                  <th className="py-2 pr-3 font-medium">Atingido</th>
                  <th className="py-2 pr-3 font-medium">Meta clips</th>
                  <th className="py-2 pr-3 font-medium">Real clips</th>
                  <th className="py-2 pr-3 font-medium">Atingido</th>
                  <th className="py-2 pr-3 font-medium">Meta reposição</th>
                  <th className="py-2 pr-3 font-medium">MLBs em risco</th>
                  <th className="py-2 pr-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const pctFat = pctAtingido(l.realFaturamento, l.metaFaturamento);
                  const pctClips = pctAtingido(l.realClips, l.metaClips);
                  const pctRepo =
                    l.realReposicao == null ? null : pctAtingido(l.realReposicao, l.metaReposicao);
                  return (
                    <tr key={l.id} className="border-b border-muted/10 tnum">
                      <td className="py-2 pr-3 font-medium">{rotuloMes(l.mes)}</td>
                      <td className="py-2 pr-3">{l.metaFaturamento == null ? "—" : fmtBRL(l.metaFaturamento)}</td>
                      <td className="py-2 pr-3">{fmtBRL(l.realFaturamento)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={corAtingimento(pctFat)}>
                          {pctFat == null ? "sem meta" : `${pctFat.toFixed(0)}%`}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{l.metaClips == null ? "—" : fmtBRL(l.metaClips)}</td>
                      <td className="py-2 pr-3">{fmtBRL(l.realClips)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={corAtingimento(pctClips)}>
                          {pctClips == null ? "sem meta" : `${pctClips.toFixed(0)}%`}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{l.metaReposicao == null ? "—" : l.metaReposicao}</td>
                      <td className="py-2 pr-3">
                        {l.realReposicao == null ? (
                          <span className="text-muted-foreground">n/d</span>
                        ) : (
                          <Badge variant="outline" className={corAtingimento(pctRepo, true)}>
                            {l.realReposicao}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label={`Remover meta de ${rotuloMes(l.mes)}`}
                          onClick={() => remover.mutate({ id: l.id, sellerId })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetasPanel;
