import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useListingsQuality } from "@/hooks/useListingsQuality";
import { useEligibility } from "@/hooks/useEligibility";
import {
  montarPlanos,
  ordenarPlanos,
  CATEGORIA_LABEL,
  type AnuncioPlano,
  type AcaoCategoria,
  type Urgencia,
} from "@/lib/queries/planoAcaoAnuncio";

const URGENCIA_TONE: Record<
  Urgencia,
  { text: string; bg: string; border: string; emoji: string; label: string }
> = {
  critico: {
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/40",
    emoji: "🔴",
    label: "Crítico",
  },
  importante: {
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/40",
    emoji: "🟠",
    label: "Importante",
  },
  otimizacao: {
    text: "text-warning",
    bg: "bg-warning/5",
    border: "border-warning/30",
    emoji: "🟡",
    label: "Otimização",
  },
  ok: {
    text: "text-emerald",
    bg: "bg-emerald/10",
    border: "border-emerald/30",
    emoji: "✅",
    label: "OK",
  },
};

function ScoreBar({
  atual,
  potencial,
  temDados,
}: {
  atual: number | null;
  potencial: number | null;
  temDados: boolean;
}) {
  // Estado 1: sem nenhum dado
  if (!temDados && potencial === null) {
    return (
      <div className="flex items-center gap-2 min-w-[160px]">
        <div className="flex-1 h-2 rounded-full bg-muted/30" />
        <span className="text-[11px] italic text-muted-foreground shrink-0">
          Sem dados
        </span>
      </div>
    );
  }

  // Estado 2: sem IPI base, só ganho estimado (ex.: só CDP)
  if (atual === null && potencial !== null) {
    const p = Math.max(0, Math.min(100, potencial));
    return (
      <div className="flex items-center gap-2 min-w-[160px]">
        <div className="relative flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-cyan-700/60"
            style={{ width: `${p}%` }}
          />
        </div>
        <div className="text-[11px] font-mono tabular-nums whitespace-nowrap shrink-0">
          <span className="text-muted-foreground">?</span>
          <span className="text-cyan-400"> → +{p.toFixed(0)}pp</span>
        </div>
      </div>
    );
  }

  // Estado 3: IPI atual conhecido
  if (atual === null) return null;
  const a = Math.max(0, Math.min(100, atual));
  const p = potencial !== null ? Math.max(a, Math.min(100, potencial)) : a;
  const ganho = p - a;
  const corAtual =
    a >= 70 ? "bg-emerald" : a >= 50 ? "bg-warning" : "bg-destructive";
  const corTxt =
    a >= 70 ? "text-emerald" : a >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <div className="relative h-2 flex-1 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${corAtual} rounded-full`}
          style={{ width: `${a}%` }}
        />
        {ganho > 0 && (
          <div
            className="absolute inset-y-0 bg-cyan-400/50 rounded-r-full"
            style={{ left: `${a}%`, width: `${ganho}%` }}
          />
        )}
      </div>
      <div className="text-[11px] font-mono tabular-nums whitespace-nowrap shrink-0">
        <span className={corTxt}>{a.toFixed(0)}%</span>
        {ganho > 0 && (
          <span className="text-cyan-400"> → {p.toFixed(0)}%</span>
        )}
      </div>
    </div>
  );
}

function AnuncioRow({ anuncio }: { anuncio: AnuncioPlano }) {
  const [aberto, setAberto] = useState(false);
  const tone = URGENCIA_TONE[anuncio.urgencia];

  return (
    <>
      <tr
        className={`border-b border-border/40 cursor-pointer hover:bg-muted/30 ${tone.bg}`}
        onClick={() => setAberto((v) => !v)}
      >
        <td className="py-2 px-3">
          <div className="flex items-start gap-2">
            <span>{tone.emoji}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <a
                  href={anuncio.mlbLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-mono font-bold text-primary hover:underline"
                >
                  MLB{anuncio.item_id}
                  <ExternalLink className="inline w-3 h-3 ml-0.5" />
                </a>
              </div>
              {anuncio.item_name && (
                <div className="text-[11px] text-foreground/80 line-clamp-1 max-w-[280px]">
                  {anuncio.item_name}
                </div>
              )}
              {anuncio.vertical && (
                <div className="text-[10px] text-muted-foreground">
                  {anuncio.vertical}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="py-2 px-3">
          <ScoreBar
            atual={anuncio.score_atual}
            potencial={anuncio.score_potencial}
            temDados={anuncio.tem_dados_qualidade}
          />
        </td>
        <td className="py-2 px-3 text-right font-mono tabular-nums text-xs">
          {Math.round(anuncio.pedidos_7d).toLocaleString("pt-BR")}
        </td>
        <td className="py-2 px-3 text-right font-mono tabular-nums text-xs">
          {Math.round(anuncio.estoque_7d).toLocaleString("pt-BR")}
        </td>
        <td className="py-2 px-3 text-center text-xs font-mono tabular-nums">
          {anuncio.flag_optin_cdp ? (
            <span className="text-emerald">
              🎯 {(anuncio.desconto_atual / 100).toFixed(1)}%
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2 px-3">
          <div className="flex flex-wrap gap-1">
            {anuncio.acoes.slice(0, 4).map((a) => (
              <span
                key={a.id}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 border border-border"
                title={a.titulo}
              >
                {a.icone} {CATEGORIA_LABEL[a.categoria]}
              </span>
            ))}
            {anuncio.acoes.length > 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{anuncio.acoes.length - 4}
              </span>
            )}
            {anuncio.acoes.length === 0 && (
              <span className="text-[10px] text-emerald">Sem gaps</span>
            )}
          </div>
        </td>
        <td className="py-2 px-3 text-right text-muted-foreground">
          {aberto ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
        </td>
      </tr>
      {aberto && (
        <tr className="bg-card/60">
          <td colSpan={7} className="p-4 border-b border-border/40">
            {anuncio.acoes.length === 0 ? (
              <div className="text-xs text-emerald">
                ✅ Nenhuma ação necessária — anúncio dentro dos padrões.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">
                    Plano de ação — {anuncio.acoes.length} item
                    {anuncio.acoes.length !== 1 ? "s" : ""}
                  </span>
                  {anuncio.score_potencial !== null &&
                    anuncio.score_atual !== null &&
                    anuncio.score_potencial > anuncio.score_atual && (
                    <span className="text-[11px] text-cyan-400 font-mono">
                      Score potencial: {anuncio.score_potencial.toFixed(0)}% (+
                      {(anuncio.score_potencial - anuncio.score_atual).toFixed(0)}pp)
                    </span>
                  )}
                </div>
                {anuncio.acoes.map((acao, idx) => (
                  <div
                    key={acao.id}
                    className="flex gap-3 p-3 rounded-md border border-border/60 bg-muted/20"
                  >
                    <div className="flex flex-col items-center shrink-0 w-10">
                      <span className="text-xl">{acao.icone}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{acao.titulo}</span>
                        {acao.impactoScore > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/40 text-cyan-400 font-mono">
                            +{acao.impactoScore}pp score
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 border border-border text-muted-foreground">
                          {CATEGORIA_LABEL[acao.categoria]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          P{acao.prioridade}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground/85 leading-relaxed">
                        {acao.instrucao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

interface Props {
  sellerId?: string;
}

export default function PlanoAcaoAnuncioPanel({ sellerId }: Props) {
  const [filtro, setFiltro] = useState<"acoes" | "todos">("acoes");
  const [ordem, setOrdem] = useState<"urgencia" | "pedidos" | "potencial">(
    "urgencia",
  );

  const { data: qualities = [], isLoading: loadingQ } = useListingsQuality(sellerId);
  const { data: eligibilities = [], isLoading: loadingE } = useEligibility(sellerId);

  const planos = useMemo(() => {
    const todos = montarPlanos(qualities, eligibilities);
    const filtrado = filtro === "acoes" ? todos.filter((p) => p.acoes.length > 0) : todos;
    return ordenarPlanos(filtrado, ordem).slice(0, 80);
  }, [qualities, eligibilities, filtro, ordem]);

  const semQualidade = qualities.length === 0;
  const semElegibilidade = eligibilities.length === 0;

  const resumo = useMemo(() => {
    const map = new Map<AcaoCategoria, number>();
    for (const p of planos) {
      for (const a of p.acoes) map.set(a.categoria, (map.get(a.categoria) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [planos]);

  if (loadingQ || loadingE) {
    return (
      <div className="glass-card p-6 text-center text-sm text-muted-foreground">
        Carregando plano de ação por anúncio…
      </div>
    );
  }

  if (semQualidade && semElegibilidade) {
    return (
      <div className="glass-card p-6 text-center text-sm text-muted-foreground space-y-2">
        <p>Nenhum dado encontrado para este seller.</p>
        <p className="text-xs">
          Verifique se os arquivos de <span className="font-mono">seller_listings_quality</span>{" "}
          e <span className="font-mono">seller_eligibility</span> foram carregados.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Plano de Ação por Anúncio</h3>
          <p className="text-xs text-muted-foreground">
            Cruza qualidade do anúncio (LL scores) com vendas, estoque e CDP por MLB.
            Clique numa linha para ver as instruções específicas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as "acoes" | "todos")}
            className="text-xs rounded px-2 py-1 border border-border bg-card text-foreground"
          >
            <option value="acoes">Só com ações</option>
            <option value="todos">Todos os anúncios</option>
          </select>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as typeof ordem)}
            className="text-xs rounded px-2 py-1 border border-border bg-card text-foreground"
          >
            <option value="urgencia">Por urgência</option>
            <option value="pedidos">Por pedidos (7d)</option>
            <option value="potencial">Por ganho de score</option>
          </select>
        </div>
      </div>

      {semQualidade && !semElegibilidade && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 text-warning px-3 py-2 text-[11px]">
          ⚠️ <strong>Dados parciais:</strong> a tabela{" "}
          <span className="font-mono">seller_listings_quality</span> está vazia para este
          seller. Exibindo apenas dados de venda e CDP (elegibilidade). Scores de IPI,
          fotos, título e ficha técnica não estão disponíveis — carregue o arquivo de
          qualidade por anúncio para habilitar o diagnóstico completo.
        </div>
      )}

      {resumo.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] p-2 rounded-md border border-border/60 bg-muted/20">
          <span className="text-muted-foreground font-semibold">Mais frequentes:</span>
          {resumo.map(([cat, qtd]) => (
            <span
              key={cat}
              className="px-1.5 py-0.5 rounded bg-card border border-border font-mono"
            >
              {qtd}× {CATEGORIA_LABEL[cat]}
            </span>
          ))}
        </div>
      )}

      {planos.length === 0 ? (
        <div className="text-sm text-center text-muted-foreground py-8">
          {filtro === "acoes"
            ? "Nenhum gap encontrado — todos os anúncios com dados estão dentro dos padrões. 🎉"
            : "Nenhum anúncio para exibir."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-3 font-semibold">Anúncio</th>
                <th className="text-left py-2 px-3 font-semibold">
                  Score atual → potencial
                </th>
                <th className="text-right py-2 px-3 font-semibold">Pedidos 7d</th>
                <th className="text-right py-2 px-3 font-semibold">Estoque</th>
                <th className="text-center py-2 px-3 font-semibold">CDP</th>
                <th className="text-left py-2 px-3 font-semibold">Ações necessárias</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <AnuncioRow key={p.item_id} anuncio={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}