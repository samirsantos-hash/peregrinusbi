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

const QualityPanel = ({ kpis }: QualityPanelProps) => {
  // Get latest data per product/seller
  const latestByProduct = kpis.reduce<Record<string, KpiLike>>((acc, k) => {
    if (!acc[k.productId] || k.date > acc[k.productId].date) acc[k.productId] = k;
    return acc;
  }, {});

  const products = Object.values(latestByProduct);
  const avgPhoto = products.length > 0 ? Math.round(products.reduce((s, p) => s + p.scorePhoto, 0) / products.length) : 0;
  const avgTitle = products.length > 0 ? Math.round(products.reduce((s, p) => s + p.scoreTitle, 0) / products.length) : 0;

  const needsReview = products.filter((p) => p.statusPhoto === "Revisar" || p.statusTitle === "Revisar");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Gauges */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-6 text-foreground text-center">
          Scores de Qualidade
        </h3>
        <div className="flex justify-center gap-16">
          <GaugeChart value={avgPhoto} label="Qualidade de Fotos" color="blue" />
          <GaugeChart value={avgTitle} label="Qualidade de Título" color="emerald" />
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
              {products.map((p, idx) => (
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
                    {p.statusPhoto === "Revisar" || p.statusTitle === "Revisar" ? (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default QualityPanel;
