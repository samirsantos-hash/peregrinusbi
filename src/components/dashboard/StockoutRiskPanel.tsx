import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Package, Copy, CheckCircle, ExternalLink, AlertTriangle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TooltipInfo from "./TooltipInfo";
import { useEligibility, type EligibilityItem } from "@/hooks/useEligibility";

interface Props {
  sellerId?: string;
}

type Row = EligibilityItem & {
  vendas7d: number;
  vendaDiaria: number;
  coberturaDias: number;
  reposicao4semanas: number;
  severidade: "critical" | "warn" | "ok";
};

function classify(item: EligibilityItem): Row {
  const vendas7d = item.pedidos7d || 0;
  const vendaDiaria = vendas7d / 7;
  const estoque = item.estoqueMedio7d || 0;
  const cobertura = vendaDiaria > 0 ? estoque / vendaDiaria : Infinity;
  // Recomendação: cobrir 4 semanas (28 dias) de venda, descontando o estoque atual.
  const alvo = Math.ceil(vendaDiaria * 28);
  const reposicao = Math.max(0, alvo - Math.round(estoque));
  let sev: Row["severidade"] = "ok";
  if (vendas7d > 0 && cobertura < 7) sev = "critical";
  else if (vendas7d > 0 && cobertura < 14) sev = "warn";
  return {
    ...item,
    vendas7d,
    vendaDiaria: Math.round(vendaDiaria * 100) / 100,
    coberturaDias: Number.isFinite(cobertura) ? Math.round(cobertura * 10) / 10 : 999,
    reposicao4semanas: reposicao,
    severidade: sev,
  };
}

function dedupeByMlb(items: EligibilityItem[]): EligibilityItem[] {
  const byMlb = new Map<string, EligibilityItem>();
  for (const it of items) {
    const key = String(it.itemId);
    const prev = byMlb.get(key);
    if (!prev) { byMlb.set(key, it); continue; }
    const prevT = prev.data ? new Date(prev.data).getTime() : 0;
    const curT = it.data ? new Date(it.data).getTime() : 0;
    byMlb.set(key, curT >= prevT ? it : prev);
  }
  return Array.from(byMlb.values());
}

const sevColor: Record<Row["severidade"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  warn: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

const sevLabel: Record<Row["severidade"], string> = {
  critical: "Ruptura iminente",
  warn: "Baixa cobertura",
  ok: "Cobertura ok",
};

const StockoutRiskPanel = ({ sellerId }: Props) => {
  const { data: items = [], isLoading } = useEligibility(sellerId);
  const [copied, setCopied] = useState<string | null>(null);
  const [onlyRisk, setOnlyRisk] = useState(true);

  const rows = useMemo(() => {
    const unique = dedupeByMlb(items);
    const scored = unique.map(classify)
      .filter((r) => r.vendas7d > 0) // só faz sentido para itens com venda observada
      .sort((a, b) => {
        const sevRank = { critical: 0, warn: 1, ok: 2 } as const;
        if (sevRank[a.severidade] !== sevRank[b.severidade])
          return sevRank[a.severidade] - sevRank[b.severidade];
        return b.vendas7d - a.vendas7d;
      });
    return scored;
  }, [items]);

  const displayed = onlyRisk ? rows.filter((r) => r.severidade !== "ok") : rows;

  const doCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const copyBtn = (key: string, label: string, buildText: () => string) => {
    const active = copied === key;
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => doCopy(key, buildText())}
        className="gap-1.5 text-xs h-7"
      >
        {active ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        {active ? "Copiado" : label}
      </Button>
    );
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 text-center text-sm text-muted-foreground">
        Carregando itens…
      </div>
    );
  }

  if (!items.length) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 text-center">
        <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Sem base de elegibilidade por MLB para este seller.</p>
      </motion.div>
    );
  }

  const criticalCount = rows.filter((r) => r.severidade === "critical").length;
  const warnCount = rows.filter((r) => r.severidade === "warn").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Risco de Ruptura & Recomendação Full
              </h3>
              <TooltipInfo text={
                "Lista por MLB com vendas observadas nos últimos 7 dias (snapshot de elegibilidade — hoje temos ~2 semanas de histórico, então usamos janela de 7d).\n\n" +
                "• Cobertura (dias) = estoque médio 7d ÷ (vendas 7d ÷ 7). < 7d = ruptura iminente; 7–14d = baixa cobertura.\n" +
                "• Recomendação de envio p/ 4 semanas = teto de venda diária × 28 − estoque atual (nunca negativo). É o volume a mandar para o Full para cobrir ~28 dias no ritmo atual.\n\n" +
                "Use os botões abaixo para copiar rapidamente MLBs, títulos, vendas 7d ou o plano de reposição."
              } />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {rows.length} itens com venda 7d ·
              {" "}<span className="text-destructive font-medium">{criticalCount} ruptura</span> ·
              {" "}<span className="text-amber-400 font-medium">{warnCount} baixa cobertura</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOnlyRisk((v) => !v)}
              className="text-xs h-7"
            >
              {onlyRisk ? "Ver todos" : "Somente em risco"}
            </Button>
            {copyBtn("mlbs", "MLBs", () => displayed.map((r) => r.itemId).join("\n"))}
            {copyBtn("titulos", "Títulos", () => displayed.map((r) => r.itemName || r.itemId).join("\n"))}
            {copyBtn("vendas", "Vendas 7d", () =>
              displayed.map((r) => `${r.itemId}\t${r.vendas7d}`).join("\n"))}
            {copyBtn("plano", "Plano Full", () =>
              displayed
                .filter((r) => r.reposicao4semanas > 0)
                .map((r) => `${r.itemId}\t${r.reposicao4semanas}`)
                .join("\n"))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rows = displayed.map((r) => ({
                  MLB: r.itemId,
                  "Título": r.itemName || "",
                  "Vendas 7d": r.vendas7d,
                  "Venda diária (méd.)": r.vendaDiaria,
                  "Estoque atual": Math.round(r.estoqueMedio7d),
                  "Cobertura (dias)": r.coberturaDias >= 999 ? "∞" : r.coberturaDias,
                  "Profundidade alvo (dias)": 28,
                  "Envio p/ Full (4 sem.)": r.reposicao4semanas,
                  "Status": sevLabel[r.severidade],
                  "Link ML": r.mlbLink || "",
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                ws["!cols"] = [
                  { wch: 14 }, { wch: 48 }, { wch: 10 }, { wch: 16 },
                  { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
                  { wch: 18 }, { wch: 40 },
                ];
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Reposição Full");
                const today = new Date().toISOString().slice(0, 10);
                XLSX.writeFile(wb, `reposicao-full-${today}.xlsx`);
              }}
              className="gap-1.5 text-xs h-7"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar planilha
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2 px-2 font-medium">MLB</th>
                <th className="text-left py-2 px-2 font-medium">Título</th>
                <th className="text-right py-2 px-2 font-medium">Vendas 7d</th>
                <th className="text-right py-2 px-2 font-medium">Estoque</th>
                <th className="text-right py-2 px-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Cobertura
                    <TooltipInfo text="Dias de estoque no ritmo de venda dos últimos 7d." />
                  </span>
                </th>
                <th className="text-right py-2 px-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Enviar p/ Full (4 sem.)
                    <TooltipInfo text="Quantidade sugerida a enviar ao Full para cobrir 4 semanas no ritmo de venda atual, descontando o estoque presente." />
                  </span>
                </th>
                <th className="text-center py-2 px-2 font-medium">Status</th>
                <th className="text-center py-2 px-2 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody>
              {displayed.slice(0, 100).map((r) => (
                <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                  <td className="py-1.5 px-2 font-mono text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      {r.itemId}
                      <button
                        type="button"
                        title="Copiar MLB"
                        aria-label={`Copiar MLB ${r.itemId}`}
                        onClick={() => doCopy(`row-${r.id}`, String(r.itemId))}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied === `row-${r.id}`
                          ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                          : <Copy className="w-3 h-3" />}
                      </button>
                    </span>
                  </td>
                  <td className="py-1.5 px-2 max-w-[280px] truncate text-foreground/90" title={r.itemName}>
                    {r.itemName || "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{r.vendas7d}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                    {Math.round(r.estoqueMedio7d)}
                  </td>
                  <td className={`py-1.5 px-2 text-right tabular-nums font-medium ${
                    r.severidade === "critical" ? "text-destructive" :
                    r.severidade === "warn" ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {r.coberturaDias >= 999 ? "∞" : `${r.coberturaDias.toFixed(1)}d`}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-semibold">
                    {r.reposicao4semanas > 0 ? r.reposicao4semanas : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <Badge variant="outline" className={`text-[10px] ${sevColor[r.severidade]}`}>
                      {r.severidade === "critical" && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                      {sevLabel[r.severidade]}
                    </Badge>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {r.mlbLink && (
                      <a href={r.mlbLink} target="_blank" rel="noreferrer" className="text-neon-blue hover:opacity-80">
                        <ExternalLink className="w-3.5 h-3.5 inline" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayed.length > 100 && (
            <p className="text-[10px] text-muted-foreground mt-2 text-right">
              Mostrando os 100 primeiros de {displayed.length}. Use os botões de cópia para levar a lista completa.
            </p>
          )}
          {displayed.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum item em risco de ruptura no momento.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StockoutRiskPanel;