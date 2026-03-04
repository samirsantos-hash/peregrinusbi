import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseBrNumber(val: string): number {
  if (!val || val.trim() === "") return 0;
  // Brazilian format: 1.234,56 → 1234.56
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

    // Parse CSV (semicolon-separated, BR format)
    const lines = csvText.split("\n").filter((l: string) => l.trim());
    const headerLine = lines[0].replace(/^\uFEFF/, ""); // Remove BOM
    const headers = headerLine.split(";");

    const colIdx = (name: string) => headers.indexOf(name);

    // Column indices
    const iData = colIdx("DATA");
    const iNickname = colIdx("CUS_NICKNAME");
    const iCustId = colIdx("CUS_CUST_ID_SEL");
    const iTimMonth = colIdx("TIM_MONTH_ID");
    const iCluster = colIdx("CLUSTER_SELLER");
    const iSubCluster = colIdx("SUB_CLUSTER_SELLER");
    const iState = colIdx("CUS_STATE");
    const iGmv = colIdx("GMV_LC");
    const iTsi = colIdx("TSI");
    const iTgmv = colIdx("TGMV_LC");
    const iInvPads = colIdx("INV_PADS");
    const iTgmvPads = colIdx("TGMV_LC_PADS");
    const iTsiPads = colIdx("TSI_PADS");
    const iFTgmv = colIdx("F_TGMV_LC");
    const iFTsi = colIdx("F_TSI");
    const iTgmvFull = colIdx("TGMV_LC_FBM");
    const iTgmvFlex = colIdx("TGMV_LC_FLEX");
    const iTsiFlex = colIdx("TSI_FLEX");
    const iScorePhoto = colIdx("PONTUACAO_LL_CHARACTERISTICS_PICTURES_OK_SCORE");
    const iScoreTitle = colIdx("PONTUACAO_LL_CHARACTERISTICS_TITLE_OK_SCORE");
    const iScoreFull = colIdx("SCORE_FINAL_FULL");
    const iScoreOferta = colIdx("SCORE_OFERTA_FINAL");
    const iScoreCaract = colIdx("SCORE_CARACTERISTICA_FINAL");
    const iScoreQual = colIdx("SCORE_QUALIDADE_FINAL");
    const iScorePads = colIdx("SCORE_FINAL_PADS");
    const iMinPriceRival = colIdx("MIN_PRICE_RIVAL");
    const iVisits = colIdx("VISITAS");
    const iVisitsExp = colIdx("VISITS_EXPENSIVE");
    const iVisitsMatch = colIdx("VISITS_MATCH");
    const iVisitsCheaper = colIdx("VISITS_CHEAPER");
    const iUplift = colIdx("UPLIFT_GMV_LC_M1");
    const iGmvM1 = colIdx("GMV_LC_M1");
    const iCdpTgmv = colIdx("CDP_TGMV_LC");
    const iCdpTsi = colIdx("CDP_TSI");
    const iRepLevel = colIdx("REP_CURRENT_LEVEL");
    const iRepClaims = colIdx("REP_CLAIMS_RATE");
    const iRepDelayed = colIdx("REP_DELAYED_HT_RATE");
    const iPontuacaoIpi = colIdx("PONTUACAO_IPI");

    // Process rows - collect unique sellers first
    const sellerMap = new Map<string, { nickname: string; cluster: string; subCluster: string; state: string }>();
    const rows: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      if (cols.length < 10) continue;

      const custId = cols[iCustId]?.trim();
      if (!custId) continue;

      // Clean custId (remove .0 or ,0 suffix from BR format)
      const cleanCustId = custId.replace(/[.,]0$/, "");

      if (!sellerMap.has(cleanCustId)) {
        sellerMap.set(cleanCustId, {
          nickname: cols[iNickname]?.trim() || "",
          cluster: cols[iCluster]?.trim() || "",
          subCluster: cols[iSubCluster]?.trim() || "",
          state: cols[iState]?.trim() || "",
        });
      }
      rows.push(cols);
    }

    // Upsert sellers
    const sellersToInsert = Array.from(sellerMap.entries()).map(([custId, s]) => ({
      cust_id: custId,
      nickname: s.nickname,
      cluster_seller: s.cluster || null,
      sub_cluster_seller: s.subCluster || null,
      cus_state: s.state || null,
    }));

    // Insert sellers in batches
    for (let i = 0; i < sellersToInsert.length; i += 100) {
      const batch = sellersToInsert.slice(i, i + 100);
      const { error } = await supabase
        .from("sellers")
        .upsert(batch, { onConflict: "cust_id", ignoreDuplicates: false });
      if (error) throw new Error(`Seller insert error: ${error.message}`);
    }

    // Get seller IDs
    const { data: sellerRows, error: sellerErr } = await supabase
      .from("sellers")
      .select("id, cust_id");
    if (sellerErr) throw new Error(`Seller fetch error: ${sellerErr.message}`);

    const sellerIdMap = new Map<string, string>();
    for (const s of sellerRows || []) {
      sellerIdMap.set(s.cust_id, s.id);
    }

    // Build KPI rows
    const kpiRows = rows.map((cols) => {
      const cleanCustId = (cols[iCustId]?.trim() || "").replace(/[.,]0$/, "");
      const sellerId = sellerIdMap.get(cleanCustId);
      if (!sellerId) return null;

      return {
        seller_id: sellerId,
        data: cols[iData]?.trim() || "2026-01-01",
        tim_month_id: parseBrInt(cols[iTimMonth] || "0"),
        gmv_lc: parseBrNumber(cols[iGmv] || "0"),
        tsi: parseBrInt(cols[iTsi] || "0"),
        tgmv_lc: parseBrNumber(cols[iTgmv] || "0"),
        inv_pads: parseBrNumber(cols[iInvPads] || "0"),
        tgmv_lc_pads: parseBrNumber(cols[iTgmvPads] || "0"),
        tsi_pads: parseBrInt(cols[iTsiPads] || "0"),
        f_tgmv_lc: parseBrNumber(cols[iFTgmv] || "0"),
        f_tsi: parseBrInt(cols[iFTsi] || "0"),
        tgmv_lc_full: parseBrNumber(cols[iTgmvFull] || "0"),
        tgmv_lc_flex: parseBrNumber(cols[iTgmvFlex] || "0"),
        tsi_flex: parseBrInt(cols[iTsiFlex] || "0"),
        score_photo: parseBrNumber(cols[iScorePhoto] || "0"),
        score_title: parseBrNumber(cols[iScoreTitle] || "0"),
        score_final_full: parseBrNumber(cols[iScoreFull] || "0"),
        score_oferta_final: parseBrNumber(cols[iScoreOferta] || "0"),
        score_caracteristica_final: parseBrNumber(cols[iScoreCaract] || "0"),
        score_qualidade_final: parseBrNumber(cols[iScoreQual] || "0"),
        score_final_pads: parseBrNumber(cols[iScorePads] || "0"),
        min_price_rival: parseBrNumber(cols[iMinPriceRival] || "0"),
        visits: parseBrNumber(cols[iVisits] || "0"),
        visits_expensive: parseBrNumber(cols[iVisitsExp] || "0"),
        visits_match: parseBrNumber(cols[iVisitsMatch] || "0"),
        visits_cheaper: parseBrNumber(cols[iVisitsCheaper] || "0"),
        uplift_gmv_lc_m1: parseBrNumber(cols[iUplift] || "0"),
        gmv_lc_m1: parseBrNumber(cols[iGmvM1] || "0"),
        cdp_tgmv_lc: parseBrNumber(cols[iCdpTgmv] || "0"),
        cdp_tsi: parseBrInt(cols[iCdpTsi] || "0"),
        rep_current_level: cols[iRepLevel]?.trim() || null,
        rep_claims_rate: parseBrNumber(cols[iRepClaims] || "0"),
        rep_delayed_ht_rate: parseBrNumber(cols[iRepDelayed] || "0"),
        pontuacao_ipi: parseBrNumber(cols[iPontuacaoIpi] || "0"),
      };
    }).filter(Boolean);

    // Deduplicate by seller_id + data (keep last occurrence)
    const deduped = new Map<string, any>();
    for (const row of kpiRows) {
      deduped.set(`${(row as any).seller_id}|${(row as any).data}`, row);
    }
    const uniqueKpiRows = Array.from(deduped.values());

    // Insert KPIs in batches (upsert on seller_id + data)
    let inserted = 0;
    for (let i = 0; i < kpiRows.length; i += 200) {
      const batch = kpiRows.slice(i, i + 200);
      const { error } = await supabase
        .from("sellers_kpi")
        .upsert(batch as any[], { onConflict: "seller_id,data", ignoreDuplicates: false });
      if (error) throw new Error(`KPI insert error batch ${i}: ${error.message}`);
      inserted += batch.length;
    }

    // Log the upload
    if (uploadedBy) {
      await supabase.from("upload_logs").insert({
        uploaded_by: uploadedBy,
        upload_type: "cpp_mensal",
        rows_imported: inserted,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sellers: sellersToInsert.length,
        kpis: inserted,
      }),
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
