import type { Metrica, Okr, Participacao, StatusOkr } from "@/types/programas";

/** Status efetivo de um OKR no render: sem valor atual ⇒ sempre sem_dado. */
export function statusEfetivo(okr: Okr): StatusOkr {
  return okr.atual.valor === null ? "sem_dado" : okr.status;
}

/** Semáforo geral do programa: pior status; >40% sem dado ⇒ sem_dado. */
export function semaforoGeral(p: Participacao): StatusOkr {
  if (p.okrs.length === 0) return "sem_dado";
  const statuses = p.okrs.map(statusEfetivo);
  const semDado = statuses.filter((s) => s === "sem_dado").length;
  if (semDado / statuses.length > 0.4) return "sem_dado";
  if (statuses.includes("critico")) return "critico";
  if (statuses.includes("atencao")) return "atencao";
  return "verde";
}

export function piorStatus(lista: StatusOkr[]): StatusOkr {
  if (lista.includes("critico")) return "critico";
  if (lista.includes("atencao")) return "atencao";
  if (lista.includes("verde")) return "verde";
  return "sem_dado";
}

export function metaDaLoja(p: Participacao): Metrica | null {
  const destaques = p.cascata.filter((n) => n.destaque);
  return destaques.length ? destaques[destaques.length - 1].meta : null;
}

/** % da meta atingido e gap em R$ (null quando falta base). */
export function progressoMeta(p: Participacao) {
  const meta = metaDaLoja(p)?.valor ?? null;
  const realizado = p.realizado.valor;
  if (meta === null || realizado === null || meta === 0) return { pct: null, gap: null };
  return { pct: (realizado / meta) * 100, gap: meta - realizado };
}

export const fmtBRL0 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
