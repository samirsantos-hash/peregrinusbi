import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseNum(val: string): number {
  if (!val || val.trim() === "") return 0;
  // Handle Brazilian number format: remove thousand-separator dots, replace decimal comma with dot
  const cleaned = val.trim().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
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

    const lines = csvText.split("\n").filter((l: string) => l.trim());
    const headerLine = lines[0].replace(/^\uFEFF/, "");
    const sep = headerLine.includes(";") ? ";" : ",";
    const headers = headerLine.split(sep).map((h: string) => h.trim().replace(/^"|"$/g, ""));

    const colIdx = (name: string) =>
      headers.findIndex((h: string) => h.toLowerCase() === name.toLowerCase());

    const iCustId = colIdx("CUS_CUST_ID_SEL") !== -1 ? colIdx("CUS_CUST_ID_SEL") : colIdx("Cust Id");
    const iVertical = colIdx("Vertical Principal") !== -1 ? colIdx("Vertical Principal") : colIdx("vertical_principal");
    const iEfect = colIdx("Efect Rta Vertical") !== -1 ? colIdx("Efect Rta Vertical") : colIdx("efect_rta_vertical");
    const iTxConv = colIdx("Taxa de Conversão Vertical") !== -1 ? colIdx("Taxa de Conversão Vertical") : colIdx("taxa_conversao_vertical");
    const iData = colIdx("TIM_DAY") !== -1 ? colIdx("TIM_DAY") : colIdx("data");

    if (iCustId === -1) {
      return new Response(JSON.stringify({ error: `Coluna CUS_CUST_ID_SEL ou Cust Id não encontrada. Headers: ${headers.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all sellers
    const { data: sellerRows } = await supabase.from("sellers").select("id, cust_id");
    const sellerMap = new Map<string, string>();
    for (const s of sellerRows || []) {
      sellerMap.set(s.cust_id, s.id);
    }

    // Deduplicate by composite key
    const deduped = new Map<string, any>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c: string) => c.trim().replace(/^"|"$/g, ""));
      const custId = (cols[iCustId] || "").replace(/[.,]0$/, "").trim();
      if (!custId) continue;

      const sellerId = sellerMap.get(custId);
      if (!sellerId) continue;

      const verticalPrincipal = iVertical !== -1 ? (cols[iVertical] || "").trim() : null;
      const efectRta = iEfect !== -1 ? parseNum(cols[iEfect]) : 0;
      const txConv = iTxConv !== -1 ? parseNum(cols[iTxConv]) : 0;

      let dataVal = iData !== -1 ? (cols[iData] || "").trim() : "";
      // Try dd/mm/yyyy
      const ddmmMatch = dataVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (ddmmMatch) {
        dataVal = `${ddmmMatch[3]}-${ddmmMatch[2].padStart(2, "0")}-${ddmmMatch[1].padStart(2, "0")}`;
      }
      if (!dataVal) dataVal = new Date().toISOString().split("T")[0];

      const key = `${sellerId}|${dataVal}|${verticalPrincipal || ""}`;
      deduped.set(key, {
        seller_id: sellerId,
        cust_id: custId,
        data: dataVal,
        vertical_principal: verticalPrincipal,
        efect_rta_vertical: efectRta,
        taxa_conversao_vertical: txConv,
      });
    }

    const rows = Array.from(deduped.values());

    if (rows.length > 0) {
      // Delete existing for fresh import
      await supabase.from("meli_campaigns").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      let inserted = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        const { error } = await supabase.from("meli_campaigns").upsert(batch as any[], {
          onConflict: "seller_id,data,vertical_principal",
          ignoreDuplicates: false,
        });
        if (error) throw new Error(`Campaign insert error batch ${i}: ${error.message}`);
        inserted += batch.length;
      }

      if (uploadedBy) {
        await supabase.from("upload_logs").insert({
          uploaded_by: uploadedBy,
          upload_type: "meli_campaigns",
          rows_imported: inserted,
        });
      }

      return new Response(
        JSON.stringify({ success: true, campaigns: inserted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, campaigns: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import meli campaigns error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
