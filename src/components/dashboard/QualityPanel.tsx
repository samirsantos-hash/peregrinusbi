import { motion } from "framer-motion";
import GaugeChart from "./GaugeChart";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface KpiLike {
  date: string;
  scorePhoto: number;
  scoreTitle: number;
  statusPhoto: string;
  statusTitle: string;
  productName: string;
  productId: string;
}

interface QualityPanelProps {
  kpis: KpiLike[];
}

/** Normaliza e arredonda o valor para 0-100 */
function normalizeScore(value: number): number {
  const num = Number(value) || 0;
  if (num > 0 && num <= 1) {
    return Math.round(num * 100);
  }
  return Math.min(100, Math.max(0, Math.round(num)));
}

/** Retorna o status baseado no score normalizado */
function getStatus(score: number): { label: string; severity: "critical" | "warning" | "success" } {
  if (score <= 40) return { label: "Crítico", severity: "critical" };
  if (score <= 70) return { label: "Atenção", severity: "warning" };
  return { label: "Saudável", severity: "success" };
}

const QualityPanel = ({ kpis }: QualityPanelProps) => {
  // Get latest data per product/seller
  const latestByProduct = kpis.reduce<Record<string, KpiLike>>((acc, k) => {
    if (!acc[k.productId] || k.date > acc[k.productId].date) acc[k.productId] = k;
    return acc;
  }, {});

  const products = Object.values(latestByProduct);
  const avgPhoto = products.length > 0 
    ? Math.round(products.reduce((s, p) => s + normalizeScore(p.scorePhoto), 0) / products.length) 
    : 0;
  const avgTitle = products.length > 0 
    ? Math.round(products.reduce((s, p) => s + normalizeScore(p.scoreTitle), 0) / products.length) 
    : 0;

  const needsReview = products.filter((p) => {
    const normPhoto = normalizeScore(p.scorePhoto);
    const normTitle = normalizeScore(p.scoreTitle);
    return normPhoto <= 70 || normTitle <= 70;
  });

  const photoStatus = getStatus(avgPhoto);
  const titleStatus = getStatus(avgTitle);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Gauges */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-6 text-foreground text-center">
          Scores de Qualidade
        </h3>
        <div className="flex flex-col md:flex-row justify-center items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <GaugeChart value={avgPhoto} label="Qualidade de Fotos" color="blue" />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              photoStatus.severity === "critical" 
                ? "bg-destructive/10 text-destructive" 
                : photoStatus.severity === "warning"
                ? "bg-warning/10 text-warning"
                : "bg-emerald/10 text-emerald"
            }`}>
              {photoStatus.label}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <GaugeChart value={avgTitle} label="Qualidade de Título" color="emerald" />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              titleStatus.severity === "critical" 
                ? "bg-destructive/10 text-destructive" 
                : titleStatus.severity === "warning"
                ? "bg-warning/10 text-warning"
                : "bg-emerald/10 text-emerald"
            }`}>
              {titleStatus.label}
            </span>
          </div>
        </div>
      </div>

      {/* Products needing review */}
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
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Seller</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Foto</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Título</th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const normPhoto = normalizeScore(p.scorePhoto);
                const normTitle = normalizeScore(p.scoreTitle);
                const photoSev = getStatus(normPhoto);
                const titleSev = getStatus(normTitle);
                const needsRevision = normPhoto <= 70 || normTitle <= 70;
                
                return (
                  <motion.tr
                    key={p.productId + idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <p className="font-medium">{p.productName}</p>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <span className={`font-mono font-bold ${
                        photoSev.severity === "success" ? "text-emerald" : 
                        photoSev.severity === "warning" ? "text-warning" : "text-destructive"
                      }`}>
                        {normPhoto}/100
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <span className={`font-mono font-bold ${
                        titleSev.severity === "success" ? "text-emerald" : 
                        titleSev.severity === "warning" ? "text-warning" : "text-destructive"
                      }`}>
                        {normTitle}/100
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {needsRevision ? (
                        <span className="inline-flex items-center gap-1 text-warning text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" /> Revisar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald text-xs">
                          <CheckCircle className="w-3.5 h-3.5" /> OK
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default QualityPanel;
