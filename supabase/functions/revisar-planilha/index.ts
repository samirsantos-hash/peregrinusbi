import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireEnv } from "../_shared/env.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "prioridades"],
  properties: {
    resumo: { type: "string" },
    prioridades: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["loja", "gravidade", "motivo", "acao", "linhas"],
        properties: {
          loja: { type: "string" },
          gravidade: { type: "string", enum: ["alta", "media", "baixa"] },
          motivo: { type: "string" },
          acao: { type: "string" },
          linhas: { type: "array", items: { type: "integer" } },
        },
      },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Faça login novamente." }, 401);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Apenas administradores podem usar a revisão." }, 403);

    const body = await req.json().catch(() => null);
    const arquivo = typeof body?.arquivo === "string" ? body.arquivo.slice(0, 200) : "planilha";
    const alertas = Array.isArray(body?.alertas) ? body.alertas.slice(0, 300) : null;
    const contagem = body?.contagem && typeof body.contagem === "object" ? body.contagem : {};
    const totais = body?.totais && typeof body.totais === "object" ? body.totais : {};
    if (!alertas) return json({ error: "Envie a lista de alertas." }, 400);

    const prompt = `Você revisa planilhas de vendas de lojas do Mercado Livre para uma consultoria.
Abaixo estão inconsistências detectadas por regras automáticas. Não invente problemas além delas.
Agrupe por loja, priorize pelo impacto em faturamento e risco de erro de dado, e diga o que revisar.
Responda em português do Brasil, frases curtas. No campo "loja" use "APELIDO (ID)". Máximo 15 prioridades.

Arquivo: ${arquivo}
Totais: ${JSON.stringify(totais)}
Contagem por tipo: ${JSON.stringify(contagem)}
Alertas (amostra, linha 0 = alerta da loja inteira):
${JSON.stringify(alertas)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": requireEnv("LOVABLE_API_KEY"),
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "revisao", strict: true, schema: SCHEMA } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      let msg = "Falha no serviço de IA.";
      try { msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? msg; } catch { /* texto */ }
      if (resp.status === 402) msg = "Créditos de IA esgotados. Adicione créditos em Configurações → Planos e créditos.";
      if (resp.status === 429) msg = "Muitas solicitações agora. Tente de novo em alguns minutos.";
      return json({ error: msg }, resp.status);
    }

    // Consome o SSE e junta só o texto final.
    const reader = resp.body!.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
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
          if (ev.type === "response.failed" || ev.type === "error")
            return json({ error: ev.response?.error?.message ?? ev.message ?? "A IA não concluiu a análise." }, 502);
        } catch { /* linha parcial */ }
      }
    }
    if (!out) return json({ error: "A IA não retornou resposta. Tente novamente mais tarde." }, 502);
    return json(JSON.parse(out));
  } catch (e) {
    console.error("revisar-planilha", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
