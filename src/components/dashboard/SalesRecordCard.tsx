import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { fmtBRLCompact } from "@/utils/formatters";
import NumeroAnimado from "@/components/ds/NumeroAnimado";

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
    </motion.div>
  );
};

export default SalesRecordCard;
