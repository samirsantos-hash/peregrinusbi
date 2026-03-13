import { motion } from "framer-motion";
import { Shield, Barcode, Sparkles, Package } from "lucide-react";
import GaugeChart from "./GaugeChart";

interface QualityKpiCardsProps {
  scoreCaracteristica: number;
  pontuacaoLlGtin: number;
  scoreOfertaFinal: number;
  totalLiveListings: number;
}

const QualityKpiCards = ({
  scoreCaracteristica,
  pontuacaoLlGtin,
  scoreOfertaFinal,
  totalLiveListings,
}: QualityKpiCardsProps) => {
  const cards = [
    {
      label: "Pontuação de Atributos",
      sublabel: "Ficha técnica, títulos e fotos",
      value: scoreCaracteristica,
      icon: Shield,
      color: "blue" as const,
      isGauge: true,
    },
    {
      label: "Saúde do Código de Barras",
      sublabel: "Validação EAN/GTIN",
      value: pontuacaoLlGtin,
      icon: Barcode,
      color: "emerald" as const,
      isGauge: true,
    },
    {
      label: "Atratividade da Oferta",
      sublabel: "Preço + Frete Grátis + Promoções",
      value: scoreOfertaFinal,
      icon: Sparkles,
      color: "blue" as const,
      isGauge: true,
    },
    {
      label: "Total de Anúncios Ativos",
      sublabel: "Itens disponíveis no catálogo",
      value: totalLiveListings,
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
            <GaugeChart value={card.value} label="" color={card.color} />
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
