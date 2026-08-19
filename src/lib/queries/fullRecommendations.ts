import { supabase } from "@/integrations/supabase/client";

export type CurvaAbc = "A" | "B" | "C" | "sem_venda";

export type FullCandidate = {
  item_id: string;
  item_name: string;
  vertical: string;
  pedidos_7d: number;
  pedidos_15d: number;
  pedidos_30d: number;
  velocity_7d: number;
  velocity_15d: number;
  velocity_30d: number;
  velocity: number;
  tendencia: number;
  volatilidade: number;
  snapshots: number;
  curva: CurvaAbc;
  share_demanda: number;
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
  prioridade: "alta" | "media" | "baixa" | "aguardar_estoque" | "sem_vendas";
  stock_gap: number;
  acao: string;
  justificativa: string;
};

export type JanelaResumo = {
  dias: 7 | 15 | 30;
  itens_com_venda: number;
  pedidos: number;
  gmv_estimado: number;
};

export type FullPortfolio = {
  candidatos: FullCandidate[];
  totalGMVGanho: number;
  totalRiscoMedio: number;
  indiceEficiencia: number;
  distribuicaoVertical: Record<string, number>;
  fullPremiumUsado: number;
  janelas: JanelaResumo[];
  curvaAbc: { curva: CurvaAbc; itens: number; share: number; gmv: number }[];
  itensSemVenda: number;
  dataReferencia: string | null;
};

export const FULL_ESTOQUE_MINIMO_DIAS = 30;
const FULL_PREMIUM_BASELINE = 0.28;
const FULL_PREMIUM_COM_FULL = 0.18;
const POISSON_VARIANCE_FLOOR = 0.05;
const JANELA_MAX_DIAS = 30;

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

const diasEntre = (a: string, b: string) =>
  Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

/**
 * `pedidos_7d` é uma janela MÓVEL de 7 dias. Somar/mediar snapshots sobrepostos
 * infla 15d/30d. Aqui reconstruímos a janela em blocos de 7 dias NÃO sobrepostos:
 * para cada bloco pegamos o snapshot mais próximo do fim do bloco.
 */
function snapshotEm(
  snaps: { data: string; pedidos: number }[],
  ref: string,
  offsetDias: number,
): { data: string; pedidos: number } | null {
  let melhor: { data: string; pedidos: number } | null = null;
  let melhorDist = Infinity;
  for (const s of snaps) {
    const d = ref ? diasEntre(ref, s.data) : 0;
    if (!Number.isFinite(d) || d < 0) continue;
    const dist = Math.abs(d - offsetDias);
    if (dist > 3.5) continue;
    if (dist < melhorDist) {
      melhorDist = dist;
      melhor = s;
    }
  }
  return melhor;
}

function pedidosJanela(
  snaps: { data: string; pedidos: number }[],
  ref: string,
  dias: number,
): { pedidos: number; velocity: number; cobertura: number; amostras: number } {
  const blocos = Math.floor(dias / 7);
  const resto = dias - blocos * 7;
  let total = 0;
  let diasCobertos = 0;
  let amostras = 0;
  for (let b = 0; b < blocos; b++) {
    const s = snapshotEm(snaps, ref, b * 7);
    if (!s) continue;
    total += s.pedidos;
    diasCobertos += 7;
    amostras++;
  }
  if (resto > 0) {
    const s = snapshotEm(snaps, ref, blocos * 7);
    if (s) {
      total += s.pedidos * (resto / 7);
      diasCobertos += resto;
      amostras++;
    }
  }
  if (diasCobertos === 0) return { pedidos: 0, velocity: 0, cobertura: 0, amostras: 0 };
  const velocity = total / diasCobertos;
  // dias sem snapshot são extrapolados pela velocidade observada
  return { pedidos: velocity * dias, velocity, cobertura: diasCobertos / dias, amostras };
}

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

  // 2) Snapshots de elegibilidade (histórico para janelas 7/15/30 dias)
  const { data: eleg } = await supabase
    .from("seller_eligibility")
    .select(
      "item_id, item_name, vertical_item, pedidos_7d, estoque_medio_7d, flag_item_s_optin, discount_seller_percentage, data",
    )
    .eq("seller_id", sellerId)
    .order("data", { ascending: false })
    .limit(5000);

  const rows = (eleg ?? []) as any[];
  const vazio: FullPortfolio = {
    candidatos: [],
    totalGMVGanho: 0,
    totalRiscoMedio: 0,
    indiceEficiencia: 0,
    distribuicaoVertical: {},
    fullPremiumUsado: FULL_PREMIUM_BASELINE,
    janelas: [],
    curvaAbc: [],
    itensSemVenda: 0,
    dataReferencia: null,
  };
  if (rows.length === 0) return vazio;

  // Data de referência = snapshot mais recente presente na base.
  const datas = rows.map((r) => String(r.data ?? "")).filter(Boolean).sort();
  const ref = datas[datas.length - 1] ?? "";

  // Agrupar por item: snapshot mais recente define cadastro/estoque; histórico define velocidade.
  type Agg = {
    base: any;
    snaps: { data: string; pedidos: number }[];
  };
  const porItem = new Map<string, Agg>();
  for (const row of rows) {
    const key = String(row.item_id ?? "");
    if (!key) continue;
    const data = String(row.data ?? ref);
    if (ref && diasEntre(ref, data) > JANELA_MAX_DIAS - 1) continue;
    const atual = porItem.get(key);
    if (!atual) {
      porItem.set(key, {
        base: row,
        snaps: [{ data, pedidos: Number(row.pedidos_7d) || 0 }],
      });
    } else {
      atual.snaps.push({ data, pedidos: Number(row.pedidos_7d) || 0 });
    }
  }
  if (porItem.size === 0) return vazio;

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

  const gmvPorPedidoEfetivo = gmvPorPedido > 0 ? gmvPorPedido : 50;

  const candidatos: FullCandidate[] = [];

  for (const [itemId, agg] of porItem) {
    const item = agg.base;
    const estoque = Number(item.estoque_medio_7d) || 0;
    const optin = Boolean(item.flag_item_s_optin);
    const desconto = Number(item.discount_seller_percentage) || 0;

    const snaps = agg.snaps.sort((a, b) => (a.data < b.data ? 1 : -1));
    const j7 = velocidadeJanela(snaps, ref, 7);
    const j15 = velocidadeJanela(snaps, ref, 15);
    const j30 = velocidadeJanela(snaps, ref, 30);

    const velocity_7d = j7.amostras > 0 ? j7.velocity : j15.velocity;
    const velocity_15d = j15.amostras > 0 ? j15.velocity : j30.velocity;
    const velocity_30d = j30.velocity;

    const pedidos_7d = Math.round(velocity_7d * 7);
    const pedidos_15d = Math.round(velocity_15d * 15);
    const pedidos_30d = Math.round(velocity_30d * 30);

    if (pedidos_30d === 0 && estoque === 0) continue;

    // Velocidade ponderada: janela curta pesa mais (recência), longa estabiliza.
    const velocity = 0.5 * velocity_7d + 0.3 * velocity_15d + 0.2 * velocity_30d;

    // Tendência 7d vs 30d e volatilidade entre janelas (proxy de instabilidade).
    const tendencia = velocity_30d > 0 ? velocity_7d / velocity_30d - 1 : 0;
    const vs = [velocity_7d, velocity_15d, velocity_30d];
    const mediaV = vs.reduce((s, v) => s + v, 0) / 3;
    const dp = Math.sqrt(vs.reduce((s, v) => s + (v - mediaV) ** 2, 0) / 3);
    const volatilidade = mediaV > 0 ? Math.min(dp / mediaV, 1) : 0;

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
      1 / Math.sqrt(pedidos_30d + 1),
      POISSON_VARIANCE_FLOOR,
    );

    // σ = ruptura (50%) + incerteza Poisson (30%) + volatilidade entre janelas (20%)
    const sigma =
      stockout_risk * 0.5 + demand_uncertainty * 0.3 + volatilidade * 0.2;
    const sharpe = mu / (1 + sigma);

    const estoque_necessario = Math.ceil(velocity * FULL_ESTOQUE_MINIMO_DIAS);
    const stock_gap = Math.max(0, estoque_necessario - estoque);

    candidatos.push({
      item_id: itemId,
      item_name: item.item_name ?? "",
      vertical: item.vertical_item ?? "Outros",
      pedidos_7d,
      pedidos_15d,
      pedidos_30d,
      velocity_7d,
      velocity_15d,
      velocity_30d,
      velocity,
      tendencia,
      volatilidade,
      snapshots: snaps.length,
      curva: "sem_venda",
      share_demanda: 0,
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
      prioridade: "sem_vendas",
      stock_gap,
      acao: "",
      justificativa: "",
    });
  }

  if (candidatos.length === 0) return vazio;

  // 4) Curva ABC por cust (Pareto sobre GMV estimado dos últimos 30 dias)
  const comVenda = candidatos
    .filter((c) => c.pedidos_30d > 0)
    .sort((a, b) => b.gmv_atual_estimado - a.gmv_atual_estimado);
  const gmvTotal = comVenda.reduce((s, c) => s + c.gmv_atual_estimado, 0);
  let acumulado = 0;
  for (const c of comVenda) {
    c.share_demanda = gmvTotal > 0 ? c.gmv_atual_estimado / gmvTotal : 0;
    const antes = acumulado;
    acumulado += c.share_demanda;
    c.curva = antes < 0.8 ? "A" : antes < 0.95 ? "B" : "C";
  }

  // 5) Prioridade — item sem venda nos 30 dias NUNCA é recomendado para Full.
  for (const c of candidatos) {
    if (c.pedidos_30d === 0) {
      c.prioridade = "sem_vendas";
      c.acao =
        c.estoque > 0
          ? `Não enviar para Full: ${c.estoque.toFixed(0)} un paradas e 0 pedidos em 30 dias. Estoque no Full geraria custo de armazenagem sem giro — trate preço/anúncio antes.`
          : "Não enviar para Full: sem vendas e sem estoque nos últimos 30 dias.";
      c.justificativa = `0 pedidos em 7/15/30 dias · ${c.snapshots} snapshot(s) analisado(s)`;
      continue;
    }

    if (c.stock_gap > 0) {
      c.prioridade = "aguardar_estoque";
    } else if (c.sharpe >= 500 && (c.curva === "A" || c.curva === "B")) {
      c.prioridade = "alta";
    } else if (c.sharpe >= 150 || c.curva === "A") {
      c.prioridade = "media";
    } else {
      c.prioridade = "baixa";
    }

    // Volatilidade muito alta rebaixa a recomendação (demanda ainda não confiável).
    if (c.prioridade === "alta" && c.volatilidade > 0.6) c.prioridade = "media";

    const mu_str = c.mu.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

    c.acao =
      c.prioridade === "aguardar_estoque"
        ? `Repor ${c.stock_gap.toFixed(0)} unidades antes de enviar para Full. Estoque atual (${c.estoque.toFixed(0)} un) cobre ${c.days_of_stock.toFixed(0)} dias — mínimo é ${FULL_ESTOQUE_MINIMO_DIAS}.`
        : c.prioridade === "alta"
          ? `Enviar para Full imediatamente. Curva ${c.curva} · potencial de ${mu_str}/mês.`
          : c.prioridade === "media"
            ? `Candidato médio (curva ${c.curva}) — agendar no próximo ciclo de reposição.`
            : `Monitorar. Curva ${c.curva}, baixo impacto projetado (${mu_str}/mês).`;

    const tendTxt =
      c.tendencia > 0.15
        ? `acelerando +${(c.tendencia * 100).toFixed(0)}% (7d vs 30d)`
        : c.tendencia < -0.15
          ? `desacelerando ${(c.tendencia * 100).toFixed(0)}% (7d vs 30d)`
          : "demanda estável (7d ≈ 30d)";

    c.justificativa = `7d ${c.pedidos_7d} ped · 15d ${c.pedidos_15d} ped · 30d ${c.pedidos_30d} ped · ${tendTxt} · estoque ${c.days_of_stock.toFixed(0)} dias · uplift +${(c.full_premium * 100).toFixed(0)}%${c.flag_optin ? "" : " (+5pp sem CDP)"} · Sharpe ${c.sharpe.toFixed(0)}`;
  }

  candidatos.sort((a, b) => {
    const ord = {
      alta: 0,
      media: 1,
      baixa: 2,
      aguardar_estoque: 3,
      sem_vendas: 4,
    } as const;
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

  const janelas: JanelaResumo[] = ([7, 15, 30] as const).map((dias) => {
    const key = dias === 7 ? "pedidos_7d" : dias === 15 ? "pedidos_15d" : "pedidos_30d";
    const vkey = dias === 7 ? "velocity_7d" : dias === 15 ? "velocity_15d" : "velocity_30d";
    return {
      dias,
      itens_com_venda: candidatos.filter((c) => (c as any)[key] > 0).length,
      pedidos: candidatos.reduce((s, c) => s + ((c as any)[key] as number), 0),
      gmv_estimado: candidatos.reduce(
        (s, c) => s + ((c as any)[vkey] as number) * dias * gmvPorPedidoEfetivo,
        0,
      ),
    };
  });

  const curvaAbc = (["A", "B", "C", "sem_venda"] as CurvaAbc[]).map((curva) => {
    const grupo = candidatos.filter((c) => c.curva === curva);
    return {
      curva,
      itens: grupo.length,
      share: grupo.reduce((s, c) => s + c.share_demanda, 0),
      gmv: grupo.reduce((s, c) => s + c.gmv_atual_estimado, 0),
    };
  });

  return {
    candidatos,
    totalGMVGanho,
    totalRiscoMedio,
    indiceEficiencia,
    distribuicaoVertical,
    fullPremiumUsado: fullPremium,
    janelas,
    curvaAbc,
    itensSemVenda: candidatos.filter((c) => c.prioridade === "sem_vendas").length,
    dataReferencia: ref || null,
  };
}
