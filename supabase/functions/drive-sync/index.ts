import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------- Service Account JWT -> OAuth token ----------
function b64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
      ? input
      : new Uint8Array(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!resp.ok) throw new Error(`Google token error [${resp.status}]: ${await resp.text()}`);
  const j = await resp.json();
  return j.access_token as string;
}

// ---------- Filename -> import route ----------
type Route = { fn: "import-csv" | "import-csv-daily" | "import-eligibility" | "import-live-listings"; type: string };
function routeForFilename(name: string): Route | null {
  const n = name.toUpperCase();
  if (n.includes("ELEGIBILIDADE")) return { fn: "import-eligibility", type: "elegibilidade" };
  if (n.includes("LIVELISTINGS") || n.includes("LIVE_LISTINGS")) return { fn: "import-live-listings", type: "live_listings" };
  if (n.includes("DIARIZADA") || n.includes("DIARIA") || n.includes("_DIA")) return { fn: "import-csv-daily", type: "cpp_diarizada" };
  if (n.includes("CPP_MENSAL") || n.includes("CPP")) return { fn: "import-csv", type: "cpp_mensal" };
  return null;
}

// ---------- Chunking for eligibility ----------
const ELIGIBILITY_CHUNK_ROWS = 8000;

function splitCsvByRows(csv: string, chunkRows: number): string[] {
  const nl = csv.indexOf("\n");
  if (nl < 0) return [csv];
  const header = csv.slice(0, nl + 1);
  const rest = csv.slice(nl + 1);
  const lines = rest.split("\n");
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += chunkRows) {
    const slice = lines.slice(i, i + chunkRows).join("\n");
    if (slice.trim()) chunks.push(header + slice);
  }
  return chunks;
}

async function invokeImport(
  fnName: string,
  csv: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ ok: boolean; body: any }> {
  const resp = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({ csv }),
  });
  const text = await resp.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch (_) { /* keep text */ }
  return { ok: resp.ok, body };
}

// ---------- Main handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const folderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
    if (!saJson) throw new Error("Missing secret GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!folderId) throw new Error("Missing secret GOOGLE_DRIVE_FOLDER_ID");

    const sa = JSON.parse(saJson);
    const supabase = createClient(supabaseUrl, serviceKey);

    const accessToken = await getAccessToken(sa);

    // List CSVs in folder (include Shared Drives)
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fields = encodeURIComponent("files(id,name,modifiedTime,size,mimeType)");
    const listUrl =
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}` +
      `&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=modifiedTime desc`;
    const listResp = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!listResp.ok) throw new Error(`Drive list [${listResp.status}]: ${await listResp.text()}`);
    const { files = [] } = await listResp.json();

    // Dedupe against drive_ingest_log
    const { data: logRows } = await supabase
      .from("drive_ingest_log")
      .select("file_id, modified_time, status")
      .in("file_id", files.map((f: any) => f.id));
    const seen = new Set(
      (logRows || [])
        .filter((r: any) => r.status === "success")
        .map((r: any) => `${r.file_id}|${new Date(r.modified_time).toISOString()}`),
    );

    const results: any[] = [];

    for (const f of files) {
      const route = routeForFilename(f.name);
      if (!route) {
        results.push({ file: f.name, skipped: "no route" });
        continue;
      }
      const key = `${f.id}|${new Date(f.modifiedTime).toISOString()}`;
      if (seen.has(key)) {
        results.push({ file: f.name, skipped: "already imported" });
        continue;
      }

      // Log start
      const { data: logRow, error: logErr } = await supabase
        .from("drive_ingest_log")
        .insert({
          file_id: f.id,
          file_name: f.name,
          modified_time: f.modifiedTime,
          file_size: f.size ? Number(f.size) : null,
          import_type: route.type,
          status: "running",
        })
        .select("id")
        .single();
      if (logErr) {
        results.push({ file: f.name, error: `log insert: ${logErr.message}` });
        continue;
      }
      const logId = logRow.id;

      try {
        // Download file
        const dl = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&supportsAllDrives=true`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!dl.ok) throw new Error(`Drive download [${dl.status}]: ${await dl.text()}`);
        const csv = await dl.text();

        let totalRows = 0;
        let chunks = 0;
        if (route.fn === "import-eligibility") {
          const parts = splitCsvByRows(csv, ELIGIBILITY_CHUNK_ROWS);
          for (const part of parts) {
            const r = await invokeImport(route.fn, part, supabaseUrl, serviceKey);
            if (!r.ok) throw new Error(`chunk ${chunks + 1}/${parts.length}: ${JSON.stringify(r.body)}`);
            totalRows += Number(r.body?.eligibility || 0);
            chunks++;
          }
        } else {
          const r = await invokeImport(route.fn, csv, supabaseUrl, serviceKey);
          if (!r.ok) throw new Error(JSON.stringify(r.body));
          totalRows = Number(r.body?.kpis || r.body?.listings || r.body?.rows || r.body?.eligibility || 0);
          chunks = 1;
        }

        await supabase
          .from("drive_ingest_log")
          .update({
            status: "success",
            rows_imported: totalRows,
            chunks_processed: chunks,
            finished_at: new Date().toISOString(),
          })
          .eq("id", logId);

        results.push({ file: f.name, type: route.type, rows: totalRows, chunks });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase
          .from("drive_ingest_log")
          .update({ status: "error", error_message: msg, finished_at: new Date().toISOString() })
          .eq("id", logId);
        results.push({ file: f.name, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, listed: files.length, processed: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("drive-sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});