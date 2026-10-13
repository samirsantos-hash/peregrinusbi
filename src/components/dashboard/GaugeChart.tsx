import { BandBar } from "@/components/ds";

interface GaugeChartProps {
  value: number;
  label: string;
  color?: "blue" | "emerald";
  max?: number;
}

/** Antigo medidor circular: agora barra com quatro faixas (Sistema de Design Peregrinus). */
const GaugeChart = ({ value, label, max = 100 }: GaugeChartProps) => (
  <BandBar valor={value} max={max} limiares={[50 * max / 100, 70 * max / 100, 80 * max / 100]} rotulo={label} className="w-full" />
);

export default GaugeChart;
