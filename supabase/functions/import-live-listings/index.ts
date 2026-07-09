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

    // Parse header without holding the full split array longer than needed
    const firstNl = csvText.indexOf("\n");
    const headerLine = csvText.slice(0, firstNl === -1 ? csvText.length : firstNl).replace(/^\uFEFF/, "").replace(/\r$/, "");
    const headers = headerLine.split(";");

    const colIdx = (name: string) => headers.indexOf(name);

    const iData = colIdx("DATA");
    const iCustId = colIdx("CUS_CUST_ID_SEL");
    const iCategoria = colIdx("CATEGORIA");
    const iItens = colIdx("ITENS");
    const iVertical = colIdx("VERTICAL");
    const iDomain = colIdx("DOM_DOMAIN_AGG1");

    // Header validation — if DATA column is missing, refuse the whole file
    // rather than silently defaulting every row to a fixed date.
    const missingCols: string[] = [];
    if (iData < 0) missingCols.push("DATA");
    if (iCustId < 0) missingCols.push("CUS_CUST_ID_SEL");
    if (missingCols.length > 0) {
      const msg = `Colunas obrigatórias ausentes no CSV: ${missingCols.join(", ")}`;
      if (uploadedBy) {
        await supabase.from("upload_logs").insert({
          uploaded_by: uploadedBy,
          upload_type: "live_listings",
          rows_imported: 0,
          status: "error",
          notes: msg,
        });
      }
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get seller IDs from DB up front
    const { data: sellerRows, error: sellerErr } = await supabase
      .from("sellers")
      .select("id, cust_id");
    if (sellerErr) throw new Error(`Seller fetch error: ${sellerErr.message}`);

    const sellerIdMap = new Map<string, string>();
    for (const s of sellerRows || []) {
      sellerIdMap.set(s.cust_id, s.id);
    }

    // Stream-parse the CSV line by line, dedup with a Map keyed by composite,
    // and flush to DB in batches to keep memory bounded.
    const deduped = new Map<string, any>();
    let inserted = 0;
    let skippedNoDate = 0;
    let skippedNoSeller = 0;
    const FLUSH_AT = 2000;

    const flush = async () => {
      if (deduped.size === 0) return;
      const rows = Array.from(deduped.values());
      deduped.clear();
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase
          .from("live_listings")
          .upsert(batch as any[], { onConflict: "seller_id,data,categoria", ignoreDuplicates: false });
        if (error) throw new Error(`Listing insert error: ${error.message}`);
        inserted += batch.length;
      }
    };

    let pos = firstNl + 1;
    const len = csvText.length;
    while (pos < len) {
      let nl = csvText.indexOf("\n", pos);
      if (nl === -1) nl = len;
      const line = csvText.slice(pos, nl);
      pos = nl + 1;
      if (!line || !line.trim()) continue;

      const cols = line.split(";");
      if (cols.length < 3) continue;
      const cleanCustId = (cols[iCustId]?.trim() || "").replace(/[.,]0$/, "");
      if (!cleanCustId) continue;
      const sellerId = sellerIdMap.get(cleanCustId);
      if (!sellerId) { skippedNoSeller++; continue; }

      // Reject rows without a valid ISO date — do NOT invent a fallback.
      const rawData = cols[iData]?.trim() || "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawData)) {
        skippedNoDate++;
        continue;
      }
      const data = rawData;
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

      if (deduped.size >= FLUSH_AT) {
        await flush();
      }
    }
    await flush();

    // Log the upload
    if (uploadedBy) {
      const skippedNotes: string[] = [];
      if (skippedNoDate > 0) skippedNotes.push(`${skippedNoDate} linha(s) ignorada(s) por DATA vazia/inválida`);
      if (skippedNoSeller > 0) skippedNotes.push(`${skippedNoSeller} linha(s) ignorada(s) por cust_id sem seller correspondente`);
      await supabase.from("upload_logs").insert({
        uploaded_by: uploadedBy,
        upload_type: "live_listings",
        rows_imported: inserted,
        status: skippedNoDate > 0 ? "warning" : "ok",
        notes: skippedNotes.length > 0 ? skippedNotes.join("; ") : null,
      });
    }

    return new Response(
      JSON.stringify({ success: true, listings: inserted, skipped_no_date: skippedNoDate, skipped_no_seller: skippedNoSeller }),
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
