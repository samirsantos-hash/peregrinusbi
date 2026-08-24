// State assinado (HMAC-SHA256) para o fluxo OAuth do Mercado Livre.
// O callback é público — o state é a única prova de que o fluxo começou aqui.

const enc = new TextEncoder();

async function chave(segredo: string) {
  return crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const deB64url = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

export interface StatePayload {
  tenant_id: string;
  site_id: string;
  redirect: string | null;
  exp: number; // epoch ms
  nonce: string;
}

export async function assinarState(p: StatePayload, segredo: string): Promise<string> {
  const corpo = b64url(enc.encode(JSON.stringify(p)));
  const mac = await crypto.subtle.sign("HMAC", await chave(segredo), enc.encode(corpo));
  return `${corpo}.${b64url(new Uint8Array(mac))}`;
}

export async function lerState(state: string, segredo: string): Promise<StatePayload | null> {
  const [corpo, mac] = state.split(".");
  if (!corpo || !mac) return null;
  const ok = await crypto.subtle.verify("HMAC", await chave(segredo), deB64url(mac), enc.encode(corpo));
  if (!ok) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(deB64url(corpo))) as StatePayload;
    if (!p.exp || Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}
