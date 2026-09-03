import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Helpers ────────────────────────────────────────────
function stripBom(s: string) { return s.replace(/^\uFEFF/, ""); }
function parseNum(v: string | undefined | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "" || s.toUpperCase() === "NULL") return null;
  const cleaned = s.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}
function parseInt2(v: string | undefined | null): number | null {
  const n = parseNum(v);
  return n == null ? null : Math.round(n);
}
function parseCustId(v: string | undefined | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().split(",")[0].split(".")[0];
  if (!s) return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}
function parseBool(v: string | undefined | null): boolean | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "" || s === "null") return null;
  return s === "true" || s === "1" || s === "sim" || s === "yes";
}
function parseDate(v: string | undefined | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s.toUpperCase() === "NULL") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const yyyymmdd = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (yyyymmdd) return `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
  return null;
}
function parseTs(v: string | undefined | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const iso = s.replace(" ", "T");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function splitCsv(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === sep && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

type Mapper = (row: Record<string, string>, sourceFile: string) => Record<string, unknown> | null;

const MAPPERS: Record<string, { table: string; map: Mapper }> = {
  CPP_DIARIZADO: {
    table: "cart_cpp_diarizado",
    map: (r, sf) => {
      const cust = parseCustId(r["CUS_CUST_ID_SEL"] ?? r["CUST_ID"]);
      if (!cust) return null;
      return {
        cust_id: cust,
        cus_nickname: r["CUS_NICKNAME"] ?? null,
        data: parseDate(r["TIM_DAY"] ?? r["DATA"]),
        date_id: parseInt2(r["DATE_ID"]),
        gmv: parseNum(r["TGMV_LC"] ?? r["GMV"]),
        f_gmv: parseNum(r["F_TGMV_LC"] ?? r["F_GMV"]),
        tsi: parseNum(r["TSI"]),
        f_tsi: parseNum(r["F_TSI"]),
        visitas: parseNum(r["VISITAS"] ?? r["VISITS"]),
        total_livelistings: parseNum(r["TOTAL_LIVELISTINGS"]),
        sub_cluster_seller: r["SUB_CLUSTER_SELLER"] ?? null,
        nivel_solucion: r["NIVEL_SOLUCION"] ?? null,
        localidade: r["CUS_STATE"] ?? r["LOCALIDADE"] ?? null,
        source_file: sf,
      };
    },
  },
  CPP_MENSAL: {
    table: "cart_cpp_mensal",
    map: (r, sf) => {
      const cust = parseCustId(r["CUS_CUST_ID_SEL"] ?? r["CUST_ID"]);
      if (!cust) return null;
      return {
        cust_id: cust,
        cus_nickname: r["CUS_NICKNAME"] ?? null,
        cus_state: r["CUS_STATE"] ?? null,
        tim_month_id: parseInt2(r["TIM_MONTH_ID"]),
        visitas: parseNum(r["VISITAS"]),
        tsi: parseNum(r["TSI"]),
        tgmv_lc: parseNum(r["TGMV_LC"]),
        tgmv_lc_full: parseNum(r["TGMV_LC_FULL"]),
        tgmv_lc_flex: parseNum(r["TGMV_LC_FLEX"]),
        tgmv_lc_fbm: parseNum(r["TGMV_LC_FBM"]),
        tgmv_lc_pads: parseNum(r["TGMV_LC_PADS"]),
        tsi_pads: parseNum(r["TSI_PADS"]),
        inv_pads: parseNum(r["INV_PADS"]),
        sellers_invest_pads: parseNum(r["SELLERS_INVEST_PADS"]),
        rep_current_level: r["REP_CURRENT_LEVEL"] ?? null,
        rep_claims_rate: parseNum(r["REP_CLAIMS_RATE"]),
        rep_disputes_rate: parseNum(r["REP_DISPUTES_RATE"] ?? r["REP_DELAYED_HT_RATE"]),
        score_final_full: parseNum(r["SCORE_FINAL_FULL"]),
        score_final_bbf: parseNum(r["SCORE_FINAL_BBF"]),
        bpc: parseNum(r["BPC"]),
        sub_cluster_seller: r["SUB_CLUSTER_SELLER"] ?? null,
        nivel_solucion: r["NIVEL_SOLUCION"] ?? null,
        source_file: sf,
      };
    },
  },
  CDP_DIARIZADO: {
    table: "cart_cdp_diarizado",
    map: (r, sf) => {
      const cust = parseCustId(r["CUS_CUST_ID_SEL"] ?? r["CUST_ID"]);
      if (!cust) return null;
      return {
        cust_id: cust,
        cus_nickname: r["CUS_NICKNAME"] ?? null,
        data: parseDate(r["TIM_DAY"] ?? r["DATA"]),
        date_id: parseInt2(r["DATE_ID"]),
        cp_investments_lc: parseNum(r["CP_INVESTMENTS_LC"]),
        cp_investiments_seller_lc: parseNum(r["CP_INVESTIMENTS_SELLER_LC"] ?? r["CP_INVESTMENTS_SELLER_LC"]),
        total_rebates_lc: parseNum(r["TOTAL_REBATES_LC"]),
        total_investiments_lc: parseNum(r["TOTAL_INVESTIMENTS_LC"] ?? r["TOTAL_INVESTMENTS_LC"]),
        source_file: sf,
      };
    },
  },
  CDP_MENSAL: {
    table: "cart_cdp_mensal",
    map: (r, sf) => {
      const cust = parseCustId(r["CUS_CUST_ID_SEL"] ?? r["CUST_ID"]);
      if (!cust) return null;
      return {
        cust_id: cust,
        cus_nickname: r["CUS_NICKNAME"] ?? null,
        tim_month_id: parseInt2(r["TIM_MONTH_ID"]),
        cp_investments_lc: parseNum(r["CP_INVESTMENTS_LC"]),
        cp_investiments_seller_lc: parseNum(r["CP_INVESTIMENTS_SELLER_LC"] ?? r["CP_INVESTMENTS_SELLER_LC"]),
        total_rebates_lc: parseNum(r["TOTAL_REBATES_LC"]),
        total_investiments_lc: parseNum(r["TOTAL_INVESTIMENTS_LC"] ?? r["TOTAL_INVESTMENTS_LC"]),
        source_file: sf,
      };
    },
  },
  CPP_LIVELISTINGS: {
    table: "cart_livelistings",
    map: (r, sf) => {
      const cust = parseCustId(r["CUS_CUST_ID_SEL"] ?? r["CUST_ID"]);
      if (!cust) return null;
      return {
        cust_id: cust,
        cus_nickname: r["CUS_NICKNAME"] ?? null,
        cus_state: r["CUS_STATE"] ?? null,
        tim_month_id: parseInt2(r["TIM_MONTH_ID"]),
        item_id: r["ITEM_ID"] ?? null,
        item_name: r["ITEM_NAME"] ?? r["ITEM_TITLE"] ?? null,
        vertical: r["VERTICAL"] ?? r["VERTICAL_PRINCIPAL"] ?? null,
        vertical_item: r["VERTICAL_ITEM"] ?? null,
        categoria: r["CATEGORIA"] ?? r["CATEGORY_NAME"] ?? null,
        dom_domain_agg1: r["DOM_DOMAIN_AGG1"] ?? null,
        dom_domain_agg2: r["DOM_DOMAIN_AGG2"] ?? null,
        dom_domain_agg3: r["DOM_DOMAIN_AGG3"] ?? null,
        itens: parseNum(r["ITENS"] ?? r["QTD"]),
        sub_cluster_seller: r["SUB_CLUSTER_SELLER"] ?? null,
        source_file: sf,
      };
    },
  },
  ELEGIBILIDADE: {
    table: "cart_elegibilidade",
    map: (r, sf) => {
      const cust = parseCustId(r["CUS_CUST_ID_SEL"] ?? r["CUST_ID"]);
      if (!cust) return null;
      return {
        cust_id: cust,
        cus_nickname: r["CUS_NICKNAME"] ?? null,
        item_id: r["ITEM_ID"] ?? null,
        item_name: r["ITEM_NAME"] ?? null,
        vertical: r["VERTICAL"] ?? r["VERTICAL_PRINCIPAL"] ?? null,
        campaign_id: r["CAMPAIGN_ID"] ?? null,
        campaign_id_best: r["CAMPAIGN_ID_BEST"] ?? null,
        campaign_type: r["CAMPAIGN_TYPE"] ?? null,
        discount_seller_percentage: parseNum(r["DISCOUNT_SELLER_PERCENTAGE"]),
        discount_total: parseNum(r["DISCOUNT_TOTAL"]),
        discount_best: parseNum(r["DISCOUNT_BEST"]),
        flag_item_s_optin: parseBool(r["FLAG_ITEM_S_OPTIN"]),
        flag_seller_s_optin: parseBool(r["FLAG_SELLER_S_OPTIN"]),
        flag_best_promo: parseBool(r["FLAG_BEST_PROMO"]),
        pedidos_7d: parseNum(r["PEDIDOS_7D"]),
        media_tsi_diario_7d: parseNum(r["MEDIA_TSI_DIARIO_7D"]),
        acao_recomendada: r["ACAO_RECOMENDADA"] ?? r["ACCAO_RECOMENDADA"] ?? null,
        data_atualizacao: parseTs(r["DATA_ATUALIZACAO"] ?? r["DT_ATUALIZACAO"]),
        source_file: sf,
      };
    },
  },
  CPP_BASE_VENDEDORES: {
    table: "cart_base_vendedores",
    map: (r, sf) => {
      const cust = parseCustId(r["CUS_CUST_ID_SEL"] ?? r["CUST_ID"]);
      if (!cust) return null;
      return {
        cust_id: cust,
        cus_nickname: r["CUS_NICKNAME"] ?? null,
        cus_state: r["CUS_STATE"] ?? null,
        nivel_solucion: r["NIVEL_SOLUCION"] ?? null,
        fecha_in: parseDate(r["FECHA_IN"]),
        fecha_out: parseDate(r["FECHA_OUT"]),
        source_file: sf,
      };
    },
  },
};

function detectSufixo(headers: string[], rows: Record<string, string>[]): string | null {
  const hasSufixoCol = headers.find((h) => h.toUpperCase() === "SUFIXO");
  if (hasSufixoCol && rows[0]) {
    const val = String(rows[0][hasSufixoCol] || "").trim().toUpperCase();
    if (MAPPERS[val]) return val;
  }
  // fallback by column signature
  const H = new Set(headers.map((h) => h.toUpperCase()));
  if (H.has("CAMPAIGN_ID") || H.has("DISCOUNT_BEST")) return "ELEGIBILIDADE";
  if (H.has("ITEM_ID") && H.has("TIM_MONTH_ID")) return "CPP_LIVELISTINGS";
  if (H.has("FECHA_OUT") || H.has("FECHA_IN")) return "CPP_BASE_VENDEDORES";
  if (H.has("TOTAL_REBATES_LC") && H.has("TIM_DAY")) return "CDP_DIARIZADO";
  if (H.has("TOTAL_REBATES_LC")) return "CDP_MENSAL";
  if ((H.has("TIM_DAY") || H.has("DATE_ID")) && H.has("TSI")) return "CPP_DIARIZADO";
  if (H.has("TIM_MONTH_ID") && H.has("TSI")) return "CPP_MENSAL";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const authHeader = req.headers.get("authorization");
    let uploadedBy: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      uploadedBy = user?.id ?? null;
    }

    const body = await req.json();
    const csvText: string = body.csv;
    const expectedSufixo: string | undefined = body.expectedSufixo?.toUpperCase();
    const sourceFile: string = body.sourceFile ?? "unknown";
    if (!csvText) {
      return new Response(JSON.stringify({ error: "csv obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clean = stripBom(csvText);
    const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: "CSV vazio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const firstLine = lines[0];
    const sep = firstLine.includes(";") ? ";" : ",";
    const headers = splitCsv(firstLine, sep).map((h) => h.replace(/^"|"$/g, ""));

    const previewRows: Record<string, string>[] = [];
    for (let i = 1; i < Math.min(lines.length, 5); i++) {
      const cols = splitCsv(lines[i], sep);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (cols[idx] ?? "").replace(/^"|"$/g, ""); });
      previewRows.push(obj);
    }
    const sufixo = detectSufixo(headers, previewRows);
    if (!sufixo) {
      return new Response(JSON.stringify({ error: `Não foi possível identificar o tipo do CSV (SUFIXO ausente e assinatura desconhecida)` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (expectedSufixo && expectedSufixo !== sufixo) {
      return new Response(JSON.stringify({ error: `Arquivo é ${sufixo}, esperado ${expectedSufixo}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const mapper = MAPPERS[sufixo];
    const rows: Record<string, unknown>[] = [];
    const rejected: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsv(lines[i], sep);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (cols[idx] ?? "").replace(/^"|"$/g, ""); });
      const mapped = mapper.map(obj, sourceFile);
      if (mapped) rows.push(mapped); else rejected.push(`line ${i + 1}`);
    }

    // Full-replace strategy per source_file+sufixo? Safer: append; dedup deferred to consumers.
    let inserted = 0;
    const errors: string[] = [];
    const BATCH = 1000;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const { error } = await supabase.from(mapper.table).insert(chunk as any);
      if (error) errors.push(`batch ${i}: ${error.message}`);
      else inserted += chunk.length;
    }

    if (uploadedBy) {
      await supabase.from("upload_logs").insert({
        uploaded_by: uploadedBy,
        upload_type: `carteira_${sufixo.toLowerCase()}`,
        rows_imported: inserted,
        status: errors.length ? "warning" : "ok",
        details: errors.length ? errors.join("; ") : null,
      } as any);
    }

    return new Response(
      JSON.stringify({ success: true, sufixo, table: mapper.table, inserted, rejected: rejected.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("import-carteira error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});