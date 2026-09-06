/**
 * Encolhimento empírico de Bayes (OS-4).
 *
 * Ranking bruto premia amostra pequena: uma loja com ROAS 202× apurado sobre
 * R$ 1,38 e um único mês aparecia em 1º lugar. O encolhimento puxa cada
 * estimativa para o prior do grupo, com força inversa ao tamanho da amostra.
 *
 *   μ   = mediana do grupo de referência (prior)
 *   τ²  = variância entre lojas
 *   σ²ᵢ = τ² / nᵢ
 *   B   = σ²ᵢ / (σ²ᵢ + τ²)
 *   θ̂ᵢ  = (1 − B)·xᵢ + B·μ
 *
 * O prior é intravertical; cai para o prior da carteira quando a vertical tem
 * menos de `prior_min_lojas` lojas — e o fallback é sinalizado no resultado.
 */

import { getLimiar } from "./config";
import { mediana } from "./robust";

export interface ItemEncolhimento {
  id: string;
  valor: number;
  /** nº de observações (meses) que sustentam o valor */
  n: number;
  /** vertical usada como grupo de referência */
  vertical?: string | null;
}

export interface ResultadoEncolhimento {
  id: string;
  valorBruto: number;
  valorAjustado: number;
  /** peso do encolhimento, 0 = confia na loja, 1 = colapsa no prior */
  B: number;
  n: number;
  prior: number;
  priorEscopo: "vertical" | "carteira";
  priorRotulo: string;
}

function variancia(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}

/**
 * @throws Error('n ausente para loja <id>: encolhimento impossível')
 * @throws Error('prior indefinido: sem grupo de referência para encolhimento')
 */
export function shrinkEstimate(itens: ItemEncolhimento[]): ResultadoEncolhimento[] {
  const validos = itens.filter((i) => Number.isFinite(i.valor));
  if (validos.length === 0) {
    throw new Error("prior indefinido: sem grupo de referência para encolhimento");
  }
  for (const i of validos) {
    if (i.n === undefined || i.n === null || !Number.isFinite(i.n) || i.n <= 0) {
      throw new Error(`n ausente para loja ${i.id}: encolhimento impossível`);
    }
  }

  const minLojas = getLimiar("prior_min_lojas");
  const carteiraVals = validos.map((i) => i.valor);
  const priorCarteira = mediana(carteiraVals);
  const tau2Carteira = variancia(carteiraVals);

  const porVertical: Record<string, number[]> = {};
  for (const i of validos) {
    const v = i.vertical || "SEM_VERTICAL";
    (porVertical[v] ||= []).push(i.valor);
  }

  return validos.map((i) => {
    const vert = i.vertical || "SEM_VERTICAL";
    const grupo = porVertical[vert] || [];
    const usaVertical = vert !== "SEM_VERTICAL" && grupo.length >= minLojas;
    const prior = usaVertical ? mediana(grupo) : priorCarteira;
    const tau2 = usaVertical ? variancia(grupo) : tau2Carteira;

    if (tau2 === 0) {
      console.warn(
        `[shrinkage] τ²=0 no grupo "${usaVertical ? vert : "carteira"}": todas as lojas colapsam no prior — grupo de referência provavelmente mal definido`,
      );
    }

    const sigma2 = tau2 / i.n;
    const B = tau2 + sigma2 === 0 ? 1 : sigma2 / (sigma2 + tau2);
    return {
      id: i.id,
      valorBruto: i.valor,
      valorAjustado: (1 - B) * i.valor + B * prior,
      B,
      n: i.n,
      prior,
      priorEscopo: usaVertical ? "vertical" : "carteira",
      priorRotulo: usaVertical ? vert : "carteira",
    };
  });
}
