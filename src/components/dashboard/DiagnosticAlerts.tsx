import { motion } from "framer-motion";
import { getDiagnostic, type SellerKPI } from "@/hooks/useSellerData";

// Also support mock data shape
interface KpiLike {
  date: string;
  scorePhoto: number;
  scoreTitle: number;
  roas: number;
  visits: number;
  visitsExpensive: number;
  minPriceRival: number;
  productName: string;
  productId: string;
}

interface DiagnosticAlertsProps {
  kpis: KpiLike[];
}

function getDiagnosticGeneric(kpi: KpiLike) {
  const alerts: { icon: string; label: string; severity: "critical" | "warning" | "success" }[] = [];

  if (kpi.scorePhoto > 0 && kpi.scorePhoto < 70) alerts.push({ icon: "📸", label: "Melhorar Fotos", severity: "critical" });
  if (kpi.scoreTitle > 0 && kpi.scoreTitle < 70) alerts.push({ icon: "❌", label: "Ajustar SEO", severity: "critical" });
  if (kpi.roas > 0 && kpi.roas < 2) alerts.push({ icon: "💸", label: "Revisar Verba Ads", severity: "warning" });

  if (kpi.minPriceRival > 0 && kpi.visits > 0) {
    const pctExpensive = kpi.visitsExpensive / kpi.visits;
    if (pctExpensive > 0.3) alerts.push({ icon: "💰", label: "Preço não Competitivo", severity: "warning" });
  }

  if (alerts.length === 0) alerts.push({ icon: "🏆", label: "Anúncio Campeão", severity: "success" });

  return alerts;
}

const DiagnosticAlerts = ({ kpis }: DiagnosticAlertsProps) => {
  // Get unique products with their latest diagnostics
  const productDiags = kpis.reduce<Record<string, { kpi: KpiLike; alerts: ReturnType<typeof getDiagnosticGeneric> }>>((acc, kpi) => {
    if (!acc[kpi.productId]) {
      acc[kpi.productId] = { kpi, alerts: getDiagnosticGeneric(kpi) };
    }
    return acc;
  }, {});

  const items = Object.values(productDiags);
  const criticalCount = items.filter((i) => i.alerts.some((a) => a.severity === "critical")).length;
  const warningCount = items.filter((i) => i.alerts.some((a) => a.severity === "warning") && !i.alerts.some((a) => a.severity === "critical")).length;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Diagnóstico Automático
        </h3>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="status-badge bg-destructive/10 text-destructive border-destructive/20">
              {criticalCount} críticos
            </span>
          )}
          {warningCount > 0 && (
            <span className="status-badge bg-warning/10 text-warning border-warning/20">
              {warningCount} alertas
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
        {items.map((item, idx) => (
          <motion.div
            key={item.kpi.productId + idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.kpi.productName}</p>
            </div>
            <div className="flex gap-1.5 ml-3 flex-shrink-0">
              {item.alerts.map((alert, aIdx) => (
                <span
                  key={aIdx}
                  className={`status-badge text-[11px] ${
                    alert.severity === "critical"
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : alert.severity === "warning"
                      ? "bg-warning/10 text-warning border-warning/20"
                      : "bg-emerald/10 text-emerald border-emerald/20"
                  }`}
                >
                  {alert.icon} {alert.label}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DiagnosticAlerts;
