import type { ListingQuality } from "@/hooks/useListingsQuality";
import type { EligibilityItem } from "@/hooks/useEligibility";

export type AcaoCategoria =
  | "fotos"
  | "video"
  | "titulo"
  | "descricao"
  | "ficha_tecnica"
  | "frete_gratis"
  | "preco"
  | "cdp_promocao"
  | "experiencia_compra";

export type AcaoAnuncio = {
  id: string;
  categoria: AcaoCategoria;
  prioridade: 1 | 2 | 3;
  titulo: string;
  instrucao: string;
  impactoScore: number; // pp estimado de ganho no score médio do anúncio
  icone: string;
};

export type Urgencia = "critico" | "importante" | "otimizacao" | "ok";

export type AnuncioPlano = {
  item_id: string;
  item_name: string;
  vertical: string;
  mlbLink: string;

  score_atual: number; // avgScore das dimensões LL
  score_potencial: number;

  pedidos_7d: number;
  media_tsi_7d: number;
  estoque_7d: number;

  flag_optin_cdp: boolean;
  flag_best_promo: boolean;
  desconto_atual: number;

  acoes: AcaoAnuncio[];
  urgencia: Urgencia;
  quality_disponivel: boolean;
};

export const CATEGORIA_LABEL: Record<AcaoCategoria, string> = {
  fotos: "Fotos",
  video: "Vídeo/Clip",
  titulo: "Título",
  descricao: "Descrição",
  ficha_tecnica: "Ficha Técnica",
  frete_gratis: "Frete Grátis",
  preco: "Preço",
  cdp_promocao: "CDP / Promoção",
  experiencia_compra: "Experiência",
};

function gerarAcoes(ql: ListingQuality, el: EligibilityItem | null): AcaoAnuncio[] {
  const acoes: AcaoAnuncio[] = [];

  // Ficha técnica
  if (ql.llTechSpecsScore > 0 && ql.llTechSpecsScore < 70) {
    const deficit = Math.round(70 - ql.llTechSpecsScore);
    acoes.push({
      id: "ficha",
      categoria: "ficha_tecnica",
      prioridade: 1,
      titulo: "Completar características obrigatórias",
      instrucao: `Ficha técnica em ${ql.llTechSpecsScore.toFixed(0)}% — ${deficit}pp abaixo do mínimo. Abrir o anúncio no ML Sellers → Editar → Características e preencher 100% dos campos obrigatórios. Campos opcionais também contam para indexação em buscas específicas — preencher todos.`,
      impactoScore: 25,
      icone: "📋",
    });
  }

  // Fotos
  if (ql.llPicturesScore > 0 && ql.llPicturesScore < 60) {
    acoes.push({
      id: "fotos",
      categoria: "fotos",
      prioridade: 1,
      titulo: "Melhorar qualidade das fotos",
      instrucao:
        "Fotos com score baixo reduzem CTR. Requisitos: fundo 100% branco, resolução mínima 1200×1200px, produto centralizado sem marca d'água ou texto. Incluir ao menos 6 ângulos (frontal, laterais, traseira, detalhe técnico, produto em uso). A 1ª foto é a mais crítica — fundo branco e produto ocupando 85%+ do frame.",
      impactoScore: 20,
      icone: "📸",
    });
  }

  // Título
  if (ql.llTitleScore > 0 && ql.llTitleScore < 60) {
    acoes.push({
      id: "titulo",
      categoria: "titulo",
      prioridade: 1,
      titulo: "Reescrever o título",
      instrucao:
        "Título genérico/curto reduz indexação. Fórmula: [Produto] + [Característica Principal] + [Modelo/Aplicação] + [Ano]. Limite 60 caracteres, sem emojis. As 3 primeiras palavras têm mais peso no algoritmo — colocar o termo principal no início.",
      impactoScore: 18,
      icone: "✏️",
    });
  }

  // Descrição
  if (ql.llDescriptionScore > 0 && ql.llDescriptionScore < 60) {
    acoes.push({
      id: "descricao",
      categoria: "descricao",
      prioridade: 2,
      titulo: "Completar a descrição",
      instrucao:
        "Estrutura das 5 primeiras linhas: (1) nome + aplicação, (2) o que vem na embalagem, (3) compatibilidade (modelos e anos), (4) alerta para conferir chassi/OEM, (5) diferencial ou brinde. Usar marcadores (✓ ⚠ 📦) — aumentam legibilidade no mobile.",
      impactoScore: 10,
      icone: "📝",
    });
  }

  // Frete
  if (ql.llFreeShippingScore > 0 && ql.llFreeShippingScore < 50) {
    acoes.push({
      id: "frete",
      categoria: "frete_gratis",
      prioridade: 2,
      titulo: "Habilitar frete grátis",
      instrucao:
        "Frete grátis é pré-requisito para muitas posições de destaque no algoritmo. Para itens leves (<1kg) o custo é baixo. Para itens pesados, avaliar absorver no preço ou limitar a regiões. Verificar no painel do seller se há subsídio de frete Full disponível.",
      impactoScore: 12,
      icone: "🚚",
    });
  }

  // Preço
  if (ql.llPriceScore > 0 && ql.llPriceScore < 60) {
    acoes.push({
      id: "preco",
      categoria: "preco",
      prioridade: 2,
      titulo: "Revisar preço vs concorrência",
      instrucao:
        "Score de preço baixo indica que este anúncio está sendo preterido por concorrentes mais baratos. O ML rebaixa progressivamente anúncios caros que recebem clique mas não convertem. Verificar 3 concorrentes diretos e ajustar preço ou reforçar proposta de valor (kit, brinde, garantia).",
      impactoScore: 8,
      icone: "💰",
    });
  }

  // Vídeo / Clip — quando dimensões básicas estão OK mas pedidos estão baixos vs estoque
  const fotosOk = ql.llPicturesScore === 0 || ql.llPicturesScore >= 60;
  const tituloOk = ql.llTitleScore === 0 || ql.llTitleScore >= 60;
  const semClip = ql.sellersClipsPubli === 0;
  const baixaVenda =
    el && el.estoqueMedio7d > 5 && el.pedidos7d < Math.max(2, el.estoqueMedio7d * 0.1);

  if (fotosOk && tituloOk && semClip && baixaVenda) {
    acoes.push({
      id: "video",
      categoria: "video",
      prioridade: 2,
      titulo: "Criar clip/vídeo para este anúncio",
      instrucao: `Item com estoque (${el?.estoqueMedio7d.toFixed(0)} und) mas baixo giro (${el?.pedidos7d} pedidos em 7d), mesmo com fotos e título adequados. Clips pré-qualificam o comprador antes do clique. Estrutura: (1) 3s iniciais com produto resolvendo um problema, (2) demonstração em uso, (3) CTA claro. Duração: 15–30s.`,
      impactoScore: 0,
      icone: "🎬",
    });
  }

  // CDP — discount_* vem em basis points (×100), ex.: 277 = 2,77%
  const descAtualPct = (el?.discountSellerPercentage ?? 0) / 100;
  const descTotalPct = (el?.discountTotal ?? 0) / 100;

  if (el && !el.flagItemSOptin) {
    acoes.push({
      id: "cdp_optin",
      categoria: "cdp_promocao",
      prioridade: 2,
      titulo: "Ativar opt-in na Central de Promoção",
      instrucao:
        "Item fora da CDP. Participar gera a tag 'Oferta Imperdível' e acesso a abas exclusivas de promoção sem custo de mídia (Ads). Estratégia inteligente: priorizar campanhas com coparticipação do ML — o ML banca parte do desconto, reduzindo o CPV (custo por venda) e liberando orçamento de Ads para outros anúncios. Resultado: mais exposição com menor custo total de aquisição.",
      impactoScore: 0,
      icone: "🎯",
    });
  } else if (el && el.flagItemSOptin && !el.flagBestPromo && descAtualPct < 5) {
    const temCopart = descTotalPct > descAtualPct + 0.5;
    acoes.push({
      id: "cdp_melhorar",
      categoria: "cdp_promocao",
      prioridade: 3,
      titulo: "Aumentar desconto na campanha CDP",
      instrucao: `Opt-in ativo mas desconto de ${descAtualPct.toFixed(1)}% está abaixo do recomendado para a tag 'Oferta Imperdível'. ${
        temCopart
          ? `ML coparticipa: desconto total é ${descTotalPct.toFixed(1)}% com custo menor para o seller.`
          : "Verificar se há campanha com coparticipação disponível."
      }`,
      impactoScore: 0,
      icone: "🎯",
    });
  }

  // Experiência de compra — qualidade OK mas pedidos zerados com estoque
  const todasOk =
    (ql.llPicturesScore === 0 || ql.llPicturesScore >= 70) &&
    (ql.llTitleScore === 0 || ql.llTitleScore >= 70) &&
    (ql.llTechSpecsScore === 0 || ql.llTechSpecsScore >= 70);
  if (todasOk && el && el.estoqueMedio7d > 10 && el.pedidos7d === 0) {
    acoes.push({
      id: "experiencia",
      categoria: "experiencia_compra",
      prioridade: 2,
      titulo: "Investigar experiência de compra",
      instrucao:
        "Anúncio adequado em qualidade mas sem pedidos com estoque disponível. Verificar: (1) perguntas não respondidas; (2) avaliações negativas recentes; (3) compatibilidade ambígua — adicionar tabela de compatibilidade explícita; (4) sazonalidade.",
      impactoScore: 0,
      icone: "🛍️",
    });
  }

  return acoes.sort((a, b) =>
    a.prioridade !== b.prioridade
      ? a.prioridade - b.prioridade
      : b.impactoScore - a.impactoScore,
  );
}

export function montarPlanos(
  qualities: ListingQuality[],
  eligibilities: EligibilityItem[],
): AnuncioPlano[] {
  // Deduplicar elegibilidade por item_id — uma linha por campanha vira N linhas
  // por MLB. Mantemos a "melhor" campanha: flag_best_promo > pedidos_7d.
  const elMap = new Map<string, EligibilityItem>();
  for (const e of eligibilities) {
    const key = String(e.itemId).replace(/\D/g, "");
    if (!key) continue;
    const atual = elMap.get(key);
    if (!atual) {
      elMap.set(key, e);
      continue;
    }
    const melhor =
      (Number(e.flagBestPromo) - Number(atual.flagBestPromo)) ||
      (e.pedidos7d - atual.pedidos7d) ||
      (e.estoqueMedio7d - atual.estoqueMedio7d);
    if (melhor > 0) elMap.set(key, e);
  }

  // Quando seller_listings_quality está vazia, usar a elegibilidade como base
  // (dados parciais — sem scores de IPI/fotos, mas com venda/CDP).
  const useFallback = qualities.length === 0 && elMap.size > 0;
  const baseQualities: ListingQuality[] = useFallback
    ? Array.from(elMap.values()).map((e) => {
        const key = String(e.itemId).replace(/\D/g, "");
        return {
          id: e.id,
          sellerId: e.sellerId,
          itemId: key || e.itemId,
          date: e.data,
          llPicturesScore: 0,
          llTitleScore: 0,
          llTechSpecsScore: 0,
          llDescriptionScore: 0,
          llPriceScore: 0,
          llStockAvailabilityScore: 0,
          llFreeShippingScore: 0,
          llPromotionsScore: 0,
          scorePhoto: 0,
          scoreTitle: 0,
          scoreOfertaFinal: 0,
          scoreCaracteristicaFinal: 0,
          scoreQualidadeFinal: 0,
          sellersClipsPubli: 0,
          visitasClips: 0,
          siClips: 0,
          ordersClips: 0,
          tgmvLcClips: 0,
          avgScore: 0,
          issues: [],
          mlbLink: e.mlbLink,
        };
      })
    : qualities;

  // Garantir unicidade por item_id também no lado das qualidades
  const seen = new Set<string>();
  return baseQualities
    .filter((ql) => {
      const k = String(ql.itemId).replace(/\D/g, "") || ql.itemId;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((ql) => {
    const key = String(ql.itemId).replace(/\D/g, "");
    const el = elMap.get(key) ?? null;
    const acoes = gerarAcoes(ql, el);
    const ganho = acoes.reduce((s, a) => s + a.impactoScore, 0);
    const scorePotencial = Math.min(100, ql.avgScore + ganho);

    const urgencia: Urgencia = acoes.some(
      (a) => a.prioridade === 1 && a.impactoScore >= 20,
    )
      ? "critico"
      : acoes.some((a) => a.prioridade === 1)
      ? "importante"
      : acoes.length > 0
      ? "otimizacao"
      : "ok";

    return {
      item_id: key || ql.itemId,
      item_name: el?.itemName || "",
      vertical: el?.verticalItem || "",
      mlbLink: ql.mlbLink,
      score_atual: ql.avgScore,
      score_potencial: scorePotencial,
      pedidos_7d: el?.pedidos7d ?? 0,
      media_tsi_7d: el?.mediaTsiDiario7d ?? 0,
      estoque_7d: el?.estoqueMedio7d ?? 0,
      flag_optin_cdp: el?.flagItemSOptin ?? false,
      flag_best_promo: el?.flagBestPromo ?? false,
      desconto_atual: el?.discountSellerPercentage ?? 0,
      acoes,
      urgencia,
      quality_disponivel: !useFallback,
    };
  });
}

export function ordenarPlanos(
  planos: AnuncioPlano[],
  ordenarPor: "urgencia" | "pedidos" | "potencial",
): AnuncioPlano[] {
  const ordemUrg: Record<Urgencia, number> = {
    critico: 0,
    importante: 1,
    otimizacao: 2,
    ok: 3,
  };
  return [...planos].sort((a, b) => {
    if (ordenarPor === "pedidos") return b.pedidos_7d - a.pedidos_7d;
    if (ordenarPor === "potencial")
      return b.score_potencial - b.score_atual - (a.score_potencial - a.score_atual);
    if (a.urgencia !== b.urgencia) return ordemUrg[a.urgencia] - ordemUrg[b.urgencia];
    return b.pedidos_7d - a.pedidos_7d;
  });
}