import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export type KpiId = "tgmv" | "sellers_ativos" | "ticket_medio" | "queda" | "crescimento" | "vencimento";

export interface KpiCardProps {
  id: KpiId;
  titulo: string;
  valor: string;
  delta?: { pct: number; direcao: "up" | "down" | "flat" };
  sparkline: number[];
  severidade?: "neutro" | "positivo" | "atencao" | "critico";
  /** procedência do número: estimador usado, faixa e n (regra transversal das OS) */
  nota?: string;
  selected?: boolean;
  onExpandir: (id: KpiId) => void;
}

const SEVER_BORDER: Record<string, string> = {
  neutro: "hsl(var(--border))",
  positivo: "#16A34A",
  atencao: "#F59E0B",
  critico: "#DC2626",
};

const KpiCard = ({ id, titulo, valor, delta, sparkline, severidade = "neutro", nota, selected, onExpandir }: KpiCardProps) => {
  const sparkData = sparkline.map((v, i) => ({ i, v }));
  const sparkColor = severidade === "critico" ? "#DC2626" : severidade === "atencao" ? "#F59E0B" : severidade === "positivo" ? "#16A34A" : "hsl(var(--primary))";

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={() => onExpandir(id)}
      className={`relative text-left rounded-lg border bg-card p-4 transition-shadow cursor-pointer focus:outline-none ${
        selected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: SEVER_BORDER[severidade] }}
      aria-label={`KPI ${titulo}: ${valor}`}
    >
      <p className="text-[11px] text-muted-foreground leading-tight">{titulo}</p>
      <div className="flex items-end justify-between mt-1 gap-2">
        <p className="text-lg font-bold tabular-nums leading-none">{valor}</p>
        {sparkData.length > 1 && (
          <div className="w-[60px] h-[24px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {nota && <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{nota}</p>}
      {delta && (
        <div className={`inline-flex items-center gap-0.5 mt-1 text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
          delta.direcao === "up" ? "bg-green-500/15 text-green-400" :
          delta.direcao === "down" ? "bg-red-500/15 text-red-400" :
          "bg-muted text-muted-foreground"
        }`}>
          {delta.direcao === "up" ? <TrendingUp className="w-3 h-3" /> : delta.direcao === "down" ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {delta.pct >= 0 ? "+" : ""}{delta.pct.toFixed(1)}%
        </div>
      )}
    </motion.button>
  );
};

export default KpiCard;