import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Camera, Type, Tag, Star, Award } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import GaugeChart from "./GaugeChart";

interface KpiLike {
  date: string;
  scorePhoto: number;
  scoreTitle: number;
  scoreOferta: number;
  scoreCaracteristica: number;
  scoreQualidade: number;
  scoreFull: number;
  scorePads: number;
  statusPhoto: string;
  statusTitle: string;
  productName: string;
  productId: string;
}

interface AuditPanelProps {
  kpis: KpiLike[];
}

const getScoreStatus = (score: number) => {
  if (score === 0) return { icon: AlertTriangle, label: "Sem dados", color: "text-muted-foreground", bg: "bg-muted/20" };
  if (score >= 80) return { icon: CheckCircle, label: "Excelente", color: "text-emerald", bg: "bg-emerald/10" };
  if (score >= 70) return { icon: CheckCircle, label: "Bom", color: "neon-text", bg: "bg-neon-blue/10" };
  if (score >= 50) return { icon: AlertTriangle, label: "Regular", color: "text-warning", bg: "bg-warning/10" };
  return { icon: XCircle, label: "Crítico", color: "text-destructive", bg: "bg-destructive/10" };
};

const AuditPanel = ({ kpis }: AuditPanelProps) => {
  // Get latest data per seller
  const latestByProduct = kpis.reduce<Record<string, KpiLike>>((acc, k) => {
    if (!acc[k.productId] || k.date > acc[k.productId].date) acc[k.productId] = k;
    return acc;
  }, {});

  const products = Object.values(latestByProduct);

  const avg = (field: keyof KpiLike) => {
    const valid = products.filter((p) => (p[field] as number) > 0);
    return valid.length > 0 ? valid.reduce((s, p) => s + (p[field] as number), 0) / valid.length : 0;
  };

  const avgPhoto = avg("scorePhoto");
  const avgTitle = avg("scoreTitle");
  const avgOferta = avg("scoreOferta");
  const avgCaracteristica = avg("scoreCaracteristica");
  const avgQualidade = avg("scoreQualidade");

  const checklist = [
    {
      label: "Qualidade de Fotos",
      score: avgPhoto,
      icon: Camera,
      tooltip: "Avaliação da qualidade das imagens dos anúncios. Inclui resolução, fundo branco e múltiplos ângulos.",
    },
    {
      label: "Qualidade de Título",
      score: avgTitle,
      icon: Type,
      tooltip: "Avaliação do título do anúncio: palavras-chave relevantes, comprimento adequado e clareza.",
    },
    {
      label: "Qualidade da Oferta",
      score: avgOferta,
      icon: Tag,
      tooltip: "Score geral da oferta incluindo preço, frete e condições de venda.",
    },
    {
      label: "Características Técnicas",
      score: avgCaracteristica,
      icon: Star,
      tooltip: "Preenchimento das fichas técnicas e atributos obrigatórios do produto.",
    },
    {
      label: "Qualidade Geral",
      score: avgQualidade,
      icon: Award,
      tooltip: "Score final de qualidade ponderando todos os critérios de avaliação do anúncio.",
    },
  ];

  const needsReview = products.filter(
    (p) => p.statusPhoto === "Revisar" || p.statusTitle === "Revisar"
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Gauges row */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground text-center flex-1">
            Scores de Auditoria
          </h3>
          <TooltipInfo text="Média dos scores de qualidade dos anúncios do seller no período mais recente." />
        </div>
        <div className="flex justify-center gap-10 flex-wrap">
          <GaugeChart value={Math.round(avgPhoto)} label="Fotos" color="blue" />
          <GaugeChart value={Math.round(avgTitle)} label="Título" color="emerald" />
          <GaugeChart value={Math.round(avgQualidade)} label="Qualidade" color="blue" />
        </div>
      </div>

      {/* Checklist */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Checklist de Auditoria
          </h3>
          <TooltipInfo text="Verificação automática dos critérios de qualidade de cada anúncio." />
        </div>

        <div className="space-y-2">
          {checklist.map((item, i) => {
            const status = getScoreStatus(item.score);
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center justify-between p-3.5 rounded-lg ${status.bg} transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${status.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  <TooltipInfo text={item.tooltip} />
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold text-lg ${status.color}`}>
                    {item.score > 0 ? item.score.toFixed(0) : "—"}
                  </span>
                  <span className={`status-badge text-[11px] ${
                    status.label === "Excelente" ? "bg-emerald/10 text-emerald border-emerald/20" :
                    status.label === "Bom" ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" :
                    status.label === "Regular" ? "bg-warning/10 text-warning border-warning/20" :
                    status.label === "Crítico" ? "bg-destructive/10 text-destructive border-destructive/20" :
                    "bg-muted/30 text-muted-foreground border-border"
                  }`}>
                    <status.icon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sellers needing review */}
      {needsReview.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Sellers para Revisão
            </h3>
            <span className="status-badge bg-destructive/10 text-destructive border-destructive/20">
              {needsReview.length} pendentes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Usuário / Loja</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Fotos</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Título</th>
                  <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {needsReview.map((p, idx) => (
                  <motion.tr
                    key={p.productId + idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium">{p.productName}</td>
                    <td className="text-center py-2.5 px-3">
                      <span className={`font-mono font-bold ${p.scorePhoto >= 70 ? "text-emerald" : "text-destructive"}`}>
                        {p.scorePhoto.toFixed(0)}
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <span className={`font-mono font-bold ${p.scoreTitle >= 70 ? "text-emerald" : "text-destructive"}`}>
                        {p.scoreTitle.toFixed(0)}
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-warning text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" /> Revisar
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AuditPanel;
