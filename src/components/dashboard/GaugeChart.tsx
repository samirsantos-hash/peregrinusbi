import { motion } from "framer-motion";

interface GaugeChartProps {
  value: number;
  label: string;
  color: "blue" | "emerald";
  max?: number;
}

const GaugeChart = ({ value, label, color, max = 100 }: GaugeChartProps) => {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75;
  const rotation = -225;

  const colorClass = color === "blue" ? "hsl(199, 100%, 50%)" : "hsl(160, 84%, 39%)";
  const glowColor = color === "blue" ? "hsl(199, 100%, 50%)" : "hsl(160, 84%, 39%)";

  const getStatus = (val: number) => {
    if (val >= 80) return { text: "Excelente", color: "hsl(160, 84%, 39%)" };
    if (val >= 70) return { text: "Bom", color: "hsl(199, 100%, 50%)" };
    if (val >= 50) return { text: "Regular", color: "hsl(40, 95%, 55%)" };
    return { text: "Crítico", color: "hsl(0, 84%, 60%)" };
  };

  const status = getStatus(value);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-40 h-40">
        <svg width="160" height="160" viewBox="0 0 160 160" className="transform">
          {/* Background arc */}
          <circle
            cx="80"
            cy="80"
            r="60"
            fill="none"
            stroke="hsl(215, 25%, 14%)"
            strokeWidth="12"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
            transform={`rotate(${rotation} 80 80)`}
          />
          {/* Value arc */}
          <motion.circle
            cx="80"
            cy="80"
            r="60"
            fill="none"
            stroke={colorClass}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeLinecap="round"
            transform={`rotate(${rotation} 80 80)`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold font-mono"
            style={{ color: status.color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {value}
          </motion.span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            / {max}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: status.color }}>
          {status.text}
        </p>
      </div>
    </div>
  );
};

export default GaugeChart;
