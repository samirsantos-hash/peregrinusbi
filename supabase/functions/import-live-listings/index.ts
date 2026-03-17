import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseBrNumber(val: string): number {
  if (!val || val.trim() === "") return 0;
  const cleaned = val.trim().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseBrInt(val: string): number {
  return Math.round(parseBrNumber(val));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    const headers = headerLine.split(";");

    const colIdx = (name: string) => headers.indexOf(name);

    const iData = colIdx("DATA");
    const iCustId = colIdx("CUS_CUST_ID_SEL");
    const iCategoria = colIdx("CATEGORIA");
    const iItens = colIdx("ITENS");
    const iVertical = colIdx("VERTICAL");
    const iDomain = colIdx("DOM_DOMAIN_AGG1");

    // Collect unique sellers
    const sellerCustIds = new Set<string>();
    const rows: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      if (cols.length < 3) continue;
      const custId = (cols[iCustId]?.trim() || "").replace(/[.,]0$/, "");
      if (!custId) continue;
      sellerCustIds.add(custId);
      rows.push(cols);
    }

    // Get seller IDs from DB
    const { data: sellerRows, error: sellerErr } = await supabase
      .from("sellers")
      .select("id, cust_id");
    if (sellerErr) throw new Error(`Seller fetch error: ${sellerErr.message}`);

    const sellerIdMap = new Map<string, string>();
    for (const s of sellerRows || []) {
      sellerIdMap.set(s.cust_id, s.id);
    }

    // Build listing rows, deduplicating by composite key
    const deduped = new Map<string, any>();
    for (const cols of rows) {
      const cleanCustId = (cols[iCustId]?.trim() || "").replace(/[.,]0$/, "");
      const sellerId = sellerIdMap.get(cleanCustId);
      if (!sellerId) continue;

      const data = cols[iData]?.trim() || "2026-01-01";
      const categoria = cols[iCategoria]?.trim() || null;
      const key = `${sellerId}|${data}|${categoria}`;

      deduped.set(key, {
        seller_id: sellerId,
        data,
        categoria,
        itens: parseBrInt(cols[iItens] || "0"),
        vertical: cols[iVertical]?.trim() || null,
        dom_domain_agg1: cols[iDomain]?.trim() || null,
      });
    }
    const listingRows = Array.from(deduped.values());

    // Upsert in batches
    let inserted = 0;
    for (let i = 0; i < listingRows.length; i += 200) {
      const batch = listingRows.slice(i, i + 200);
      const { error } = await supabase
        .from("live_listings")
        .upsert(batch as any[], { onConflict: "seller_id,data,categoria", ignoreDuplicates: false });
      if (error) throw new Error(`Listing insert error batch ${i}: ${error.message}`);
      inserted += batch.length;
    }

    // Log the upload
    if (uploadedBy) {
      await supabase.from("upload_logs").insert({
        uploaded_by: uploadedBy,
        upload_type: "live_listings",
        rows_imported: inserted,
      });
    }

    return new Response(
      JSON.stringify({ success: true, listings: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
