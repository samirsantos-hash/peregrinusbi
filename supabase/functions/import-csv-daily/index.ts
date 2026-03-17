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

/** Parse DD/MM/YYYY to YYYY-MM-DD */
function parseBrDate(val: string): string {
  if (!val) return "2026-01-01";
  const trimmed = val.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  // DD/MM/YYYY
  const match = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (match) {
    const d = match[1].padStart(2, "0");
    const m = match[2].padStart(2, "0");
    let y = match[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}

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

    const lines = csvText.split("\n").filter((l: string) => l.trim());
    const headerLine = lines[0].replace(/^\uFEFF/, "");
    const headers = parseCSVLine(headerLine).map(h => h.trim());
    const colIdx = (name: string) => headers.indexOf(name);

    // Try TIM_DAY first, fallback to DATA
    const iData = colIdx("TIM_DAY") >= 0 ? colIdx("TIM_DAY") : colIdx("DATA");
    const iNickname = colIdx("CUS_NICKNAME");
    const iCustId = colIdx("CUS_CUST_ID_SEL");
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
    const iLlPictures = colIdx("PONTUACAO_LL_CHARACTERISTICS_PICTURES_OK_SCORE");
    const iLlTitle = colIdx("PONTUACAO_LL_CHARACTERISTICS_TITLE_OK_SCORE");
    const iLlTechSpecs = colIdx("PONTUACAO_LL_CHARACTERISTICS_TECHNICAL_SPECIFICATIONS_MAIN_OK_SCORE");
    const iLlDescription = colIdx("PONTUACAO_LL_CHARACTERISTICS_DESCRIPTION_OK_SCORE");
    const iLlPrice = colIdx("PONTUACAO_LL_OFFER_PRICE_OK_SCORE");
    const iLlStock = colIdx("PONTUACAO_LL_OFFER_STOCK_AVAILABILITY_TIME_OK_SCORE");
    const iLlFreeShipping = colIdx("PONTUACAO_LL_OFFER_FREE_SHIPPING_OK_SCORE");
    const iLlPromotions = colIdx("PONTUACAO_LL_OFFER_PROMOTIONS_OK_SCORE");
    const iSellersClipsPub = colIdx("SELLERS_CLIPS_PUBLI");
    const iVisitasClips = colIdx("VISITAS_CLIPS");
    const iSiClips = colIdx("SI_CLIPS");
    const iOrdersClips = colIdx("ORDERS_CLIPS");
    const iTgmvClips = colIdx("TGMV_LC_CLIPS");

    // Collect unique sellers
    const sellerMap = new Map<string, { nickname: string; cluster: string; subCluster: string; state: string }>();
    const rows: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 5) continue;
      const custId = cols[iCustId]?.trim();
      if (!custId) continue;
      const cleanCustId = custId.replace(/[.,]0$/, "");
      if (!sellerMap.has(cleanCustId)) {
        sellerMap.set(cleanCustId, {
          nickname: cols[iNickname]?.trim() || "",
          cluster: iCluster >= 0 ? cols[iCluster]?.trim() || "" : "",
          subCluster: iSubCluster >= 0 ? cols[iSubCluster]?.trim() || "" : "",
          state: iState >= 0 ? cols[iState]?.trim() || "" : "",
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
    for (const s of sellerRows || []) sellerIdMap.set(s.cust_id, s.id);

    // Build daily KPI rows
    const kpiRows = rows.map((cols) => {
      const cleanCustId = (cols[iCustId]?.trim() || "").replace(/[.,]0$/, "");
      const sellerId = sellerIdMap.get(cleanCustId);
      if (!sellerId) return null;

      const rawDate = cols[iData]?.trim() || "";
      const isoDate = parseBrDate(rawDate);

      return {
        seller_id: sellerId,
        data: isoDate,
        gmv_lc: iGmv >= 0 ? parseBrNumber(cols[iGmv] || "0") : 0,
        tsi: iTsi >= 0 ? parseBrInt(cols[iTsi] || "0") : 0,
        tgmv_lc: iTgmv >= 0 ? parseBrNumber(cols[iTgmv] || "0") : 0,
        inv_pads: iInvPads >= 0 ? parseBrNumber(cols[iInvPads] || "0") : 0,
        tgmv_lc_pads: iTgmvPads >= 0 ? parseBrNumber(cols[iTgmvPads] || "0") : 0,
        tsi_pads: iTsiPads >= 0 ? parseBrInt(cols[iTsiPads] || "0") : 0,
        f_tgmv_lc: iFTgmv >= 0 ? parseBrNumber(cols[iFTgmv] || "0") : 0,
        f_tsi: iFTsi >= 0 ? parseBrInt(cols[iFTsi] || "0") : 0,
        tgmv_lc_full: iTgmvFull >= 0 ? parseBrNumber(cols[iTgmvFull] || "0") : 0,
        tgmv_lc_flex: iTgmvFlex >= 0 ? parseBrNumber(cols[iTgmvFlex] || "0") : 0,
        tsi_flex: iTsiFlex >= 0 ? parseBrInt(cols[iTsiFlex] || "0") : 0,
        score_photo: iScorePhoto >= 0 ? parseBrNumber(cols[iScorePhoto] || "0") : 0,
        score_title: iScoreTitle >= 0 ? parseBrNumber(cols[iScoreTitle] || "0") : 0,
        score_final_full: iScoreFull >= 0 ? parseBrNumber(cols[iScoreFull] || "0") : 0,
        score_oferta_final: iScoreOferta >= 0 ? parseBrNumber(cols[iScoreOferta] || "0") : 0,
        score_caracteristica_final: iScoreCaract >= 0 ? parseBrNumber(cols[iScoreCaract] || "0") : 0,
        score_qualidade_final: iScoreQual >= 0 ? parseBrNumber(cols[iScoreQual] || "0") : 0,
        score_final_pads: iScorePads >= 0 ? parseBrNumber(cols[iScorePads] || "0") : 0,
        min_price_rival: iMinPriceRival >= 0 ? parseBrNumber(cols[iMinPriceRival] || "0") : 0,
        visits: iVisits >= 0 ? parseBrNumber(cols[iVisits] || "0") : 0,
        visits_expensive: iVisitsExp >= 0 ? parseBrNumber(cols[iVisitsExp] || "0") : 0,
        visits_match: iVisitsMatch >= 0 ? parseBrNumber(cols[iVisitsMatch] || "0") : 0,
        visits_cheaper: iVisitsCheaper >= 0 ? parseBrNumber(cols[iVisitsCheaper] || "0") : 0,
        uplift_gmv_lc_m1: iUplift >= 0 ? parseBrNumber(cols[iUplift] || "0") : 0,
        gmv_lc_m1: iGmvM1 >= 0 ? parseBrNumber(cols[iGmvM1] || "0") : 0,
        cdp_tgmv_lc: iCdpTgmv >= 0 ? parseBrNumber(cols[iCdpTgmv] || "0") : 0,
        cdp_tsi: iCdpTsi >= 0 ? parseBrInt(cols[iCdpTsi] || "0") : 0,
        rep_current_level: iRepLevel >= 0 ? cols[iRepLevel]?.trim() || null : null,
        rep_claims_rate: iRepClaims >= 0 ? parseBrNumber(cols[iRepClaims] || "0") : 0,
        rep_delayed_ht_rate: iRepDelayed >= 0 ? parseBrNumber(cols[iRepDelayed] || "0") : 0,
        rep_cancellations_rate: iRepCancellations >= 0 ? parseBrNumber(cols[iRepCancellations] || "0") : 0,
        pontuacao_ipi: iPontuacaoIpi >= 0 ? parseBrNumber(cols[iPontuacaoIpi] || "0") : 0,
        pontuacao_ll_gtin: iPontuacaoLlGtin >= 0 ? parseBrNumber(cols[iPontuacaoLlGtin] || "0") : 0,
        ll_pictures_score: iLlPictures >= 0 ? parseBrNumber(cols[iLlPictures] || "0") : 0,
        ll_title_score: iLlTitle >= 0 ? parseBrNumber(cols[iLlTitle] || "0") : 0,
        ll_tech_specs_score: iLlTechSpecs >= 0 ? parseBrNumber(cols[iLlTechSpecs] || "0") : 0,
        ll_description_score: iLlDescription >= 0 ? parseBrNumber(cols[iLlDescription] || "0") : 0,
        ll_price_score: iLlPrice >= 0 ? parseBrNumber(cols[iLlPrice] || "0") : 0,
        ll_stock_availability_score: iLlStock >= 0 ? parseBrNumber(cols[iLlStock] || "0") : 0,
        ll_free_shipping_score: iLlFreeShipping >= 0 ? parseBrNumber(cols[iLlFreeShipping] || "0") : 0,
        ll_promotions_score: iLlPromotions >= 0 ? parseBrNumber(cols[iLlPromotions] || "0") : 0,
        sellers_clips_publi: iSellersClipsPub >= 0 ? safeClipsValue(cols[iSellersClipsPub] || "0") : 0,
        visitas_clips: iVisitasClips >= 0 ? safeClipsValue(cols[iVisitasClips] || "0") : 0,
        si_clips: iSiClips >= 0 ? safeClipsValue(cols[iSiClips] || "0") : 0,
        orders_clips: iOrdersClips >= 0 ? safeClipsValue(cols[iOrdersClips] || "0") : 0,
        tgmv_lc_clips: iTgmvClips >= 0 ? parseBrNumber(cols[iTgmvClips] || "0") : 0,
      };
    }).filter(Boolean);

    // Deduplicate by seller_id + data (keep last)
    const deduped = new Map<string, any>();
    for (const row of kpiRows) {
      deduped.set(`${(row as any).seller_id}|${(row as any).data}`, row);
    }
    const uniqueKpiRows = Array.from(deduped.values());

    // Insert in batches
    let inserted = 0;
    for (let i = 0; i < uniqueKpiRows.length; i += 200) {
      const batch = uniqueKpiRows.slice(i, i + 200);
      const { error } = await supabase
        .from("sellers_kpi_daily")
        .upsert(batch as any[], { onConflict: "seller_id,data", ignoreDuplicates: false });
      if (error) throw new Error(`Daily KPI insert error batch ${i}: ${error.message}`);
      inserted += batch.length;
    }

    // Log the upload
    if (uploadedBy) {
      await supabase.from("upload_logs").insert({
        uploaded_by: uploadedBy,
        upload_type: "cpp_diarizada",
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
    console.error("Import daily error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
