import type { StatusOkr } from "@/types/programas";

export interface ItemFilho {
  id: string;
  nome: string;
  status: StatusOkr;
  /** Número principal do nível (moeda quando unidade = BRL). */
  valor: number | null;
  unidade: "BRL" | "un" | "pct";
  /** Gap para a meta (negativo = abaixo da meta). */
  gap: number | null;
  serie: { periodo: string; valor: number | null }[];
  acao: string;
  destino: string;
}

export const ORDEM_URGENCIA: Record<StatusOkr, number> = {
  critico: 0,
  atencao: 1,
  verde: 2,
  sem_dado: 3,
};

export function ordenarPorUrgencia(itens: ItemFilho[]): ItemFilho[] {
  return [...itens].sort((a, b) => {
    const d = ORDEM_URGENCIA[a.status] - ORDEM_URGENCIA[b.status];
    if (d !== 0) return d;
    return (b.valor ?? -Infinity) - (a.valor ?? -Infinity);
  });
}

/** Semáforo por atingimento de meta: >=100% verde, >=80% atenção, abaixo crítico. */
export function statusPorMeta(realizado: number | null, meta: number | null): StatusOkr {
  if (realizado === null || meta === null || meta === 0) return "sem_dado";
  const pct = (realizado / meta) * 100;
  if (pct >= 100) return "verde";
  if (pct >= 80) return "atencao";
  return "critico";
}

export function mesParaId(mes: string): number {
  const [a, m] = mes.split("-");
  return Number(`${a}${(m || "01").padStart(2, "0")}`);
}

export function idParaMes(id: number | null): string {
  if (!id) return "—";
  const s = String(id);
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
}
