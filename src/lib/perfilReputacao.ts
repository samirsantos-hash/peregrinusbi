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
