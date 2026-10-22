import { requireEnv } from "./env.ts";

export const MODELO_IA = "openai/gpt-6-astra";
const TIMEOUT_MS = 90_000;

/** Chama o gateway de IA com saída em JSON pelo schema e junta o texto final do stream. */
export async function chamarIa(
  prompt: string,
  nome: string,
  schema: Record<string, unknown>,
): Promise<{ ok: true; json: unknown } | { ok: false; erro: string }> {
  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": requireEnv("LOVABLE_API_KEY"),
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODELO_IA,
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: nome, strict: true, schema } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, erro: "O serviço de IA não respondeu a tempo." };
  }

  if (!resp.ok) {
    if (resp.status === 402) return { ok: false, erro: "Créditos de IA esgotados. Adicione créditos em Configurações → Planos e créditos." };
    if (resp.status === 429) return { ok: false, erro: "Muitas solicitações de IA agora. Tente de novo em alguns minutos." };
    return { ok: false, erro: "Falha no serviço de IA." };
  }

  const reader = resp.body!.getReader();
  const dec = new TextDecoder();
  let buf = "", out = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const ev = JSON.parse(data);
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
          if (ev.type === "response.failed" || ev.type === "error") return { ok: false, erro: "A IA não concluiu a análise." };
        } catch { /* linha parcial */ }
      }
    }
  } catch {
    return { ok: false, erro: "O serviço de IA interrompeu a resposta." };
  }
  if (!out) return { ok: false, erro: "A IA não retornou resposta." };
  try {
    return { ok: true, json: JSON.parse(out) };
  } catch {
    return { ok: false, erro: "A IA devolveu uma resposta ilegível." };
  }
}
