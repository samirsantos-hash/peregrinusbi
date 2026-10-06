/** Limites que classificam as alavancas da carteira. Valores escolhidos pela consultoria. */
export interface Limiar { min: number; rotulo: string }

export const LIMIARES = {
  full: { min: 0.4, rotulo: "meta ≥ 40%" },
  ads: { min: 0.05, rotulo: "meta ≥ 5% do faturamento" },
  promocao: { min: 0.2, rotulo: "meta ≥ 20%" },
  competitividade: { min: 0.7, rotulo: "meta ≥ 70%" },
} as const satisfies Record<string, Limiar>;

/** Queda de faturamento contra o mês anterior, na mesma janela de dias. */
export const LIMIAR_QUEDA = -0.2;

/** Curva A: severidade de competitividade de preço. */
export const CURVA_A = { urgencia: 0.5, oportunidade: 0.7 } as const;

/** Mudança de mix: itens caem e ticket sobe acima destas variações. */
export const MIX = { quedaItens: -0.05, altaTicket: 0.05 } as const;

/** Janela, em dias a partir da data de referência, para considerar uma loja "saindo". */
export const DIAS_SAIDA = 60;
