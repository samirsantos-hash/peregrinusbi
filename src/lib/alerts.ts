export type AlertTipo =
  | "QUEDA_3M"
  | "QUEDA_MOM"
  | "CRESCIMENTO_3M"
  | "CRESCIMENTO_MOM"
  | "VENCIMENTO_PROXIMO"
  | "VENCIDO"
  | "CRITICO"
  | "NOVO_SELLER";

export type AlertSeveridade = "critica" | "alta" | "media" | "positiva" | "informativa";

export interface SellerAlert {
  tipo: AlertTipo;
  severidade: AlertSeveridade;
  mensagem: string;
  cor: string;
  pulsante?: boolean;
}

export interface AlertConfig {
  quedaPct: number;       // default 30
  crescimentoPct: number; // default 25
  diasJanela: number;     // default 30
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  quedaPct: 30,
  crescimentoPct: 25,
  diasJanela: 30,
};

export function loadAlertConfig(): AlertConfig {
  try {
    const raw = localStorage.getItem("carteira_alert_config");
    if (raw) return { ...DEFAULT_ALERT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_ALERT_CONFIG;
}

export function saveAlertConfig(config: AlertConfig) {
  localStorage.setItem("carteira_alert_config", JSON.stringify(config));
}

export interface SellerData {
  cust_id: number;
  cus_nickname: string;
  nmv_lc: number;
  nmv_lc_1: number;
  nmv_lc_2: number;
  vs_pm_pct: number;
  dias_expiracao: number;
  meses_no_programa: number;
  tgmv_lc: number;
}

export function classificarSeller(seller: SellerData, config: AlertConfig): SellerAlert[] {
  const alerts: SellerAlert[] = [];

  const queda3m = seller.nmv_lc < seller.nmv_lc_1 && seller.nmv_lc_1 < seller.nmv_lc_2;
  const cresc3m =
    seller.nmv_lc > seller.nmv_lc_1 &&
    seller.nmv_lc_1 > seller.nmv_lc_2 &&
    seller.nmv_lc_2 > 0 &&
    ((seller.nmv_lc - seller.nmv_lc_2) / seller.nmv_lc_2) * 100 > 20;

  const vencProximo = seller.dias_expiracao >= 0 && seller.dias_expiracao <= config.diasJanela;
  const vencido = seller.dias_expiracao < 0;

  // CRITICO first
  if (queda3m && vencProximo) {
    const varPct = seller.nmv_lc_2 > 0
      ? Math.round(((seller.nmv_lc - seller.nmv_lc_2) / seller.nmv_lc_2) * 100)
      : 0;
    alerts.push({
      tipo: "CRITICO",
      severidade: "critica",
      mensagem: `NMV caiu ${Math.abs(varPct)}% em 3 meses e concessão vence em ${seller.dias_expiracao} dias`,
      cor: "hsl(0 90% 40%)",
      pulsante: true,
    });
  }

  if (queda3m && !(queda3m && vencProximo)) {
    const varPct = seller.nmv_lc_2 > 0
      ? Math.round(((seller.nmv_lc - seller.nmv_lc_2) / seller.nmv_lc_2) * 100)
      : 0;
    alerts.push({
      tipo: "QUEDA_3M",
      severidade: "alta",
      mensagem: `NMV em queda por 3 meses consecutivos (${varPct}%)`,
      cor: "hsl(0 70% 50%)",
    });
  }

  if (seller.vs_pm_pct < -config.quedaPct) {
    alerts.push({
      tipo: "QUEDA_MOM",
      severidade: "media",
      mensagem: `Queda de ${Math.abs(Math.round(seller.vs_pm_pct))}% vs mês anterior`,
      cor: "hsl(25 90% 50%)",
    });
  }

  if (cresc3m) {
    const varPct = seller.nmv_lc_2 > 0
      ? Math.round(((seller.nmv_lc - seller.nmv_lc_2) / seller.nmv_lc_2) * 100)
      : 0;
    alerts.push({
      tipo: "CRESCIMENTO_3M",
      severidade: "positiva",
      mensagem: `Crescimento consistente de ${varPct}% em 3 meses`,
      cor: "hsl(142 70% 45%)",
    });
  }

  if (seller.vs_pm_pct > config.crescimentoPct) {
    alerts.push({
      tipo: "CRESCIMENTO_MOM",
      severidade: "positiva",
      mensagem: `Crescimento de ${Math.round(seller.vs_pm_pct)}% vs mês anterior`,
      cor: "hsl(142 50% 55%)",
    });
  }

  if (vencProximo && !alerts.some((a) => a.tipo === "CRITICO")) {
    alerts.push({
      tipo: "VENCIMENTO_PROXIMO",
      severidade: "alta",
      mensagem: `Concessão vence em ${seller.dias_expiracao} dias`,
      cor: "hsl(25 90% 50%)",
    });
  }

  if (vencido) {
    alerts.push({
      tipo: "VENCIDO",
      severidade: "critica",
      mensagem: `Concessão vencida há ${Math.abs(seller.dias_expiracao)} dias`,
      cor: "hsl(0 80% 30%)",
    });
  }

  if (seller.meses_no_programa <= 2) {
    alerts.push({
      tipo: "NOVO_SELLER",
      severidade: "informativa",
      mensagem: `Seller novo no programa (${seller.meses_no_programa} meses)`,
      cor: "hsl(210 80% 55%)",
    });
  }

  return alerts;
}