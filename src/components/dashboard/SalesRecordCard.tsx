import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { fmtBRLCompact } from "@/utils/formatters";

interface Props {
  kpis: { date: string; revenue: number }[];
}

const SalesRecordCard = ({ kpis }: Props) => {
  const record = useMemo(() => {
    if (!kpis.length) return null;

    const byDate = kpis.reduce<Record<string, number>>((acc, k) => {
      acc[k.date] = (acc[k.date] || 0) + k.revenue;
      return acc;
    }, {});

    let maxDate = "";
    let maxVal = 0;
    for (const [date, val] of Object.entries(byDate)) {
      if (val > maxVal) {
        maxVal = val;
        maxDate = date;
      }
    }

    if (!maxDate) return null;

    const [y, m, d] = maxDate.split("-");
    const formatted = `${d}/${m}/${y}`;
    return { date: formatted, value: maxVal };
  }, [kpis]);

  if (!record) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-5 flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
        <Trophy className="w-6 h-6 text-amber-500" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Recorde de Vendas
        </p>
        <p className="text-lg font-bold text-foreground mt-0.5">
          {fmtBRLCompact(record.value)}{" "}
          <span className="text-sm font-normal text-amber-500">em {record.date}</span>
        </p>
      </div>
    </motion.div>
  );
};

export default SalesRecordCard;
