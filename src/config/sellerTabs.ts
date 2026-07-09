// Ordem lógica de análise (NÃO ALTERAR sem revisão consultiva):
// Abas 1–3 (Resumo, Faturamento, Logística): respondem "como está indo o negócio?"
// Abas 4–6 (Qualidade, Clips, Preço): respondem "por que está indo assim?"
// Abas 7–9 (Oportunidades, Reputação): respondem "o que fazer para melhorar?"

import {
  DollarSign,
  LayoutDashboard,
  Truck,
  Shield,
  Video,
  Swords,
  Gift,
  HeartPulse,
  Link2,
  Megaphone,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export type SellerTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  juniorTip: string;
  order: number;
};

export const SELLER_TABS: SellerTab[] = [
  { id: "efficiency", label: "Resumo", icon: DollarSign, order: 1,
    juniorTip: "Comece aqui. Dá a fotografia completa em uma tela." },
  { id: "executive", label: "Faturamento", icon: LayoutDashboard, order: 2,
    juniorTip: "Analise tendências de GMV e eficiência dos Ads antes de qualquer reunião." },
  { id: "logistics", label: "Logística", icon: Truck, order: 3,
    juniorTip: "Full é o fator de maior peso no algoritmo. Sempre analise aqui depois do Resumo." },
  { id: "quality", label: "Qualidade", icon: Shield, order: 4,
    juniorTip: "Score < 70 em qualquer eixo afeta ranking orgânico diretamente." },
  { id: "clips", label: "Clips", icon: Video, order: 5,
    juniorTip: "Canal novo de tráfego orgânico — meta: 20 clips/mês, 8.000 visitas." },
  { id: "competitiveness", label: "Preço", icon: Swords, order: 6,
    juniorTip: "% Não Competitivo > 30%? O algoritmo começa a esconder o anúncio." },
  { id: "publicidade", label: "Publicidade", icon: Megaphone, order: 7,
    juniorTip: "ROAS < 3x ou TACOS > 10%? Há vazamento de margem nos Ads." },
  { id: "opportunities", label: "Oportunidades", icon: Gift, order: 8,
    juniorTip: "CDP = combustível do algoritmo. Item elegível sem opt-in = dinheiro na mesa." },
  { id: "reputation", label: "Reputação", icon: HeartPulse, order: 9,
    juniorTip: "Verde escuro é pré-requisito para Tier 1. Reclamação > 3% = risco de rebaixamento." },
  { id: "correlacoes", label: "Correlações", icon: Link2, order: 11,
    juniorTip: "Veja como os KPIs do seller se influenciam — Pearson e fluxo do algoritmo." },
  { id: "alertas-riscos", label: "Alertas & Riscos", icon: AlertTriangle, order: 12,
    juniorTip: "Painel consolidado da carteira: BPC baixo, reputação em risco e churn (jun vs mai). Visão cross-seller." },
];