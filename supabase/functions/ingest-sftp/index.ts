import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ───────── Configuração POR ARQUIVO (nunca global) ───────── */
type Feed = "CPP" | "CDP";

interface FeedConfig {
  feed: Feed;
  table: "raw_cpp_mensal" | "raw_cdp_mensal";
  delimiter: string;
  decimal: "." | ",";
  required: string[];
}

const CONFIGS: Record<Feed, FeedConfig> = {
  CPP: { feed: "CPP", table: "raw_cpp_mensal", delimiter: ";", decimal: ",", required: ["CUS_CUST_ID_SEL", "TIM_MONTH_ID"] },
  CDP: { feed: "CDP", table: "raw_cdp_mensal", delimiter: ";", decimal: ".", required: ["CUS_CUST_ID_SEL", "TIM_MONTH_ID"] },
};

/** Detecta o feed EXCLUSIVAMENTE pelo nome do arquivo. Nunca pela coluna PROGRAMA. */
function detectFeed(path: string): Feed | null {
  const name = path.toUpperCase();
  if (name.includes("CDP_MENSAL")) return "CDP";
  if (name.includes("CPP_MENSAL")) return "CPP";
  return null;
}

const stripBom = (s: string) => s.replace(/^\uFEFF/, "");

/**
 * Chave do seller: CPP traz "3294245579,0" (float BR) e CDP traz "82935283".
 * Sempre TEXTO — o ID estoura int32 e perde precisão como float.
 * Remove sufixo decimal (",0" / ".0") e qualquer caractere não numérico.
 */
function normalizeKey(raw: string): string {
  const v = (raw ?? "").trim().replace(/^"|"$/g, "");
  if (v === "") return "";
  return v.replace(/[.,]\d+$/, "").replace(/\D/g, "");
}

function parseLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else { q = false; } }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delimiter) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const NUM_COMMA = /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+,\d+$/;

/** Normalização TEXTUAL do separador decimal (não é conversão de tipo). */
function normalizeDecimal(raw: string, decimal: "." | ","): string {
  if (decimal === ".") return raw;
  const v = raw.trim();
  if (v === "" || !NUM_COMMA.test(v)) return raw;
  return v.replace(/\./g, "").replace(",", ".");
}

/** Campo vazio vira null. NUNCA zero. */
function cell(raw: string, decimal: "." | ","): string | null {
  const v = (raw ?? "").trim();
  return v === "" ? null : normalizeDecimal(v, decimal);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let execId: string | null = null;
  let feedLabel = "desconhecido";
  let path = "";

  const fail = async (msg: string, status = 400) => {
    if (execId) {
      await supabase.from("ingestao_execucoes").update({
        status: "erro", erro: msg, finalizado_em: new Date().toISOString(),
      }).eq("id", execId);
    } else {
      await supabase.from("ingestao_execucoes").insert({
        feed: feedLabel, arquivo: path || "(sem arquivo)", status: "erro",
        erro: msg, finalizado_em: new Date().toISOString(),
      });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const body = await req.json().catch(() => ({}));
    path = String(body?.path ?? "").trim();
    const bucket = String(body?.bucket ?? "sftp-raw");
    if (!path) return await fail("Parâmetro 'path' é obrigatório.");

    const feed = detectFeed(path);
    if (!feed) {
      return await fail(
        `Não foi possível identificar o layout pelo nome do arquivo "${path}". O nome precisa conter CPP_MENSAL ou CDP_MENSAL. Importação abortada.`,
      );
    }
    const cfg = CONFIGS[feed];
    feedLabel = feed;

    const { data: exec } = await supabase.from("ingestao_execucoes")
      .insert({ feed, arquivo: path, status: "executando" })
      .select("id").single();
    execId = exec?.id ?? null;

    const dl = await supabase.storage.from(bucket).download(path);
    if (dl.error || !dl.data) return await fail(`Falha ao ler do Storage: ${dl.error?.message ?? "arquivo inexistente"}`);

    // BOM removido ANTES de ler o header
    const text = stripBom(await dl.data.text());
    const lines = text.split(/\r?\n/);
    const headerIdx = lines.findIndex((l) => l.trim() !== "");
    if (headerIdx === -1) return await fail("Arquivo sem header legível.");

    const header = parseLine(lines[headerIdx], cfg.delimiter)
      .map((h) => stripBom(h).trim().replace(/^"|"$/g, ""));
    const upper = header.map((h) => h.toUpperCase());
    const missing = cfg.required.filter((c) => !upper.includes(c));
    if (missing.length) {
      return await fail(
        `Header inesperado para o layout ${feed}: faltam ${missing.join(", ")}. Importação abortada — nenhuma linha gravada.`,
      );
    }

    const iCust = upper.indexOf("CUS_CUST_ID_SEL");
    const iMonth = upper.indexOf("TIM_MONTH_ID");

    const rowsMap = new Map<string, Record<string, unknown>>();
    let read = 0;

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "") continue;
      read++;
      const cols = parseLine(line, cfg.delimiter);
      if (cols.length !== header.length) {
        return await fail(
          `Linha ${i + 1}: ${cols.length} colunas, esperado ${header.length}. Importação abortada — nenhuma linha gravada.`,
        );
      }
      const cust = normalizeKey(cols[iCust] ?? "");
      const month = normalizeKey(cols[iMonth] ?? "");
      if (!cust || !month) {
        return await fail(`Linha ${i + 1}: CUS_CUST_ID_SEL ou TIM_MONTH_ID vazio. Importação abortada.`);
      }
      const dados: Record<string, string | null> = {};
      for (let c = 0; c < header.length; c++) dados[header[c]] = cell(cols[c], cfg.decimal);

      rowsMap.set(`${cust}|${month}`, {
        cus_cust_id_sel: cust,
        tim_month_id: month,
        dados,
        arquivo_origem: `${bucket}/${path}`,
        importado_em: new Date().toISOString(),
      });
    }

    if (read === 0) return await fail("Arquivo sem linhas de dados. Importação abortada.");

    const rows = Array.from(rowsMap.values());
    let written = 0;
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error } = await supabase.from(cfg.table)
        .upsert(slice, { onConflict: "cus_cust_id_sel,tim_month_id" });
      if (error) return await fail(`Falha ao gravar lote ${Math.floor(i / CHUNK) + 1}: ${error.message}`);
      written += slice.length;
    }

    await supabase.from("ingestao_execucoes").update({
      status: "ok", linhas_lidas: read, linhas_gravadas: written,
      finalizado_em: new Date().toISOString(),
    }).eq("id", execId!);

    return new Response(JSON.stringify({
      feed, arquivo: path, colunas: header.length,
      linhas_lidas: read, linhas_gravadas: written, decimal_origem: cfg.decimal,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return await fail(e instanceof Error ? e.message : "Erro desconhecido", 500);
  }
});
