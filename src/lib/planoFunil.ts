import { LIMIARES } from "@/config/limiaresCarteira";

export interface DadosFunil { visitas: number; competitivas: number; unidades: number; fat: number }
export type EtapaFunil = "preco" | "fechar" | "atrair";
export interface PassoPlano {
  etapa: EtapaFunil;
  prioridade: "Alta" | "Média" | "Baixa";
  /** fração de clientes que não passa desta etapa (0–1) */
  perda: number;
  /** clientes (visitas) perdidos na etapa */
  perdidos: number;
  /** unidades a mais estimadas se a etapa atingir a meta (só preço tem meta) */
  unidadesPotenciais: number;
}

/** Ordena as etapas do funil pela perda de clientes; a maior perda vem primeiro. */
export function planoFunil(d: DadosFunil): PassoPlano[] {
  if (d.visitas <= 0) return [];
  const temPreco = d.competitivas > 0 && d.competitivas <= d.visitas;
  const base = temPreco ? d.competitivas : d.visitas;
  const conv = base > 0 ? Math.min(1, d.unidades / base) : 0;
  const passos: Omit<PassoPlano, "prioridade">[] = [];
  if (temPreco) {
    const taxa = d.competitivas / d.visitas;
    const falta = Math.max(0, LIMIARES.competitividade.min - taxa);
    passos.push({ etapa: "preco", perda: 1 - taxa, perdidos: d.visitas - d.competitivas, unidadesPotenciais: falta * d.visitas * conv });
  }
  passos.push({ etapa: "fechar", perda: 1 - conv, perdidos: Math.max(0, base - d.unidades), unidadesPotenciais: 0 });
  passos.sort((a, b) => b.perda - a.perda);
  const ordenados = passos.map((p, i) => ({ ...p, prioridade: (i === 0 ? "Alta" : "Média") as PassoPlano["prioridade"] }));
  // Atrair visitas é sempre o último passo: aumenta o topo depois de estancar as perdas
  ordenados.push({ etapa: "atrair", prioridade: "Baixa", perda: 0, perdidos: 0, unidadesPotenciais: 0 });
  return ordenados;
}
