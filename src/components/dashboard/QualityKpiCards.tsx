import { motion } from "framer-motion";
import { Shield, Barcode, Sparkles, Package } from "lucide-react";
import GaugeChart from "./GaugeChart";

interface QualityKpiCardsProps {
  scoreCaracteristica: number;
  pontuacaoLlGtin: number;
  scoreOfertaFinal: number;
  totalLiveListings: number;
}

/** Normaliza e arredonda o valor para 0-100 */
function normalizeScore(value: number): number {
  const num = Number(value) || 0;
  // Se o valor parece estar em escala 0-1 (ex: 0.42), converte para 0-100
  if (num > 0 && num <= 1) {
    return Math.round(num * 100);
  }
  // Limita entre 0 e 100 e arredonda
  return Math.min(100, Math.max(0, Math.round(num)));
}

/** Retorna o status baseado no score normalizado */
function getStatus(score: number): { label: string; color: string } {
  if (score <= 40) return { label: "Crítico", color: "destructive" };
  if (score <= 70) return { label: "Atenção", color: "warning" };
  return { label: "Saudável", color: "emerald" };
}

const QualityKpiCards = ({
  scoreCaracteristica,
  pontuacaoLlGtin,
  scoreOfertaFinal,
  totalLiveListings,
}: QualityKpiCardsProps) => {
  const normalizedCaracteristica = normalizeScore(scoreCaracteristica);
  const normalizedGtin = normalizeScore(pontuacaoLlGtin);
  const normalizedOferta = normalizeScore(scoreOfertaFinal);

  const statusCaracteristica = getStatus(normalizedCaracteristica);
  const statusGtin = getStatus(normalizedGtin);
  const statusOferta = getStatus(normalizedOferta);

  const cards = [
    {
      label: "Pontuação de Atributos",
      sublabel: "Ficha técnica, títulos e fotos",
      value: normalizedCaracteristica,
      rawValue: scoreCaracteristica,
      icon: Shield,
      color: "blue" as const,
      status: statusCaracteristica,
      isGauge: true,
    },
    {
      label: "Saúde do Código de Barras",
      sublabel: "Validação EAN/GTIN",
      value: normalizedGtin,
      rawValue: pontuacaoLlGtin,
      icon: Barcode,
      color: "emerald" as const,
      status: statusGtin,
      isGauge: true,
      zeroWarning: normalizedGtin === 0,
    },
    {
      label: "Atratividade da Oferta",
      sublabel: "Preço + Frete Grátis + Promoções",
      value: normalizedOferta,
      rawValue: scoreOfertaFinal,
      icon: Sparkles,
      color: "blue" as const,
      status: statusOferta,
      isGauge: true,
    },
    {
      label: "Total de Anúncios Ativos",
      sublabel: "Itens disponíveis no catálogo",
      value: totalLiveListings,
      rawValue: totalLiveListings,
      icon: Package,
      color: "emerald" as const,
      isGauge: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass-card p-5 flex flex-col items-center text-center space-y-3"
        >
          <div className="flex items-center gap-2">
            <card.icon className="w-4 h-4 text-neon-blue" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {card.label}
            </h4>
          </div>
          <p className="text-[10px] text-muted-foreground -mt-1">{card.sublabel}</p>

          {card.isGauge ? (
            <>
              <GaugeChart value={card.value} label="" color={card.color} />
              
              {/* Status Badge */}
              {card.status && (
                <div className="flex flex-col items-center gap-1">
                  <span 
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      card.status.color === "destructive" 
                        ? "bg-destructive/10 text-destructive" 
                        : card.status.color === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-emerald/10 text-emerald"
                    }`}
                  >
                    {card.status.label}
                  </span>
                  
                  {/* Warning for GTIN = 0 */}
                  {(card as any).zeroWarning && (
                    <span className="text-[10px] text-muted-foreground">
                      Dado ausente ou inválido
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-2">
              <span className="text-4xl font-bold font-mono text-foreground">
                {totalLiveListings.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs text-muted-foreground mt-1">anúncios</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default QualityKpiCards;
