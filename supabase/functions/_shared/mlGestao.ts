// Regras puras da gestão Mercado Livre (Etapa 1).
// Sem I/O: a Edge Function e os testes usam as mesmas decisões.

export const TOPICOS_GESTAO = [
  "questions",
  "public_offers",
  "public_candidates",
  "items",
  "price_suggestion",
] as const;

export type TopicoGestao = (typeof TOPICOS_GESTAO)[number];

const TOPICOS = new Set<string>(TOPICOS_GESTAO);

export const AVISO_POR_TOPICO: Record<TopicoGestao, { tipo: string; titulo: string }> = {
  questions: { tipo: "pergunta", titulo: "Nova pergunta" },
  public_offers: { tipo: "promocao_oferta", titulo: "Mudança em oferta de promoção" },
  public_candidates: { tipo: "promocao_convite", titulo: "Novo convite de promoção" },
  items: { tipo: "anuncio", titulo: "Anúncio alterado" },
  price_suggestion: { tipo: "preco", titulo: "Nova referência de preço" },
};

export type AvisoMl = {
  id: string | null;
  topic: string;
  resource: string;
  userId: number;
  applicationId: string;
  sent: string | null;
  attempts: number | null;
  actions: string[];
};

export function topicoAceito(topic: string): topic is TopicoGestao {
  return TOPICOS.has(topic);
}

/** Inteiros com 16+ dígitos (application_id) perdem precisão se virarem number. */
export function jsonMl(texto: string): unknown {
  const seguro = texto.replace(/"(application_id|user_id)"\s*:\s*(\d{16,})/g, '"$1":"$2"');
  return JSON.parse(seguro);
}

export function lerAviso(body: unknown): { ok: true; aviso: AvisoMl } | { ok: false; erro: string } {
  if (!body || typeof body !== "object") return { ok: false, erro: "corpo inválido" };
  const b = body as Record<string, unknown>;
  const topic = typeof b.topic === "string" ? b.topic.trim() : "";
  const resource = typeof b.resource === "string" ? b.resource.trim() : "";
  const applicationId = b.application_id == null ? "" : String(b.application_id).trim();
  const userId = Number(b.user_id);
  if (!topic || !resource) return { ok: false, erro: "tópico ou recurso ausente" };
  if (!applicationId) return { ok: false, erro: "application_id ausente" };
  if (!Number.isFinite(userId)) return { ok: false, erro: "user_id ausente" };
  const idBruto = b._id ?? b.id;
  const id = typeof idBruto === "string" && idBruto.trim() ? idBruto.trim() : null;
  const actions = Array.isArray(b.actions) ? b.actions.filter((a): a is string => typeof a === "string") : [];
  return {
    ok: true,
    aviso: {
      id,
      topic: topic.slice(0, 60),
      resource: resource.slice(0, 300),
      userId,
      applicationId,
      sent: typeof b.sent === "string" ? b.sent : null,
      attempts: Number.isFinite(Number(b.attempts)) ? Number(b.attempts) : null,
      actions,
    },
  };
}

export function aplicacaoConfere(applicationId: string, clientId: string): boolean {
  return applicationId.length > 0 && applicationId === clientId.trim();
}

export function chaveDedupe(aviso: AvisoMl): string {
  if (aviso.id) return `id:${aviso.id}`;
  return `evt:${aviso.applicationId}:${aviso.topic}:${aviso.resource}:${aviso.sent ?? ""}`;
}

/** Só caminhos relativos da API. Recusa URL absoluta e tentativa de sair da raiz. */
export function caminhoRecurso(resource: string): string | null {
  if (!resource.startsWith("/") || resource.startsWith("//") || resource.includes("://") || resource.includes("..")) {
    return null;
  }
  return resource;
}

export function segredoConfere(informado: string, esperado: string): boolean {
  if (!esperado || informado.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= informado.charCodeAt(i) ^ esperado.charCodeAt(i);
  return diff === 0;
}

export type SettingsInput = {
  meta_investimento_ads?: number | null;
  acos_alvo?: number | null;
  margem_minima?: number | null;
  alerta_acos?: number | null;
  alerta_roas?: number | null;
  alerta_ctr?: number | null;
  alerta_cpc?: number | null;
  alerta_tacos?: number | null;
};

const FRACAO = [
  "meta_investimento_ads",
  "acos_alvo",
  "margem_minima",
  "alerta_acos",
  "alerta_ctr",
  "alerta_tacos",
] as const;

const ANULAVEL = new Set(["acos_alvo", "margem_minima"]);

export function validarSettings(parcial: unknown): { ok: true; valores: SettingsInput } | { ok: false; erros: string[] } {
  if (!parcial || typeof parcial !== "object" || Array.isArray(parcial)) {
    return { ok: false, erros: ["Informe os campos a alterar."] };
  }
  const origem = parcial as Record<string, unknown>;
  const valores: SettingsInput = {};
  const erros: string[] = [];
  const chaves = Object.keys(origem).filter((k) => k !== "account_id");
  if (!chaves.length) erros.push("Nenhum parâmetro para alterar.");

  for (const chave of chaves) {
    if (![...FRACAO, "alerta_roas", "alerta_cpc"].includes(chave)) {
      erros.push(`Campo desconhecido: ${chave}.`);
      continue;
    }
    const bruto = origem[chave];
    if (bruto === null) {
      if (!ANULAVEL.has(chave)) erros.push(`${chave} não pode ficar vazio.`);
      else (valores as Record<string, number | null>)[chave] = null;
      continue;
    }
    const n = typeof bruto === "number" ? bruto : Number(bruto);
    if (!Number.isFinite(n)) {
      erros.push(`${chave} precisa ser um número.`);
      continue;
    }
    if ((FRACAO as readonly string[]).includes(chave)) {
      if (n < 0 || n > 1) erros.push(`${chave} fica entre 0 e 1 (3% = 0.03).`);
      else (valores as Record<string, number | null>)[chave] = n;
      continue;
    }
    if (n < 0) erros.push(`${chave} não pode ser negativo.`);
    else (valores as Record<string, number | null>)[chave] = n;
  }

  return erros.length ? { ok: false, erros } : { ok: true, valores };
}

export type StatusAcao = "preview" | "processing" | "committed" | "failed" | "conflict";

export function decidirIdempotencia(
  existente: { status: StatusAcao; estadoHash: string | null } | null,
  hashAtual: string,
): "criar" | "repetir_preview" | "ja_feito" | "conflito" {
  if (!existente) return "criar";
  if (existente.status === "committed") return "ja_feito";
  if (existente.estadoHash && existente.estadoHash !== hashAtual) return "conflito";
  if (existente.status === "preview" || existente.status === "failed") return "repetir_preview";
  return "conflito";
}

export function traduzirErroMl(status: number, codigo: string | null, mensagem: string | null): string {
  const c = (codigo ?? "").toLowerCase();
  if (status === 401 || c === "unauthorized" || c === "invalid_token") return "A autorização da conta expirou. Conecte de novo.";
  if (status === 403 || c.includes("unauthorized") || c === "forbidden") return "O Mercado Livre recusou esta ação. Falta permissão no aplicativo.";
  if (status === 404) return "O Mercado Livre não encontrou este recurso.";
  if (status === 429) return "O Mercado Livre limitou as consultas. A tentativa foi adiada.";
  if (status >= 500) return "O Mercado Livre está instável. A tentativa será refeita.";
  if (c === "invalid_grant") return "A autorização foi revogada. Conecte a conta de novo.";
  if (c === "item.price.not_modifiable") return "O anúncio tem automação de preços ativa no Mercado Livre. Pause a automação para mudar o preço.";
  if (c === "error_credibility_discounted_price") return "O Mercado Livre recusou o preço: precisa ser menor que o menor preço recente do anúncio.";
  if (status === 423) return "O anúncio está bloqueado para mudanças de promoção agora. Tente mais tarde.";
  const texto = (mensagem ?? "").replace(/https?:\/\/\S+/g, "").trim();
  if (texto) return `O Mercado Livre recusou: ${texto.slice(0, 180)}`;
  return `O Mercado Livre recusou a ação (HTTP ${status}).`;
}

export function esperaRetryMs(tentativa: number): number {
  return 400 * 2 ** tentativa;
}
