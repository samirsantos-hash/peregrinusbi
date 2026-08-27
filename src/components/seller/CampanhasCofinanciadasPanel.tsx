import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, AlertTriangle, RefreshCw, CheckCircle2, Tag } from "lucide-react";
import type { EligibilityItem } from "@/hooks/useEligibility";
import TooltipInfo from "@/components/dashboard/TooltipInfo";
import {
  buildCampanhasCofinanciadas,
  PESO_CAMPANHA,
  LABEL_CAMPANHA,
  COR_PESO,
} from "@/lib/queries/campanhasCofinanciadas";

type Filtro = "todos" | "sem_optin" | "cofinanciada" | "pode_melhorar";

interface Props {
  items: EligibilityItem[];
}

export function CampanhasCofinanciadasPanel({ items }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("sem_optin");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const portfolio = useMemo(() => buildCampanhasCofinanciadas(items), [items]);

  const itensFiltrados = useMemo(() => {
    let lista = portfolio.itens;
    if (filtro === "sem_optin") lista = lista.filter((i) => i.cofinanciada && !i.optin);
    else if (filtro === "cofinanciada") lista = lista.filter((i) => i.cofinanciada);
    else if (filtro === "pode_melhorar") lista = lista.filter((i) => i.pode_melhorar);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(
        (i) =>
          i.item_name.toLowerCase().includes(q) ||
          i.campaign_id.toLowerCase().includes(q) ||
          i.item_id.toLowerCase().includes(q),
      );
    }
    return lista;
  }, [portfolio, filtro, busca]);

  const countByFilter = (f: Filtro) =>
    portfolio.itens.filter((i) =>
      f === "todos"
        ? true
        : f === "sem_optin"
        ? i.cofinanciada && !i.optin
        : f === "cofinanciada"
        ? i.cofinanciada
        : i.pode_melhorar,
    ).length;

  if (portfolio.itens.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-sm text-muted-foreground">
        Nenhuma campanha de promoção detectada para este seller.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Cabeçalho */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-neon-blue" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Campanhas de Promoção — Análise de Cofinanciamento
          </h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Campanhas cofinanciadas têm peso algorítmico maior — o ML promove ativamente os anúncios
          em que ele mesmo está investindo parte do desconto.
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              Cofinanciadas com opt-in
            </p>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {portfolio.cofinanciadas_com_optin}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            itens ativos com ML bancando parte do desconto
          </p>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
              Cofinanciadas SEM opt-in
            </p>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {portfolio.cofinanciadas_sem_optin}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            oportunidade imediata — ML pronto para cofinanciar
          </p>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-sky-500">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-sky-400" />
            <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
              Pode trocar por campanha melhor
            </p>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {portfolio.pode_melhorar}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            existe opção com desconto maior disponível
          </p>
        </div>
      </div>

      {/* Resumo por tipo */}
      <div className="glass-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Campanhas ativas por tipo
        </p>
        <div className="space-y-2">
          {Object.entries(portfolio.por_tipo)
            .sort((a, b) => (PESO_CAMPANHA[b[0]] ?? 1) - (PESO_CAMPANHA[a[0]] ?? 1))
            .map(([tipo, stats]) => {
              const peso = PESO_CAMPANHA[tipo] ?? 1;
              const cor = COR_PESO[peso];
              const cofi = stats.ml_medio > 0.5;
              return (
                <div
                  key={tipo}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2 border-b border-border/40 last:border-0"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-3 rounded-sm"
                        style={{ background: i < peso ? cor : "#1e293b" }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-foreground truncate">
                      {LABEL_CAMPANHA[tipo] ?? tipo}
                    </span>
                    {cofi && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                        ML cofinancia
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                    {stats.count} itens
                  </span>
                  <div className="text-[11px] font-mono tabular-nums whitespace-nowrap">
                    {cofi ? (
                      <>
                        <span className="text-red-400">Seller {stats.seller_medio.toFixed(1)}%</span>
                        <span className="text-muted-foreground"> + </span>
                        <span className="text-cyan-300">ML {stats.ml_medio.toFixed(1)}%</span>
                        <span className="text-muted-foreground"> = </span>
                        <span className="text-foreground font-semibold">
                          {(stats.seller_medio + stats.ml_medio).toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        Seller {stats.seller_medio.toFixed(1)}% (sem cofinanciamento)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Filtros + busca */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["sem_optin", "⚠️ Sem opt-in (prioridade)"],
            ["cofinanciada", "💰 Cofinanciadas"],
            ["pode_melhorar", "🔄 Pode melhorar"],
            ["todos", "Todos"],
          ] as [Filtro, string][]
        ).map(([f, label]) => {
          const active = filtro === f;
          return (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                background: active ? "#1e293b" : "transparent",
                borderColor: active ? "#3b82f6" : "#1e293b",
                color: active ? "#93c5fd" : "#94a3b8",
              }}
            >
              {label}
              <span className="ml-1.5 text-[10px] text-muted-foreground font-mono tabular-nums">
                ({countByFilter(f)})
              </span>
            </button>
          );
        })}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar item ou código da campanha…"
            className="text-xs pl-8 pr-3 py-1.5 rounded-lg border bg-card/60"
            style={{ borderColor: "#1e293b", color: "#cbd5e1", minWidth: 240 }}
          />
        </div>
      </div>

      {/* Tabela de itens */}
      <div className="glass-card p-3">
        <div className="grid grid-cols-[2.2fr_1.2fr_70px_90px_90px_110px_90px] gap-2 px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border">
          <div>Anúncio</div>
          <div>Código campanha</div>
          <div className="text-center">Peso</div>
          <div className="text-right">
            Seller
            <TooltipInfo text={"Desconto bancado pelo seller.\n\nFórmula: discount_seller_percentage ÷ 10 — a base grava em décimos de ponto percentual (82 = 8,2%; 30 = 3,0%).\n\nÉ a abertura de preço real do seller sobre o preço cheio do anúncio."} />
          </div>
          <div className="text-right">
            ML
            <TooltipInfo text={"Parte do desconto bancada pelo Mercado Livre.\n\nFórmula: (discount_total − discount_seller_percentage) ÷ 10, nunca negativa.\n\n'ML banca X%' = parte ML ÷ desconto total × 100, ou seja, quanto da abertura de preço não sai do bolso do seller."} />
          </div>
          <div className="text-right">
            Total
            <TooltipInfo text={"Desconto total visto pelo comprador.\n\nFórmula: discount_total ÷ 10 (décimos de p.p.; pisos típicos 30 = 3% e 50 = 5%).\n\nAbertura de preço total = Seller + ML. Preço final ≈ preço cheio × (1 − desconto total ÷ 100)."} />
          </div>
          <div className="text-center">Opt-in</div>
        </div>

        {itensFiltrados.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Nenhum item neste filtro.
          </div>
        ) : (
          itensFiltrados.slice(0, 100).map((item) => {
            const isOpen = expanded === item.item_id;
            const cor = COR_PESO[item.peso_algo];
            return (
              <div key={item.item_id} className="border-b border-border/40 last:border-0">
                <button
                  onClick={() => setExpanded(isOpen ? null : item.item_id)}
                  className="w-full grid grid-cols-[2.2fr_1.2fr_70px_90px_90px_110px_90px] gap-2 px-2 py-2.5 text-xs items-center hover:bg-card/40 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <div className="truncate text-foreground">
                      {item.item_name.length > 56
                        ? item.item_name.slice(0, 56) + "…"
                        : item.item_name || item.item_id}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{item.vertical}</span>
                      {item.pode_melhorar && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          🔄 campanha melhor disponível
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-foreground truncate">
                      {item.campaign_id || "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {LABEL_CAMPANHA[item.campaign_type] ?? item.campaign_type ?? "—"}
                    </div>
                  </div>
                  <div className="flex gap-0.5 justify-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-3 rounded-sm"
                        style={{ background: i < item.peso_algo ? cor : "#1e293b" }}
                      />
                    ))}
                  </div>
                  <div className="text-right font-mono tabular-nums text-red-400">
                    {item.discount_seller.toFixed(1)}%
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    {item.discount_ml > 0 ? (
                      <span className="text-cyan-300">+{item.discount_ml.toFixed(1)}%</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono tabular-nums text-foreground font-semibold">
                      {item.discount_total.toFixed(1)}%
                    </div>
                    {item.discount_ml > 0 && (
                      <div className="text-[9px] text-cyan-400">
                        ML banca {item.pct_ml.toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    {item.optin ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        ✓ Ativo
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        ⚠ Pendente
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pt-1 bg-card/30 space-y-3">
                    {/* Split visual */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                        Composição do desconto
                      </p>
                      <div className="flex h-3 rounded overflow-hidden bg-slate-800">
                        <div
                          style={{
                            width: `${
                              item.discount_total > 0
                                ? (item.discount_seller / item.discount_total) * 100
                                : 100
                            }%`,
                            background: "#ef4444",
                          }}
                          title={`Seller: ${item.discount_seller.toFixed(1)}%`}
                        />
                        {item.discount_ml > 0 && (
                          <div
                            style={{
                              width: `${(item.discount_ml / item.discount_total) * 100}%`,
                              background: "#22d3ee",
                            }}
                            title={`ML: ${item.discount_ml.toFixed(1)}%`}
                          />
                        )}
                      </div>
                      <div className="flex gap-3 mt-1.5 text-[10px] font-mono tabular-nums">
                        <span className="text-red-400">
                          Seller: {item.discount_seller.toFixed(1)}%
                        </span>
                        {item.discount_ml > 0 && (
                          <span className="text-cyan-300">
                            ML: {item.discount_ml.toFixed(1)}%
                          </span>
                        )}
                        <span className="text-foreground ml-auto">
                          Total comprador: {item.discount_total.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          Código campanha
                        </p>
                        <p className="font-mono text-foreground">{item.campaign_id || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          Visitas 7d
                        </p>
                        <p className="font-mono tabular-nums text-foreground">
                          {item.pedidos_7d.toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          Estoque médio 7d
                        </p>
                        <p className="font-mono tabular-nums text-foreground">
                          {item.estoque.toFixed(0)}
                        </p>
                      </div>
                    </div>

                    {item.pode_melhorar && (
                      <div className="p-2 rounded border border-sky-500/30 bg-sky-500/5">
                        <p className="text-[11px] text-sky-300 flex items-start gap-2">
                          <RefreshCw className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>
                            Existe campanha melhor disponível —{" "}
                            <span className="font-mono">{item.best_campaign_id}</span> com desconto
                            de <strong>{item.discount_best.toFixed(1)}%</strong> vs{" "}
                            <strong>{item.discount_total.toFixed(1)}%</strong> atual.
                          </span>
                        </p>
                      </div>
                    )}

                    {!item.optin && item.cofinanciada && (
                      <div className="p-2 rounded border border-amber-500/30 bg-amber-500/5">
                        <p className="text-[11px] text-amber-300 flex items-start gap-2">
                          <Tag className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>
                            Este anúncio está elegível a uma campanha cofinanciada mas{" "}
                            <strong>sem opt-in</strong>. O ML está pronto para bancar{" "}
                            <strong>{item.discount_ml.toFixed(1)}%</strong> do desconto — ative o
                            opt-in para receber o benefício algorítmico.
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {itensFiltrados.length > 100 && (
          <div className="py-3 text-center text-[11px] text-muted-foreground">
            Mostrando 100 de {itensFiltrados.length} itens. Use a busca para filtrar.
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default CampanhasCofinanciadasPanel;