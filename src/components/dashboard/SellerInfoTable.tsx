import { motion } from "framer-motion";
import { CalendarDays, Clock, Layers, Tag, MapPin } from "lucide-react";
import TooltipInfo from "./TooltipInfo";

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface Props {
  seller?: { cluster?: string; subCluster?: string; state?: string } | null;
  allKpis: { date?: string }[];
}

const SellerInfoTable = ({ seller, allKpis }: Props) => {
  if (!seller) return null;

  const dates = allKpis.map((k: any) => k.date).filter(Boolean).sort() as string[];
  const latest = dates[dates.length - 1];
  const safra = latest
    ? (() => {
        const s = parseLocalDate(latest).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        return s.charAt(0).toUpperCase() + s.slice(1);
      })()
    : "—";

  let tempoPrograma = "—";
  if (dates.length >= 2) {
    const first = parseLocalDate(dates[0]);
    const last = parseLocalDate(dates[dates.length - 1]);
    const months = Math.max(1, Math.round((last.getTime() - first.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    tempoPrograma = `${months} ${months === 1 ? "mês" : "meses"}`;
  }

  const rows = [
    {
      icon: CalendarDays,
      label: "Safra",
      value: safra,
      tooltip: "Mês/ano mais recente de dados disponíveis para este seller. Referência para todas as análises.",
    },
    {
      icon: Clock,
      label: "Tempo no Programa",
      value: tempoPrograma,
      tooltip: "Meses decorridos desde o primeiro registro de KPI do seller no programa Peregrinus.",
    },
    {
      icon: Layers,
      label: "Segmentação",
      value: seller.cluster || "—",
      tooltip: "Cluster estratégico do seller (Emerging, Core, Mature) — define as metas e benchmarks aplicados.",
    },
    {
      icon: Tag,
      label: "Sub Categoria",
      value: seller.subCluster || "—",
      tooltip: "Subclassificação dentro do cluster principal — usada para comparações intra-vertical.",
    },
    {
      icon: MapPin,
      label: "Localização",
      value: seller.state || "—",
      tooltip: "UF de origem da operação do seller — impacta prazos logísticos e disponibilidade Full.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-neon-blue rounded-full" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Informações do Seller
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-2 border-b border-border/40 last:border-b-0 md:[&:nth-last-child(2)]:border-b-0"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <r.icon className="w-3.5 h-3.5" />
              <span>{r.label}</span>
              <TooltipInfo text={r.tooltip} />
            </div>
            <span className="text-xs font-medium text-foreground truncate max-w-[60%] text-right">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SellerInfoTable;