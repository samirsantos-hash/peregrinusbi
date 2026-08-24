// ml-daily-sync
// Extração diária de operações financeiras do Mercado Livre.
// Recebe { site_id, start_date, end_date, limit, offset } e pagina o endpoint
// configurado, gravando o payload cru em stg_ml_daily_raw e a projeção
// normalizada em fin_operations / fin_costs. Cada execução vira um sync_jobs.
//
// Proteção: header x-refresh-secret (cron/backoffice). verify_jwt = false.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ML_API = "https://api.mercadolibre.com";
// Endpoint padrão de operações faturáveis; pode ser sobrescrito no corpo.
const DEFAULT_ENDPOINT = "/billing/integration/periods/operations";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Body = {
  site_id: string;
  start_date: string;
  end_date: string;
  limit: number;
  offset: number;
  endpoint: string;
  trilha: string;
  account_id: string | null;
};

/** Validação explícita — nada do corpo é usado sem checagem. */
function parseBody(raw: unknown): { ok: true; data: Body } | { ok: false; erros: string[] } {
  const erros: string[] = [];
  const b = (raw ?? {}) as Record<string, unknown>;

  const site_id = String(b.site_id ?? "MLB").toUpperCase();
  if (!/^[A-Z]{3}$/.test(site_id)) erros.push("site_id inválido (ex.: MLB)");

  const start_date = String(b.start_date ?? "");
  const end_date = String(b.end_date ?? "");
  if (!ISO_DATE.test(start_date)) erros.push("start_date deve ser YYYY-MM-DD");
  if (!ISO_DATE.test(end_date)) erros.push("end_date deve ser YYYY-MM-DD");
  if (ISO_DATE.test(start_date) && ISO_DATE.test(end_date) && start_date > end_date) {
    erros.push("start_date não pode ser maior que end_date");
  }

  const limit = Number(b.limit ?? 1000);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) erros.push("limit deve ser 1..1000");

  const offset = Number(b.offset ?? 0);
  if (!Number.isInteger(offset) || offset < 0) erros.push("offset deve ser >= 0");

  const endpoint = String(b.endpoint ?? DEFAULT_ENDPOINT);
  if (!endpoint.startsWith("/")) erros.push("endpoint deve começar com /");

  const trilha = String(b.trilha ?? "diaria");
  const account_id = b.account_id == null ? null : String(b.account_id);

  if (erros.length) return { ok: false, erros };
  return { ok: true, data: { site_id, start_date, end_date, limit, offset, endpoint, trilha, account_id } };
}

function segredoOk(provided: string, expected: string) {
  if (!expected || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function sha256(input: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const txt = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v));

/** Identidade da operação no payload do ML, tolerante a variações de nome. */
function idDaOperacao(r: Record<string, unknown>): string | null {
  return (
    txt(r.operation_id) ?? txt(r.id) ?? txt(r.order_id) ?? txt(r.source_id) ?? txt(r.reference_id)
  );
}

function dataDaOperacao(r: Record<string, unknown>): string | null {
  const v =
    txt(r.operation_date) ?? txt(r.date_created) ?? txt(r.date) ?? txt(r.transaction_date) ?? null;
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Projeção normalizada para fin_operations. data_competencia é GENERATED. */
function mapOperacao(r: Record<string, unknown>, accountId: string, rawId: number | null) {
  const first = (o: Record<string, unknown>, keys: string[]) => {
    for (const k of keys) if (o[k] !== undefined) return o[k];
    return null;
  };
  const ship = (r.shipping ?? {}) as Record<string, unknown>;
  const item = (r.item ?? {}) as Record<string, unknown>;

  return {
    account_id: accountId,
    operation_id: idDaOperacao(r)!,
    operation_type: txt(first(r, ["operation_type", "type", "detail_type"])) ?? "UNKNOWN",
    operation_date: dataDaOperacao(r)!,
    status: txt(first(r, ["status", "operation_status"])),
    seller_gross_income: num(first(r, ["seller_gross_income", "gross_income"])),
    total_order_amount: num(first(r, ["total_order_amount", "order_amount"])),
    total_income: num(first(r, ["total_income", "income"])),
    gross_price: num(first(r, ["gross_price", "unit_price_gross"])),
    total_discount: num(first(r, ["total_discount", "discount"])),
    total_meli_discount: num(r.total_meli_discount),
    transparent_meli_discount: num(r.transparent_meli_discount),
    total_seller_discount: num(r.total_seller_discount),
    meli_rebate: num(r.meli_rebate),
    buyer_shipping_charge: num(first(r, ["buyer_shipping_charge", "receiver_shipping_cost"])),
    net_costs: num(first(r, ["net_costs", "total_net_costs"])),
    pending_costs: num(r.pending_costs),
    tax_withholding_amount: num(first(r, ["tax_withholding_amount", "taxes_amount"])),
    seller_net_income: num(first(r, ["seller_net_income", "net_received_amount"])),
    ml_item_id: txt(first(r, ["ml_item_id", "item_id"]) ?? item.id),
    sku: txt(first(r, ["sku", "seller_sku"]) ?? item.seller_sku),
    titulo: txt(first(r, ["titulo", "title"]) ?? item.title),
    quantidade: num(first(r, ["quantidade", "quantity"]) ?? item.quantity),
    unit_price: num(first(r, ["unit_price"]) ?? item.unit_price),
    sale_price: num(r.sale_price),
    total_price: num(r.total_price),
    shipment_id: txt(first(r, ["shipment_id"]) ?? ship.id),
    shipping_logistic_type: txt(first(r, ["shipping_logistic_type"]) ?? ship.logistic_type),
    shipping_type: txt(first(r, ["shipping_type"]) ?? ship.shipping_mode),
    shipping_cost: num(first(r, ["shipping_cost"]) ?? ship.cost),
    pack_id: txt(r.pack_id),
    raw_id: rawId,
    ingested_at: new Date().toISOString(),
  };
}

function mapCustos(r: Record<string, unknown>, operationPk: number, accountId: string) {
  const lista = (Array.isArray(r.costs) ? r.costs : Array.isArray(r.charges) ? r.charges : []) as Record<
    string,
    unknown
  >[];
  return lista.map((c) => ({
    operation_pk: operationPk,
    account_id: accountId,
    ml_cost_id: txt(c.id ?? c.cost_id),
    tipo: txt(c.tipo ?? c.type),
    detail_type: txt(c.detail_type),
    concept_type: txt(c.concept_type),
    gross_amount: num(c.gross_amount ?? c.amount),
    total_discount: num(c.total_discount),
    net_cost: num(c.net_cost ?? c.amount),
    remaining: num(c.remaining),
    currency_id: txt(c.currency_id),
    order_percentage_fee: num(c.order_percentage_fee),
    cost_operation_id: txt(c.cost_operation_id ?? c.operation_id),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "use POST" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const TRIGGER_SECRET = Deno.env.get("REFRESH_TRIGGER_SECRET")!;

  if (!segredoOk(req.headers.get("x-refresh-secret") ?? "", TRIGGER_SECRET)) {
    return json({ error: "forbidden" }, 403);
  }

  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return json({ error: "corpo JSON inválido" }, 400);
  }
  const parsed = parseBody(bruto);
  if (!parsed.ok) return json({ error: parsed.erros }, 400);
  const p = parsed.data;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Contas ativas do site pedido (ou a conta específica informada)
  let q = admin.from("ml_accounts").select("id, ml_user_id, site_id, status").eq("status", "active");
  if (p.account_id) q = q.eq("id", p.account_id);
  else q = q.eq("site_id", p.site_id);
  const { data: contas, error: errContas } = await q;
  if (errContas) return json({ error: errContas.message }, 500);
  if (!contas?.length) return json({ jobs: [], aviso: "nenhuma conta ML ativa para este site" });

  const jobs: unknown[] = [];

  for (const conta of contas) {
    const { data: job, error: errJob } = await admin
      .from("sync_jobs")
      .insert({
        account_id: conta.id,
        endpoint: p.endpoint,
        start_date: p.start_date,
        end_date: p.end_date,
        trilha: p.trilha,
        status: "running",
        offset_atual: p.offset,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (errJob) {
      jobs.push({ account: conta.id, error: errJob.message });
      continue;
    }
    const jobId = job.id as number;

    let offset = p.offset;
    let total: number | null = null;
    let gravados = 0;

    try {
      const { data: tok } = await admin
        .from("ml_tokens")
        .select("access_token, expires_at")
        .eq("account_id", conta.id)
        .eq("is_current", true)
        .maybeSingle();
      if (!tok?.access_token) throw new Error("conta sem token corrente (reautorizar)");
      if (Date.parse(tok.expires_at) <= Date.now()) throw new Error("token expirado (aguardar refresh)");

      // Paginação até esgotar o período
      for (let pagina = 0; pagina < 200; pagina++) {
        const url = new URL(ML_API + p.endpoint);
        url.searchParams.set("site_id", p.site_id);
        url.searchParams.set("user_id", String(conta.ml_user_id));
        url.searchParams.set("date_from", p.start_date);
        url.searchParams.set("date_to", p.end_date);
        url.searchParams.set("limit", String(p.limit));
        url.searchParams.set("offset", String(offset));

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${tok.access_token}`, Accept: "application/json" },
        });
        const corpo = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            `ML ${res.status}: ${typeof corpo === "object" ? JSON.stringify(corpo).slice(0, 300) : "sem corpo"}`,
          );
        }

        const linhas: Record<string, unknown>[] = Array.isArray(corpo)
          ? corpo
          : Array.isArray((corpo as Record<string, unknown>)?.results)
            ? ((corpo as Record<string, unknown>).results as Record<string, unknown>[])
            : Array.isArray((corpo as Record<string, unknown>)?.data)
              ? ((corpo as Record<string, unknown>).data as Record<string, unknown>[])
              : [];

        const paging = (corpo as Record<string, unknown>)?.paging as Record<string, unknown> | undefined;
        if (total === null) total = num(paging?.total) ?? linhas.length;

        for (const linha of linhas) {
          const opId = idDaOperacao(linha);
          const opDate = dataDaOperacao(linha);
          if (!opId || !opDate) continue;

          const hash = await sha256(JSON.stringify(linha));
          const { data: raw } = await admin
            .from("stg_ml_daily_raw")
            .upsert(
              {
                account_id: conta.id,
                operation_id: opId,
                operation_type: txt(linha.operation_type ?? linha.type) ?? "UNKNOWN",
                operation_date: opDate,
                payload: linha as never,
                payload_hash: hash,
                fetched_at: new Date().toISOString(),
                sync_job_id: jobId,
              },
              { onConflict: "account_id,operation_type,operation_id,payload_hash" },
            )
            .select("id")
            .maybeSingle();

          const { data: op, error: errOp } = await admin
            .from("fin_operations")
            .upsert(mapOperacao(linha, conta.id, (raw?.id as number) ?? null), {
              onConflict: "account_id,operation_type,operation_id",
            })
            .select("id")
            .single();
          if (errOp) throw new Error(`fin_operations: ${errOp.message}`);

          const custos = mapCustos(linha, op.id as number, conta.id);
          if (custos.length) {
            const { error: errC } = await admin
              .from("fin_costs")
              .upsert(custos, { onConflict: "operation_pk,ml_cost_id,tipo,detail_type,concept_type" });
            if (errC) throw new Error(`fin_costs: ${errC.message}`);
          }
          gravados++;
        }

        offset += p.limit;
        await admin.from("sync_jobs").update({ offset_atual: offset, registros_gravados: gravados }).eq("id", jobId);

        if (linhas.length < p.limit || (total !== null && offset >= total)) break;
      }

      await admin
        .from("sync_jobs")
        .update({
          status: "done",
          total_registros: total,
          registros_gravados: gravados,
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      jobs.push({ account: conta.id, job_id: jobId, total, gravados, status: "done" });
    } catch (e) {
      const msg = String((e as Error).message ?? e);
      await admin
        .from("sync_jobs")
        .update({ status: "error", erro: msg, registros_gravados: gravados, finished_at: new Date().toISOString() })
        .eq("id", jobId);
      jobs.push({ account: conta.id, job_id: jobId, status: "error", erro: msg });
    }
  }

  return json({ periodo: { de: p.start_date, ate: p.end_date }, site_id: p.site_id, jobs });
});
