import { esperaRetryMs, jsonMl, traduzirErroMl } from "./mlGestao.ts";

const TIMEOUT_MS = 8_000;

export type RespostaMl =
  | { ok: true; status: number; json: unknown }
  | { ok: false; status: number; codigo: string | null; erro: string };

type Buscar = (url: string, init: RequestInit) => Promise<Response>;

function codigoDe(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const c = (json as { error?: unknown; code?: unknown }).error ?? (json as { code?: unknown }).code;
  return typeof c === "string" ? c.slice(0, 80) : null;
}

function mensagemDe(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const m = (json as { message?: unknown }).message;
  return typeof m === "string" ? m : null;
}

/** GET com timeout e nova tentativa em 429 e 5xx. Não segue corpo de erro como sucesso. */
export async function buscarMl(
  url: string,
  token: string,
  buscar: Buscar = fetch,
  extra: Record<string, string> = {},
): Promise<RespostaMl> {
  let ultimo: RespostaMl = { ok: false, status: 0, codigo: null, erro: "O Mercado Livre não respondeu." };
  for (let t = 0; t < 3; t++) {
    let res: Response;
    try {
      res = await buscar(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...extra },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      const timeout = error instanceof DOMException && error.name === "TimeoutError";
      ultimo = { ok: false, status: 0, codigo: timeout ? "timeout" : "rede", erro: timeout ? "O Mercado Livre demorou para responder." : "Falha de rede ao falar com o Mercado Livre." };
      if (t < 2) await esperar(esperaRetryMs(t));
      continue;
    }
    const texto = await res.text();
    let json: unknown = {};
    if (texto) {
      try { json = jsonMl(texto); } catch { json = {}; }
    }
    if (res.ok) return { ok: true, status: res.status, json };
    const codigo = codigoDe(json);
    ultimo = { ok: false, status: res.status, codigo, erro: traduzirErroMl(res.status, codigo, mensagemDe(json)) };
    if (res.status !== 429 && res.status < 500) return ultimo;
    if (t < 2) await esperar(esperaRetryMs(t));
  }
  return ultimo;
}

/**
 * Escrita no ML. Só repete em 429 (o pedido não foi aceito). Em 5xx ou timeout o resultado
 * é incerto: devolve `incerto` para quem chamou reler o estado antes de concluir.
 */
export async function enviarMl(
  metodo: "POST" | "PUT" | "DELETE",
  url: string,
  token: string,
  corpo: unknown,
  buscar: Buscar = fetch,
  extra: Record<string, string> = {},
): Promise<RespostaMl & { incerto?: boolean }> {
  let ultimo: RespostaMl & { incerto?: boolean } = { ok: false, status: 0, codigo: null, erro: "O Mercado Livre não respondeu.", incerto: true };
  for (let t = 0; t < 3; t++) {
    let res: Response;
    try {
      res = await buscar(url, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", ...extra },
        body: corpo == null ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      const timeout = error instanceof DOMException && error.name === "TimeoutError";
      return { ok: false, status: 0, codigo: timeout ? "timeout" : "rede", erro: timeout ? "O Mercado Livre demorou para responder." : "Falha de rede ao falar com o Mercado Livre.", incerto: true };
    }
    const texto = await res.text();
    let json: unknown = {};
    if (texto) {
      try { json = jsonMl(texto); } catch { json = {}; }
    }
    if (res.ok) return { ok: true, status: res.status, json };
    const codigo = codigoDe(json);
    ultimo = { ok: false, status: res.status, codigo, erro: traduzirErroMl(res.status, codigo, mensagemDe(json)), incerto: res.status >= 500 };
    if (res.status !== 429) return ultimo;
    if (t < 2) await esperar(esperaRetryMs(t));
  }
  return ultimo;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
