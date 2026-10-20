import { useMemo } from "react";
import { analiseDiaria } from "@/lib/analiseDiaria";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { fmtBRLCompact } from "@/utils/formatters";
import NumeroAnimado from "@/components/ds/NumeroAnimado";

interface Props {
  kpis: { date: string; revenue: number }[];
  from?: string;
  to?: string;
}

const SalesRecordCard = ({ kpis, from, to }: Props) => {
  const a = useMemo(() => analiseDiaria(kpis, from, to), [kpis, from, to]);
  if (!a?.recorde) return <p className="text-sm text-muted-foreground">Sem série diária no período para calcular média e recorde.</p>;
  const [y, m, d] = a.recorde.date.split("-");
  const record = { date: `${d}/${m}/${y}`, value: a.recorde.revenue, media: a.media ?? 0 };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-5 h-full flex flex-col justify-center gap-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ec-ambar/10 border border-ec-ambar/20 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-ec-ambar" />
        </div>
        <p className="metric-label">Recorde de Vendas</p>
      </div>
      <div>
        <p className="metric-value text-foreground"><NumeroAnimado valor={fmtBRLCompact(record.value)} /></p>
        <p className="text-sm text-ec-ambar mt-1">em {record.date}</p>
      </div>
      <div className="pt-3 border-t border-border/40 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Média por dia</span>
          <span className="font-medium tabular-nums">{fmtBRLCompact(record.media)}</span>
        </div>
        <div className="flex justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Mediana diária observada</span>
          <span className="font-medium tabular-nums">{fmtBRLCompact(a.mediana ?? 0)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{a.diasComDado} de {a.dias} dias com registro. Média = faturamento ÷ {a.dias} dias do período; lacunas não entram na mediana.</p>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div className="h-full bg-ec-ambar/70" style={{ width: `${record.value > 0 ? Math.min(100, (record.media / record.value) * 100) : 0}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Recorde {record.media > 0 ? (record.value / record.media).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}x a média diária
        </p>
      </div>
    </motion.div>
  );
};

export default SalesRecordCard;
