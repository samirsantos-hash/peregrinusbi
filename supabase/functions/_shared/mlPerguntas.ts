// Regras puras de Perguntas e Respostas. Sem I/O.

export const LIMITE_RESPOSTA = 2000;

export type PerguntaLinha = {
  question_id: number;
  item_id: string | null;
  texto: string | null;
  status: string;
  data_criacao: string | null;
  from_id: number | null;
  resposta_texto: string | null;
  resposta_status: string | null;
  resposta_data: string | null;
  seller_id: number | null;
};

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const txt = (v: unknown) => (typeof v === "string" ? v : null);
const dataIso = (v: unknown) => {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

export function lerPergunta(json: unknown): PerguntaLinha | null {
  if (!json || typeof json !== "object") return null;
  const q = json as Record<string, unknown>;
  const id = num(q.id);
  const status = txt(q.status);
  if (id == null || !status) return null;
  const resposta = q.answer && typeof q.answer === "object" ? (q.answer as Record<string, unknown>) : null;
  const from = q.from && typeof q.from === "object" ? (q.from as Record<string, unknown>) : null;
  return {
    question_id: id,
    item_id: txt(q.item_id),
    texto: txt(q.text),
    status,
    data_criacao: dataIso(q.date_created),
    from_id: from ? num(from.id) : null,
    resposta_texto: resposta ? txt(resposta.text) : null,
    resposta_status: resposta ? txt(resposta.status) : null,
    resposta_data: resposta ? dataIso(resposta.date_created) : null,
    seller_id: num(q.seller_id),
  };
}

export function lerListaPerguntas(json: unknown): { perguntas: PerguntaLinha[]; total: number } {
  const corpo = json && typeof json === "object" ? (json as { questions?: unknown; total?: unknown }) : {};
  const lista = Array.isArray(corpo.questions) ? corpo.questions : [];
  const perguntas = lista.map(lerPergunta).filter((p): p is PerguntaLinha => p !== null);
  return { perguntas, total: num(corpo.total) ?? perguntas.length };
}

export function validarResposta(bruto: unknown): { ok: true; texto: string } | { ok: false; erro: string } {
  if (typeof bruto !== "string") return { ok: false, erro: "Escreva a resposta." };
  const texto = bruto.trim();
  if (!texto) return { ok: false, erro: "Escreva a resposta." };
  if (texto.length > LIMITE_RESPOSTA) return { ok: false, erro: `A resposta passa de ${LIMITE_RESPOSTA} caracteres.` };
  return { ok: true, texto };
}

/** Assinatura do estado da pergunta no ML, comparada entre a prévia e a confirmação. */
export function estadoPergunta(p: PerguntaLinha): string {
  return `${p.status}|${p.resposta_texto ?? ""}`;
}

export function motivoSemResposta(status: string): string | null {
  if (status === "UNANSWERED") return null;
  if (status === "ANSWERED") return "Esta pergunta já foi respondida.";
  if (status === "UNDER_REVIEW") return "A pergunta está em revisão no Mercado Livre.";
  if (status === "CLOSED_UNANSWERED") return "O anúncio foi encerrado e a pergunta não aceita mais resposta.";
  if (status === "BANNED" || status === "DELETED" || status === "DISABLED") return "A pergunta foi removida no Mercado Livre.";
  return `A pergunta não aceita resposta agora (${status}).`;
}
