import { useMemo } from "react";
import { PARTICIPACOES, PROGRAMAS } from "@/data/participacoes.mock";
import type { Participacao, Programa } from "@/types/programas";

/** Hoje lê o mock; amanhã troca para API sem alterar componente algum. */
export function useParticipacoes(lojaId: string | undefined) {
  return useMemo(() => {
    const participacoes: Participacao[] = lojaId
      ? PARTICIPACOES.filter((p) => p.lojaId === lojaId)
      : [];
    const programasPorId = new Map<string, Programa>(PROGRAMAS.map((p) => [p.id, p]));
    const programas = participacoes
      .map((p) => programasPorId.get(p.programaId))
      .filter((p): p is Programa => Boolean(p));
    return { participacoes, programas, programasPorId, loading: false };
  }, [lojaId]);
}
