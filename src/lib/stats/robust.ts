/**
 * Estatística robusta — mediana, MAD e z-score modificado (Iglewicz & Hoaglin).
 *
 * Regra transversal desta frente: nenhuma função devolve número quando não pode
 * calcular. Ou lança erro explícito, ou devolve o estado `sem_dado`.
 */

export const CONST_MZ = 0.6745; // torna o MAD comparável ao desvio-padrão sob normalidade
export const MIN_N_Z_ROBUSTO = 8;

export type ResultadoZRobusto =
  | {
      estado: "ok";
      mediana: number;
      mad: number;
      /** z modificado na mesma ordem dos valores finitos de entrada */
      zs: number[];
      /** índice → posição original no array de entrada */
      indices: number[];
      descartados: number;
    }
  | { estado: "sem_dado"; descartados: number };

function finitos(values: (number | null | undefined)[]): { vals: number[]; idx: number[]; descartados: number } {
  const vals: number[] = [];
  const idx: number[] = [];
  let descartados = 0;
  values.forEach((v, i) => {
    const n = typeof v === "number" ? v : NaN;
    if (Number.isFinite(n)) {
      vals.push(n);
      idx.push(i);
    } else {
      descartados++;
    }
  });
  return { vals, idx, descartados };
}

export function mediana(values: number[]): number {
  if (values.length === 0) throw new Error("mediana de série vazia: sem dado para calcular");
  const arr = [...values].sort((a, b) => a - b);
  const meio = Math.floor(arr.length / 2);
  return arr.length % 2 === 1 ? arr[meio] : (arr[meio - 1] + arr[meio]) / 2;
}

export function mad(values: number[]): number {
  const med = mediana(values);
  return mediana(values.map((v) => Math.abs(v - med)));
}

/**
 * z-score modificado. Falha alto em dispersão nula ou amostra insuficiente.
 * @throws Error('MAD=0: dispersão nula, use Qn ou IQR')
 * @throws Error('amostra insuficiente para z robusto: n=<n>')
 */
export function computeRobustZScore(
  values: (number | null | undefined)[],
  opts?: { minN?: number },
): ResultadoZRobusto {
  const minN = opts?.minN ?? MIN_N_Z_ROBUSTO;
  const { vals, idx, descartados } = finitos(values);
  if (descartados > 0) {
    console.warn(`[robust] ${descartados} valor(es) nulo(s)/NaN descartado(s) antes do z robusto`);
  }
  if (vals.length === 0) return { estado: "sem_dado", descartados };
  if (vals.length < minN) throw new Error(`amostra insuficiente para z robusto: n=${vals.length}`);
  const med = mediana(vals);
  const desvio = mediana(vals.map((v) => Math.abs(v - med)));
  if (desvio === 0) throw new Error("MAD=0: dispersão nula, use Qn ou IQR");
  return {
    estado: "ok",
    mediana: med,
    mad: desvio,
    zs: vals.map((v) => (CONST_MZ * (v - med)) / desvio),
    indices: idx,
    descartados,
  };
}

/** z modificado de um único valor contra um modelo (mediana + MAD) já estimado. */
export function zModificado(valor: number, med: number, desvio: number): number {
  if (!Number.isFinite(valor)) throw new Error("valor não finito no z robusto");
  if (desvio === 0) throw new Error("MAD=0: dispersão nula, use Qn ou IQR");
  return (CONST_MZ * (valor - med)) / desvio;
}
