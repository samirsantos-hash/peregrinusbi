import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import { TIER_THRESHOLDS, type LojaClassificada } from "@/hooks/useClassificacaoLojas";

const TIER_COLOR: Record<1 | 2 | 3, string> = { 1: "#E5E4E2", 2: "#D4AF37", 3: "#9CA3AF" };
const TIER_NAME: Record<1 | 2 | 3, string> = { 1: "green_platinum", 2: "green_gold", 3: "green_silver" };

function TierBadge({ t }: { t: 1 | 2 | 3 | null }) {
  if (!t) return <Badge variant="outline" className="text-[10px] text-muted-foreground">n/d</Badge>;
  return (
    <Badge variant="outline" className="text-[10px] tabular-nums" style={{ borderColor: TIER_COLOR[t], color: TIER_COLOR[t] }}>
      T{t} · {TIER_NAME[t]}
    </Badge>
  );
}

function MetricRow({ label, value, alvo, ok, suffix = "%", invert = false }: {
  label: string; value: number | null; alvo: string; ok: "ok" | "fail" | "na"; suffix?: string; invert?: boolean;
}) {
  const Icon = ok === "ok" ? CheckCircle2 : ok === "fail" ? AlertTriangle : MinusCircle;
  const color = ok === "ok" ? "#16A34A" : ok === "fail" ? "#DC2626" : "hsl(var(--muted-foreground))";
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2 tabular-nums">
        <span className="font-medium" style={{ color }}>
          {value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(2)}${suffix}`}
        </span>
        <span className="text-[10px] text-muted-foreground">{invert ? "≤" : "≥"} {alvo}</span>
      </div>
    </div>
  );
}

export default function TierComparePanel({ lojas }: { lojas: LojaClassificada[] }) {
  const [busca, setBusca] = useState("");
  const [filtroDiverg, setFiltroDiverg] = useState<"all" | "div" | "agree" | "rep_only" | "met_only">("all");
  const [sellerId, setSellerId] = useState<string>("");

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lojas.filter((l) => {
      if (q && !l.nickname.toLowerCase().includes(q) && !String(l.custId).includes(q)) return false;
      if (filtroDiverg === "div") return l.tierByRep && l.tierByMetricas && l.tierByRep !== l.tierByMetricas;
      if (filtroDiverg === "agree") return l.tierByRep && l.tierByMetricas && l.tierByRep === l.tierByMetricas;
      if (filtroDiverg === "rep_only") return l.tierByRep && !l.tierByMetricas;
      if (filtroDiverg === "met_only") return !l.tierByRep && l.tierByMetricas;
      return true;
    });
  }, [lojas, busca, filtroDiverg]);

  const selecionada = filtradas.find((l) => l.sellerId === sellerId) ?? filtradas[0];

  // Resumo de divergência
  const stats = useMemo(() => {
    let agree = 0, div = 0, repOnly = 0, metOnly = 0, sem = 0;
    lojas.forEach((l) => {
      if (l.tierByRep && l.tierByMetricas) { l.tierByRep === l.tierByMetricas ? agree++ : div++; }
      else if (l.tierByRep) repOnly++;
      else if (l.tierByMetricas) metOnly++;
      else sem++;
    });
    return { agree, div, repOnly, metOnly, sem };
  }, [lojas]);

  if (!lojas.length) return null;

  const renderCard = (titulo: string, tier: 1 | 2 | 3 | null, fonteLabel: string, isAtiva: boolean, body: React.ReactNode) => (
    <div
      className="rounded-xl border bg-background p-4 flex flex-col gap-3"
      style={{ borderColor: isAtiva ? (tier ? TIER_COLOR[tier] : "hsl(var(--border))") : "hsl(var(--border))", borderWidth: isAtiva ? 2 : 1 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{titulo}</p>
          <div className="mt-1"><TierBadge t={tier} /></div>
        </div>
        {isAtiva && <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30" variant="outline">FONTE ESCOLHIDA</Badge>}
      </div>
      <p className="text-[10px] text-muted-foreground -mt-2">{fonteLabel}</p>
      <div className="space-y-0">{body}</div>
    </div>
  );

  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">Comparativo por loja — Reputação vs Métricas oficiais</h3>
          <p className="text-[11px] text-muted-foreground">Veja lado a lado o tier que cada fonte atribuiria e por quê. A fonte escolhida segue a prioridade Reputação → Métricas → Receita.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[10px] flex items-center gap-3">
            <span className="text-emerald-500">● {stats.agree} concordam</span>
            <span className="text-amber-500">● {stats.div} divergem</span>
            <span className="text-muted-foreground">● {stats.repOnly} só rep · {stats.metOnly} só métricas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <Input placeholder="Buscar por loja ou CUST_ID…" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-8 text-xs" />
        <Select value={filtroDiverg} onValueChange={(v) => setFiltroDiverg(v as any)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="div">Apenas divergentes</SelectItem>
            <SelectItem value="agree">Apenas concordantes</SelectItem>
            <SelectItem value="rep_only">Só com Reputação</SelectItem>
            <SelectItem value="met_only">Só com Métricas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selecionada?.sellerId ?? ""} onValueChange={setSellerId}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar loja" /></SelectTrigger>
          <SelectContent>
            {filtradas.slice(0, 200).map((l) => {
              const div = l.tierByRep && l.tierByMetricas && l.tierByRep !== l.tierByMetricas;
              return (
                <SelectItem key={l.sellerId} value={l.sellerId}>
                  {div ? "⚠ " : ""}{l.nickname} · {l.custId} {l.tierByRep ? `· Rep T${l.tierByRep}` : ""} {l.tierByMetricas ? `· Met T${l.tierByMetricas}` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {!selecionada ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Nenhuma loja para o filtro atual.</p>
      ) : (() => {
        const l = selecionada;
        const fonteLbl = (k: LojaClassificada["tierFonte"]) =>
          k === "reputacao" ? "Lida do campo rep_current_level no DB."
          : k === "metricas" ? "Calculada com %SoW Pads, %OOS e %BS do último mês."
          : "Sem reputação nem métricas — ranking por receita do último mês.";
        const repFonte = l.tierByRep ? "Lida do campo rep_current_level (último visto)." : "Sem rep_current_level no histórico.";
        const metFonte = l.tierByMetricas ? "Avaliada vs. thresholds oficiais Tier 1/2/3." : "Sem dados suficientes (OOS e/ou BS ausentes).";
        const divergente = l.tierByRep && l.tierByMetricas && l.tierByRep !== l.tierByMetricas;

        return (
          <>
            <div className="flex items-center justify-between mb-3 px-2">
              <div>
                <p className="text-sm font-medium">{l.nickname} <span className="text-muted-foreground text-[11px]">· {l.custId}</span></p>
                <p className="text-[10px] text-muted-foreground">{l.cluster}{l.subCluster && l.subCluster !== "—" ? ` · ${l.subCluster}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Tier final</span>
                <TierBadge t={l.tier} />
                <span className="text-[10px] text-muted-foreground">via {l.tierFonte}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {renderCard(
                "1) Pela Reputação (oficial MeLi)",
                l.tierByRep,
                repFonte,
                l.tierFonte === "reputacao",
                <>
                  <div className="flex items-center justify-between text-[11px] py-1">
                    <span className="text-muted-foreground">rep_current_level</span>
                    <span className="font-medium">{l.repLevel ?? "—"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-2 leading-relaxed">
                    Mapeamento direto: <b>platinum→T1</b>, <b>gold→T2</b>, <b>silver→T3</b>.
                    Reflete a avaliação consolidada do MeLi (entregas, cancelamentos, reclamações etc.).
                  </p>
                </>
              )}

              {renderCard(
                "2) Pelas métricas (cálculo local)",
                l.tierByMetricas,
                metFonte,
                l.tierFonte === "metricas",
                <>
                  <MetricRow
                    label="%SoW Pads"
                    value={l.metricas.sowPadsPct}
                    alvo={`${TIER_THRESHOLDS[l.tierByMetricas ?? 3].sowPads}%`}
                    ok={l.tierChecks.sowPads}
                  />
                  <MetricRow
                    label="%OOS"
                    value={l.tierChecks.oos === "na" ? null : l.metricas.oosPct}
                    alvo={`${TIER_THRESHOLDS[l.tierByMetricas ?? 3].oos}%`}
                    ok={l.tierChecks.oos}
                    invert
                  />
                  <MetricRow
                    label="%BS"
                    value={l.tierChecks.bs === "na" ? null : l.metricas.bsPct}
                    alvo={`${TIER_THRESHOLDS[l.tierByMetricas ?? 3].bs}%`}
                    ok={l.tierChecks.bs}
                    invert
                  />
                  <p className="text-[10px] text-muted-foreground pt-2 leading-relaxed">
                    Tier exigido por <i>todos</i> os 3 critérios simultaneamente. Falha em qualquer um rebaixa para o próximo nível.
                  </p>
                </>
              )}
            </div>

            {divergente && (
              <div className="mt-3 p-3 rounded-md border border-amber-500/40 bg-amber-500/5 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-amber-500">Divergência:</span>{" "}
                  Reputação aponta <b>T{l.tierByRep}</b> mas as métricas apontariam <b>T{l.tierByMetricas}</b>.
                  Como a reputação é a fonte oficial do MeLi, ela prevalece — mas as métricas indicam onde
                  atuar para sustentar/melhorar o nível.
                  <span className="inline-flex items-center gap-1 ml-1 text-muted-foreground"><ArrowRight className="w-3 h-3" /> revisar critérios em vermelho acima.</span>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </Card>
  );
}