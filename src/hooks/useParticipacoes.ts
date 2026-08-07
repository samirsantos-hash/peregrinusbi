import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PARTICIPACOES, PROGRAMAS } from "@/data/participacoes.mock";
import type { Participacao, Programa } from "@/types/programas";
import { carregarRawDoSeller, overlayAlavancas, overlayOkrs } from "@/lib/programas/rawMensal";

/**
 * Cadastro (programas, parceiros, categorias) vem do catálogo;
 * alavancas e OKRs vêm dos feeds mensais reais (raw_cpp/raw_cdp),
 * incluindo o histórico de 12 meses das sparklines.
 */
export function useParticipacoes(lojaId: string | undefined) {
  const { data: raw, isLoading } = useQuery({
    queryKey: ["raw-mensal", lojaId],
    queryFn: () => carregarRawDoSeller(lojaId!),
    enabled: Boolean(lojaId),
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    const base: Participacao[] = lojaId
      ? PARTICIPACOES.filter((p) => p.lojaId === lojaId)
      : [];
    const temRaw = Boolean(raw && (raw.cpp.length || raw.cdp.length));
    const participacoes = temRaw
      ? base.map((p) => ({
          ...p,
          alavancas: overlayAlavancas(p.alavancas, raw!),
          okrs: overlayOkrs(p.okrs, raw!),
        }))
      : base;
    const programasPorId = new Map<string, Programa>(PROGRAMAS.map((p) => [p.id, p]));
    const programas = participacoes
      .map((p) => programasPorId.get(p.programaId))
      .filter((p): p is Programa => Boolean(p));
    return { participacoes, programas, programasPorId, loading: isLoading, temDadoReal: temRaw };
  }, [lojaId, raw, isLoading]);
}
