import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function parseBrInt(val: string): number {
  return Math.round(parseBrNumber(val));
}

/** Parse DD/MM/YYYY (or ISO) to YYYY-MM-DD. Returns "" when invalid. */
function parseValidDate(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const m = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let y = m[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${mm}-${d}`;
  }
  return "";
}

// Clips fields should never exceed this — values above indicate column misalignment (e.g. CUST_ID leaking in)
const MAX_CLIPS_VALUE = 100_000;

function safeClipsValue(val: string): number {
  const n = parseBrNumber(val);
  return n > MAX_CLIPS_VALUE ? 0 : n;
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
    const headers = parseCSVLine(headerLine).map(h => h.trim());
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
    const iRepCancellations = colIdx("REP_CANCELLATIONS_RATE");
    const iPontuacaoIpi = colIdx("PONTUACAO_IPI");
    const iPontuacaoLlGtin = colIdx("PONTUACAO_LL_GTIN");
    // LL Granular – Técnico
    const iLlPictures = colIdx("PONTUACAO_LL_CHARACTERISTICS_PICTURES_OK_SCORE");
    const iLlTitle = colIdx("PONTUACAO_LL_CHARACTERISTICS_TITLE_OK_SCORE");
    const iLlTechSpecs = colIdx("PONTUACAO_LL_CHARACTERISTICS_TECHNICAL_SPECIFICATIONS_MAIN_OK_SCORE");
    const iLlDescription = colIdx("PONTUACAO_LL_CHARACTERISTICS_DESCRIPTION_OK_SCORE");
    // LL Granular – Oferta
    const iLlPrice = colIdx("PONTUACAO_LL_OFFER_PRICE_OK_SCORE");
    const iLlStock = colIdx("PONTUACAO_LL_OFFER_STOCK_AVAILABILITY_TIME_OK_SCORE");
    const iLlFreeShipping = colIdx("PONTUACAO_LL_OFFER_FREE_SHIPPING_OK_SCORE");
    const iLlPromotions = colIdx("PONTUACAO_LL_OFFER_PROMOTIONS_OK_SCORE");
    // Clips / Conteúdo
    const iSellersClipsPub = colIdx("SELLERS_CLIPS_PUBLI");
    const iVisitasClips = colIdx("VISITAS_CLIPS");
    const iSiClips = colIdx("SI_CLIPS");
    const iOrdersClips = colIdx("ORDERS_CLIPS");
    const iTgmvClips = colIdx("TGMV_LC_CLIPS");
    // Item ID (MLB)
    const iItemId = colIdx("ITE_ITEM_ID");
    // BPC
    const iBpc = colIdx("BPC");

    // Process rows - collect unique sellers first
    const sellerMap = new Map<string, { nickname: string; cluster: string; subCluster: string; state: string }>();
    const rows: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
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
    let skippedNoDate = 0;
    const kpiRows = rows.map((cols) => {
      const cleanCustId = (cols[iCustId]?.trim() || "").replace(/[.,]0$/, "");
      const sellerId = sellerIdMap.get(cleanCustId);
      if (!sellerId) return null;
      const isoDate = parseValidDate(cols[iData] || "");
      if (!isoDate) { skippedNoDate++; return null; }

      return {
        seller_id: sellerId,
        data: isoDate,
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
        rep_cancellations_rate: iRepCancellations >= 0 ? parseBrNumber(cols[iRepCancellations] || "0") : 0,
        pontuacao_ipi: parseBrNumber(cols[iPontuacaoIpi] || "0"),
        pontuacao_ll_gtin: iPontuacaoLlGtin >= 0 ? parseBrNumber(cols[iPontuacaoLlGtin] || "0") : 0,
        // LL Granular – Técnico
        ll_pictures_score: iLlPictures >= 0 ? parseBrNumber(cols[iLlPictures] || "0") : 0,
        ll_title_score: iLlTitle >= 0 ? parseBrNumber(cols[iLlTitle] || "0") : 0,
        ll_tech_specs_score: iLlTechSpecs >= 0 ? parseBrNumber(cols[iLlTechSpecs] || "0") : 0,
        ll_description_score: iLlDescription >= 0 ? parseBrNumber(cols[iLlDescription] || "0") : 0,
        // LL Granular – Oferta
        ll_price_score: iLlPrice >= 0 ? parseBrNumber(cols[iLlPrice] || "0") : 0,
        ll_stock_availability_score: iLlStock >= 0 ? parseBrNumber(cols[iLlStock] || "0") : 0,
        ll_free_shipping_score: iLlFreeShipping >= 0 ? parseBrNumber(cols[iLlFreeShipping] || "0") : 0,
        ll_promotions_score: iLlPromotions >= 0 ? parseBrNumber(cols[iLlPromotions] || "0") : 0,
        // Clips / Conteúdo (use safeClipsValue to reject anomalous values like CUST_ID)
        sellers_clips_publi: iSellersClipsPub >= 0 ? safeClipsValue(cols[iSellersClipsPub] || "0") : 0,
        visitas_clips: iVisitasClips >= 0 ? safeClipsValue(cols[iVisitasClips] || "0") : 0,
        si_clips: iSiClips >= 0 ? safeClipsValue(cols[iSiClips] || "0") : 0,
        orders_clips: iOrdersClips >= 0 ? safeClipsValue(cols[iOrdersClips] || "0") : 0,
        tgmv_lc_clips: iTgmvClips >= 0 ? parseBrNumber(cols[iTgmvClips] || "0") : 0,
        bpc: iBpc >= 0 && cols[iBpc]?.trim() ? parseBrNumber(cols[iBpc]) : null,
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
    for (let i = 0; i < uniqueKpiRows.length; i += 200) {
      const batch = uniqueKpiRows.slice(i, i + 200);
      const { error } = await supabase
        .from("sellers_kpi")
        .upsert(batch as any[], { onConflict: "seller_id,data", ignoreDuplicates: false });
      if (error) throw new Error(`KPI insert error batch ${i}: ${error.message}`);
      inserted += batch.length;
    }

    // Build listing-level quality rows (per item)
    if (iItemId >= 0) {
      const listingRows = rows.map((cols) => {
        const cleanCustId = (cols[iCustId]?.trim() || "").replace(/[.,]0$/, "");
        const sellerId = sellerIdMap.get(cleanCustId);
        const itemId = cols[iItemId]?.trim().replace(/[.,]0$/, "");
        if (!sellerId || !itemId) return null;
        const isoDate2 = parseValidDate(cols[iData] || "");
        if (!isoDate2) return null;

        return {
          seller_id: sellerId,
          item_id: itemId,
          data: isoDate2,
          ll_pictures_score: iLlPictures >= 0 ? parseBrNumber(cols[iLlPictures] || "0") : 0,
          ll_title_score: iLlTitle >= 0 ? parseBrNumber(cols[iLlTitle] || "0") : 0,
          ll_tech_specs_score: iLlTechSpecs >= 0 ? parseBrNumber(cols[iLlTechSpecs] || "0") : 0,
          ll_description_score: iLlDescription >= 0 ? parseBrNumber(cols[iLlDescription] || "0") : 0,
          ll_price_score: iLlPrice >= 0 ? parseBrNumber(cols[iLlPrice] || "0") : 0,
          ll_stock_availability_score: iLlStock >= 0 ? parseBrNumber(cols[iLlStock] || "0") : 0,
          ll_free_shipping_score: iLlFreeShipping >= 0 ? parseBrNumber(cols[iLlFreeShipping] || "0") : 0,
          ll_promotions_score: iLlPromotions >= 0 ? parseBrNumber(cols[iLlPromotions] || "0") : 0,
          score_photo: parseBrNumber(cols[iScorePhoto] || "0"),
          score_title: parseBrNumber(cols[iScoreTitle] || "0"),
          score_oferta_final: parseBrNumber(cols[iScoreOferta] || "0"),
          score_caracteristica_final: parseBrNumber(cols[iScoreCaract] || "0"),
          score_qualidade_final: parseBrNumber(cols[iScoreQual] || "0"),
          sellers_clips_publi: iSellersClipsPub >= 0 ? safeClipsValue(cols[iSellersClipsPub] || "0") : 0,
          visitas_clips: iVisitasClips >= 0 ? safeClipsValue(cols[iVisitasClips] || "0") : 0,
          si_clips: iSiClips >= 0 ? safeClipsValue(cols[iSiClips] || "0") : 0,
          orders_clips: iOrdersClips >= 0 ? safeClipsValue(cols[iOrdersClips] || "0") : 0,
          tgmv_lc_clips: iTgmvClips >= 0 ? parseBrNumber(cols[iTgmvClips] || "0") : 0,
        };
      }).filter(Boolean);

      // Deduplicate by seller_id + item_id + data
      const dedupedListings = new Map<string, any>();
      for (const row of listingRows) {
        dedupedListings.set(`${(row as any).seller_id}|${(row as any).item_id}|${(row as any).data}`, row);
      }
      const uniqueListings = Array.from(dedupedListings.values());

      let listingsInserted = 0;
      for (let i = 0; i < uniqueListings.length; i += 200) {
        const batch = uniqueListings.slice(i, i + 200);
        const { error } = await supabase
          .from("seller_listings_quality")
          .upsert(batch as any[], { onConflict: "seller_id,item_id,data", ignoreDuplicates: false });
        if (error) throw new Error(`Listings insert error batch ${i}: ${error.message}`);
        listingsInserted += batch.length;
      }
      console.log(`Listings quality inserted: ${listingsInserted}`);
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
        rows_skipped_no_date: skippedNoDate,
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
