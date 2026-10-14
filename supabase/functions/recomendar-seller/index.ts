import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireEnv } from "../_shared/env.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "recomendacoes"],
  properties: {
    resumo: { type: "string" },
    recomendacoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["criterio", "prioridade", "titulo", "texto"],
        properties: {
          criterio: { type: "string", enum: ["Preço", "Reputação", "Publicidade", "Logística", "Promoções", "Qualidade", "Crescimento", "Clips"] },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          titulo: { type: "string" },
          texto: { type: "string" },
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

    const body = await req.json().catch(() => null);
    const loja = typeof body?.loja === "string" ? body.loja.slice(0, 120) : "Loja";
    const m = body?.metricas && typeof body.metricas === "object" && !Array.isArray(body.metricas) ? body.metricas : null;
    if (!m || Object.keys(m).length > 40) return json({ error: "Envie as métricas da loja." }, 400);

    const prompt = `Você é consultor sênior de vendedores do Mercado Livre.
Leia as métricas abaixo e escreva recomendações práticas para o vendedor melhorar.
Use só os números informados; campo null = sem dado (não conclua nada sobre ele).
Metas da consultoria: competitividade de preço ≥ 70%; Ads ≥ 5% do faturamento; Full ≥ 40% do faturamento;
faturamento com promoção ≥ 20%; queda de faturamento > 20% contra o mês anterior é alerta;
reputação: green_platinum/green_gold são ótimas, yellow/orange/red exigem ação; reclamações, atrasos e cancelamentos baixos.
Favorabilidade é a nota (0–100%) de cumprimento dessas metas. Crescimento compara o último mês fechado com o anterior e com a mediana do mercado.
Responda em português do Brasil, frases curtas, cite o número que motivou cada sugestão e o próximo passo.
Entre 3 e 6 recomendações, ordenadas pela prioridade. "resumo": 2 frases com a leitura geral do vendedor.

Loja: ${loja}
Métricas: ${JSON.stringify(m)}`;

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
        text: { format: { type: "json_schema", name: "recomendacao", strict: true, schema: SCHEMA } },
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
    console.error("recomendar-seller", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
