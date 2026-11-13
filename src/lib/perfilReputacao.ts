export function tierPorMedalha(medalha?: string | null) {
  const valor = medalha?.trim().toLowerCase() ?? "";
  if (valor.includes("platinum")) return 1;
  if (valor.includes("gold")) return 2;
  if (valor.includes("silver")) return 3;
  return null;
}

export function perfilLegivel(perfil?: string | null) {
  const valor = perfil?.trim() ?? "";
  const rotulos: Record<string, string> = {
    newbie: "Newbie", "starter/newbie": "Starter / Newbie",
    "in professionalization": "Em profissionalização", professional: "Profissional",
    professionalization: "Em profissionalização", emerging: "Emerging · Em maturação",
    mature: "Mature · Madura", core: "Core · Consolidada", melipro: "MeliPro · Profissional",
    crownjewels: "Joias da Coroa", "crown jewels": "Joias da Coroa",
  };
  return rotulos[valor.toLowerCase()] ?? (valor || "Não informado");
}
/** Meta de envios no prazo (padrão de referência importado: 97%). */
export const META_ENVIOS_NO_PRAZO = 97;

/** Calcula envios no prazo e a folga até a meta. `taxaAtraso` aceita fração (0,02) ou percentual (2). */
export function metaEnvios(taxaAtraso?: number | null, vendas?: number | null, meta = META_ENVIOS_NO_PRAZO) {
  if (taxaAtraso == null || !Number.isFinite(taxaAtraso)) return null;
  const atrasoPct = taxaAtraso <= 1 ? taxaAtraso * 100 : taxaAtraso;
  const noPrazo = Math.max(0, 100 - atrasoPct);
  const limiteAtraso = 100 - meta;
  const temVendas = vendas != null && vendas > 0;
  const atrasosAtuais = temVendas ? Math.round((atrasoPct / 100) * vendas!) : null;
  const atrasosPermitidos = temVendas ? Math.floor((limiteAtraso / 100) * vendas! + 1e-9) : null;
  return { noPrazo, atrasoPct, meta, atingida: noPrazo >= meta, atrasosAtuais, atrasosPermitidos,
    folga: atrasosAtuais != null && atrasosPermitidos != null ? atrasosPermitidos - atrasosAtuais : null };
}

/** Limites de referência da reputação verde no Mercado Livre (taxas sobre vendas de 60 dias). */
export const LIMITES_REPUTACAO = { reclamacoes: 1, cancelamentos: 0.5, atrasos: 100 - META_ENVIOS_NO_PRAZO } as const;

/** Desempenho por indicador: taxa em %, quantidade estimada nas vendas, limite e folga. Ausência fica null. */
export function desempenhoVendedor(d: { reclamacoes?: number | null; cancelamentos?: number | null; atrasos?: number | null; vendas_concluidas_60d?: number | null }) {
  const vendas = d.vendas_concluidas_60d ?? null;
  return (Object.keys(LIMITES_REPUTACAO) as (keyof typeof LIMITES_REPUTACAO)[]).map((chave) => {
    const bruto = d[chave];
    if (bruto == null || !Number.isFinite(bruto)) return { chave, taxa: null, qtd: null, limite: LIMITES_REPUTACAO[chave], permitidos: null, folga: null, ok: null };
    const taxa = bruto <= 1 ? bruto * 100 : bruto;
    const limite = LIMITES_REPUTACAO[chave];
    const qtd = vendas ? Math.round((taxa / 100) * vendas) : null;
    const permitidos = vendas ? Math.floor((limite / 100) * vendas + 1e-9) : null;
    return { chave, taxa, qtd, limite, permitidos, folga: qtd != null && permitidos != null ? permitidos - qtd : null, ok: taxa <= limite };
  });
}

type Limites = { sowPads: number; oos: number; bs: number };
/** Compara indicadores atuais com o tier-alvo (próximo acima; Tier 1 mantém). Ausência fica null, sem ação inventada. */
export function evolucaoTier(atual: { tier: 1 | 2 | 3 | null; sowPads: number | null; oos: number | null; bs: number | null }, limites: Record<1 | 2 | 3, Limites>) {
  const alvo: 1 | 2 | 3 = atual.tier === 1 ? 1 : atual.tier === 2 ? 1 : 2;
  const l = limites[alvo];
  const linha = (nome: string, valor: number | null, limite: number, sentido: "min" | "max", acao: (gap: number) => string) => {
    if (valor == null || !Number.isFinite(valor)) return { nome, valor: null, limite, sentido, ok: null, gap: null, acao: "Sem medição disponível" };
    const gap = sentido === "min" ? limite - valor : valor - limite;
    return { nome, valor, limite, sentido, ok: gap <= 0, gap: Math.max(0, gap), acao: gap <= 0 ? "Mantenha" : acao(gap) };
  };
  return { alvo, linhas: [
    linha("Investimento Ads / faturamento", atual.sowPads, l.sowPads, "min", g => `Aumentar investimento em Ads em ${g.toFixed(2).replace(".", ",")} p.p. do faturamento`),
    linha("Falta de estoque", atual.oos, l.oos, "max", g => `Reduzir falta de estoque em ${g.toFixed(1).replace(".", ",")} p.p.`),
    linha("Bad Seller · referência", atual.bs, l.bs, "max", g => `Reduzir em ${g.toFixed(1).replace(".", ",")} p.p.`),
  ] };
}
