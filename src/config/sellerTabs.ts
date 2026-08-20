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
  Gauge,
  Target,
  type LucideIcon,
} from "lucide-react";

export type SellerTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  descricao: string;
  juniorTip: string;
  order: number;
};

export const SELLER_TABS: SellerTab[] = [
  { id: "efficiency", label: "Resumo", icon: DollarSign, order: 1,
    descricao: "Visão geral da saúde da loja no período",
    juniorTip: "Comece aqui. Dá a fotografia completa em uma tela." },
  { id: "pock", label: "Pock", icon: Gauge, order: 1.5,
    descricao: "Full Potential — diagnóstico seller centric",
    juniorTip: "Diagnóstico Pock da loja: identidade, medidores de serviços, atendimento e evolução anual." },
  { id: "executive", label: "Faturamento", icon: LayoutDashboard, order: 2,
    descricao: "GMV, itens vendidos e ticket médio",
    juniorTip: "Analise tendências de GMV e eficiência dos Ads antes de qualquer reunião." },
  { id: "logistics", label: "Logística", icon: Truck, order: 3,
    descricao: "Envios, prazos e adesão ao FULL",
    juniorTip: "Full é o fator de maior peso no algoritmo. Sempre analise aqui depois do Resumo." },
  { id: "quality", label: "Qualidade", icon: Shield, order: 4,
    descricao: "Score dos anúncios e preenchimento de atributos",
    juniorTip: "Score < 70 em qualquer eixo afeta ranking orgânico diretamente." },
  { id: "clips", label: "Clips", icon: Video, order: 5,
    descricao: "Vídeos publicados e desempenho",
    juniorTip: "Canal novo de tráfego orgânico — meta: 20 clips/mês, 8.000 visitas." },
  { id: "competitiveness", label: "Preço", icon: Swords, order: 6,
    descricao: "Competitividade frente aos concorrentes",
    juniorTip: "% Não Competitivo > 30%? O algoritmo começa a esconder o anúncio." },
  { id: "publicidade", label: "Publicidade", icon: Megaphone, order: 7,
    descricao: "ADS, PADS e retorno do investimento",
    juniorTip: "ROAS < 3x ou TACOS > 10%? Há vazamento de margem nos Ads." },
  { id: "opportunities", label: "Oportunidades", icon: Gift, order: 8,
    descricao: "Onde há receita não capturada",
    juniorTip: "CDP = combustível do algoritmo. Item elegível sem opt-in = dinheiro na mesa." },
  { id: "reputation", label: "Reputação", icon: HeartPulse, order: 9,
    descricao: "Reclamações, atrasos, cancelamentos e disputas",
    juniorTip: "Verde escuro é pré-requisito para Tier 1. Reclamação > 3% = risco de rebaixamento." },
  { id: "metas", label: "Metas", icon: Target, order: 10,
    descricao: "Metas definidas por loja e o realizado",
    juniorTip: "Defina metas de faturamento, clips e reposição por loja e compare com o realizado." },
  { id: "correlacoes", label: "Correlações", icon: Link2, order: 11,
    descricao: "Relação entre indicadores",
    juniorTip: "Veja como os KPIs do seller se influenciam — Pearson e fluxo do algoritmo." },
  { id: "alertas-riscos", label: "Alertas & Riscos", icon: AlertTriangle, order: 12,
    descricao: "O que exige ação agora",
    juniorTip: "Painel consolidado da carteira: BPC baixo, reputação em risco e churn (jun vs mai). Visão cross-seller." },
];
/** Fonte única dos nomes/descrições de seção (sidebar, título e document.title). */
export const SECOES: Record<string, { label: string; descricao: string }> = Object.fromEntries(
  SELLER_TABS.map((t) => [t.id, { label: t.label, descricao: t.descricao }]),
);

export function getSecao(id: string) {
  return SECOES[id] ?? { label: "Painel", descricao: "" };
}
