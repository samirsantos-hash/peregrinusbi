import { supabase } from "@/integrations/supabase/client";

export type FullCandidate = {
  item_id: string;
  item_name: string;
  vertical: string;
  pedidos_7d: number;
  velocity: number;
  estoque: number;
  days_of_stock: number;
  flag_optin: boolean;
  desconto: number;
  mu: number;
  sigma: number;
  sharpe: number;
  full_premium: number;
  gmv_atual_estimado: number;
  gmv_full_estimado: number;
  stockout_risk: number;
  demand_uncertainty: number;
  prioridade: "alta" | "media" | "baixa" | "aguardar_estoque";
  stock_gap: number;
  acao: string;
  justificativa: string;
};

export type FullPortfolio = {
  candidatos: FullCandidate[];
  totalGMVGanho: number;
  totalRiscoMedio: number;
  indiceEficiencia: number;
  distribuicaoVertical: Record<string, number>;
  fullPremiumUsado: number;
};

export const FULL_ESTOQUE_MINIMO_DIAS = 30;
const FULL_PREMIUM_BASELINE = 0.28;
const FULL_PREMIUM_COM_FULL = 0.18;
const POISSON_VARIANCE_FLOOR = 0.05;

const VERTICAL_CORRELATION: Record<string, number> = {
  Eletrônicos: 0.85,
  Eletrodomésticos: 0.8,
  Moda: 0.6,
  "Casa e Jardim": 0.65,
  "Esporte e Lazer": 0.55,
  Ferramentas: 0.5,
  "Beleza e Cuidado": 0.7,
  default: 0.72,
};

export async function getFullRecommendations(
  sellerId: string,
  custId?: string | number,
): Promise<FullPortfolio> {
  // 1) Métricas do seller no CPP mensal (último mês disponível)
  let cpp: any = null;
  if (custId !== undefined && custId !== null && String(custId).length > 0) {
    const { data } = await supabase
      .from("cpp_mensal" as any)
      .select(
        "tgmv_lc, tgmv_lc_fbm, tgmv_lc_flex, tsi, visitas, f_tgmv_lc, f_tsi, tim_month_id",
      )
      .eq("cus_cust_id_sel", String(custId))
      .order("tim_month_id", { ascending: false })
      .limit(1)
      .maybeSingle();
    cpp = data;
  }

  // 2) Itens da elegibilidade do seller
  const { data: eleg } = await supabase
    .from("seller_eligibility")
    .select(
      "item_id, item_name, vertical_item, pedidos_7d, estoque_medio_7d, flag_item_s_optin, discount_seller_percentage",
    )
    .eq("seller_id", sellerId);

  const items = (eleg ?? []) as any[];
  if (items.length === 0) {
    return {
      candidatos: [],
      totalGMVGanho: 0,
      totalRiscoMedio: 0,
      indiceEficiencia: 0,
      distribuicaoVertical: {},
      fullPremiumUsado: FULL_PREMIUM_BASELINE,
    };
  }

  // 3) Métricas de referência
  const tgmv = Number(cpp?.tgmv_lc) || 0;
  const tgmvFbm = Number(cpp?.tgmv_lc_fbm) || 0;
  const tsiTotal = Number(cpp?.tsi) || 0;
  const shareFBM = tgmv > 0 ? tgmvFbm / tgmv : 0;
  const gmvPorPedido = tsiTotal > 0 ? tgmv / tsiTotal : 0;

  const fullPremium =
    shareFBM >= 0.7
      ? FULL_PREMIUM_COM_FULL
      : shareFBM >= 0.3
        ? (FULL_PREMIUM_BASELINE + FULL_PREMIUM_COM_FULL) / 2
        : FULL_PREMIUM_BASELINE;

  // Fallback de GMV/pedido quando não temos CPP: usar média da elegibilidade
  // (sem GMV no item, assumimos R$ 50 como proxy mínimo para não zerar o μ)
  const gmvPorPedidoEfetivo = gmvPorPedido > 0 ? gmvPorPedido : 50;

  const candidatos: FullCandidate[] = [];

  for (const item of items) {
    const pedidos_7d = Number(item.pedidos_7d) || 0;
    const estoque = Number(item.estoque_medio_7d) || 0;
    const optin = Boolean(item.flag_item_s_optin);
    const desconto = Number(item.discount_seller_percentage) || 0;

    if (pedidos_7d === 0 && estoque === 0) continue;

    const velocity = pedidos_7d / 7;
    const days_of_stock =
      velocity > 0 ? Math.min(estoque / velocity, 365) : estoque > 0 ? 999 : 0;

    const gmv_atual_estimado = velocity * 30 * gmvPorPedidoEfetivo;
    const premiumAjustado = optin ? fullPremium : Math.min(fullPremium + 0.05, 0.45);
    const gmv_full_estimado = gmv_atual_estimado * (1 + premiumAjustado);
    const mu = gmv_full_estimado - gmv_atual_estimado;

    const stockout_risk =
      velocity > 0
        ? Math.exp(-days_of_stock / FULL_ESTOQUE_MINIMO_DIAS)
        : estoque < 10
          ? 0.9
          : 0.3;

    const demand_uncertainty = Math.max(
      1 / Math.sqrt(pedidos_7d + 1),
      POISSON_VARIANCE_FLOOR,
    );

    const sigma = stockout_risk * 0.6 + demand_uncertainty * 0.4;
    const sharpe = mu / (1 + sigma);

    const estoque_necessario = Math.ceil(velocity * FULL_ESTOQUE_MINIMO_DIAS);
    const stock_gap = Math.max(0, estoque_necessario - estoque);

    const prioridade: FullCandidate["prioridade"] =
      stock_gap > 0
        ? "aguardar_estoque"
        : sharpe >= 500
          ? "alta"
          : sharpe >= 150
            ? "media"
            : "baixa";

    const mu_str = mu.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
    const acao =
      stock_gap > 0
        ? `Repor ${stock_gap.toFixed(0)} unidades antes de enviar para Full. Estoque atual (${estoque.toFixed(0)} un) cobre ${days_of_stock.toFixed(0)} dias — mínimo é ${FULL_ESTOQUE_MINIMO_DIAS}.`
        : prioridade === "alta"
          ? `Enviar para Full imediatamente. Potencial de ${mu_str}/mês.`
          : prioridade === "media"
            ? `Candidato médio — agendar no próximo ciclo de reposição.`
            : `Monitorar. Baixo impacto projetado (${mu_str}/mês).`;

    const justificativa = `Velocidade ${(velocity * 30).toFixed(0)} un/mês · Estoque ${days_of_stock.toFixed(0)} dias · Uplift +${(premiumAjustado * 100).toFixed(0)}%${optin ? "" : " (+5pp sem CDP)"} · Sharpe ${sharpe.toFixed(0)}`;

    candidatos.push({
      item_id: String(item.item_id),
      item_name: item.item_name ?? "",
      vertical: item.vertical_item ?? "Outros",
      pedidos_7d,
      velocity,
      estoque,
      days_of_stock,
      flag_optin: optin,
      desconto,
      mu,
      sigma,
      sharpe,
      full_premium: premiumAjustado,
      gmv_atual_estimado,
      gmv_full_estimado,
      stockout_risk,
      demand_uncertainty,
      prioridade,
      stock_gap,
      acao,
      justificativa,
    });
  }

  candidatos.sort((a, b) => {
    const ord = { alta: 0, media: 1, baixa: 2, aguardar_estoque: 3 } as const;
    return ord[a.prioridade] !== ord[b.prioridade]
      ? ord[a.prioridade] - ord[b.prioridade]
      : b.sharpe - a.sharpe;
  });

  const recomendados = candidatos.filter(
    (c) => c.prioridade === "alta" || c.prioridade === "media",
  );

  const totalGMVGanho = recomendados.reduce((s, c) => s + c.mu, 0);
  const totalRiscoMedio =
    recomendados.length > 0
      ? recomendados.reduce((s, c) => s + c.sigma, 0) / recomendados.length
      : 0;

  const verticals = [...new Set(recomendados.map((c) => c.vertical))];
  const rhoMedio =
    verticals.length > 0
      ? verticals.reduce(
          (s, v) => s + (VERTICAL_CORRELATION[v] ?? VERTICAL_CORRELATION.default),
          0,
        ) / verticals.length
      : 1;

  const sigmaPortfolio = Math.sqrt(
    (recomendados.reduce((s, c) => s + c.sigma ** 2, 0) /
      Math.max(recomendados.length, 1)) *
      rhoMedio,
  );

  const indiceEficiencia =
    sigmaPortfolio > 0 ? totalGMVGanho / (1 + sigmaPortfolio) : totalGMVGanho;

  const distribuicaoVertical: Record<string, number> = {};
  for (const c of recomendados) {
    distribuicaoVertical[c.vertical] = (distribuicaoVertical[c.vertical] ?? 0) + 1;
  }

  return {
    candidatos,
    totalGMVGanho,
    totalRiscoMedio,
    indiceEficiencia,
    distribuicaoVertical,
    fullPremiumUsado: fullPremium,
  };
}