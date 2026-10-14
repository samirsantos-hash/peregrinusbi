/** Comparação de lojas por vertical contra a mediana da própria vertical. Funções puras. */
export interface LojaMes { sellerId: string; vertical: string | null; atual: number; anterior: number }
export interface LojaComparada extends LojaMes { crescimento: number | null; vsMediana: number | null }
export interface ResumoVertical {
  vertical: string;
  lojas: number;
  medianaFat: number;
  medianaCresc: number | null;
  /** fração das lojas (com crescimento calculável) acima da mediana */
  acima: number;
}

export function mediana(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Crescimento do mês (atual ÷ anterior − 1); sem base no mês anterior não há crescimento. */
export function compararLojas(lojas: LojaMes[]): { lojas: LojaComparada[]; verticais: ResumoVertical[] } {
  const grupos = new Map<string, LojaMes[]>();
  for (const l of lojas) {
    if (!l.vertical) continue;
    grupos.set(l.vertical, [...(grupos.get(l.vertical) ?? []), l]);
  }
  const out: LojaComparada[] = [];
  const verticais: ResumoVertical[] = [];
  for (const [vertical, ls] of grupos) {
    const cresc = ls.map((l) => (l.anterior > 0 ? l.atual / l.anterior - 1 : null));
    const med = mediana(cresc.filter((c): c is number => c !== null));
    let acima = 0, comCresc = 0;
    ls.forEach((l, i) => {
      const c = cresc[i];
      const vs = c !== null && med !== null ? c - med : null;
      if (vs !== null) { comCresc++; if (vs > 0) acima++; }
      out.push({ ...l, crescimento: c, vsMediana: vs });
    });
    verticais.push({ vertical, lojas: ls.length, medianaFat: mediana(ls.map((l) => l.atual)) ?? 0, medianaCresc: med, acima: comCresc ? acima / comCresc : 0 });
  }
  verticais.sort((a, b) => b.lojas - a.lojas);
  return { lojas: out, verticais };
}

export const ROTULO_VERTICAL: Record<string, string> = {
  BEAUTY: "Beleza", "CONSTRUCTION & INDUSTRY": "Construção e Indústria", CPG: "Mercado e Consumo",
  ENTERTAINMENT: "Entretenimento", FASHION: "Moda", "FURNISHING & HOUSEWARE": "Casa e Decoração",
  HEALTH: "Saúde", "HOME ELECTRONICS": "Eletrodomésticos", OTHERS: "Outros", SPORTS: "Esportes",
  "T & B": "Brinquedos e Bebês", TECHNOLOGY: "Tecnologia", "VEHICLE PARTS & ACCESSORIES": "Autopeças", VIS: "Veículos",
};
