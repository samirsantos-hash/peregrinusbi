import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const sep = headerLine.includes(";") ? ";" : ",";
    const headers = headerLine.split(sep).map((h: string) => h.trim().replace(/^"|"$/g, ""));

    const colIdx = (name: string) => {
      const idx = headers.findIndex((h: string) => h.toLowerCase() === name.toLowerCase());
      return idx;
    };

    const iCustId = colIdx("Cust Id");
    const iSeller = colIdx("Seller");
    const iExpDate = colIdx("Expiração da concessão");
    const iDays = colIdx("Dias de expiração");

    if (iCustId === -1 || iExpDate === -1 || iDays === -1) {
      return new Response(JSON.stringify({ error: `Colunas obrigatórias não encontradas. Headers: ${headers.join(", ")}` }), {
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

    const grantRows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c: string) => c.trim().replace(/^"|"$/g, ""));
      const custId = (cols[iCustId] || "").replace(/[.,]0$/, "").trim();
      if (!custId) continue;

      const sellerId = sellerMap.get(custId);
      if (!sellerId) continue;

      const salesforceUrl = iSeller !== -1 ? (cols[iSeller] || "").trim() : null;
      const daysRaw = cols[iDays] || "0";
      const days = parseInt(daysRaw.replace(/[^\d-]/g, ""), 10) || 0;

      let expDate = cols[iExpDate]?.trim() || "";
      // Try to parse dd/mm/yyyy
      const ddmmMatch = expDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (ddmmMatch) {
        expDate = `${ddmmMatch[3]}-${ddmmMatch[2].padStart(2, "0")}-${ddmmMatch[1].padStart(2, "0")}`;
      }
      if (!expDate || expDate === "") expDate = "2026-01-01";

      grantRows.push({
        seller_id: sellerId,
        cust_id: custId,
        salesforce_url: salesforceUrl || null,
        expiration_date: expDate,
        days_to_expire: days,
      });
    }

    // Delete existing and insert fresh
    if (grantRows.length > 0) {
      await supabase.from("seller_grants").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      let inserted = 0;
      for (let i = 0; i < grantRows.length; i += 200) {
        const batch = grantRows.slice(i, i + 200);
        const { error } = await supabase.from("seller_grants").upsert(batch as any[], {
          onConflict: "seller_id",
          ignoreDuplicates: false,
        });
        if (error) throw new Error(`Grant insert error batch ${i}: ${error.message}`);
        inserted += batch.length;
      }

      if (uploadedBy) {
        await supabase.from("upload_logs").insert({
          uploaded_by: uploadedBy,
          upload_type: "grants",
          rows_imported: inserted,
        });
      }

      return new Response(
        JSON.stringify({ success: true, grants: inserted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, grants: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import grants error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
