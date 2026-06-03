export type InsightPreco = {
  id: string;
  tipo: "alerta" | "oportunidade" | "tendencia" | "investigar";
  titulo: string;
  identificado: string;
  porque: string;
  investigar: string;
  sugestao: string;
  urgencia: "alta" | "media" | "baixa";
  metrica: string;
  periodo?: string;
};

export type DadosMes = {
  mes: string;
  pctMaisBarato: number;
  pctEquivalente: number;
  pctMaisCaro: number;
  totalBPC: number;
};

export function gerarInsights(
  historico: DadosMes[],
  dadosAtual: DadosMes,
  _priceScore: number | null,
  _temCDP: boolean,
  pctOptinCDP: number,
  _isMercadoLider: boolean,
): InsightPreco[] {
  const insights: InsightPreco[] = [];
  if (historico.length < 2) return insights;

  const atual = dadosAtual;
  const anterior = historico.at(-2)!;

  // 1: Não competitivo crítico / atenção
  if (atual.pctMaisCaro >= 30) {
    insights.push({
      id: "nao_competitivo_critico",
      tipo: "alerta",
      urgencia: "alta",
      titulo: "Preço não competitivo acima do limite algorítmico",
      metrica: `${atual.pctMaisCaro.toFixed(1)}%`,
      identificado: `Em ${atual.pctMaisCaro.toFixed(1)}% das comparações de preço ativadas pelo ML, o seller estava mais caro que o concorrente direto. O limite que dispara penalização é 30%.`,
      porque:
        "O algoritmo do ML cruza CTR com taxa de conversão em tempo real. Quando um anúncio recebe cliques mas não converte por causa do preço, ele é progressivamente rebaixado nos resultados de busca — sem necessidade de ação do ML, acontece automaticamente.",
      investigar:
        "Identificar quais categorias ou produtos específicos concentram essa desvantagem. Verificar se houve reajuste de preço recente ou se um concorrente reduziu o preço. Comparar o preço atual com os 3 primeiros resultados da busca no ML para os produtos de maior GMV.",
      sugestao:
        "Revisar o preço dos 5 SKUs de maior visita. Para itens onde a margem não permite redução de preço, ativar CDP com coparticipação do ML — o desconto conjunto melhora a competitividade sem reduzir o preço de tabela.",
    });
  } else if (atual.pctMaisCaro >= 20) {
    insights.push({
      id: "nao_competitivo_atencao",
      tipo: "investigar",
      urgencia: "media",
      titulo: "Preço em zona de atenção — 10pp do limite de penalização",
      metrica: `${atual.pctMaisCaro.toFixed(1)}%`,
      identificado: `${atual.pctMaisCaro.toFixed(1)}% das comparações com preço mais caro. Ainda dentro do tolerável pelo algoritmo, mas com pouca margem antes de atingir os 30% de limite.`,
      porque:
        "Entre 20% e 30%, o algoritmo ainda não penaliza diretamente, mas a conversão já começa a cair porque o comprador vê o rival mais barato na comparação de preço.",
      investigar:
        "Verificar tendência: está subindo ou descendo nos últimos 3 meses? Se subindo, identificar a causa (reajuste do seller ou concorrente mais barato entrando no mercado).",
      sugestao: "Monitorar mensalmente e agir preventivamente nos SKUs de maior volume antes de ultrapassar 30%.",
    });
  }

  // 2: Piora mensal
  const deltaMasCaro = atual.pctMaisCaro - anterior.pctMaisCaro;
  if (deltaMasCaro >= 8) {
    const mesFmt = new Date(atual.mes + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    insights.push({
      id: "piora_mensal",
      tipo: "alerta",
      urgencia: "alta",
      titulo: `Preço piorou ${deltaMasCaro.toFixed(0)}pp vs mês anterior`,
      metrica: `+${deltaMasCaro.toFixed(0)}pp`,
      periodo: atual.mes,
      identificado: `O percentual de visitas com preço mais caro saltou de ${anterior.pctMaisCaro.toFixed(1)}% para ${atual.pctMaisCaro.toFixed(1)}% — variação de ${deltaMasCaro.toFixed(1)}pp em um único mês.`,
      porque:
        "Uma variação tão brusca em um mês indica uma mudança concreta: ou o seller reajustou preços para cima, ou um concorrente relevante entrou no mercado com preço mais baixo. Ambos os casos afetam o posicionamento orgânico.",
      investigar: `Verificar o que aconteceu especificamente em ${mesFmt}: houve reajuste de lista de preços? Novo concorrente identificado na categoria? Promoção de um rival expirou e ele abaixou mais o preço base?`,
      sugestao:
        "Abrir o ML e buscar pelos 10 produtos de maior GMV do seller. Comparar o preço atual com o 1º resultado. Se o rival está sistematicamente mais barato, avaliar: redução de preço nos produtos-âncora ou ativação de CDP com desconto focado nesses itens.",
    });
  }

  // 3: Melhora consistente
  const ultimos3 = historico.slice(-3);
  const tendenciaQueda =
    ultimos3.length >= 3 && ultimos3.every((m, i) => i === 0 || m.pctMaisCaro < ultimos3[i - 1].pctMaisCaro);
  if (tendenciaQueda && atual.pctMaisCaro < 25) {
    insights.push({
      id: "melhora_consistente",
      tipo: "tendencia",
      urgencia: "baixa",
      titulo: "Competitividade de preço melhorando consistentemente",
      metrica: `${atual.pctMaisCaro.toFixed(1)}%`,
      identificado: `Nos últimos 3 meses, o % de visitas com preço mais caro caiu consecutivamente: ${ultimos3
        .map((m) => `${m.pctMaisCaro.toFixed(0)}%`)
        .join(" → ")}.`,
      porque:
        "Tendência de melhora consistente indica que ajustes de preço ou ativação de promoções estão surtindo efeito. O algoritmo recompensa progressivamente com mais exposição orgânica.",
      investigar:
        "Identificar o que foi feito de diferente nos últimos 3 meses e replicar: houve ativação de CDP? Redução de preço em categorias específicas? Novo concorrente saiu do mercado?",
      sugestao: "Manter a estratégia atual. Documentar o que funcionou para replicar em outros sellers da carteira com perfil similar.",
    });
  }

  // 4: Empate sem vantagem
  if (atual.pctEquivalente >= 45 && atual.pctMaisBarato < 25) {
    insights.push({
      id: "empate_sem_vantagem",
      tipo: "oportunidade",
      urgencia: "media",
      titulo: "Preço empatado mas sem vantagem — oportunidade de CDP",
      metrica: `${atual.pctEquivalente.toFixed(0)}% equivalente`,
      identificado: `${atual.pctEquivalente.toFixed(0)}% das comparações mostram o seller com preço igual ao rival, mas apenas ${atual.pctMaisBarato.toFixed(0)}% mais barato. Quando os preços são iguais, o comprador decide por outros fatores: frete, reputação, CDP.`,
      porque:
        'Empate de preço é onde o CDP tem maior impacto. A tag "Oferta Imperdível" gerada pela CDP desempata a decisão de compra a favor do seller — sem precisar reduzir o preço base.',
      investigar: `Verificar quantos itens com preço equivalente ao concorrente estão participando da CDP. Se ${(100 - pctOptinCDP).toFixed(0)}% do catálogo está fora da CDP, essa é a alavanca mais imediata disponível.`,
      sugestao:
        "Ativar CDP nos itens que já têm preço equivalente ao rival. Nesses casos, o custo do desconto é mínimo (já está empatado) e o ganho de visibilidade pela tag é máximo. Priorizar itens com coparticipação do ML disponível.",
    });
  }

  // 5: Cobertura BPC baixa
  const coberturaBPC = historico.reduce((acc, m) => acc + m.totalBPC, 0) / historico.length;
  if (coberturaBPC < 500) {
    insights.push({
      id: "cobertura_bpc_baixa",
      tipo: "investigar",
      urgencia: "media",
      titulo: "Poucas comparações de preço ativadas pelo ML",
      metrica: `${Math.round(coberturaBPC).toLocaleString("pt-BR")} comp/mês`,
      identificado: `O ML ativou em média apenas ${Math.round(coberturaBPC).toLocaleString("pt-BR")} comparações de preço por mês. Volume baixo indica que poucos produtos do catálogo têm concorrentes diretos identificados pelo ML.`,
      porque:
        "Quando o ML não encontra um rival direto, o anúncio perde a oportunidade de aparecer nas comparações de preço — um canal de tráfego qualificado. Pode indicar catálogo muito específico ou produtos sem concorrência identificada no ML.",
      investigar:
        "Verificar se os produtos estão cadastrados no catálogo ML (GTIN/EAN válido) e se há produtos similares com preços diferentes de outros sellers. Sem EAN válido, o ML não vincula o produto ao catálogo e não ativa comparações.",
      sugestao:
        "Priorizar cadastro de EAN válido nos produtos de maior GMV. Com EAN correto, o ML vincula ao catálogo e começa a ativar comparações de preço — aumentando a visibilidade nas buscas por produto específico.",
    });
  }

  // 6: Pior mês histórico
  const piorMes = [...historico].sort((a, b) => b.pctMaisCaro - a.pctMaisCaro)[0];
  if (piorMes && piorMes.pctMaisCaro >= 35 && piorMes.mes !== atual.mes) {
    const mesFmt = new Date(piorMes.mes + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    insights.push({
      id: "pior_mes_historico",
      tipo: "investigar",
      urgencia: "baixa",
      titulo: `Pior momento de competitividade foi em ${mesFmt}`,
      metrica: `${piorMes.pctMaisCaro.toFixed(0)}% não competitivo`,
      periodo: piorMes.mes,
      identificado: `Em ${mesFmt}, ${piorMes.pctMaisCaro.toFixed(1)}% das comparações mostraram o seller mais caro — o pior resultado nos últimos ${historico.length} meses.`,
      porque:
        "Identificar o pior período ajuda a entender ciclos sazonais ou eventos pontuais que afetam a competitividade. Se o padrão se repetir, o consultor pode agir preventivamente.",
      investigar: `O que aconteceu em ${mesFmt}? Reajuste de preços? Alta demanda sazonal que permitiu subida de preço? Promoção de um rival concentrada naquele período? Verificar se esse mês coincide com datas comemorativas ou campanhas do ML.`,
      sugestao: "Mapear o padrão sazonal e criar uma régua de preços preventiva para os meses historicamente mais críticos.",
    });
  }

  const ordemUrgencia = { alta: 0, media: 1, baixa: 2 } as const;
  const ordemTipo = { alerta: 0, investigar: 1, oportunidade: 2, tendencia: 3 } as const;

  return insights.sort((a, b) =>
    ordemUrgencia[a.urgencia] !== ordemUrgencia[b.urgencia]
      ? ordemUrgencia[a.urgencia] - ordemUrgencia[b.urgencia]
      : ordemTipo[a.tipo] - ordemTipo[b.tipo],
  );
}