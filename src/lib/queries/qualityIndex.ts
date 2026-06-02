import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusLevel = "ok" | "atencao" | "critico";

export type Topico = {
  id: string;
  label: string;
  valor: number | string;
  score: number;
  peso: number;
  status: StatusLevel;
  acaoSugerida: string;
  fonte: string;
};

export type PilarScore = {
  id: "logistica" | "cdp" | "reputacao" | "relevancia";
  label: string;
  peso: number;
  score: number;
  scoreNota: string;
  status: StatusLevel;
  topicos: Topico[];
};

export type QualityIndex = {
  custId: string;
  mes: string | null;
  scoreGeral: number;
  notaGeral: string;
  pilares: PilarScore[];
  tendencia: number[];
  alertasCriticos: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizar(
  valor: number,
  min: number,
  max: number,
  sentido: "maior_melhor" | "menor_melhor",
): number {
  if (max === min) return 50;
  const raw = Math.max(min, Math.min(max, valor));
  const pct = (raw - min) / (max - min);
  return Math.round(sentido === "maior_melhor" ? pct * 100 : (1 - pct) * 100);
}

function scoreReputacao(level: string | null | undefined): number {
  if (!level) return 50;
  const l = String(level).toLowerCase();
  if (l.includes("platinum")) return 100;
  if (l.includes("gold")) return 85;
  if (l.includes("silver") || l === "green") return 70;
  if (l.includes("yellow") || l.includes("amarel")) return 40;
  if (l.includes("orange") || l.includes("laranja")) return 20;
  if (l.includes("red") || l.includes("vermelh")) return 0;
  return 50;
}

function toNota(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function toStatus(score: number): StatusLevel {
  if (score >= 70) return "ok";
  if (score >= 45) return "atencao";
  return "critico";
}

type CppRow = Record<string, any>;
type ListingsStats = { avgCarac: number | null };

// ─── Pilares ──────────────────────────────────────────────────────────────────

function calcPilarLogistica(row: CppRow): PilarScore {
  const tgmv = Number(row.tgmv_lc) || 0;
  const fbm = Number(row.tgmv_lc_fbm) || 0;
  const flex = Number(row.tgmv_lc_flex) || 0;
  const shareFull = tgmv > 0 ? (fbm / tgmv) * 100 : 0;
  const shareFlex = tgmv > 0 ? (flex / tgmv) * 100 : 0;
  const shareVeloc = shareFull + shareFlex;
  const claims = Number(row.rep_claims_rate) || 0;

  const scoreFull = normalizar(shareFull, 0, 80, "maior_melhor");
  const scoreFlex = normalizar(shareFlex, 0, 30, "maior_melhor");
  const scoreVeloc = normalizar(shareVeloc, 0, 80, "maior_melhor");
  const scoreAtraso = normalizar(claims, 0, 10, "menor_melhor");

  const scoreTotal = Math.round(
    scoreFull * 0.5 + scoreFlex * 0.2 + scoreVeloc * 0.2 + scoreAtraso * 0.1,
  );

  const topicos: Topico[] = [
    {
      id: "share_full",
      label: "Share Full (FBM)",
      valor: `${shareFull.toFixed(1)}%`,
      score: scoreFull,
      peso: 0.5,
      status: shareFull >= 60 ? "ok" : shareFull >= 30 ? "atencao" : "critico",
      acaoSugerida:
        shareFull >= 60
          ? "Full acima de 60% — manter e garantir estoque no CD."
          : shareFull >= 30
            ? `${shareFull.toFixed(0)}% em Full. Identificar SKUs de maior giro em Coleta/Places e criar plano de migração.`
            : `Apenas ${shareFull.toFixed(0)}% em Full. Desvantagem estrutural — prioridade máxima de ação.`,
      fonte: "cpp_mensal.tgmv_lc_fbm / tgmv_lc",
    },
    {
      id: "share_flex",
      label: "Share Flex",
      valor: `${shareFlex.toFixed(1)}%`,
      score: scoreFlex,
      peso: 0.2,
      status: shareFlex >= 10 ? "ok" : shareFlex > 0 ? "atencao" : "critico",
      acaoSugerida:
        shareFlex > 0
          ? "Flex ativo — continuar expandindo para capitais."
          : "Flex zerado. Habilitar para sellers em grandes capitais como ponte para Full.",
      fonte: "cpp_mensal.tgmv_lc_flex / tgmv_lc",
    },
    {
      id: "velocidade_combinada",
      label: "Full + Flex (velocidade)",
      valor: `${shareVeloc.toFixed(1)}%`,
      score: scoreVeloc,
      peso: 0.2,
      status: shareVeloc >= 50 ? "ok" : shareVeloc >= 30 ? "atencao" : "critico",
      acaoSugerida:
        shareVeloc >= 50
          ? "Cobertura de velocidade saudável."
          : `Full+Flex em ${shareVeloc.toFixed(0)}%. Meta: > 50% para competir nas primeiras posições.`,
      fonte: "cpp_mensal.(tgmv_lc_fbm + tgmv_lc_flex) / tgmv_lc",
    },
    {
      id: "taxa_reclamacoes_log",
      label: "Taxa de Reclamações",
      valor: `${claims.toFixed(2)}%`,
      score: scoreAtraso,
      peso: 0.1,
      status: claims < 2 ? "ok" : claims < 5 ? "atencao" : "critico",
      acaoSugerida:
        claims >= 5
          ? "Reclamações críticas. Verificar SLA do CD e atrasos de entrega."
          : claims >= 2
            ? "Reclamações em atenção. Investigar atrasos."
            : "Taxa de reclamações saudável.",
      fonte: "cpp_mensal.rep_claims_rate",
    },
  ];

  return {
    id: "logistica",
    label: "🥇 Logística de Velocidade",
    peso: 0.3,
    score: scoreTotal,
    scoreNota: toNota(scoreTotal),
    status: toStatus(scoreTotal),
    topicos,
  };
}

function calcPilarCdp(row: CppRow): PilarScore {
  const scoreCdpFinal = Number(row.score_final_cdp) || 0;
  const cdpTsi = Number(row.cdp_tsi) || 0;
  const tsi = Number(row.tsi) || 0;
  const pctPedidosCdp = tsi > 0 ? (cdpTsi / tsi) * 100 : 0;

  const scoreScore = normalizar(scoreCdpFinal, 0, 36, "maior_melhor");
  const scorePedidos = normalizar(pctPedidosCdp, 0, 60, "maior_melhor");

  const scoreTotal = Math.round(scoreScore * 0.6 + scorePedidos * 0.4);

  const topicos: Topico[] = [
    {
      id: "score_final_cdp",
      label: "Score CDP do Plano",
      valor: `${scoreCdpFinal.toFixed(0)} / 36`,
      score: scoreScore,
      peso: 0.6,
      status: scoreCdpFinal >= 30 ? "ok" : scoreCdpFinal >= 15 ? "atencao" : "critico",
      acaoSugerida:
        scoreCdpFinal >= 30
          ? "Score CDP próximo do máximo. Manter participação ativa."
          : scoreCdpFinal >= 15
            ? "Score CDP parcial. Ampliar opt-in nos itens elegíveis."
            : "Score CDP baixo. CDP é o 2º fator mais importante — ativar é a ação de maior retorno.",
      fonte: "cpp_mensal.score_final_cdp",
    },
    {
      id: "pct_pedidos_cdp",
      label: "% Pedidos via CDP",
      valor: `${pctPedidosCdp.toFixed(1)}%`,
      score: scorePedidos,
      peso: 0.4,
      status: pctPedidosCdp >= 40 ? "ok" : pctPedidosCdp >= 20 ? "atencao" : "critico",
      acaoSugerida:
        pctPedidosCdp >= 40
          ? "Boa conversão via CDP."
          : `Apenas ${pctPedidosCdp.toFixed(0)}% dos pedidos passam pela CDP. Aumentar opt-in.`,
      fonte: "cpp_mensal.cdp_tsi / tsi",
    },
  ];

  return {
    id: "cdp",
    label: "🥈 Central de Promoção (CDP)",
    peso: 0.25,
    score: scoreTotal,
    scoreNota: toNota(scoreTotal),
    status: toStatus(scoreTotal),
    topicos,
  };
}

function calcPilarReputacao(row: CppRow): PilarScore {
  const level = (row.rep_current_level as string) || null;
  const claims = Number(row.rep_claims_rate) || 0;
  const scoreServicos = Number(row.score_final_servicos) || 0;

  const scoreLevel = scoreReputacao(level);
  const scoreClaims = normalizar(claims, 0, 10, "menor_melhor");
  const scoreServ = normalizar(scoreServicos, 0, 100, "maior_melhor");

  const scoreTotal = Math.round(scoreLevel * 0.5 + scoreClaims * 0.35 + scoreServ * 0.15);

  const topicos: Topico[] = [
    {
      id: "nivel_reputacao",
      label: "Nível de Reputação",
      valor: level || "—",
      score: scoreLevel,
      peso: 0.5,
      status: scoreLevel >= 70 ? "ok" : scoreLevel >= 40 ? "atencao" : "critico",
      acaoSugerida:
        scoreLevel >= 85
          ? "Reputação Platinum/Gold — pré-requisito do algoritmo atendido."
          : scoreLevel >= 70
            ? "Reputação Silver. Melhorar reclamações e atrasos para atingir Gold."
            : "Reputação abaixo do verde. Todas as outras otimizações são secundárias até resolver isso.",
      fonte: "cpp_mensal.rep_current_level",
    },
    {
      id: "taxa_reclamacoes",
      label: "Taxa de Reclamações",
      valor: `${claims.toFixed(2)}%`,
      score: scoreClaims,
      peso: 0.35,
      status: claims < 2 ? "ok" : claims < 5 ? "atencao" : "critico",
      acaoSugerida:
        claims >= 5
          ? "Reclamações críticas (> 5%). Risco de suspensão."
          : claims >= 2
            ? `Reclamações em ${claims.toFixed(2)}% — acima da meta de 2%.`
            : "Taxa de reclamações saudável (< 2%).",
      fonte: "cpp_mensal.rep_claims_rate",
    },
    {
      id: "score_servicos",
      label: "Score de Serviços",
      valor: `${scoreServicos.toFixed(0)} / 100`,
      score: scoreServ,
      peso: 0.15,
      status: scoreServicos >= 70 ? "ok" : scoreServicos >= 45 ? "atencao" : "critico",
      acaoSugerida:
        scoreServicos >= 70
          ? "Score de serviços saudável."
          : "Verificar atrasos, cancelamentos e qualidade do atendimento.",
      fonte: "cpp_mensal.score_final_servicos",
    },
  ];

  return {
    id: "reputacao",
    label: "🥉 Reputação e Autoridade",
    peso: 0.25,
    score: scoreTotal,
    scoreNota: toNota(scoreTotal),
    status: toStatus(scoreTotal),
    topicos,
  };
}

function calcPilarRelevancia(row: CppRow, listingsStats?: ListingsStats): PilarScore {
  const ipi = Number(row.pontuacao_ipi) || 0;
  const avgCarac = listingsStats?.avgCarac ?? null;

  const scoreIpi = normalizar(ipi, 0, 100, "maior_melhor");
  const scoreCarac =
    avgCarac !== null ? normalizar(avgCarac, 0, 100, "maior_melhor") : 50;

  // Pesos redistribuídos (sem visits_expensive e GTIN/IPI por item — não disponíveis no schema)
  const scoreTotal = Math.round(scoreIpi * 0.65 + scoreCarac * 0.35);

  const topicos: Topico[] = [
    {
      id: "pontuacao_ipi",
      label: "IPI Médio do Catálogo",
      valor: `${ipi.toFixed(0)} / 100`,
      score: scoreIpi,
      peso: 0.65,
      status: ipi >= 70 ? "ok" : ipi >= 50 ? "atencao" : "critico",
      acaoSugerida:
        ipi >= 70
          ? "IPI acima de 70 — anúncios elegíveis para posições de destaque orgânico."
          : ipi >= 50
            ? `IPI em ${ipi.toFixed(0)}. Corrigir título, fotos e ficha técnica para ultrapassar 70.`
            : `IPI em ${ipi.toFixed(0)} — abaixo de 50. Anúncios invisíveis no orgânico.`,
      fonte: "cpp_mensal.pontuacao_ipi",
    },
    {
      id: "ficha_tecnica",
      label: "Ficha Técnica Média (listings)",
      valor: avgCarac !== null ? `${avgCarac.toFixed(0)} / 100` : "—",
      score: scoreCarac,
      peso: 0.35,
      status:
        avgCarac === null
          ? "atencao"
          : avgCarac >= 80
            ? "ok"
            : avgCarac >= 50
              ? "atencao"
              : "critico",
      acaoSugerida:
        avgCarac === null
          ? "Dados de ficha técnica indisponíveis. Carregar seller_listings_quality."
          : avgCarac >= 80
            ? "Boa cobertura de ficha técnica."
            : "Ficha incompleta em parte do catálogo — anúncios invisíveis para buscas específicas.",
      fonte: "seller_listings_quality.score_caracteristica_final",
    },
  ];

  return {
    id: "relevancia",
    label: "4º Relevância do Anúncio",
    peso: 0.2,
    score: scoreTotal,
    scoreNota: toNota(scoreTotal),
    status: toStatus(scoreTotal),
    topicos,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function getQualityIndex(
  supabase: SupabaseClient,
  custId: string,
  sellerUuid?: string,
): Promise<QualityIndex | null> {
  if (!custId) return null;
  const custIdNum = Number(custId);
  if (!Number.isFinite(custIdNum)) return null;

  // Últimos 6 meses para tendência + corrente
  let { data: rows } = await supabase
    .from("cpp_mensal")
    .select(
      "tim_month_id, mes_ref, tgmv_lc, tgmv_lc_fbm, tgmv_lc_flex, tsi, cdp_tsi, score_final_cdp, score_final_servicos, pontuacao_ipi, rep_current_level, rep_claims_rate, visitas",
    )
    .eq("cus_cust_id_sel", custIdNum)
    .order("tim_month_id", { ascending: false })
    .limit(6);

  // Fallback: cpp_mensal pode estar vazio. Usa sellers_kpi (que também é
  // mensal — uma linha por seller × tim_month_id) e mapeia para o shape
  // esperado. Scores de CDP/Serviços ficam zerados (não existem na origem).
  if ((!rows || rows.length === 0) && sellerUuid) {
    const { data: kpiRows } = await supabase
      .from("sellers_kpi")
      .select(
        "tim_month_id, data, tgmv_lc, tgmv_lc_full, tgmv_lc_flex, tsi, cdp_tsi, pontuacao_ipi, rep_current_level, rep_claims_rate, visits",
      )
      .eq("seller_id", sellerUuid)
      .not("tim_month_id", "is", null)
      .order("tim_month_id", { ascending: false })
      .limit(6);
    if (kpiRows && kpiRows.length > 0) {
      rows = kpiRows.map((r: any) => ({
        tim_month_id: r.tim_month_id,
        mes_ref: r.data,
        tgmv_lc: r.tgmv_lc,
        tgmv_lc_fbm: r.tgmv_lc_full,
        tgmv_lc_flex: r.tgmv_lc_flex,
        tsi: r.tsi,
        cdp_tsi: r.cdp_tsi,
        score_final_cdp: 0,
        score_final_servicos: 0,
        pontuacao_ipi: r.pontuacao_ipi,
        rep_current_level: r.rep_current_level,
        rep_claims_rate: r.rep_claims_rate,
        visitas: r.visits,
      })) as any;
    }
  }

  if (!rows || rows.length === 0) return null;

  const current = rows[0];

  // Listings (opcional)
  let listingsStats: ListingsStats | undefined;
  if (sellerUuid) {
    const { data: listData } = await supabase
      .from("seller_listings_quality")
      .select("score_caracteristica_final, data")
      .eq("seller_id", sellerUuid)
      .order("data", { ascending: false })
      .limit(500);

    if (listData && listData.length > 0) {
      const caracs = listData
        .map((r: any) => Number(r.score_caracteristica_final))
        .filter((v) => Number.isFinite(v) && v > 0);
      listingsStats = {
        avgCarac: caracs.length > 0 ? caracs.reduce((a, b) => a + b, 0) / caracs.length : null,
      };
    }
  }

  const pilares: PilarScore[] = [
    calcPilarLogistica(current),
    calcPilarCdp(current),
    calcPilarReputacao(current),
    calcPilarRelevancia(current, listingsStats),
  ];

  const scoreGeral = Math.round(pilares.reduce((acc, p) => acc + p.score * p.peso, 0));

  const tendencia = [...rows]
    .reverse()
    .map((r) => {
      const arr = [
        calcPilarLogistica(r),
        calcPilarCdp(r),
        calcPilarReputacao(r),
        calcPilarRelevancia(r, listingsStats),
      ];
      return Math.round(arr.reduce((acc, p) => acc + p.score * p.peso, 0));
    });

  const alertasCriticos = pilares
    .flatMap((p) => p.topicos)
    .filter((t) => t.status === "critico")
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 3)
    .map((t) => t.acaoSugerida);

  return {
    custId,
    mes: (current.mes_ref as string) || String(current.tim_month_id),
    scoreGeral,
    notaGeral: toNota(scoreGeral),
    pilares,
    tendencia,
    alertasCriticos,
  };
}