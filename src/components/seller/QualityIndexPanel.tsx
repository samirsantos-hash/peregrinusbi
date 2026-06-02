import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, AlertTriangle, Lightbulb } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  getQualityIndex,
  type PilarScore,
  type Topico,
  type StatusLevel,
} from "@/lib/queries/qualityIndex";

function statusTone(s: StatusLevel) {
  if (s === "ok") return { text: "text-emerald", bg: "bg-emerald/10", border: "border-emerald/30", bar: "bg-emerald" };
  if (s === "atencao") return { text: "text-warning", bg: "bg-warning/10", border: "border-warning/30", bar: "bg-warning" };
  return { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", bar: "bg-destructive" };
}

function statusEmoji(s: StatusLevel) {
  return s === "ok" ? "🟢" : s === "atencao" ? "🟡" : "🔴";
}

function ScoreBig({ score, nota }: { score: number; nota: string }) {
  const t = statusTone(score >= 70 ? "ok" : score >= 45 ? "atencao" : "critico");
  return (
    <div className={`flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 ${t.border} ${t.bg}`}>
      <span className={`text-4xl font-bold tabular-nums ${t.text}`}>{score}</span>
      <span className={`text-sm font-semibold ${t.text}`}>{nota}</span>
    </div>
  );
}

function TopicoRow({ topico }: { topico: Topico }) {
  const t = statusTone(topico.status);
  return (
    <div className={`rounded-lg border ${t.border} ${t.bg} p-3 space-y-2`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span>{statusEmoji(topico.status)}</span>
          <span className="text-xs font-semibold truncate">{topico.label}</span>
          <span className="text-[10px] text-muted-foreground font-mono truncate hidden md:inline">
            ({topico.fonte})
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono font-bold tabular-nums">{topico.valor}</span>
          <div className="w-24 h-1.5 bg-muted/40 rounded-full overflow-hidden">
            <div
              className={`h-full ${t.bar} rounded-full transition-all`}
              style={{ width: `${topico.score}%` }}
            />
          </div>
          <span className={`text-[11px] font-mono tabular-nums ${t.text} w-8 text-right`}>{topico.score}</span>
        </div>
      </div>
      {topico.status !== "ok" && (
        <p className={`text-[11px] flex items-start gap-1.5 ${t.text}`}>
          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{topico.acaoSugerida}</span>
        </p>
      )}
    </div>
  );
}

function PilarCard({
  pilar,
  expanded,
  onToggle,
}: {
  pilar: PilarScore;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = statusTone(pilar.status);
  return (
    <div className={`rounded-lg border ${t.border} bg-card overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-3 p-3 ${t.bg} hover:opacity-80 transition`}
      >
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          <span className="text-sm font-semibold truncate">{pilar.label}</span>
          <span className="text-[10px] text-muted-foreground">peso {(pilar.peso * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold tabular-nums ${t.text}`}>{pilar.score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.bg} ${t.text} border ${t.border}`}>
            {pilar.scoreNota}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {expanded && (
        <div className="p-3 space-y-2">
          {pilar.topicos.map((tp) => (
            <TopicoRow key={tp.id} topico={tp} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  custId?: string;
  sellerUuid?: string;
}

export default function QualityIndexPanel({ custId, sellerUuid }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: qi, isLoading } = useQuery({
    queryKey: ["quality-index-v2", custId, sellerUuid],
    queryFn: () => getQualityIndex(supabase, custId!, sellerUuid),
    enabled: !!custId,
  });

  const pilarMaisFraco = useMemo(
    () => (qi ? [...qi.pilares].sort((a, b) => a.score - b.score)[0] : null),
    [qi],
  );

  if (isLoading) {
    return <div className="glass-card p-6 text-center text-sm text-muted-foreground">Carregando Quality Index…</div>;
  }
  if (!qi) {
    return (
      <div className="glass-card p-6 text-center text-sm text-muted-foreground">
        Sem dados mensais (cpp_mensal) para este seller.
      </div>
    );
  }

  const tendenciaData = qi.tendencia.map((v, i) => ({ i, v }));
  const tGeral = statusTone(qi.scoreGeral >= 70 ? "ok" : qi.scoreGeral >= 45 ? "atencao" : "critico");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header: score geral + composição + sparkline */}
      <div className="glass-card p-6 flex flex-col lg:flex-row gap-6 items-center">
        <ScoreBig score={qi.scoreGeral} nota={qi.notaGeral} />
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Quality Index</h3>
              <p className="text-xs text-muted-foreground">
                Mês de referência: <span className="font-mono">{qi.mes}</span> · 4 pilares do algoritmo ML
              </p>
            </div>
          </div>

          {/* Barra de composição */}
          <div className="flex w-full h-3 rounded-full overflow-hidden border border-border">
            {qi.pilares.map((p) => {
              const tp = statusTone(p.status);
              return (
                <div
                  key={p.id}
                  className={tp.bar}
                  style={{ width: `${p.peso * 100}%` }}
                  title={`${p.label}: ${p.score}/100 (peso ${(p.peso * 100).toFixed(0)}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {qi.pilares.map((p) => (
              <span key={p.id} className="flex items-center gap-1">
                {statusEmoji(p.status)} {p.label.replace(/^\S+\s/, "")}:{" "}
                <span className="font-mono font-bold tabular-nums">{p.score}</span>
              </span>
            ))}
          </div>

          {qi.tendencia.length > 1 && (
            <div className="pt-2">
              <p className="text-[10px] text-muted-foreground mb-1">
                Tendência ({qi.tendencia.length} meses)
              </p>
              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tendenciaData}>
                    <XAxis dataKey="i" hide />
                    <Tooltip
                      contentStyle={{ fontSize: 11 }}
                      formatter={(v: number) => [`${v}/100`, "Quality Index"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke="currentColor"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      className={tGeral.text}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alertas críticos */}
      {qi.alertasCriticos.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm font-bold text-destructive flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Ações imediatas ({qi.alertasCriticos.length})
          </p>
          <ul className="space-y-1">
            {qi.alertasCriticos.map((a, i) => (
              <li key={i} className="text-xs text-destructive/90">• {a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Pilar mais fraco */}
      {pilarMaisFraco && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
          💡 <span className="font-semibold">Pilar mais fraco:</span> {pilarMaisFraco.label} ({pilarMaisFraco.score}/100).
          Melhorar este pilar tem o maior impacto relativo no score geral.
        </div>
      )}

      {/* Cards de pilar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {qi.pilares.map((p) => (
          <PilarCard
            key={p.id}
            pilar={p}
            expanded={expanded === p.id}
            onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
          />
        ))}
      </div>

      {/* Tabela resumo */}
      <div className="glass-card p-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 font-semibold">Pilar</th>
              <th className="text-right py-2 font-semibold">Score</th>
              <th className="text-right py-2 font-semibold">Nota</th>
              <th className="text-right py-2 font-semibold">Peso</th>
              <th className="text-right py-2 font-semibold">Contribuição</th>
            </tr>
          </thead>
          <tbody>
            {qi.pilares.map((p) => {
              const t = statusTone(p.status);
              return (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{p.label}</td>
                  <td className={`py-2 text-right font-mono font-bold tabular-nums ${t.text}`}>{p.score}</td>
                  <td className="py-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.bg} ${t.text} border ${t.border}`}>
                      {p.scoreNota}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">{(p.peso * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right font-mono tabular-nums">{(p.score * p.peso).toFixed(1)} pts</td>
                </tr>
              );
            })}
            <tr className="bg-muted/30 font-bold">
              <td className="py-2" colSpan={4}>Quality Index Total</td>
              <td className={`py-2 text-right font-mono text-base tabular-nums ${tGeral.text}`}>{qi.scoreGeral}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}