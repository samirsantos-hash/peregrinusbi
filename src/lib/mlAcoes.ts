import { useState } from "react";
import { chamarFuncaoMl } from "@/lib/mlFuncoes";

export type LinhaPrevia = {
  chave: string;
  item_id: string | null;
  titulo: string | null;
  antes: string;
  depois: string;
  aviso?: string | null;
  bloqueio?: string | null;
};

export type StatusResultado = "feito" | "ja_feito" | "conflito" | "recusado" | "bloqueado" | "nao_enviado";

export type ResultadoLinha = {
  chave: string;
  item_id: string | null;
  status: StatusResultado;
  mensagem: string | null;
  codigo_ml?: string | null;
};

export const ROTULO_RESULTADO: Record<StatusResultado, string> = {
  feito: "Feito",
  ja_feito: "Já estava assim",
  conflito: "Mudou no Mercado Livre",
  recusado: "Recusado",
  bloqueado: "Não enviado",
  nao_enviado: "Não enviado",
};

export type FaseAcao =
  | { fase: "ocioso" }
  | { fase: "carregando" }
  | { fase: "previa"; chave: string; linhas: LinhaPrevia[] }
  | { fase: "enviando"; chave: string; linhas: LinhaPrevia[] }
  | { fase: "resultado"; linhas: LinhaPrevia[]; resultados: ResultadoLinha[] };

/** Prévia (antes → depois) e confirmação com a mesma chave de idempotência, contra uma Edge Function de lote. */
export function useAcaoEmLote(funcao: string, accountId: string, aoConcluir?: () => void) {
  const [estado, setEstado] = useState<FaseAcao>({ fase: "ocioso" });
  const [erro, setErro] = useState<string | null>(null);

  const previa = async (dados: Record<string, unknown>) => {
    const chave = crypto.randomUUID();
    setErro(null);
    setEstado({ fase: "carregando" });
    try {
      const r = await chamarFuncaoMl<{ linhas: LinhaPrevia[] }>(funcao, { ...dados, account_id: accountId, etapa: "previa", idempotency_key: chave });
      setEstado({ fase: "previa", chave, linhas: r.linhas ?? [] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar a prévia.");
      setEstado({ fase: "ocioso" });
    }
  };

  const confirmar = async () => {
    if (estado.fase !== "previa") return;
    const { chave, linhas } = estado;
    setErro(null);
    setEstado({ fase: "enviando", chave, linhas });
    try {
      const r = await chamarFuncaoMl<{ resultados: ResultadoLinha[] }>(funcao, { account_id: accountId, etapa: "confirmar", idempotency_key: chave });
      setEstado({ fase: "resultado", linhas, resultados: r.resultados ?? [] });
      aoConcluir?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar ao Mercado Livre.");
      setEstado({ fase: "previa", chave, linhas });
    }
  };

  const fechar = () => {
    setErro(null);
    setEstado({ fase: "ocioso" });
  };

  return { estado, erro, previa, confirmar, fechar };
}

export type AcaoEmLote = ReturnType<typeof useAcaoEmLote>;
