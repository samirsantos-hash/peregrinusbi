import type {
  Alavanca, CategoriaEscopo, EventoTimeline, Metrica, Okr,
  Parceiro, Participacao, Programa,
} from "@/types/programas";

const HOJE = "2026-07-31";
const FONTE_GM = "Relatório GM Div. Norte";
const FONTE_ML = "Mercado Livre API";

const m = (
  valor: number | null,
  unidade: Metrica["unidade"],
  procedencia: Metrica["procedencia"] = "real",
  fonte = FONTE_ML,
  formula?: string,
): Metrica => ({ valor, unidade, procedencia, fonte, atualizadoEm: HOJE, formula });

export const PROGRAMAS: Programa[] = [
  {
    id: "gm",
    nome: "e-Commerce GM",
    marca: "GM",
    marketplace: "Mercado Livre",
    vigenciaInicio: "2021-01-01",
    vigenciaFim: "2026-12-31",
    corAcento: "199 100% 50%",
    metodoAtribuicao: "keyword da marca",
  },
  {
    id: "acelera-ml",
    nome: "Acelera Marketplace",
    marca: "Peregrinus",
    marketplace: "Mercado Livre",
    vigenciaInicio: "2025-01-01",
    vigenciaFim: "2026-12-31",
    corAcento: "280 80% 60%",
    metodoAtribuicao: "último clique",
  },
];

const PARCEIROS: Parceiro[] = [
  { id: "gtm", nome: "GTM", papel: "Go-to-market", contato: "contato@gtm.com.br", ultimaInteracao: "2026-06-18" },
  { id: "alephee", nome: "Alephee", papel: "Integração", contato: "suporte@alephee.com", ultimaInteracao: "2026-05-02" },
  { id: "ecomconsult", nome: "EcomConsult", papel: "Performance", contato: "time@ecomconsult.com.br", ultimaInteracao: "2026-07-21" },
  { id: "prospectpro", nome: "ProspectPro", papel: "Atacado", contato: null, ultimaInteracao: null },
];

const cascata = (metaLoja: number) => [
  { rotulo: "Nacional", meta: m(200_000_000, "BRL", "real", FONTE_GM), destaque: false },
  { rotulo: "Divisão Norte", meta: m(62_800_000, "BRL", "real", FONTE_GM), destaque: false },
  { rotulo: "Grupo C", meta: m(null, "BRL", "real", FONTE_GM), destaque: false },
  {
    rotulo: "Sua loja",
    meta: m(metaLoja, "BRL", "derivado", FONTE_GM, "potencial inicial do ano"),
    destaque: true,
  },
];

const CATEGORIAS_BASE: { nome: string; catalogo: number | null; anunciados: number | null; gmv: number | null; potencial: number; prioritario: boolean }[] = [
  { nome: "Sistema Ignição e Elétrica", catalogo: 420, anunciados: 180, gmv: 78_000, potencial: 210_000, prioritario: true },
  { nome: "Sistema de Freios", catalogo: 310, anunciados: 205, gmv: 64_000, potencial: 186_000, prioritario: true },
  { nome: "Filtragem e Lubrificação", catalogo: 260, anunciados: 96, gmv: 41_000, potencial: 150_000, prioritario: false },
  { nome: "Suspensão e Transmissão", catalogo: 380, anunciados: 112, gmv: 33_000, potencial: 142_000, prioritario: false },
  { nome: "Acessórios Externos e Iluminação", catalogo: 190, anunciados: null, gmv: null, potencial: 110_000, prioritario: false },
];

const categorias = (fator: number): CategoriaEscopo[] =>
  CATEGORIAS_BASE.map((c, i) => {
    const gmv = c.gmv === null ? null : Math.round(c.gmv * fator);
    const potencial = Math.round(c.potencial * fator);
    const cobertura = c.anunciados === null || c.catalogo === null ? null : (c.anunciados / c.catalogo) * 100;
    return {
      id: `cat-${i}`,
      nome: c.nome,
      skusCatalogo: m(c.catalogo, "un"),
      skusAnunciados: m(c.anunciados, "un"),
      coberturaPct: m(cobertura, "pct", "derivado", FONTE_ML, "SKUs anunciados ÷ SKUs no catálogo × 100"),
      gmv12m: m(gmv, "BRL"),
      potencial: m(potencial, "BRL", "estimado", FONTE_GM),
      gapBrl: m(gmv === null ? null : potencial - gmv, "BRL", "derivado", FONTE_GM, "potencial − GMV 12m"),
      fullAtivo: i === 0 ? true : i === 1 ? false : null,
      prioritario: c.prioritario,
    };
  });

const timeline: EventoTimeline[] = [
  { id: "ev1", data: "2024-02-01", tipo: "mudanca_grupo", titulo: "Entrada no Grupo C", descricao: "Reclassificação da loja pelo programa." },
  { id: "ev2", data: "2025-04-10", tipo: "ativacao_alavanca", titulo: "Ativação de PADS", descricao: "Início dos anúncios patrocinados de produto." },
  { id: "ev3", data: "2025-09-05", tipo: "campanha", titulo: "Lista Pré-Acordo", descricao: "Campanha de preços pré-acordados com a marca." },
  { id: "ev4", data: "2026-03-01", tipo: "outro", titulo: "Queda de performance", descricao: "Queda de performance de vendas observada após março/2026." },
];

const hist = (vals: (number | null)[]) =>
  vals.map((valor, i) => ({ periodo: `2026-0${i + 2}`, valor }));

// ---------- Participação A — Canada Piauí (Teresina) ----------
const alavancasPiaui: Alavanca[] = [
  {
    id: "ads", nome: "Investimento em ADS", descricaoCurta: "Verba de mídia paga sobre o GMV da loja.",
    estado: "nao_ativado", ativoDesde: null,
    valorAtual: m(0, "pct"), valorContratado: m(3, "pct", "real", FONTE_GM),
    resultadoAtribuido: m(null, "BRL"), impactoEstimado: m(180_000, "BRL", "estimado", FONTE_GM),
    parceiroResponsavelId: "ecomconsult", proximaAcao: "Definir verba mensal de ADS",
  },
  {
    id: "pads", nome: "PADS", descricaoCurta: "Anúncios patrocinados de produto ativos.",
    estado: "ativo", ativoDesde: "2025-04-10",
    valorAtual: m(21, "un"), valorContratado: m(20, "un", "real", FONTE_GM),
    resultadoAtribuido: m(62_400, "BRL"), impactoEstimado: m(null, "BRL", "estimado", FONTE_GM),
    parceiroResponsavelId: "ecomconsult", proximaAcao: null,
  },
  {
    id: "clips", nome: "CLIPs", descricaoCurta: "Vídeos curtos de produto na vitrine.",
    estado: "parcial", ativoDesde: "2026-03-15",
    valorAtual: m(6, "un"), valorContratado: m(20, "un", "real", FONTE_GM),
    resultadoAtribuido: m(8_900, "BRL"), impactoEstimado: m(45_000, "BRL", "estimado", FONTE_GM),
    parceiroResponsavelId: "gtm", proximaAcao: "Retomar produção de CLIPs mensais",
  },
  {
    id: "full", nome: "MELI FULL", descricaoCurta: "Estoque armazenado no centro de distribuição.",
    estado: "sem_dado", ativoDesde: null,
    valorAtual: m(null, "pct"), valorContratado: m(null, "pct", "real", FONTE_GM),
    resultadoAtribuido: m(null, "BRL"), impactoEstimado: m(120_000, "BRL", "estimado", FONTE_GM),
    parceiroResponsavelId: "alephee", proximaAcao: "Levantar elegibilidade de FULL",
  },
  {
    id: "cdp", nome: "Central de Promoções", descricaoCurta: "Adesão às campanhas de desconto do marketplace.",
    estado: "sem_dado", ativoDesde: null,
    valorAtual: m(null, "pct"), valorContratado: m(null, "pct", "real", FONTE_GM),
    resultadoAtribuido: m(null, "BRL"), impactoEstimado: m(96_000, "BRL", "estimado", FONTE_GM),
    parceiroResponsavelId: "ecomconsult", proximaAcao: "Mapear itens elegíveis a promoção",
  },
  {
    id: "pre-acordo", nome: "Lista Pré-Acordo", descricaoCurta: "Itens com preço pré-acordado com a marca.",
    estado: "sem_dado", ativoDesde: null,
    valorAtual: m(null, "un"), valorContratado: m(null, "un", "real", FONTE_GM),
    resultadoAtribuido: m(null, "BRL"), impactoEstimado: m(38_000, "BRL", "estimado", FONTE_GM),
    parceiroResponsavelId: "prospectpro", proximaAcao: null,
  },
  {
    id: "platinum", nome: "Consultoria Platinum", descricaoCurta: "Acompanhamento consultivo dedicado.",
    estado: "nao_elegivel", ativoDesde: null,
    valorAtual: m(null, "un"), valorContratado: m(null, "un", "real", FONTE_GM),
    resultadoAtribuido: m(null, "BRL"), impactoEstimado: m(null, "BRL", "estimado", FONTE_GM),
    parceiroResponsavelId: "gtm", proximaAcao: null,
  },
  {
    id: "catalogo", nome: "Catálogo 100% GM", descricaoCurta: "Cobertura total do catálogo da marca anunciado.",
    estado: "sem_dado", ativoDesde: null,
    valorAtual: m(null, "pct"), valorContratado: m(100, "pct", "real", FONTE_GM),
    resultadoAtribuido: m(null, "BRL"), impactoEstimado: m(140_000, "BRL", "estimado", FONTE_GM),
    parceiroResponsavelId: "alephee", proximaAcao: "Publicar SKUs faltantes do catálogo",
  },
];

const okrsPiaui: Okr[] = [
  {
    id: "okr-rep", nome: "Recuperar reputação", metricaNome: "Cor da reputação",
    atual: m(1, "indice"), meta: m(3, "indice", "real", FONTE_GM), metaTipo: "categoria", metaCategoria: "Verde",
    historico: hist([1, 1, 1, 1, 1, 1]), status: "critico", responsavel: "EcomConsult",
  },
  {
    id: "okr-qual", nome: "Qualidade dos anúncios", metricaNome: "Quality Index",
    atual: m(71.3, "indice"), meta: m(80, "indice", "real", FONTE_GM), metaTipo: "faixa", metaFaixa: [80, 100],
    historico: hist([65, 67.2, 69, 70.1, 70.8, 71.3]), status: "atencao", responsavel: "GTM",
  },
  {
    id: "okr-ads", nome: "Investimento em ADS", metricaNome: "% do GMV em mídia",
    atual: m(0, "pct"), meta: m(3, "pct", "real", FONTE_GM), metaTipo: "minimo",
    historico: hist([0, 0, 0, 0, 0, 0]), status: "critico", responsavel: "EcomConsult",
  },
  {
    id: "okr-lucro", nome: "Ajuste de lucratividade", metricaNome: "Margem de contribuição",
    atual: m(null, "pct"), meta: m(45, "pct", "real", FONTE_GM), metaTipo: "faixa", metaFaixa: [45, 60],
    historico: [], status: "sem_dado", responsavel: null,
  },
  {
    id: "okr-atrib", nome: "Atributos de embalagem", metricaNome: "% de SKUs com atributos",
    atual: m(null, "pct"), meta: m(100, "pct", "real", FONTE_GM), metaTipo: "minimo",
    historico: [], status: "sem_dado", responsavel: "Alephee",
  },
  {
    id: "okr-exped", nome: "Calibrar expedição", metricaNome: "Prazo de handling",
    atual: m(null, "dias"), meta: m(null, "dias", "real", FONTE_GM), metaTipo: "maximo",
    historico: [], status: "sem_dado", responsavel: null,
  },
  {
    id: "okr-recursos", nome: "Recursos dedicados (1 gestor + 1 backoffice)", metricaNome: "Time dedicado",
    atual: m(null, "un"), meta: m(1, "un", "real", FONTE_GM), metaTipo: "booleano",
    historico: [], status: "sem_dado", responsavel: "Loja",
  },
];

// ---------- Participação B — Canada Caxias (MA) ----------
const alavancasCaxias: Alavanca[] = alavancasPiaui.map((a) => {
  if (a.id === "pads") {
    return {
      ...a, estado: "nao_ativado" as const, ativoDesde: null,
      valorAtual: m(0, "un"), resultadoAtribuido: m(null, "BRL"),
      impactoEstimado: m(74_000, "BRL", "estimado", FONTE_GM),
      proximaAcao: "Ativar PADS nos SKUs prioritários",
    };
  }
  if (a.id === "clips") {
    return {
      ...a, estado: "sem_dado" as const, ativoDesde: null,
      valorAtual: m(null, "un"), resultadoAtribuido: m(null, "BRL"), proximaAcao: "Levantar CLIPs publicados",
    };
  }
  return a;
});

const okrsCaxias: Okr[] = okrsPiaui.map((o) => {
  if (o.id === "okr-rep") {
    return { ...o, atual: m(3, "indice"), historico: hist([2, 2, 3, 3, 3, 3]), status: "verde" as const };
  }
  if (o.id === "okr-qual") {
    return { ...o, atual: m(70.9, "indice"), historico: hist([72, 71.6, 71.2, 71, 70.9, 70.9]), status: "atencao" as const };
  }
  return o;
});

const alavancasAcelera: Alavanca[] = [
  {
    id: "acl-ads", nome: "Mídia performance", descricaoCurta: "Campanhas de aquisição fora da marca.",
    estado: "ativo", ativoDesde: "2025-06-01",
    valorAtual: m(2.1, "pct"), valorContratado: m(2, "pct"),
    resultadoAtribuido: m(112_000, "BRL"), impactoEstimado: m(null, "BRL", "estimado", "Peregrinus"),
    parceiroResponsavelId: "ecomconsult", proximaAcao: null,
  },
  {
    id: "acl-full", nome: "Logística acelerada", descricaoCurta: "Migração de estoque para modal rápido.",
    estado: "parcial", ativoDesde: "2026-01-12",
    valorAtual: m(34, "pct"), valorContratado: m(60, "pct"),
    resultadoAtribuido: m(48_000, "BRL"), impactoEstimado: m(90_000, "BRL", "estimado", "Peregrinus"),
    parceiroResponsavelId: "alephee", proximaAcao: "Elevar share do modal rápido para 60%",
  },
  {
    id: "acl-cat", nome: "Expansão de catálogo", descricaoCurta: "Publicação de novos SKUs por mês.",
    estado: "nao_ativado", ativoDesde: null,
    valorAtual: m(0, "un"), valorContratado: m(50, "un"),
    resultadoAtribuido: m(null, "BRL"), impactoEstimado: m(66_000, "BRL", "estimado", "Peregrinus"),
    parceiroResponsavelId: "prospectpro", proximaAcao: "Definir plano de publicação mensal",
  },
];

const okrsAcelera: Okr[] = [
  {
    id: "acl-okr-roi", nome: "ROI de mídia", metricaNome: "ROAS",
    atual: m(4.2, "indice"), meta: m(4, "indice"), metaTipo: "minimo",
    historico: hist([3.1, 3.4, 3.8, 4.0, 4.1, 4.2]), status: "verde", responsavel: "EcomConsult",
  },
  {
    id: "acl-okr-cob", nome: "Cobertura de catálogo", metricaNome: "% SKUs anunciados",
    atual: m(48, "pct"), meta: m(70, "pct"), metaTipo: "minimo",
    historico: hist([40, 42, 44, 45, 47, 48]), status: "atencao", responsavel: "Alephee",
  },
];

export const PARTICIPACOES: Participacao[] = [
  {
    id: "part-gm-piaui", lojaId: "canada-piaui", programaId: "gm", sellerId: "237.664.328",
    grupo: "Grupo C", grupoDescricao: "Concessionárias em recuperação",
    cascata: cascata(780_000),
    realizado: m(235_000, "BRL"),
    potencial: m(780_000, "BRL", "estimado", FONTE_GM),
    crescimentoYoY: m(39, "pct", "derivado", FONTE_ML, "GMV 12m atual ÷ GMV 12m anterior − 1"),
    alavancas: alavancasPiaui, okrs: okrsPiaui, parceiros: PARCEIROS,
    categorias: categorias(1), timeline,
    coberturaDadosPct: 46, atualizadoEm: HOJE,
  },
  {
    id: "part-acelera-piaui", lojaId: "canada-piaui", programaId: "acelera-ml", sellerId: "237.664.328",
    grupo: "Tier 2", grupoDescricao: "Lojas em escala",
    cascata: [
      { rotulo: "Rede", meta: m(9_500_000, "BRL", "real", "Peregrinus"), destaque: false },
      { rotulo: "Região Nordeste", meta: m(2_100_000, "BRL", "real", "Peregrinus"), destaque: false },
      { rotulo: "Tier 2", meta: m(640_000, "BRL", "real", "Peregrinus"), destaque: false },
      { rotulo: "Sua loja", meta: m(320_000, "BRL", "derivado", "Peregrinus", "meta do tier ÷ nº de lojas do tier"), destaque: true },
    ],
    realizado: m(268_000, "BRL"),
    potencial: m(410_000, "BRL", "estimado", "Peregrinus"),
    crescimentoYoY: m(12, "pct", "derivado", FONTE_ML, "GMV 12m atual ÷ GMV 12m anterior − 1"),
    alavancas: alavancasAcelera, okrs: okrsAcelera, parceiros: PARCEIROS.slice(1),
    categorias: categorias(0.6), timeline: timeline.slice(1),
    coberturaDadosPct: 82, atualizadoEm: HOJE,
  },
  {
    id: "part-gm-caxias", lojaId: "canada-caxias", programaId: "gm", sellerId: "241.882.101",
    grupo: "Grupo C", grupoDescricao: "Concessionárias em recuperação",
    cascata: cascata(420_000),
    realizado: m(148_000, "BRL"),
    potencial: m(798_000, "BRL", "estimado", FONTE_GM),
    crescimentoYoY: m(-4, "pct", "derivado", FONTE_ML, "GMV 12m atual ÷ GMV 12m anterior − 1"),
    alavancas: alavancasCaxias, okrs: okrsCaxias, parceiros: PARCEIROS,
    categorias: categorias(0.72), timeline,
    coberturaDadosPct: 38, atualizadoEm: HOJE,
  },
];
