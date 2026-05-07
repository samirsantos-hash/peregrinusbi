import { supabase } from "@/integrations/supabase/client";
import { parseCsv, dedup, normalizeCustId, normalizeUpperStr } from "./csv";
import {
  SELLERS_PM_SCHEMA,
  CPP_MENSAL_SCHEMA,
  CDP_MENSAL_SCHEMA,
  LIVELISTINGS_SCHEMA,
  ELEGIBILIDADE_SCHEMA,
} from "./schemas";

interface IngestResult {
  file: string;
  rowsIn: number;
  rowsUpserted: number;
  errors: string[];
}

async function upsertBatch(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  batchSize = 500
): Promise<{ upserted: number; errors: string[] }> {
  let upserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error, count } = await (supabase.from(table) as any).upsert(batch, {
      onConflict,
      count: "exact",
    });
    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize)}: ${error.message}`);
    } else {
      upserted += count ?? batch.length;
    }
  }
  return { upserted, errors };
}

function normalizeSellersPm(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows
    .map((r) => ({
      ...r,
      cust_id: normalizeCustId(r.cust_id as string),
      cus_nickname: normalizeUpperStr(r.cus_nickname as string),
    }))
    .filter((r) => r.cust_id > 0);
}

function normalizeCppMensal(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows
    .map((r) => {
      const row = { ...r };
      row.cus_cust_id_sel = normalizeCustId(row.cus_cust_id_sel as string);
      row.cus_nickname = normalizeUpperStr(row.cus_nickname as string);
      row.cluster_seller = normalizeUpperStr(row.cluster_seller as string);
      row.h_l = normalizeUpperStr(row.h_l as string);
      row.nivel_solucion = normalizeUpperStr(row.nivel_solucion as string);
      // Remove mes_ref — it's a generated column
      delete row.mes_ref;
      return row;
    })
    .filter((r) => (r.cus_cust_id_sel as number) > 0);
}

function normalizeCdpMensal(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows
    .map((r) => ({
      ...r,
      cus_cust_id_sel: normalizeCustId(r.cus_cust_id_sel as string),
      programa: r.programa ? String(r.programa).trim() : "",
    }))
    .filter((r) => (r.cus_cust_id_sel as number) > 0);
}

export async function ingestAllFiles(
  files: { name: string; content: string }[],
  userId: string
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  const findFile = (pattern: string) =>
    files.filter((f) => f.name.toLowerCase().includes(pattern.toLowerCase()));

  // 1. SellersPreviousMonth
  const sellersPmFiles = findFile("SellersPreviousMonth");
  for (const f of sellersPmFiles) {
    const parsed = parseCsv(f.content, SELLERS_PM_SCHEMA);
    const normalized = normalizeSellersPm(parsed.rows);
    const { upserted, errors } = await upsertBatch(
      "sellers_pm",
      normalized,
      "cust_id,snapshot_date"
    );
    results.push({ file: f.name, rowsIn: parsed.rows.length, rowsUpserted: upserted, errors });
  }

  // 2. CPP Mensal
  const cppFiles = findFile("CPP_MENSAL");
  for (const f of cppFiles) {
    const parsed = parseCsv(f.content, CPP_MENSAL_SCHEMA);
    const normalized = normalizeCppMensal(parsed.rows);
    const { upserted, errors } = await upsertBatch(
      "cpp_mensal",
      normalized,
      "cus_cust_id_sel,tim_month_id"
    );
    results.push({ file: f.name, rowsIn: parsed.rows.length, rowsUpserted: upserted, errors });
  }

  // 3. CDP Mensal (may have multiple files — dedup)
  const cdpFiles = findFile("CDP_MENSAL");
  let allCdpRows: Record<string, unknown>[] = [];
  for (const f of cdpFiles) {
    const parsed = parseCsv(f.content, CDP_MENSAL_SCHEMA);
    allCdpRows = allCdpRows.concat(normalizeCdpMensal(parsed.rows));
  }
  if (allCdpRows.length > 0) {
    const deduped = dedup(
      allCdpRows,
      ["cus_cust_id_sel", "tim_month_id", "programa"],
      "dt_atualizacao"
    );
    const { upserted, errors } = await upsertBatch(
      "cdp_mensal",
      deduped,
      "cus_cust_id_sel,tim_month_id,programa"
    );
    results.push({
      file: `CDP_MENSAL (${cdpFiles.length} arquivos)`,
      rowsIn: allCdpRows.length,
      rowsUpserted: upserted,
      errors,
    });
  }

  // 4. Live Listings
  const llFiles = findFile("LIVELISTINGS");
  for (const f of llFiles) {
    const parsed = parseCsv(f.content, LIVELISTINGS_SCHEMA);
    const normalized = parsed.rows.map((r: any) => ({
      ...r,
      cus_cust_id_sel: normalizeCustId(r.cus_cust_id_sel),
      cus_nickname: normalizeUpperStr(r.cus_nickname),
    }));
    // No PK — just insert (delete old data first)
    await (supabase.from("gm_live_listings") as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { upserted, errors } = await upsertBatch("gm_live_listings", normalized, "id", 500);
    results.push({ file: f.name, rowsIn: parsed.rows.length, rowsUpserted: upserted, errors });
  }

  // 5. Elegibilidade (may have multiple files)
  const elegFiles = findFile("ELEGIBILIDADE");
  let allElegRows: Record<string, unknown>[] = [];
  for (const f of elegFiles) {
    const parsed = parseCsv(f.content, ELEGIBILIDADE_SCHEMA);
    allElegRows = allElegRows.concat(
      parsed.rows.map((r: any) => ({
        ...r,
        cus_cust_id_sel: normalizeCustId(r.cus_cust_id_sel),
        cus_nickname: normalizeUpperStr(r.cus_nickname),
      }))
    );
  }
  if (allElegRows.length > 0) {
    await (supabase.from("gm_elegibilidade") as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { upserted, errors } = await upsertBatch("gm_elegibilidade", allElegRows, "id", 500);
    results.push({
      file: `ELEGIBILIDADE (${elegFiles.length} arquivos)`,
      rowsIn: allElegRows.length,
      rowsUpserted: upserted,
      errors,
    });
  }

  // Log ingestion
  for (const r of results) {
    await (supabase.from("ingest_log") as any).insert({
      file: r.file,
      rows_in: r.rowsIn,
      rows_upserted: r.rowsUpserted,
      errors_json: r.errors,
      uploaded_by: userId,
    });
  }

  return results;
}