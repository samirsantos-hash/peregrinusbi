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