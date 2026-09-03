import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseCSVLine(line: string, delimiter = ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseBrNumber(val: string): number {
  if (!val || val.trim() === "") return 0;
  const cleaned = val.trim().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseBool(val: string): boolean {
  const v = val?.trim()?.toLowerCase();
  return v === "true" || v === "1" || v === "sim" || v === "yes";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    let uploadedBy: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      uploadedBy = user?.id || null;
    }

    const body = await req.json();
    const csvText: string = body.csv;

    if (!csvText) {
      return new Response(JSON.stringify({ error: "CSV data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Split lines and parse header, then discard raw text progressively
    const lines = csvText.split("\n");
    const headerLine = (lines[0] || "").replace(/^\uFEFF/, "");
    const headers = parseCSVLine(headerLine).map(h => h.trim());
    const colIdx = (name: string) => headers.indexOf(name);

    const iCustId = colIdx("CUS_CUST_ID_SEL");
    const iItemId = colIdx("ITEM_ID");
    const iItemName = colIdx("ITEM_NAME");
    const iDiscountBest = colIdx("DISCOUNT_BEST");
    const iDiscountTotal = colIdx("DISCOUNT_TOTAL");
    const iFlagOptin = colIdx("FLAG_ITEM_S_OPTIN");
    const iFlagBestPromo = colIdx("FLAG_BEST_PROMO");
    const iAcao = colIdx("ACAO_RECOMENDADA");
    const iEstoque7d = colIdx("ESTOQUE_MEDIO_7D");
    const iEstoqueFull7d = colIdx("ESTOQUE_MEDIO_FULL_7D");
    const iPedidos7d = colIdx("PEDIDOS_7D");
    const iVertical = colIdx("VERTICAL_ITEM");
    const iDomain = colIdx("DOM_DOMAIN_AGG1");
    const iCampaignBest = colIdx("CAMPAIGN_ID_BEST");
    const iData = colIdx("DATA");
    const iDiscountSellerPct = colIdx("DISCOUNT_SELLER_PERCENTAGE");
    const iCampaignType = colIdx("CAMPAIGN_TYPE");
    const iMediaTsi7d = colIdx("MEDIA_TSI_DIARIO_7D");

    if (iCustId < 0 || iItemId < 0) {
      return new Response(JSON.stringify({ error: "Colunas obrigatórias não encontradas: CUS_CUST_ID_SEL, ITEM_ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // First pass: collect unique cust_ids (lightweight — only store strings)
    const custIds = new Set<string>();
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      // Fast extraction: split only up to the needed column index
      const maxNeeded = Math.max(iCustId, iItemId) + 1;
      const cols = parseCSVLine(line);
      if (cols.length < maxNeeded) continue;
      const custId = (cols[iCustId]?.trim() || "").replace(/[.,]0$/, "");
      if (custId) custIds.add(custId);
    }

    // Fetch seller IDs in batches to avoid huge IN queries
    const sellerIdMap = new Map<string, string>();
    const custIdArray = Array.from(custIds);
    for (let i = 0; i < custIdArray.length; i += 500) {
      const batch = custIdArray.slice(i, i + 500);
      const { data: sellerRows, error: sellerErr } = await supabase
        .from("sellers")
        .select("id, cust_id")
        .in("cust_id", batch);
      if (sellerErr) throw new Error(`Seller fetch error: ${sellerErr.message}`);
      for (const s of sellerRows || []) {
        sellerIdMap.set(s.cust_id, s.id);
      }
    }
    // Free memory
    custIds.clear();

    const today = new Date().toISOString().slice(0, 10);

    // Second pass: process rows in chunks and upsert directly
    let inserted = 0;
    const CHUNK_SIZE = 200;
    const deduped = new Map<string, any>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;

      const cols = parseCSVLine(line);
      if (cols.length < 5) continue;

      const cleanCustId = (cols[iCustId]?.trim() || "").replace(/[.,]0$/, "");
      const sellerId = sellerIdMap.get(cleanCustId);
      const itemId = (cols[iItemId]?.trim() || "").replace(/[.,]0$/, "");
      if (!sellerId || !itemId) continue;

      const dataVal = iData >= 0 && cols[iData]?.trim() ? cols[iData].trim() : today;
      const key = `${sellerId}|${itemId}|${dataVal}`;

      deduped.set(key, {
        seller_id: sellerId,
        item_id: itemId,
        item_name: iItemName >= 0 ? cols[iItemName]?.trim() || "" : "",
        discount_best: iDiscountBest >= 0 ? parseBrNumber(cols[iDiscountBest] || "0") : 0,
        discount_total: iDiscountTotal >= 0 ? parseBrNumber(cols[iDiscountTotal] || "0") : 0,
        discount_seller_percentage: iDiscountSellerPct >= 0 ? parseBrNumber(cols[iDiscountSellerPct] || "0") : 0,
        flag_item_s_optin: iFlagOptin >= 0 ? parseBool(cols[iFlagOptin] || "") : false,
        flag_best_promo: iFlagBestPromo >= 0 ? parseBool(cols[iFlagBestPromo] || "") : false,
        acao_recomendada: iAcao >= 0 ? cols[iAcao]?.trim() || "" : "",
        estoque_medio_7d: iEstoque7d >= 0 ? parseBrNumber(cols[iEstoque7d] || "0") : 0,
        estoque_medio_full_7d: iEstoqueFull7d >= 0 ? parseBrNumber(cols[iEstoqueFull7d] || "0") : 0,
        pedidos_7d: iPedidos7d >= 0 ? parseBrNumber(cols[iPedidos7d] || "0") : 0,
        media_tsi_diario_7d: iMediaTsi7d >= 0 ? parseBrNumber(cols[iMediaTsi7d] || "0") : 0,
        campaign_type: iCampaignType >= 0 ? cols[iCampaignType]?.trim() || "" : "",
        vertical_item: iVertical >= 0 ? cols[iVertical]?.trim() || "" : "",
        dom_domain_agg1: iDomain >= 0 ? cols[iDomain]?.trim() || "" : "",
        campaign_id_best: iCampaignBest >= 0 ? (cols[iCampaignBest]?.trim() || "").replace(/[.,]0$/, "") : "",
        data: dataVal,
      });

      // Flush when deduped map gets large enough
      if (deduped.size >= CHUNK_SIZE) {
        const batch = Array.from(deduped.values());
        deduped.clear();
        const { error } = await supabase
          .from("seller_eligibility")
          .upsert(batch, { onConflict: "seller_id,item_id,data", ignoreDuplicates: false });
        if (error) throw new Error(`Eligibility insert error: ${error.message}`);
        inserted += batch.length;
      }
    }

    // Flush remaining
    if (deduped.size > 0) {
      const batch = Array.from(deduped.values());
      deduped.clear();
      const { error } = await supabase
        .from("seller_eligibility")
        .upsert(batch, { onConflict: "seller_id,item_id,data", ignoreDuplicates: false });
      if (error) throw new Error(`Eligibility insert error: ${error.message}`);
      inserted += batch.length;
    }

    if (uploadedBy) {
      await supabase.from("upload_logs").insert({
        uploaded_by: uploadedBy,
        upload_type: "elegibilidade",
        rows_imported: inserted,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sellers: sellerIdMap.size,
        eligibility: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import eligibility error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
